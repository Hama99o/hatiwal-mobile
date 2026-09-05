/**
 * FloatingTabBar unit tests.
 *
 * The critical behaviour under test is tab VISIBILITY: Expo Router compiles a
 * Tabs.Screen `href: null` (used by the (tabs) _layout to hide My Shop / Saved /
 * Chats from logged-out guests and to swap tabs by buyer/seller mode) into
 * `options.tabBarItemStyle = { display: "none" }` while DELETING `options.href`.
 * A custom tab bar must therefore detect hidden tabs via that style — otherwise
 * guest-forbidden tabs leak into the bar. These tests lock that in.
 *
 * Global mocks (src/__tests__/setup.ts): useColors, useLocalization, and
 * react-native-safe-area-context. We add a useModeStore mock here.
 */

import React from "react";
import { Dimensions } from "react-native";
import { render, screen } from "@testing-library/react-native";

// Tab bar reads the mode only for the accent color; fix it to buyer.
jest.mock("@/stores/mode.store", () => ({
  useModeStore: (selector: (s: { mode: string }) => unknown) => selector({ mode: "buyer" }),
}));

// Icons come in via options.tabBarIcon (we supply trivial ones below), so no
// lucide import in the component to mock.
import { FloatingTabBar } from "../FloatingTabBar";

type TabDef = {
  name: string;
  title: string;
  /** When true, simulate Expo Router's compiled `href: null` (display:none). */
  hiddenViaStyle?: boolean;
  /** When true, simulate a raw `href: null` still present on options (fallback path). */
  hiddenViaHref?: boolean;
  focused?: boolean;
};

function makeProps(tabs: TabDef[]) {
  const routes = tabs.map((t, i) => ({ key: `${t.name}-${i}`, name: t.name, params: undefined }));
  const focusedIdx = Math.max(0, tabs.findIndex((t) => t.focused));

  const descriptors: Record<string, unknown> = {};
  tabs.forEach((t, i) => {
    descriptors[`${t.name}-${i}`] = {
      options: {
        title: t.title,
        tabBarItemStyle: t.hiddenViaStyle ? { display: "none" } : undefined,
        href: t.hiddenViaHref ? null : undefined,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          // Minimal icon stand-in (a Text node) — keeps the test free of native svg.
          <></>
        ),
      },
    };
  });

  return {
    state: { index: focusedIdx, routes },
    descriptors,
    navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => {} },
  } as unknown as React.ComponentProps<typeof FloatingTabBar>;
}

describe("FloatingTabBar — tab visibility (guest/mode security)", () => {
  it("renders only the visible tabs and hides href:null tabs (compiled to display:none)", () => {
    // Guest scenario: Bazaar + Me visible; My Shop / Saved / Chats hidden.
    render(
      <FloatingTabBar
        {...makeProps([
          { name: "browse", title: "Bazaar", focused: true },
          { name: "my-listings", title: "My Shop", hiddenViaStyle: true },
          { name: "saved", title: "Saved", hiddenViaStyle: true },
          { name: "chat", title: "Chats", hiddenViaStyle: true },
          { name: "profile", title: "Me" },
        ])}
      />
    );

    // Visible tabs are present (each Pressable carries accessibilityLabel = title).
    expect(screen.getByLabelText("Bazaar")).toBeTruthy();
    expect(screen.getByLabelText("Me")).toBeTruthy();

    // Guest-forbidden tabs must NOT be rendered at all.
    expect(screen.queryByLabelText("My Shop")).toBeNull();
    expect(screen.queryByLabelText("Saved")).toBeNull();
    expect(screen.queryByLabelText("Chats")).toBeNull();
  });

  it("also hides a tab when options.href === null (fallback path)", () => {
    render(
      <FloatingTabBar
        {...makeProps([
          { name: "browse", title: "Bazaar", focused: true },
          { name: "chat", title: "Chats", hiddenViaHref: true },
        ])}
      />
    );

    expect(screen.getByLabelText("Bazaar")).toBeTruthy();
    expect(screen.queryByLabelText("Chats")).toBeNull();
  });

  it("renders all tabs when none are hidden (authenticated buyer)", () => {
    render(
      <FloatingTabBar
        {...makeProps([
          { name: "browse", title: "Bazaar", focused: true },
          { name: "saved", title: "Saved" },
          { name: "chat", title: "Chats" },
          { name: "profile", title: "Me" },
        ])}
      />
    );

    expect(screen.getByLabelText("Bazaar")).toBeTruthy();
    expect(screen.getByLabelText("Saved")).toBeTruthy();
    expect(screen.getByLabelText("Chats")).toBeTruthy();
    expect(screen.getByLabelText("Me")).toBeTruthy();
  });

  describe("long labels never truncate, at any width", () => {
    // The defect: at 360dp the primary nav read "Categ…", and Dari's
    // "دسته‌بندی‌ها" truncated the same way.
    //
    // The FIRST fix was a `windowWidth < 380` breakpoint that dropped the label
    // to 9.5pt, and these two tests used to assert exactly that — 9.5 at 360dp,
    // 10.5 at 411dp. Both passed. The breakpoint was still wrong: on a device at
    // 411dp, ABOVE the threshold and therefore "fine" by these tests, the tab
    // read "Categor…". A width number cannot know how long a translated string
    // is, so it was replaced by shrink-to-fit, which asks the platform.
    //
    // These tests are therefore about the CONTRACT, not a number: one line,
    // allowed to shrink, with a floor. Asserting a rendered font size again
    // would re-introduce exactly the false confidence described above — the
    // shrinking happens in native layout, which does not run in Jest.
    const labelProps = (title: string) => screen.getByText(title).props;

    const renderBar = () =>
      render(
        <FloatingTabBar
          {...makeProps([
            { name: "browse", title: "Bazaar", focused: true },
            { name: "categories", title: "Categories" },
          ])}
        />
      );

    it("lets every label shrink to fit rather than clipping it", () => {
      renderBar();
      for (const title of ["Bazaar", "Categories"]) {
        const props = labelProps(title);
        expect(props.numberOfLines).toBe(1);
        expect(props.adjustsFontSizeToFit).toBe(true);
        expect(props.minimumFontScale).toBe(0.8);
      }
    });

    it("keeps one base font size instead of a width breakpoint", () => {
      // Same render at two very different widths must produce the same style —
      // any width-conditional font here would be the old bug returning.
      const sizeAt = (width: number) => {
        jest.spyOn(Dimensions, "get").mockReturnValue({
          width, height: 900, scale: 2, fontScale: 1,
        });
        const { unmount } = renderBar();
        const flat = [labelProps("Categories").style].flat(3).filter(Boolean) as Record<
          string,
          unknown
        >[];
        const size = flat.reduce<number | undefined>(
          (acc, layer) => (typeof layer.fontSize === "number" ? layer.fontSize : acc),
          undefined,
        );
        unmount();
        return size;
      };
      expect(sizeAt(360)).toBe(10.5);
      expect(sizeAt(411)).toBe(10.5);
      expect(sizeAt(448)).toBe(10.5);
    });
  });

  it("renders a label for every tab (active tab highlighted, Apple-News style)", () => {
    render(
      <FloatingTabBar
        {...makeProps([
          { name: "browse", title: "Bazaar", focused: true },
          { name: "profile", title: "Me" },
        ])}
      />
    );

    // Every tab shows its icon + label; the active tab is tinted / sits in a
    // pill (a visual distinction), so both labels are present in the tree.
    expect(screen.getByText("Bazaar")).toBeTruthy();
    expect(screen.getByText("Me")).toBeTruthy();
    expect(screen.getByLabelText("Me")).toBeTruthy();
  });
});

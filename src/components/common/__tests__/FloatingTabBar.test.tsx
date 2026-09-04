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

  describe("narrow screens", () => {
    // The defect: at 360dp the primary nav read "Categ…". Five tabs share
    // ~328dp there, so a tab is ~66dp; minus the pill's 20dp of horizontal
    // padding and the item's 4dp, the label had ~42dp for text needing ~56dp at
    // 10.5pt. Dari's "دسته‌بندی‌ها" truncated the same way. The fix trims the
    // pill's padding and the font ONLY below 380dp, so the 411dp reference
    // device is untouched.
    const widthOf = (title: string) => {
      const node = screen.getByText(title);
      const flat = [node.props.style].flat(3).filter(Boolean) as Record<string, unknown>[];
      return flat.reduce<number | undefined>(
        (acc, layer) => (typeof layer.fontSize === "number" ? layer.fontSize : acc),
        undefined,
      );
    };

    it("shrinks the label font below 380dp", () => {
      jest.spyOn(Dimensions, "get").mockReturnValue({
        width: 360, height: 640, scale: 2, fontScale: 1,
      });
      render(
        <FloatingTabBar
          {...makeProps([
            { name: "browse", title: "Bazaar", focused: true },
            { name: "categories", title: "Categories" },
          ])}
        />
      );
      expect(widthOf("Categories")).toBe(9.5);
    });

    it("leaves the 411dp reference device alone", () => {
      jest.spyOn(Dimensions, "get").mockReturnValue({
        width: 411, height: 914, scale: 2.625, fontScale: 1,
      });
      render(
        <FloatingTabBar
          {...makeProps([
            { name: "browse", title: "Bazaar", focused: true },
            { name: "categories", title: "Categories" },
          ])}
        />
      );
      expect(widthOf("Categories")).toBe(10.5);
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

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ListingCard } from "../ListingCard";
import type { Listing } from "@/api/listings";

// react-native-reanimated: override the setup.ts mock with a complete one that
// covers the Animated.View entering prop and useSharedValue/useAnimatedStyle
// used in ListingCard.  The jest preset mock doesn't handle react-native-worklets
// (ESM-only) unless it's explicitly mocked here at the component level.
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
    },
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => {
      try { fn(); } catch { /* noop */ }
      return {};
    },
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (..._args: unknown[]) => _args[0],
    withDelay: (_d: unknown, v: unknown) => v,
    runOnUI: (fn: () => void) => fn,
    runOnJS: (fn: () => void) => fn,
    interpolate: (_v: unknown, _i: unknown[], o: unknown[]) => o[0],
    Extrapolation: { CLAMP: "CLAMP" },
    cancelAnimation: jest.fn(),
    Easing: { linear: (v: unknown) => v, ease: (v: unknown) => v, bezier: () => (v: unknown) => v },
    createAnimatedComponent: (C: React.ComponentType) => C,
  };
});

// Lucide icons used by ListingCard — mock them all to null so they don't crash
jest.mock("lucide-react-native", () => ({
  Heart: "Heart",
  MapPin: "MapPin",
  Camera: "Camera",
  Eye: "Eye",
  BadgeCheck: "BadgeCheck",
}));

// @/lib/animation — mock so useListItemEntering + triggerHaptic are no-ops.
// useListItemEntering() returns a factory; the factory returns undefined to skip
// the entering animation in tests (no Reanimated worklet execution required).
jest.mock("@/lib/animation", () => ({
  // Deprecated variant — kept in mock for any legacy callers in the test tree
  getListItemEntering: () => undefined,
  // Reduce-motion aware hook variant — what ListingCard now uses
  useListItemEntering: () => () => undefined,
  // Returns false by default so animation code paths are exercised in tests
  useReduceMotion: () => false,
  triggerHaptic: jest.fn(),
  AnimatedPressable: require("react-native").Pressable,
  usePulse: () => ({}),
}));

// react-native-reanimated is mocked via setup.ts (require mock)
// expo-image, useColors, useLocalization, expo-router all mocked in setup.ts

// ── Fixture factory ───────────────────────────────────────────────────────────
// Mirrors the same factory used in ListingCard.stories.tsx
const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 42,
  title: "Lenovo ThinkPad X1 Carbon",
  description: "Used for 6 months. No scratches.",
  price: 85000,
  currency: "AFN",
  status: "active",
  categoryId: 1,
  location: "Kabul, Share Naw",
  address: null,
  latitude: null,
  longitude: null,
  thumbnailUrl: null,
  viewsCount: 10,
  isSaved: false,
  isViewed: false,
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2024-01-10T08:00:00Z",
  seller: {
    id: 99,
    name: "Ahmad Karimi",
    city: "Kabul",
    verified: true,
    avatarUrl: null,
  },
  category: {
    id: 1,
    nameEn: "Electronics",
    namePs: "برقی توکي",
    nameFa: "الکترونیک",
    slug: "electronics",
  },
  ...overrides,
});

// ── 1. Title + formatted price ────────────────────────────────────────────────

describe("ListingCard — title and price", () => {
  it("renders the listing title", () => {
    render(<ListingCard listing={makeListing()} />);
    expect(screen.getByText("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
  });

  it("renders the formatted price via PriceTag (AFN <amount>)", () => {
    render(<ListingCard listing={makeListing({ price: 85000, currency: "AFN" })} />);
    // useLocalization mock: formatCurrency(n, c) => `${c} ${n}`
    expect(screen.getByText("AFN 85000")).toBeTruthy();
  });

  it("renders USD price when currency is USD", () => {
    render(<ListingCard listing={makeListing({ price: 200, currency: "USD" })} />);
    expect(screen.getByText("USD 200")).toBeTruthy();
  });

  it("renders zero price as free item", () => {
    render(<ListingCard listing={makeListing({ price: 0, currency: "AFN" })} />);
    expect(screen.getByText("AFN 0")).toBeTruthy();
  });
});

// ── 2. Location meta ──────────────────────────────────────────────────────────

describe("ListingCard — meta row (location + date)", () => {
  it("renders the listing location city", () => {
    render(<ListingCard listing={makeListing({ location: "Kabul, Share Naw" })} />);
    expect(screen.getByText("Kabul, Share Naw")).toBeTruthy();
  });

  it("does not render the posted date on the card (date removed to keep cards clean)", () => {
    render(<ListingCard listing={makeListing({ createdAt: "2024-01-10T08:00:00Z" })} />);
    // Design: date removed from card meta row — location only, no date.
    expect(screen.queryByText("2024-01-10T08:00:00Z")).toBeNull();
  });

  it("does not render location row when location is null", () => {
    render(<ListingCard listing={makeListing({ location: null })} />);
    expect(screen.queryByText("Kabul, Share Naw")).toBeNull();
  });
});

// ── 3. StatusBadge reflects listing status ───────────────────────────────────

describe("ListingCard — StatusBadge with showStatus=true", () => {
  // t() returns the key; StatusBadge renders "listing.status.<status>"
  it.each(["active", "draft", "reserved", "sold"] as const)(
    "renders StatusBadge for %s status",
    (status) => {
      render(<ListingCard listing={makeListing({ status })} showStatus />);
      expect(screen.getByText(`listing.status.${status}`)).toBeTruthy();
    }
  );

  it("does NOT render StatusBadge when showStatus is false (default)", () => {
    render(<ListingCard listing={makeListing({ status: "active" })} />);
    expect(screen.queryByText("listing.status.active")).toBeNull();
  });
});

// ── 4. Save heart toggle ──────────────────────────────────────────────────────

describe("ListingCard — save heart toggle", () => {
  it("fires onSaveToggle with (id, true) when listing is currently unsaved", () => {
    const onSaveToggle = jest.fn();
    render(
      <ListingCard
        listing={makeListing({ id: 42 })}
        isSaved={false}
        onSaveToggle={onSaveToggle}
      />
    );

    fireEvent.press(screen.getByRole("togglebutton"));
    expect(onSaveToggle).toHaveBeenCalledTimes(1);
    expect(onSaveToggle).toHaveBeenCalledWith(42, true);
  });

  it("fires onSaveToggle with (id, false) when listing is currently saved", () => {
    const onSaveToggle = jest.fn();
    render(
      <ListingCard
        listing={makeListing({ id: 42 })}
        isSaved={true}
        onSaveToggle={onSaveToggle}
      />
    );

    fireEvent.press(screen.getByRole("togglebutton"));
    expect(onSaveToggle).toHaveBeenCalledTimes(1);
    expect(onSaveToggle).toHaveBeenCalledWith(42, false);
  });

  it("reflects saved state: accessibilityState.checked=true when isSaved=true", () => {
    render(
      <ListingCard
        listing={makeListing()}
        isSaved={true}
        onSaveToggle={jest.fn()}
      />
    );
    const heartBtn = screen.getByRole("togglebutton");
    expect(heartBtn.props.accessibilityState?.checked).toBe(true);
  });

  it("reflects unsaved state: accessibilityState.checked=false when isSaved=false", () => {
    render(
      <ListingCard
        listing={makeListing()}
        isSaved={false}
        onSaveToggle={jest.fn()}
      />
    );
    const heartBtn = screen.getByRole("togglebutton");
    expect(heartBtn.props.accessibilityState?.checked).toBe(false);
  });

  it("shows save accessibilityLabel when isSaved is false", () => {
    render(
      <ListingCard
        listing={makeListing()}
        isSaved={false}
        onSaveToggle={jest.fn()}
      />
    );
    // t('listing.save') returns 'listing.save' in tests
    const heartBtn = screen.getByRole("togglebutton");
    expect(heartBtn.props.accessibilityLabel).toBe("listing.save");
  });

  it("shows unsave accessibilityLabel when isSaved is true", () => {
    render(
      <ListingCard
        listing={makeListing()}
        isSaved={true}
        onSaveToggle={jest.fn()}
      />
    );
    const heartBtn = screen.getByRole("togglebutton");
    expect(heartBtn.props.accessibilityLabel).toBe("listing.unsave");
  });

  it("does NOT render the heart button when isSaved is undefined", () => {
    render(<ListingCard listing={makeListing()} onSaveToggle={jest.fn()} />);
    expect(screen.queryByRole("togglebutton")).toBeNull();
  });

  it("does NOT render the heart button when onSaveToggle is undefined", () => {
    render(<ListingCard listing={makeListing()} isSaved={false} />);
    expect(screen.queryByRole("togglebutton")).toBeNull();
  });
});

// ── 5. Card press navigates to detail route ───────────────────────────────────

describe("ListingCard — card press navigation", () => {
  it("calls router.push with the correct listing id when card is pressed", () => {
    // The setup.ts mock returns a shared router mock; we need to capture it.
    // Re-mock inline to get a controllable reference.
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingCard listing={makeListing({ id: 42 })} />);
    fireEvent.press(screen.getByRole("button", { name: "Lenovo ThinkPad X1 Carbon" }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/listing/[id]",
      params: { id: "42" },
    });
  });

  it("calls custom onPress instead of router.push when onPress prop is provided", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    const customOnPress = jest.fn();
    render(
      <ListingCard listing={makeListing({ id: 99 })} onPress={customOnPress} />
    );
    fireEvent.press(screen.getByRole("button", { name: "Lenovo ThinkPad X1 Carbon" }));

    expect(customOnPress).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ── 6. is_viewed seen state ───────────────────────────────────────────────────

describe("ListingCard — is_viewed seen state (B6)", () => {
  it("renders the 'Seen' badge when isViewed is true", () => {
    render(<ListingCard listing={makeListing({ isViewed: true })} />);
    // t('listing.seen') returns 'listing.seen' in tests
    expect(screen.getByText("listing.seen")).toBeTruthy();
  });

  it("does NOT render the 'Seen' badge when isViewed is false", () => {
    render(<ListingCard listing={makeListing({ isViewed: false })} />);
    expect(screen.queryByText("listing.seen")).toBeNull();
  });

  it("does NOT render the 'Seen' badge when isViewed is undefined", () => {
    const listing = makeListing();
    // Remove isViewed entirely
    const { isViewed: _removed, ...listingWithoutIsViewed } = listing;
    render(<ListingCard listing={listingWithoutIsViewed as Listing} />);
    expect(screen.queryByText("listing.seen")).toBeNull();
  });
});

// ── 7. No-photo fallback ──────────────────────────────────────────────────────

describe("ListingCard — no-photo fallback", () => {
  it("renders the no-photo label when thumbnailUrl is null", () => {
    render(<ListingCard listing={makeListing({ thumbnailUrl: null })} />);
    // t('listing.noPhoto') returns 'listing.noPhoto' in tests
    expect(screen.getByText("listing.noPhoto")).toBeTruthy();
  });

  it("does NOT render the no-photo label when thumbnailUrl is set", () => {
    render(
      <ListingCard
        listing={makeListing({ thumbnailUrl: "https://example.com/photo.jpg" })}
      />
    );
    expect(screen.queryByText("listing.noPhoto")).toBeNull();
  });
});

// ── 8. Renders without crashing for all status values ────────────────────────

describe("ListingCard — smoke tests", () => {
  it.each(["active", "draft", "reserved", "sold"] as const)(
    "renders without throwing for status=%s",
    (status) => {
      expect(() =>
        render(<ListingCard listing={makeListing({ status })} />)
      ).not.toThrow();
    }
  );

  it("renders with all optional props provided without throwing", () => {
    expect(() =>
      render(
        <ListingCard
          listing={makeListing({ isViewed: true, thumbnailUrl: "https://example.com/p.jpg" })}
          index={0}
          showStatus
          isSaved={true}
          onSaveToggle={jest.fn()}
          onPress={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});

// ── 9. List variant (variant="list") ─────────────────────────────────────────

describe("ListingCard — list variant", () => {
  it("renders the listing title in list mode", () => {
    render(<ListingCard listing={makeListing()} variant="list" />);
    expect(screen.getByText("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
  });

  it("renders the formatted price in list mode", () => {
    render(
      <ListingCard listing={makeListing({ price: 50000, currency: "AFN" })} variant="list" />
    );
    expect(screen.getByText("AFN 50000")).toBeTruthy();
  });

  it("renders location in list mode", () => {
    render(<ListingCard listing={makeListing({ location: "Kabul, Share Naw" })} variant="list" />);
    expect(screen.getByText("Kabul, Share Naw")).toBeTruthy();
  });

  it("renders save heart toggle in list mode when isSaved is provided", () => {
    const onSaveToggle = jest.fn();
    render(
      <ListingCard
        listing={makeListing({ id: 10 })}
        variant="list"
        isSaved={false}
        onSaveToggle={onSaveToggle}
      />
    );
    fireEvent.press(screen.getByRole("togglebutton"));
    expect(onSaveToggle).toHaveBeenCalledWith(10, true);
  });

  it("does NOT render heart when isSaved is undefined in list mode", () => {
    render(<ListingCard listing={makeListing()} variant="list" />);
    expect(screen.queryByRole("togglebutton")).toBeNull();
  });

  it("renders StatusBadge in list mode when showStatus=true", () => {
    render(
      <ListingCard listing={makeListing({ status: "active" })} variant="list" showStatus />
    );
    expect(screen.getByText("listing.status.active")).toBeTruthy();
  });

  it("renders seen badge in list mode when isViewed=true", () => {
    render(
      <ListingCard listing={makeListing({ isViewed: true })} variant="list" />
    );
    expect(screen.getByText("listing.seen")).toBeTruthy();
  });

  it("calls custom onPress when card is pressed in list mode", () => {
    const customOnPress = jest.fn();
    render(
      <ListingCard
        listing={makeListing()}
        variant="list"
        onPress={customOnPress}
      />
    );
    fireEvent.press(screen.getByRole("button", { name: "Lenovo ThinkPad X1 Carbon" }));
    expect(customOnPress).toHaveBeenCalledTimes(1);
  });

  it("defaults to grid variant when variant prop is omitted", () => {
    // Smoke test — grid mode renders no horizontal row-specific a11y change;
    // just confirm no crash and title present
    render(<ListingCard listing={makeListing()} />);
    expect(screen.getByText("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
  });
});

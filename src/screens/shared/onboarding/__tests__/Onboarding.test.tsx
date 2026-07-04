/**
 * Onboarding screen — unit / gate tests (TASK-W924).
 *
 * Covers:
 *  - Renders all 3 slides' titles (welcome, modes, meetups) via the carousel.
 *  - Renders the language switcher and a Skip control.
 *  - Tapping Skip marks onboarding as seen and replaces the route with Browse.
 *  - Tapping "Next" advances the carousel without marking onboarding seen.
 *  - On the last slide the primary button reads "Get started" and, when
 *    pressed, marks onboarding as seen and replaces the route with Browse.
 *
 * The real react-native-reanimated-carousel component swipes via native
 * gestures, which don't exist in the Jest/JSDOM-less RN test renderer — so it
 * is replaced with a minimal test double that renders every slide via
 * `renderItem` and exposes `next()` / `scrollTo()` through the imperative ref,
 * exactly like BlockedUsers.test.tsx replaces UniversalList.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

// NOTE: every jest.mock() factory below builds its elements with
// React.createElement rather than JSX. Mixing a JSX-returning function
// *inside* a jest.mock() factory with JSX used elsewhere in this same test
// file trips a babel-plugin-jest-hoist / nativewind-jsx-runtime interaction
// (a hard parse-time crash: "Property declarations[0] of VariableDeclaration
// expected node to be of a type [VariableDeclarator]"). createElement sidesteps
// it entirely — verified by isolating the repro to jest.mock() factories only.
jest.mock("@/components/common/LanguageSwitcher", () => {
  const RN_React = require("react");
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: function LanguageSwitcherMock() {
      return RN_React.createElement(
        View,
        { testID: "language-switcher" },
        RN_React.createElement(Text, null, "Language")
      );
    },
  };
});

const mockMarkOnboardingSeen = jest.fn().mockResolvedValue(undefined);
jest.mock("@/utils/onboarding", () => ({
  markOnboardingSeen: (...args: unknown[]) => mockMarkOnboardingSeen(...args),
}));

// @/lib/animation — same convention as ListingCard.test.tsx / SavedSearches.test.tsx:
// useReduceMotion() normally resolves AccessibilityInfo.isReduceMotionEnabled()
// asynchronously, which updates state after RNTL's render() has already returned
// and trips a "not wrapped in act(...)" console.error. Mocking it to a
// synchronous `false` keeps the animation code path exercised without the
// unmocked async state update.
jest.mock("@/lib/animation", () => ({
  useReduceMotion: () => false,
}));

// Minimal Carousel test double — renders every item via renderItem (no swipe
// gesture simulation), and exposes next()/scrollTo() on the ref so the
// primary button + dots can be exercised without native gesture handling.
jest.mock("react-native-reanimated-carousel", () => {
  const RN_React = require("react");
  const { View } = require("react-native");

  function CarouselMock(props: any) {
    const [index, setIndex] = RN_React.useState(0);

    RN_React.useImperativeHandle(props.ref, () => ({
      next: () => {
        const nextIndex = Math.min(index + 1, props.data.length - 1);
        setIndex(nextIndex);
        props.onSnapToItem?.(nextIndex);
      },
      scrollTo: (arg: { index: number }) => {
        setIndex(arg.index);
        props.onSnapToItem?.(arg.index);
      },
    }));

    return RN_React.createElement(
      View,
      { testID: "onboarding-carousel-mock" },
      props.renderItem({ item: props.data[index], index })
    );
  }

  const Pagination = { Basic: function PaginationBasicMock() { return null; } };

  return { __esModule: true, default: CarouselMock, Pagination };
});

import OnboardingScreen from "@/screens/shared/Onboarding";

describe("OnboardingScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockMarkOnboardingSeen.mockClear();
  });

  it("renders the first slide (welcome), the language switcher, and Skip", () => {
    render(<OnboardingScreen />);
    expect(screen.getByText("onboarding.slides.welcome.title")).toBeTruthy();
    expect(screen.getByTestId("language-switcher")).toBeTruthy();
    expect(screen.getByText("onboarding.skip")).toBeTruthy();
    // First slide → primary button says "Next", not "Get started"
    expect(screen.getByText("onboarding.next")).toBeTruthy();
  });

  it("advances through all 3 slides via the Next button without marking onboarding seen", () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByText("onboarding.next"));
    expect(screen.getByText("onboarding.slides.modes.title")).toBeTruthy();
    expect(mockMarkOnboardingSeen).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("onboarding.next"));
    expect(screen.getByText("onboarding.slides.meetups.title")).toBeTruthy();
    // Last slide → primary button now reads "Get started"
    expect(screen.getByText("onboarding.getStarted")).toBeTruthy();
    expect(mockMarkOnboardingSeen).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("tapping Get started on the last slide marks onboarding seen and replaces with Browse", async () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByText("onboarding.next"));
    fireEvent.press(screen.getByText("onboarding.next"));
    fireEvent.press(screen.getByText("onboarding.getStarted"));

    await screen.findByText("onboarding.slides.meetups.title");
    expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(main)/(tabs)/browse");
  });

  it("tapping Skip marks onboarding seen and replaces with Browse from any slide", async () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByText("onboarding.skip"));

    expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1);
    // finishOnboarding awaits markOnboardingSeen() before calling router.replace,
    // so the navigation call lands on a later microtask — wait for it rather than
    // asserting synchronously (this was flaky/failing before the fix).
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(main)/(tabs)/browse");
    });
  });
});

/**
 * Unit tests for the toast polish wrapper (TASK-P401 — micro-interactions).
 *
 * Verifies:
 *  - every variant pairs with the correct haptic (success/error/light)
 *  - the underlying sonner-native call keeps the caller's exact arity (no
 *    extra `undefined` options argument when the caller didn't pass one —
 *    several existing screens' tests assert a single-argument call, e.g.
 *    `expect(toast.error).toHaveBeenCalledWith("chat.archive.error")`)
 *  - the haptic is clamped to "light" strength (via the `reduceMotion` flag
 *    forwarded to `triggerHaptic`) once the system Reduce Motion setting is
 *    read, and live-updates when the setting changes while the app is open
 *  - loading/custom/promise/dismiss/wiggle pass straight through untouched
 *
 * The module reads/subscribes to `AccessibilityInfo` exactly once, at import
 * time (it isn't a React hook, so there's no per-render re-subscription) —
 * so this file imports it once at the top rather than re-requiring it per
 * test, and captures the `reduceMotionChanged` handler the module
 * registered so tests can flip the live setting deterministically.
 */
import { AccessibilityInfo } from "react-native";

type MockToast = jest.Mock & Record<string, jest.Mock>;

const mockSonnerToast = jest.fn() as MockToast;
mockSonnerToast.success = jest.fn();
mockSonnerToast.error = jest.fn();
mockSonnerToast.warning = jest.fn();
mockSonnerToast.info = jest.fn();
mockSonnerToast.loading = jest.fn();
mockSonnerToast.custom = jest.fn();
mockSonnerToast.promise = jest.fn();
mockSonnerToast.dismiss = jest.fn();
mockSonnerToast.wiggle = jest.fn();

jest.mock("sonner-native", () => ({ toast: mockSonnerToast }));

const mockTriggerHaptic = jest.fn();
jest.mock("@/lib/animation/haptics", () => ({ triggerHaptic: mockTriggerHaptic }));

const mockIsReduceMotionEnabled = AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
const mockAddEventListener = AccessibilityInfo.addEventListener as jest.Mock;
mockIsReduceMotionEnabled.mockResolvedValue(false);
mockAddEventListener.mockReturnValue({ remove: jest.fn() });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toast } = require("../toast");

// Captured immediately after import, before any test clears mock call logs.
const reduceMotionChangedHandler: (enabled: boolean) => void =
  mockAddEventListener.mock.calls[0][1];

describe("toast (src/lib/toast)", () => {
  beforeEach(() => {
    mockTriggerHaptic.mockClear();
    mockSonnerToast.mockClear();
    mockSonnerToast.success.mockClear();
    mockSonnerToast.error.mockClear();
    mockSonnerToast.warning.mockClear();
    mockSonnerToast.info.mockClear();
    // Always leave Reduce Motion off at the start of each test.
    reduceMotionChangedHandler(false);
  });

  it("subscribes to reduceMotionChanged on load", () => {
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "reduceMotionChanged",
      expect.any(Function)
    );
  });

  it("pairs toast.success with a success haptic and a single-argument call", () => {
    toast.success("listing.publish.success");

    expect(mockTriggerHaptic).toHaveBeenCalledWith("success", false);
    expect(mockSonnerToast.success).toHaveBeenCalledWith("listing.publish.success");
    expect(mockSonnerToast.success.mock.calls[0]).toHaveLength(1);
  });

  it("pairs toast.error with an error haptic and forwards options when given", () => {
    const options = { duration: 5000 };
    toast.error("chat.archive.error", options);

    expect(mockTriggerHaptic).toHaveBeenCalledWith("error", false);
    expect(mockSonnerToast.error).toHaveBeenCalledWith("chat.archive.error", options);
  });

  it("pairs toast.warning and toast.info with a light haptic", () => {
    toast.warning("common.warning");
    toast.info("common.info");

    expect(mockTriggerHaptic).toHaveBeenNthCalledWith(1, "light", false);
    expect(mockTriggerHaptic).toHaveBeenNthCalledWith(2, "light", false);
    expect(mockSonnerToast.warning).toHaveBeenCalledWith("common.warning");
    expect(mockSonnerToast.info).toHaveBeenCalledWith("common.info");
  });

  it("pairs the bare toast(...) call with a light haptic and forwards its action option", () => {
    const onClick = jest.fn();
    toast("listing.hiddenUndo", { action: { label: "common.undo", onClick } });

    expect(mockTriggerHaptic).toHaveBeenCalledWith("light", false);
    expect(mockSonnerToast).toHaveBeenCalledWith("listing.hiddenUndo", {
      action: { label: "common.undo", onClick },
    });
  });

  it("clamps the haptic strength while the system Reduce Motion setting is on, and un-clamps when it turns off", () => {
    reduceMotionChangedHandler(true);
    toast.error("common.error");
    expect(mockTriggerHaptic).toHaveBeenLastCalledWith("error", true);

    reduceMotionChangedHandler(false);
    toast.success("common.success");
    expect(mockTriggerHaptic).toHaveBeenLastCalledWith("success", false);
  });

  it("passes loading/custom/promise/dismiss/wiggle straight through, untouched", () => {
    expect(toast.loading).toBe(mockSonnerToast.loading);
    expect(toast.custom).toBe(mockSonnerToast.custom);
    expect(toast.promise).toBe(mockSonnerToast.promise);
    expect(toast.dismiss).toBe(mockSonnerToast.dismiss);
    expect(toast.wiggle).toBe(mockSonnerToast.wiggle);
  });
});

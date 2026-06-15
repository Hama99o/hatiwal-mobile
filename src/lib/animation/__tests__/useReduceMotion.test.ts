/**
 * Unit tests for useReduceMotion hook.
 *
 * The jest-expo preset already provides a jest.fn() mock for:
 *   AccessibilityInfo.isReduceMotionEnabled  → resolves false by default
 *   AccessibilityInfo.addEventListener       → returns { remove: jest.fn() }
 *
 * These tests verify the hook reads the initial value correctly and reacts to
 * real-time changes delivered through the event listener.
 */

import { renderHook, act } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReduceMotion } from "../useReduceMotion";

const mockIsReduceMotionEnabled =
  AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
const mockAddEventListener = AccessibilityInfo.addEventListener as jest.Mock;

describe("useReduceMotion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: reduce motion is off.
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    mockAddEventListener.mockReturnValue({ remove: jest.fn() });
  });

  it("returns false by default when reduce motion is disabled", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    const { result } = renderHook(() => useReduceMotion());

    // Initial synchronous state is false.
    expect(result.current).toBe(false);

    // After the promise resolves it stays false.
    await act(async () => {});
    expect(result.current).toBe(false);
  });

  it("returns true when the system reports reduce motion is enabled", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useReduceMotion());

    // Wait for the async isReduceMotionEnabled() to settle.
    await act(async () => {});
    expect(result.current).toBe(true);
  });

  it("subscribes to reduceMotionChanged events on mount", () => {
    renderHook(() => useReduceMotion());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "reduceMotionChanged",
      expect.any(Function)
    );
  });

  it("updates state when the reduceMotionChanged event fires with true", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    let capturedListener: ((enabled: boolean) => void) | null = null;
    mockAddEventListener.mockImplementation((_event: string, listener: (enabled: boolean) => void) => {
      capturedListener = listener;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useReduceMotion());

    // Settle the initial async read.
    await act(async () => {});
    expect(result.current).toBe(false);

    // Simulate the user enabling Reduce Motion while the app is running.
    act(() => {
      capturedListener?.(true);
    });
    expect(result.current).toBe(true);
  });

  it("updates state when the reduceMotionChanged event fires with false", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    let capturedListener: ((enabled: boolean) => void) | null = null;
    mockAddEventListener.mockImplementation((_event: string, listener: (enabled: boolean) => void) => {
      capturedListener = listener;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useReduceMotion());
    await act(async () => {});
    expect(result.current).toBe(true);

    // Simulate the user disabling Reduce Motion while the app is running.
    act(() => {
      capturedListener?.(false);
    });
    expect(result.current).toBe(false);
  });

  it("removes the event listener on unmount", () => {
    const removeMock = jest.fn();
    mockAddEventListener.mockReturnValue({ remove: removeMock });

    const { unmount } = renderHook(() => useReduceMotion());
    unmount();

    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});

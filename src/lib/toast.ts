/**
 * Toast polish (TASK-P401 — micro-interactions).
 *
 * A thin, drop-in-compatible wrapper around `sonner-native`'s `toast`. Every
 * screen already calls `toast.success(...)` / `toast.error(...)` / the bare
 * `toast(...)` (see docs/DESIGN_SYSTEM.md §4 — sonner-native is the ONE
 * sanctioned toast library); this module is the single place that pairs each
 * shown toast with a haptic pulse, matching the tactile feedback already
 * used everywhere else in the app (`src/lib/animation/haptics.ts` — Button,
 * AnimatedPressable, ListingCard's save-heart, etc.). Nothing about the
 * public call shape changes, so every existing call site only needs its
 * import path swapped from `"sonner-native"` to `"@/lib/toast"` — no
 * call-site logic changes.
 *
 * Haptic strength is clamped the same way every other `triggerHaptic` call
 * in the app is clamped: when the system "Reduce Motion" accessibility
 * setting is on, only the lightest impact fires regardless of variant. This
 * module isn't a component (it has no React tree to call `useReduceMotion()`
 * from), so it keeps its own small live-updated cache of the setting via the
 * same `AccessibilityInfo` API the hook uses internally.
 */
import { AccessibilityInfo } from "react-native";
import { toast as sonnerToast } from "sonner-native";
import { triggerHaptic } from "@/lib/animation/haptics";

type ToastOptions = Parameters<typeof sonnerToast.success>[1];

let reduceMotionEnabled = false;

AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  reduceMotionEnabled = enabled;
});
AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled: boolean) => {
  reduceMotionEnabled = enabled;
});

function fire(
  variant: "success" | "error" | "light",
  fn: (message: string, options?: ToastOptions) => string | number,
  message: string,
  options?: ToastOptions
): string | number {
  triggerHaptic(variant, reduceMotionEnabled);
  // Only forward `options` when the caller actually passed it, so the
  // underlying sonner-native call keeps the exact same arity the caller
  // used (some call sites — and their tests — assert a single-argument
  // call, e.g. `toast.error("chat.archive.error")`).
  return options !== undefined ? fn(message, options) : fn(message);
}

type ToastFn = ((message: string, options?: ToastOptions) => string | number) & {
  success: (message: string, options?: ToastOptions) => string | number;
  error: (message: string, options?: ToastOptions) => string | number;
  warning: (message: string, options?: ToastOptions) => string | number;
  info: (message: string, options?: ToastOptions) => string | number;
  loading: typeof sonnerToast.loading;
  custom: typeof sonnerToast.custom;
  promise: typeof sonnerToast.promise;
  dismiss: typeof sonnerToast.dismiss;
  wiggle: typeof sonnerToast.wiggle;
};

const wrapped = ((message: string, options?: ToastOptions) =>
  fire("light", sonnerToast, message, options)) as ToastFn;

wrapped.success = (message, options) => fire("success", sonnerToast.success, message, options);
wrapped.error = (message, options) => fire("error", sonnerToast.error, message, options);
wrapped.warning = (message, options) => fire("light", sonnerToast.warning, message, options);
wrapped.info = (message, options) => fire("light", sonnerToast.info, message, options);
// Not yet used anywhere in the app; passed through untouched so this module
// stays a complete, type-compatible replacement for the real `toast` export.
wrapped.loading = sonnerToast.loading;
wrapped.custom = sonnerToast.custom;
wrapped.promise = sonnerToast.promise;
wrapped.dismiss = sonnerToast.dismiss;
wrapped.wiggle = sonnerToast.wiggle;

export const toast = wrapped;

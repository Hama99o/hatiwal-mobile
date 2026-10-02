import * as Haptics from "expo-haptics";
import { triggerHaptic, type HapticType } from "../haptics";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

// What every Android build does: app.json blocks android.permission.VIBRATE.
const denied = () =>
  Promise.reject(new Error("vibrate: Neither user nor current process has android.permission.VIBRATE."));

describe("triggerHaptic", () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    unhandled.length = 0;
    process.on("unhandledRejection", onUnhandled);
    (Haptics.impactAsync as jest.Mock).mockImplementation(denied);
    (Haptics.notificationAsync as jest.Mock).mockImplementation(denied);
    (Haptics.selectionAsync as jest.Mock).mockImplementation(denied);
  });
  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
  });

  const types: HapticType[] = ["light", "medium", "heavy", "success", "error", "selection"];

  it.each(types)("a rejected %s haptic is swallowed, not an unhandled rejection", async (type) => {
    expect(() => triggerHaptic(type)).not.toThrow();
    // Let the rejection settle and Node report it if nothing caught it.
    await new Promise((r) => setImmediate(r));
    expect(unhandled).toEqual([]);
  });

  it("reduce motion fires only the light impact, and swallows its rejection too", async () => {
    triggerHaptic("heavy", true);
    await new Promise((r) => setImmediate(r));
    expect(Haptics.impactAsync).toHaveBeenLastCalledWith("light");
    expect(unhandled).toEqual([]);
  });
});

/**
 * onboarding flag utility — unit tests.
 *
 * Covers:
 *  - hasSeenOnboarding() returns false when the flag was never set.
 *  - markOnboardingSeen() persists "true" under the documented storage key.
 *  - hasSeenOnboarding() returns true after markOnboardingSeen() runs.
 *  - hasSeenOnboarding() fails safe (returns true) if AsyncStorage throws.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_SEEN_KEY, hasSeenOnboarding, markOnboardingSeen } from "@/utils/onboarding";

describe("onboarding flag", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns false before onboarding has ever been seen", async () => {
    expect(await hasSeenOnboarding()).toBe(false);
  });

  it("persists the flag under the documented storage key", async () => {
    await markOnboardingSeen();
    expect(await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)).toBe("true");
  });

  it("returns true after markOnboardingSeen() has run", async () => {
    await markOnboardingSeen();
    expect(await hasSeenOnboarding()).toBe(true);
  });

  it("fails safe (treats onboarding as seen) if storage read throws", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("storage down"));
    expect(await hasSeenOnboarding()).toBe(true);
  });

  it("does not throw if storage write fails", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("storage down"));
    await expect(markOnboardingSeen()).resolves.toBeUndefined();
  });
});

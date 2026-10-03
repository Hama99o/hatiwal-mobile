/**
 * useShareProfile — the one "share a profile" implementation, used by someone
 * else's profile (⋯ menu) and by "Share my profile" on your own Profile tab.
 * The owner's complaint was a share WhatsApp could not open, so the url in the
 * text is what these tests pin.
 */
import { Platform, Share } from "react-native";
import { renderHook } from "@testing-library/react-native";

const mockToastError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a) } }));
jest.mock("expo-linking", () => ({ createURL: (path: string) => `hatiwal://${path}` }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key}|${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("|")}` : key,
  }),
}));

import { useShareProfile } from "@/screens/shared/user-profile/useShareProfile";

const shareSpy = jest.spyOn(Share, "share");

beforeEach(() => {
  shareSpy.mockReset();
  mockToastError.mockReset();
  Platform.OS = "android";
});

function share() {
  return renderHook(() => useShareProfile(42)).result.current;
}

it("shares the server's https profile link, with the name, on Android", async () => {
  shareSpy.mockResolvedValue({ action: Share.sharedAction });
  await share()({ name: "Umair Safi", shareUrl: "https://hatiwal.com/u/42" });

  expect(shareSpy).toHaveBeenCalledTimes(1);
  const arg = shareSpy.mock.calls[0][0] as { message: string; url?: string };
  expect(arg.message).toContain("name=Umair Safi");
  expect(arg.message).toContain("url=https://hatiwal.com/u/42");
  expect(arg.message).not.toContain("hatiwal://");
  expect(arg.url).toBe("https://hatiwal.com/u/42");
});

it("on iOS puts the link only in the message (a separate url duplicates it)", async () => {
  Platform.OS = "ios";
  shareSpy.mockResolvedValue({ action: Share.sharedAction });
  await share()({ name: "Umair Safi", shareUrl: "https://hatiwal.com/u/42" });

  const arg = shareSpy.mock.calls[0][0] as { message: string; url?: string };
  expect(arg.message).toContain("url=https://hatiwal.com/u/42");
  expect(arg.url).toBeUndefined();
});

it("falls back to the hatiwal:// deep link only when the server sent no share url", async () => {
  shareSpy.mockResolvedValue({ action: Share.sharedAction });
  await share()({ name: "Umair Safi", shareUrl: null });

  const arg = shareSpy.mock.calls[0][0] as { message: string };
  expect(arg.message).toContain("url=hatiwal://seller/42");
});

it("a dismissed sheet is not an error", async () => {
  shareSpy.mockResolvedValue({ action: Share.dismissedAction });
  await share()({ name: "Umair Safi", shareUrl: "https://hatiwal.com/u/42" });
  expect(mockToastError).not.toHaveBeenCalled();
});

it("a real failure is SHOWN, never swallowed", async () => {
  shareSpy.mockRejectedValue(new Error("presentation failed"));
  await share()({ name: "Umair Safi", shareUrl: "https://hatiwal.com/u/42" });
  expect(mockToastError).toHaveBeenCalledTimes(1);
});

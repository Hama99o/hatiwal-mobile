/**
 * Unit tests for the centralized denied-permission helper (Q3 audit).
 *
 * Verifies: copy resolves per kind, always routes through confirmAlert
 * (never raw Alert.alert), and always offers an "Open Settings" action
 * wired to Linking.openSettings().
 */

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("react-native", () => ({
  Linking: { openSettings: jest.fn() },
}));

import { Linking } from "react-native";
import { confirmAlert } from "@/utils/alert";
import { showPermissionDeniedAlert, showLimitedPhotoAccessAlert } from "../permissions";

const confirmAlertMock = confirmAlert as jest.Mock;
const openSettingsMock = Linking.openSettings as jest.Mock;

// Minimal stand-in for i18next's TFunction — returns the key so assertions
// can check exactly which key each call site resolves.
const t = ((key: string) => key) as any;

describe("showPermissionDeniedAlert", () => {
  beforeEach(() => {
    confirmAlertMock.mockClear();
    openSettingsMock.mockClear();
  });

  it.each([
    ["photos", "permissions.photosDenied"],
    ["camera", "permissions.cameraDenied"],
    ["location", "permissions.locationDenied"],
  ] as const)("resolves the correct message key for %s", (kind, expectedKey) => {
    showPermissionDeniedAlert(kind, t);

    expect(confirmAlertMock).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = confirmAlertMock.mock.calls[0];
    expect(title).toBe("permissions.permissionNeededTitle");
    expect(message).toBe(expectedKey);
    expect(buttons).toHaveLength(2);
  });

  it("always includes a cancel button and an Open Settings button", () => {
    showPermissionDeniedAlert("photos", t);
    const [, , buttons] = confirmAlertMock.mock.calls[0];

    expect(buttons[0]).toMatchObject({ text: "common.cancel", style: "cancel" });
    expect(buttons[1]).toMatchObject({ text: "permissions.openSettings" });
  });

  it("wires the Open Settings button to Linking.openSettings()", () => {
    showPermissionDeniedAlert("camera", t);
    const [, , buttons] = confirmAlertMock.mock.calls[0];

    expect(openSettingsMock).not.toHaveBeenCalled();
    buttons[1].onPress();
    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });

  it("never calls Alert.alert directly — only confirmAlert", () => {
    showPermissionDeniedAlert("location", t);
    // If this module ever regresses to importing react-native's Alert
    // directly, confirmAlert (our mock) would not be the sole call target.
    expect(confirmAlertMock).toHaveBeenCalledTimes(1);
  });
});

describe("showLimitedPhotoAccessAlert", () => {
  beforeEach(() => {
    confirmAlertMock.mockClear();
    openSettingsMock.mockClear();
  });

  it("shows the limited-access notice via confirmAlert with an Open Settings action", () => {
    showLimitedPhotoAccessAlert(t);

    expect(confirmAlertMock).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = confirmAlertMock.mock.calls[0];
    expect(title).toBe("permissions.permissionNeededTitle");
    expect(message).toBe("permissions.photosLimited");
    expect(buttons[1].text).toBe("permissions.openSettings");

    buttons[1].onPress();
    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });
});

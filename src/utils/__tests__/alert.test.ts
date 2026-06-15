/**
 * Unit tests for the confirmAlert utility.
 *
 * confirmAlert delegates to React Native's Alert.alert on iOS and Android.
 */

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

import { Alert } from "react-native";
import { confirmAlert } from "../alert";

const alertAlertMock = Alert.alert as jest.Mock;

describe("confirmAlert", () => {
  beforeEach(() => {
    alertAlertMock.mockClear();
  });

  it("delegates to Alert.alert with title, message and buttons", () => {
    const onPress = jest.fn();
    const buttons = [
      { text: "Cancel", style: "cancel" as const },
      { text: "Delete", style: "destructive" as const, onPress },
    ];

    confirmAlert("Delete listing?", "This cannot be undone.", buttons);

    expect(alertAlertMock).toHaveBeenCalledTimes(1);
    expect(alertAlertMock).toHaveBeenCalledWith(
      "Delete listing?",
      "This cannot be undone.",
      buttons
    );
  });

  it("works with title only (no message, no buttons)", () => {
    confirmAlert("Something went wrong");
    expect(alertAlertMock).toHaveBeenCalledWith(
      "Something went wrong",
      undefined,
      undefined
    );
  });

  it("calls Alert.alert once per invocation", () => {
    confirmAlert("Info");
    confirmAlert("Info 2");
    expect(alertAlertMock).toHaveBeenCalledTimes(2);
  });
});

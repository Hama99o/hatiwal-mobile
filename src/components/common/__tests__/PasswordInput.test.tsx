/**
 * PasswordInput — the shared password field.
 *
 * These lock in the three things the bare `<Input secureTextEntry />` fields in
 * Login and Register were missing, each of which made signing in harder than it
 * needed to be:
 *   1. no way to reveal a mistyped password
 *   2. no autoComplete/textContentType, so no OS autofill ever offered
 *   3. no keyboard submit/next behaviour
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { PasswordInput } from "../PasswordInput";

const PLACEHOLDER = "Password";

function renderField(props: Partial<React.ComponentProps<typeof PasswordInput>> = {}) {
  return render(
    <PasswordInput placeholder={PLACEHOLDER} value="" onChangeText={() => {}} {...props} />
  );
}

/** The toggle is the only button in the tree. */
function toggle() {
  return screen.getByRole("button");
}

describe("PasswordInput", () => {
  it("masks the password by default", () => {
    renderField();

    expect(screen.getByPlaceholderText(PLACEHOLDER).props.secureTextEntry).toBe(true);
  });

  it("reveals the password when the toggle is pressed, and hides it again", () => {
    renderField();

    fireEvent.press(toggle());
    expect(screen.getByPlaceholderText(PLACEHOLDER).props.secureTextEntry).toBe(false);

    fireEvent.press(toggle());
    expect(screen.getByPlaceholderText(PLACEHOLDER).props.secureTextEntry).toBe(true);
  });

  it("labels the toggle for screen readers and updates it with state", () => {
    renderField();

    expect(screen.getByLabelText("auth.showPassword")).toBeTruthy();

    fireEvent.press(toggle());
    expect(screen.getByLabelText("auth.hidePassword")).toBeTruthy();
  });

  it("asks the OS for a saved password when signing in", () => {
    renderField({ purpose: "current" });
    const field = screen.getByPlaceholderText(PLACEHOLDER);

    expect(field.props.autoComplete).toBe("current-password");
    expect(field.props.textContentType).toBe("password");
  });

  it("asks the OS to offer a new password when registering", () => {
    renderField({ purpose: "new" });
    const field = screen.getByPlaceholderText(PLACEHOLDER);

    expect(field.props.autoComplete).toBe("new-password");
    expect(field.props.textContentType).toBe("newPassword");
  });

  it("never lets the keyboard rewrite a password", () => {
    renderField();
    const field = screen.getByPlaceholderText(PLACEHOLDER);

    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.autoCapitalize).toBe("none");
    expect(field.props.spellCheck).toBe(false);
  });

  it("forwards keyboard submit props through to the input", () => {
    const onSubmitEditing = jest.fn();
    renderField({ returnKeyType: "go", onSubmitEditing });

    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props.returnKeyType).toBe("go");

    fireEvent(field, "submitEditing");
    expect(onSubmitEditing).toHaveBeenCalled();
  });

  it("forwards a ref so a previous field can move focus into it", () => {
    const ref = React.createRef<TextInput>();
    render(
      <PasswordInput
        ref={ref}
        placeholder={PLACEHOLDER}
        value=""
        onChangeText={() => {}}
      />
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focus).toBe("function");
  });

  it("reports typing to the caller", () => {
    const onChangeText = jest.fn();
    renderField({ onChangeText });

    fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), "hunter2");
    expect(onChangeText).toHaveBeenCalledWith("hunter2");
  });
});

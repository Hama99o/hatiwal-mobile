/**
 * PasswordInput — the shared password field.
 *
 * WHY THIS EXISTS
 * Login and Register between them had three bare `<Input secureTextEntry />`
 * fields, and every one of them made the user's life harder than it needed to be:
 *
 *   - no way to reveal what you typed, so a single mistyped character means
 *     retyping the whole password blind. On a phone keyboard that is the single
 *     most common complaint about a sign-in form.
 *   - no `autoComplete` / `textContentType`, so Android autofill and the iOS
 *     keychain never offered a saved password — every sign-in was typed by hand.
 *   - no `returnKeyType` / `onSubmitEditing`, so the keyboard could not submit
 *     the form or move to the next field.
 *
 * All three are fixed once, here, instead of three times at the call sites.
 *
 * Composes the shared RNR `Input` — it does NOT reimplement it, so the focus
 * animation, error border, label and RTL font handling all still apply.
 */
import React, { useState } from "react";
import { View, Pressable, type TextInput, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface PasswordInputProps extends Omit<TextInputProps, "style" | "secureTextEntry"> {
  /** Solid destructive border, forwarded to Input. */
  error?: boolean;
  /** Optional label above the field, forwarded to Input. */
  label?: string;
  /**
   * "current" for signing in, "new" for creating or confirming a password.
   * Drives autoComplete/textContentType so the OS offers the right thing:
   * a saved password vs an offer to generate and save a new one.
   */
  purpose?: "current" | "new";
}

export const PasswordInput = React.forwardRef<TextInput, PasswordInputProps>(
  function PasswordInput({ error, label, purpose = "current", ...props }, ref) {
    const [revealed, setRevealed] = useState(false);
    const colors = useColors();
    const { isRtl } = useLocalization();
    const { t } = useTranslation();

    const Icon = revealed ? EyeOff : Eye;

    return (
      <View style={{ position: "relative", justifyContent: "center" }}>
        <Input
          ref={ref}
          {...props}
          error={error}
          label={label}
          secureTextEntry={!revealed}
          autoCapitalize="none"
          autoCorrect={false}
          // Never let a keyboard suggestion strip rewrite a password.
          spellCheck={false}
          autoComplete={purpose === "new" ? "new-password" : "current-password"}
          textContentType={purpose === "new" ? "newPassword" : "password"}
          style={{
            textAlign: isRtl ? "right" : "left",
            // Leave room for the toggle so a long password never runs under it.
            ...(isRtl ? { paddingLeft: 44 } : { paddingRight: 44 }),
          }}
        />

        <Pressable
          onPress={() => setRevealed((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t(
            revealed ? "auth.hidePassword" : "auth.showPassword"
          )}
          // 44x44 is the minimum comfortable touch target; the icon is 20.
          hitSlop={8}
          style={{
            position: "absolute",
            ...(isRtl ? { left: 4 } : { right: 4 }),
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
          android_ripple={{ color: colors.muted, radius: 22, borderless: true }}
        >
          <Icon size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }
);

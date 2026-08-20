/**
 * RNR Input — NativeWind-aware TextInput wrapper.
 * Uses forwardRef so callers can programmatically focus the input.
 *
 * TASK-P401 (micro-interactions) — the border now animates from
 * `colors.border` to `colors.primary` over 150ms (`withTiming`) whenever the
 * field gains focus, and eases back on blur. The transition is instant (no
 * animation) when the system "Reduce Motion" accessibility setting is on
 * (`useReduceMotion`), matching every other animation in `src/lib/animation/`.
 *
 * `error`: a field with a validation error always renders a solid
 * `colors.destructive` border and skips the focus animation entirely — the
 * error is a more important, persistent signal than the focus ring, and
 * must not be masked by the border easing back to `colors.border` on blur.
 *
 * `label`: optional — when supplied, renders a small label above the field
 * whose color animates from `colors.mutedForeground` to `colors.primary` in
 * lockstep with the border (same shared value). This is an opt-in
 * alternative to composing a separate `<Label>`/`<FieldLabel>` above the
 * input, for call sites that want the label to visibly "connect" to the
 * field on focus. Existing call sites that render their own `<Label>`
 * separately are unaffected — omit `label` and nothing changes structurally.
 */
import React, { useCallback } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
  type FocusEvent,
  type BlurEvent,
  StyleSheet,
  StyleProp,
  TextStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useReduceMotion } from "@/lib/animation";
import { fontFamilyForLang } from "@/lib/fonts";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const FOCUS_ANIMATION_MS = 150;

interface InputProps extends Omit<TextInputProps, "style"> {
  className?: string;
  style?: StyleProp<TextStyle>;
  /** Renders a solid destructive border and suppresses the focus animation. */
  error?: boolean;
  /** Optional label rendered above the field; animates to `primary` on focus. */
  label?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  function Input({ className, style, error, label, onFocus, onBlur, ...props }, ref) {
    const colors = useColors();
    const reduceMotion = useReduceMotion();
    const { i18n } = useTranslation();
    const fontFamily = fontFamilyForLang(i18n.language);

    const focusProgress = useSharedValue(0);

    const handleFocus = useCallback(
      (e: FocusEvent) => {
        focusProgress.value = withTiming(1, {
          duration: reduceMotion ? 0 : FOCUS_ANIMATION_MS,
        });
        onFocus?.(e);
      },
      [focusProgress, reduceMotion, onFocus]
    );

    const handleBlur = useCallback(
      (e: BlurEvent) => {
        focusProgress.value = withTiming(0, {
          duration: reduceMotion ? 0 : FOCUS_ANIMATION_MS,
        });
        onBlur?.(e);
      },
      [focusProgress, reduceMotion, onBlur]
    );

    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [colors.border, colors.primary]
      ),
    }));

    const animatedLabelStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        focusProgress.value,
        [0, 1],
        [colors.mutedForeground, colors.primary]
      ),
    }));

    const field = (
      <AnimatedTextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.base,
          {
            backgroundColor: colors.background,
            color: colors.foreground,
          },
          error ? { borderColor: colors.destructive } : animatedBorderStyle,
          style,
        ]}
        {...props}
      />
    );

    if (label == null) return field;

    return (
      <View>
        <Animated.Text style={[styles.label, { fontFamily }, animatedLabelStyle]}>
          {label}
        </Animated.Text>
        {field}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
});

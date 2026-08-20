/**
 * RNR Textarea — multi-line TextInput.
 *
 * TASK-P401 (micro-interactions) — same focus-border animation as `Input`
 * (see input.tsx for the full rationale): border eases from `colors.border`
 * to `colors.primary` over 150ms on focus, instantly when Reduce Motion is
 * on, and `error` renders a solid destructive border with no animation.
 */
import React, { useCallback } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
  type FocusEvent,
  type BlurEvent,
  StyleSheet,
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

interface TextareaProps extends TextInputProps {
  className?: string;
  /** Renders a solid destructive border and suppresses the focus animation. */
  error?: boolean;
  /** Optional label rendered above the field; animates to `primary` on focus. */
  label?: string;
}

export const Textarea = React.forwardRef<TextInput, TextareaProps>(
  function Textarea({ className, style, error, label, onFocus, onBlur, ...props }, ref) {
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
        multiline
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
    minHeight: 96,
    textAlignVertical: "top",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
});

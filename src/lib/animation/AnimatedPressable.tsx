import React from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type EntryOrExitLayoutType,
} from "react-native-reanimated";
import { triggerHaptic } from "./haptics";
import { useReduceMotion } from "./useReduceMotion";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  haptic?: boolean;
  /**
   * Reanimated layout-animation entering/exiting builders (e.g.
   * `FadeIn.duration(180)`). `AnimatedPressableBase` is itself an animated
   * component (`Animated.createAnimatedComponent(Pressable)`), so it can play
   * its own enter/exit transition directly — no need to wrap it in a separate
   * `Animated.View` just to get `entering`/`exiting`.
   *
   * DR fix: an extra wrapping `Animated.View` sized only to its content used
   * to shrink to the visual (post negative-margin) footprint of a
   * padding-enlarged touch target inside it (e.g. SearchBar's 44pt clear
   * button), which made the real 44pt tap target NOT hit-testable on Android
   * (the ancestor's own layout box was back down to the icon's 16px). Putting
   * entering/exiting on this component directly means there is only ONE view
   * — its own measured box IS the tap target, no smaller ancestor to clip it.
   */
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
}

export function AnimatedPressable({
  children,
  onPress,
  haptic = true,
  disabled,
  style,
  entering,
  exiting,
  ...props
}: AnimatedPressableProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  // Review fix: when `entering`/`exiting` are supplied, Reanimated's layout-
  // animation mechanism owns `opacity` on this same shadow node to fade the
  // view in/out. `useAnimatedStyle` writing a constant `opacity: 1` (the
  // "at rest" press-feedback value) to that same native prop every frame
  // fights it — the fade either doesn't visibly play or settles at the
  // press-in opacity instead of animating. Press feedback stays scale-only
  // in that case; entering/exiting exclusively own opacity.
  const hasEnterExit = Boolean(entering || exiting);

  const animatedStyle = useAnimatedStyle(() => {
    if (hasEnterExit) {
      return { transform: [{ scale: scale.value }] };
    }
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (!reduceMotion) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      if (!hasEnterExit) {
        opacity.value = withSpring(0.85, { damping: 15, stiffness: 300 });
      }
    }
    if (haptic && !disabled) {
      triggerHaptic("light", reduceMotion);
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      if (!hasEnterExit) {
        opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
      }
    }
  };

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      entering={entering}
      exiting={exiting}
      style={[animatedStyle, style as any]}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}

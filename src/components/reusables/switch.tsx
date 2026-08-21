import React from "react";
import { Animated } from "react-native";
import * as SwitchPrimitive from "@rn-primitives/switch";
import { useColors } from "@/hooks/useColors";

// The thumb transform is driven by an Animated.Value, so the receiving component
// must be an animated component — a plain View can't resolve an Animated.Value and
// throws "Transform with key of translateX must be number or a percentage".
const AnimatedThumb = Animated.createAnimatedComponent(SwitchPrimitive.Thumb);

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /**
   * The shared Switch had no testID at all, so no E2E flow could target a
   * specific switch: `tapOn` had to match the accessibilityLabel, which on a
   * label+switch row is the SAME string as the visible Text beside it — and
   * Maestro matches the Text, which is not the control. Every switch in the app
   * was effectively untappable from a flow.
   */
  testID?: string;
}

export function Switch({ checked, onCheckedChange, disabled, accessibilityLabel, testID }: SwitchProps) {
  const colors = useColors();
  const translateX = React.useRef(new Animated.Value(checked ? 20 : 2)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: checked ? 20 : 2,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [checked]);

  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: checked ? colors.primary : colors.border,
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <AnimatedThumb
        style={[
          {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.primaryForeground,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
          },
          // @ts-ignore — Animated.Value is valid here at runtime
          { transform: [{ translateX }] },
        ]}
      />
    </SwitchPrimitive.Root>
  );
}

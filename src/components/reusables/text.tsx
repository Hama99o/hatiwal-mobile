import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/useColors";
import { useButtonTextColor } from "@/components/reusables/button";

interface Props extends TextProps {
  className?: string;
}

export function Text({ className, style, ...props }: Props) {
  const colors = useColors();
  const buttonTextColor = useButtonTextColor();
  const baseColor = buttonTextColor ?? colors.foreground;
  return (
    <RNText
      className={cn(className)}
      style={[{ color: baseColor }, style]}
      {...props}
    />
  );
}

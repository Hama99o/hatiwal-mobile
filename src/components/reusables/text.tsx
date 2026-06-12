/**
 * RNR Text — thin NativeWind-aware wrapper around React Native Text.
 * Replaces raw `import { Text } from "react-native"` throughout the app.
 * Use via `import { Text } from "@/components/reusables/text"`.
 */
import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

interface Props extends TextProps {
  className?: string;
}

export function Text({ className, style, ...props }: Props) {
  return (
    <RNText
      className={cn("text-foreground", className)}
      style={style}
      {...props}
    />
  );
}

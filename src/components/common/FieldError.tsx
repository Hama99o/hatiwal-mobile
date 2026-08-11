import React from "react";
import { View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface FieldErrorProps {
  /** Already-localized error copy (call `t(...)` before passing it in). */
  message: string;
  testID?: string;
}

/**
 * FieldError — TASK-P736 (review fix).
 *
 * The ONE inline-error treatment for every required field on the listing
 * form (and any future form): a leading destructive `AlertCircle` + a
 * `text-sm` message, laid out RTL-aware. Before this component existed,
 * ListingForm.tsx had FIVE different inline-error renderings — three bare
 * `text-xs` `<Text>`s (title/price/category) and a fourth copy-pasted
 * `AlertCircle` + `text-sm` block for location — while PhotosSection.tsx
 * carried its own near-identical local `PhotoFieldError`. All five now
 * render through this single shared component so the treatment can never
 * drift apart again.
 *
 * Renders nothing when `message` is falsy — callers can pass a possibly-
 * undefined error string directly without an extra `{error && ...}` guard,
 * though most call sites still guard explicitly for clarity.
 */
export function FieldError({ message, testID }: FieldErrorProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();

  if (!message) return null;

  return (
    <View
      testID={testID}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: 4,
        marginTop: 4,
      }}
    >
      <AlertCircle size={14} color={colors.destructive} style={{ marginTop: 1 }} />
      <Text
        className="text-sm"
        style={{ color: colors.destructive, textAlign: isRtl ? "right" : "left", flex: 1 }}
      >
        {message}
      </Text>
    </View>
  );
}

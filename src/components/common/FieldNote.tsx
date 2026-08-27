import React from "react";
import { View } from "react-native";
import { CheckCircle2, Info } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface FieldNoteProps {
  /** Already-localized copy (call `t(...)` before passing it in). */
  message: string;
  testID?: string;
  /**
   * "info" (default) — a neutral, muted `Info` icon, for a plain explanatory
   * aside. "success" — `CheckCircle2` in the success color, for copy that
   * states a GOOD outcome of the current input (e.g. "saving puts this
   * listing back on sale"), not a warning and not an error.
   */
  tone?: "info" | "success";
}

/**
 * FieldNote — the non-error sibling of `FieldError`/`FieldLabel` (see
 * `FieldError.tsx`'s own header for why that family was extracted: five
 * near-identical inline-error blocks used to be copy-pasted across
 * ListingForm.tsx and PhotosSection.tsx before it existed). First consumer:
 * SF-M7 (docs/SELL_FLOW_REDESIGN.md) — telling a seller BEFORE they save
 * that raising quantity on a `sold` listing will put it back on sale, so
 * "nothing visibly happened" (the owner's own complaint) never happens
 * again. Kept as a SEPARATE component from `FieldError` rather than an
 * error-with-a-different-color: this is calm, expected information, and its
 * accessibility role and intent genuinely differ from a validation failure —
 * it must never read as `accessibilityRole="alert"`.
 *
 * Renders nothing when `message` is falsy, same contract as `FieldError`.
 */
export function FieldNote({ message, testID, tone = "info" }: FieldNoteProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();

  if (!message) return null;

  const color = tone === "success" ? colors.success : colors.mutedForeground;
  const Icon = tone === "success" ? CheckCircle2 : Info;

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
      <Icon size={14} color={color} style={{ marginTop: 1 }} />
      <Text
        className="text-sm"
        style={{ color, textAlign: isRtl ? "right" : "left", flex: 1 }}
      >
        {message}
      </Text>
    </View>
  );
}

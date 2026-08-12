import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export type PriceTagSize = "lg" | "md" | "sm";

/**
 * TASK-C381 (review fix, DR): every price on screen must go through this
 * component (CLAUDE.md: "Same for PriceTag/StatusBadge... Extend the shared
 * component, don't fork it") — but `MessageBubble`'s offer/counter amount
 * used to hand-roll its own colored `<Text>` instead, because the default
 * `colors.foreground` tone couldn't express the "mine" bubble's warning
 * accent. `tone` closes that gap: `"default"` (unchanged — every existing
 * call site omits it) or `"warning"` / `"muted"` for the two colors chat's
 * offer bubbles actually need.
 */
export type PriceTagTone = "default" | "warning" | "muted";

interface PriceTagProps {
  price: number | null | undefined;
  currency?: string;
  size?: PriceTagSize;
  tone?: PriceTagTone;
  className?: string;
}

// lg: hero price on Listing Detail (24sp — most prominent text after the photo)
// md: price in Browse card (17sp — dominant within card body)
// sm: secondary surfaces (chat header, similar listings)
const fontSize: Record<PriceTagSize, number> = { lg: 24, md: 17, sm: 13 };
const fontWeight: Record<PriceTagSize, "700" | "600"> = { lg: "700", md: "700", sm: "600" };

export function PriceTag({ price, currency = "AFN", size = "md", tone = "default" }: PriceTagProps) {
  const { formatCurrency } = useLocalization();
  const colors = useColors();

  if (price == null) return null;

  const color =
    tone === "warning" ? colors.warning : tone === "muted" ? colors.mutedForeground : colors.foreground;

  return (
    <Text
      style={{ color, fontSize: fontSize[size], fontWeight: fontWeight[size] }}
      numberOfLines={1}
      accessibilityRole="text"
    >
      {formatCurrency(price, currency)}
    </Text>
  );
}

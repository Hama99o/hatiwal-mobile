import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export type PriceTagSize = "lg" | "md" | "sm";

interface PriceTagProps {
  price: number | null | undefined;
  currency?: string;
  size?: PriceTagSize;
  className?: string;
}

const fontSize: Record<PriceTagSize, number> = { lg: 20, md: 16, sm: 14 };
const fontWeight: Record<PriceTagSize, "700" | "600"> = { lg: "700", md: "700", sm: "600" };

export function PriceTag({ price, currency = "AFN", size = "md" }: PriceTagProps) {
  const { formatCurrency } = useLocalization();
  const colors = useColors();

  if (price == null) return null;

  return (
    <Text
      style={{ color: colors.foreground, fontSize: fontSize[size], fontWeight: fontWeight[size] }}
      numberOfLines={1}
      accessibilityRole="text"
    >
      {formatCurrency(price, currency)}
    </Text>
  );
}

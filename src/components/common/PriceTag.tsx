import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";

export type PriceTagSize = "lg" | "md" | "sm";

interface PriceTagProps {
  price: number | null | undefined;
  currency?: string;
  size?: PriceTagSize;
  className?: string;
}

const sizeClass: Record<PriceTagSize, string> = {
  lg: "text-xl font-bold",
  md: "text-base font-bold",
  sm: "text-sm font-semibold",
};

/**
 * PriceTag — locale-aware currency display.
 * Sizes: lg (detail hero), md (card), sm (compact inline).
 * Always text-foreground and bold — never muted.
 */
export function PriceTag({
  price,
  currency = "AFN",
  size = "md",
  className,
}: PriceTagProps) {
  const { formatCurrency } = useLocalization();

  if (price == null) return null;

  return (
    <Text
      className={cn("text-foreground", sizeClass[size], className)}
      numberOfLines={1}
      accessibilityRole="text"
    >
      {formatCurrency(price, currency)}
    </Text>
  );
}

import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ListingStatus = "draft" | "active" | "reserved" | "sold";

interface StatusBadgeProps {
  status: ListingStatus;
  className?: string;
}

/**
 * Maps listing status to the correct badge color as per DESIGN_SYSTEM.md:
 *   draft    → muted (grey)
 *   active   → success (green)
 *   reserved → warning (amber)
 *   sold     → secondary/grey dimmed
 */
const statusStyles: Record<
  ListingStatus,
  { container: string; text: string }
> = {
  draft: {
    container: "bg-muted",
    text: "text-muted-foreground",
  },
  active: {
    container: "bg-green-100 dark:bg-green-900",
    text: "text-green-700 dark:text-green-300",
  },
  reserved: {
    container: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-700 dark:text-amber-300",
  },
  sold: {
    container: "bg-secondary",
    text: "text-secondary-foreground opacity-70",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const translationKey = `listing.status.${status}` as const;
  const styles = statusStyles[status];

  return (
    <View
      className={cn(
        "rounded-full px-2 py-0.5 self-start",
        styles.container,
        className
      )}
      accessibilityRole="text"
      accessibilityLabel={t(translationKey)}
    >
      <Text
        className={cn("text-xs font-medium", styles.text)}
        numberOfLines={1}
      >
        {t(translationKey)}
      </Text>
    </View>
  );
}

import { View } from "react-native";
import { BadgeCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

/**
 * Trust badge for a verified seller. Icon-only by default; pass `withLabel`
 * to render the "Verified" text beside it (e.g. on the profile header).
 */
export function VerifiedBadge({
  size = 16,
  withLabel = false,
}: {
  size?: number;
  withLabel?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRtl } = useLocalization();

  if (!withLabel) {
    return (
      <BadgeCheck
        size={size}
        color={colors.primary}
        accessibilityLabel={t("common.verified")}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.primaryAlpha,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <BadgeCheck size={size} color={colors.primary} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
        {t("common.verified")}
      </Text>
    </View>
  );
}

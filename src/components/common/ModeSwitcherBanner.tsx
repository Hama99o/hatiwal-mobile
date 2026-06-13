/**
 * ModeSwitcherBanner — a slim persistent strip at the top of main screens
 * that shows the current mode and lets the user switch with one tap.
 *
 * Buyer mode  → blue primary strip: "Buyer Mode · Switch to Selling →"
 * Seller mode → amber warning strip: "Seller Mode · Switch to Buying →"
 */

import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useModeStore } from "@/stores/mode.store";
import { Text } from "@/components/reusables/text";
import { Store, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react-native";

export function ModeSwitcherBanner() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const { mode, toggleMode } = useModeStore();

  const isSeller = mode === "seller";
  const bgColor = isSeller ? colors.warningAlpha : colors.primaryAlpha;
  const textColor = isSeller ? colors.warning : colors.primary;
  const borderColor = isSeller ? colors.warning : colors.primary;

  const Icon = isSeller ? Store : ShoppingBag;
  const ChevronIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <TouchableOpacity
      onPress={toggleMode}
      activeOpacity={0.75}
      style={[
        styles.banner,
        {
          backgroundColor: bgColor,
          borderBottomColor: borderColor,
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
    >
      <Icon size={13} color={textColor} />
      <Text style={[styles.label, { color: textColor }]}>
        {isSeller ? t("profile.sellerMode") : t("profile.buyerMode")}
      </Text>
      <View style={styles.spacer} />
      <Text style={[styles.switchLabel, { color: textColor }]}>
        {isSeller ? t("profile.switchToBuyer") : t("profile.switchToSeller")}
      </Text>
      <ChevronIcon size={13} color={textColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  spacer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});

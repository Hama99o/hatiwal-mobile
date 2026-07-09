/**
 * OfferSheet — slide-up modal for making a price offer on a listing.
 * Buyer enters an amount, the offer is sent as a message to the conversation.
 *
 * TASK-G083: Quick-amount suggestion chips (95%, 90%, 85% of asking price)
 * appear above the offer input so buyers can tap a sensible figure without
 * having to type a raw number. Chips are purely presentational — tapping
 * fills the input but does NOT auto-send.
 */

import React, { useMemo } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

/** Percentages of the asking price used to derive the three quick-amount chips. */
const CHIP_PERCENTAGES = [0.95, 0.9, 0.85] as const;

/**
 * Compute a quick-amount chip value from an asking price and a percentage.
 * Rounds to the nearest whole number and clamps to at least 1.
 */
export function computeChipAmount(price: number, percent: number): number {
  return Math.max(1, Math.round(price * percent));
}

interface OfferSheetProps {
  visible: boolean;
  onClose: () => void;
  onSend: (offerAmount: string) => void;
  offerAmount: string;
  onChangeAmount: (v: string) => void;
  currency: string;
  price: number;
  isBusy: boolean;
}

export function OfferSheet({
  visible,
  onClose,
  onSend,
  offerAmount,
  onChangeAmount,
  currency,
  price,
  isBusy,
}: OfferSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Compute three quick-amount chips from the asking price (95%, 90%, 85%).
  // Memoized so they only recalculate when the price changes.
  const chips = useMemo(
    () => CHIP_PERCENTAGES.map((pct) => computeChipAmount(price, pct)),
    [price]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* KeyboardAvoidingView lifts the bottom sheet above the keyboard so the
          amount input and Send button stay visible (the input auto-focuses, so
          the keyboard is up immediately). Matches the chat screen's pattern. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 24) + 12,
            },
          ]}
        >
        {/* Header */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
            {t("listing.detail.offerTitle")}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Listed price reference — uses formatCurrency for locale-aware output */}
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 16 }}>
          {t("listing.detail.listedPrice", {
            price: formatCurrency(price, currency),
          })}
        </Text>

        {/* Offer amount */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.foreground,
            marginBottom: 8,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t("listing.detail.yourOffer")}
        </Text>

        {/* Quick-amount suggestion chips — 95%, 90%, 85% of asking price.
            Tapping a chip fills the amount input without auto-sending.
            Hidden while an offer is in flight (isBusy). */}
        {!isBusy && (
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 11,
                color: colors.mutedForeground,
                marginBottom: 6,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("chat.offer.quickChipsHint")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 8,
              }}
              accessibilityLabel={t("chat.offer.quickChipsHint")}
            >
              {chips.map((chipAmount) => {
                const isSelected = offerAmount === String(chipAmount);
                return (
                  <Pressable
                    key={chipAmount}
                    onPress={() => onChangeAmount(String(chipAmount))}
                    accessibilityRole="button"
                    accessibilityLabel={formatCurrency(chipAmount, currency)}
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      minHeight: 44,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : colors.muted,
                    }}
                    testID={`quick-chip-${chipAmount}`}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? colors.primaryForeground : colors.foreground,
                      }}
                    >
                      {formatCurrency(chipAmount, currency)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, alignItems: "center" }}>
          <View style={[styles.currencyTag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
              {currency}
            </Text>
          </View>
          <Input
            value={offerAmount}
            onChangeText={onChangeAmount}
            placeholder="0"
            keyboardType="numeric"
            style={{ flex: 1, textAlign: isRtl ? "right" : "left" }}
            autoFocus
          />
        </View>

        <Text
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            marginTop: 12,
            lineHeight: 17,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t("listing.detail.noPaymentNote")}
        </Text>

        <Button
          variant="default"
          onPress={() => onSend(offerAmount)}
          disabled={isBusy || !offerAmount}
          style={{ marginTop: 20 }}
        >
          <Text>{t("listing.detail.sendOffer")}</Text>
        </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    padding: 20,
  },
  currencyTag: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    alignItems: "center",
  },
});

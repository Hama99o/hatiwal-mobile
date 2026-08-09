/**
 * CounterOfferSheet — slide-up modal for countering an offer or a previous
 * counter with a new price. Mirrors the OfferSheet pattern used on listing
 * detail. Originally seller-only (TASK-O829); since TASK-C381 either
 * participant can open it — on a buyer's fresh offer, on a seller's own
 * proactive offer, or on either side's counter-back — so its copy must stay
 * role-neutral (it references "the previous offer", never "the buyer").
 */

import React from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { X, ArrowLeftRight } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface CounterOfferSheetProps {
  visible: boolean;
  onClose: () => void;
  onSend: (counterAmount: string) => void;
  counterAmount: string;
  onChangeAmount: (v: string) => void;
  currency: string;
  /**
   * The amount of the offer/counter being responded to (for reference).
   * Named for the original buyer-offer case (TASK-O829); since TASK-C381
   * this may also be a seller's proactive offer or either side's counter —
   * the displayed copy is role-neutral ("Previous offer"), never "Buyer".
   */
  buyerOfferAmount: number;
  isBusy: boolean;
}

export function CounterOfferSheet({
  visible,
  onClose,
  onSend,
  counterAmount,
  onChangeAmount,
  currency,
  buyerOfferAmount,
  isBusy,
}: CounterOfferSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* KeyboardAvoidingView lifts the sheet above the keyboard (same as OfferSheet). */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={onClose}
        />
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
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ArrowLeftRight size={18} color={colors.warning} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.foreground,
                }}
              >
                {t("chat.offer.counterTitle")}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Reference to the offer/counter being responded to. Role-neutral
              copy (TASK-C381 review fix) — this sheet is no longer seller-only,
              so it must not say "Buyer offered" when a seller's own proactive
              offer or either side's counter-back is what's being countered. */}
          <Text
            style={{
              fontSize: 13,
              color: colors.mutedForeground,
              marginBottom: 16,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("chat.offer.previousOfferAt", {
              price: formatCurrency(buyerOfferAmount, currency),
            })}
          </Text>

          {/* Counter amount input */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.foreground,
              marginBottom: 8,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("chat.offer.yourCounterOffer")}
          </Text>

          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              gap: 8,
              alignItems: "center",
            }}
          >
            <View
              style={[
                styles.currencyTag,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.foreground,
                }}
              >
                {currency}
              </Text>
            </View>
            <Input
              value={counterAmount}
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
            {t("chat.offer.counterNote")}
          </Text>

          <Button
            variant="default"
            onPress={() => onSend(counterAmount)}
            disabled={isBusy || !counterAmount}
            style={{ marginTop: 20 }}
          >
            <Text>{t("chat.offer.sendCounter")}</Text>
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

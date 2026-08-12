/**
 * OfferSheet — slide-up modal for making a price offer on a listing, OR
 * (TASK-C381 review fix, DR) countering an existing offer/counter with a new
 * price. One sheet, one chip implementation — `mode` swaps only the copy and
 * the reference-amount line; everything else (layout, validation, busy
 * state) is shared.
 *
 * Folded in from the former standalone `CounterOfferSheet` (originally
 * TASK-O829, seller-only) — that component was a near line-for-line
 * duplicate of this one (same header/backdrop/currency-tag/input/note/button
 * chrome), which is exactly the kind of fork CLAUDE.md's "extend the shared
 * component, don't fork it" rule exists to prevent. `mode="counter"` no
 * longer restricts to the seller: since TASK-C381 either participant can
 * open a counter sheet (on a buyer's fresh offer, a seller's own proactive
 * offer, or either side's counter-back), so its copy stays role-neutral —
 * "the previous offer", never "the buyer".
 *
 * TASK-G083: Quick-amount suggestion chips (95%, 90%, 85% of asking price)
 * appear above the offer input in `mode="offer"` so buyers can tap a
 * sensible figure without having to type a raw number. Chips are purely
 * presentational — tapping fills the input but does NOT auto-send. Not
 * shown in `mode="counter"` — a counter responds to a specific prior
 * figure, not the original asking price, so there is no equivalent
 * percentage to suggest (matches the former `CounterOfferSheet`, which never
 * had chips either).
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
import { X, ArrowLeftRight } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { parseOfferAmount } from "@/utils/offerAmount";

/** Percentages of the asking price used to derive the three quick-amount chips. */
const CHIP_PERCENTAGES = [0.95, 0.9, 0.85] as const;

/**
 * Compute a quick-amount chip value from an asking price and a percentage.
 * Rounds to the nearest whole number and clamps to at least 1.
 */
export function computeChipAmount(price: number, percent: number): number {
  return Math.max(1, Math.round(price * percent));
}

export type OfferSheetMode = "offer" | "counter";

interface OfferSheetProps {
  visible: boolean;
  onClose: () => void;
  onSend: (offerAmount: string) => void;
  offerAmount: string;
  onChangeAmount: (v: string) => void;
  currency: string;
  /**
   * `mode="offer"`: the listing's asking price (drives the quick-amount
   * chips and the "Listed price" reference line).
   * `mode="counter"`: the amount of the offer/counter being responded to
   * (the "Previous offer" reference line) — no chips are derived from it.
   */
  price: number;
  isBusy: boolean;
  /** Defaults to `"offer"` — every pre-existing call site is unchanged. */
  mode?: OfferSheetMode;
  /**
   * TASK-C381 (review fix, DR): `listing.detail.noPaymentNote` ("this is
   * just a message to the seller") is role-coded true ONLY for
   * ListingDetail's own buyer-only "Make an Offer" CTA — the sheet's other
   * caller, `Conversation.tsx`'s in-thread composer button, is usable by
   * EITHER participant (a seller opening one is a proactive discount), so
   * naming "the seller" is simply wrong half the time there. Set `true`
   * when this sheet is opened from inside the chat thread (`mode="offer"`
   * only — `mode="counter"` always uses the already role-neutral
   * `chat.offer.counterNote` regardless of this prop) to show the
   * role-neutral `chat.offer.threadNote` instead. Defaults to `false` —
   * ListingDetail's call site is unchanged.
   */
  inThread?: boolean;
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
  mode = "offer",
  inThread = false,
}: OfferSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isCounter = mode === "counter";

  // Compute three quick-amount chips from the asking price (95%, 90%, 85%).
  // Memoized so they only recalculate when the price changes. Irrelevant in
  // counter mode (never rendered there) but harmless to compute.
  const chips = useMemo(
    () => CHIP_PERCENTAGES.map((pct) => computeChipAmount(price, pct)),
    [price]
  );

  // CR fix (MUST): the former CounterOfferSheet's Send button only checked
  // `!counterAmount` (a non-empty STRING), so "0" or "-500" — both truthy
  // strings — were never disabled. Both modes now share the exact same
  // positive-number guard as the send handlers themselves (`parseOfferAmount`).
  const isAmountValid = parseOfferAmount(offerAmount) != null;

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
        {/* Header — the counter mode's icon mirrors the former CounterOfferSheet. */}
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
            {isCounter && <ArrowLeftRight size={18} color={colors.warning} />}
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {t(isCounter ? "chat.offer.counterTitle" : "listing.detail.offerTitle")}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Reference line — the listing's asking price in "offer" mode, or
            the previous offer/counter being responded to in "counter" mode.
            Role-neutral copy in counter mode (TASK-C381) — this sheet is no
            longer seller-only, so it must not say "Buyer offered" when a
            seller's own proactive offer or either side's counter-back is
            what's being countered. */}
        <Text
          style={{
            fontSize: 13,
            color: colors.mutedForeground,
            marginBottom: 16,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t(isCounter ? "chat.offer.previousOfferAt" : "listing.detail.listedPrice", {
            price: formatCurrency(price, currency),
          })}
        </Text>

        {/* Offer / counter amount label */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.foreground,
            marginBottom: 8,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t(isCounter ? "chat.offer.yourCounterOffer" : "listing.detail.yourOffer")}
        </Text>

        {/* Quick-amount suggestion chips — 95%, 90%, 85% of asking price.
            Tapping a chip fills the amount input without auto-sending.
            Hidden while an offer is in flight (isBusy), and in "counter"
            mode — a counter responds to a specific prior figure, not the
            original asking price, so there is no percentage to suggest
            (matches the former CounterOfferSheet, which never had chips). */}
        {!isBusy && !isCounter && (
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
            testID="offer-amount-input"
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
          {t(
            isCounter
              ? "chat.offer.counterNote"
              : inThread
              ? "chat.offer.threadNote"
              : "listing.detail.noPaymentNote"
          )}
        </Text>

        <Button
          variant="default"
          onPress={() => onSend(offerAmount)}
          disabled={isBusy || !isAmountValid}
          style={{ marginTop: 20 }}
        >
          <Text>{t(isCounter ? "chat.offer.sendCounter" : "listing.detail.sendOffer")}</Text>
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

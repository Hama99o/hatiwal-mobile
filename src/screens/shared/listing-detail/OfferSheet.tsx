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
import { parseOfferQuantity } from "./offerQuantity";

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
   * Multi-quantity: the listing has several identical units, so the reference
   * price above the input is PER UNIT (docs/SPIKE_LISTING_QUANTITY.md).
   *
   * Without it a buyer offering on 15 bags reads "Listed price: AFN 14,000" and
   * cannot tell whether their own number should be for one or for the lot — and
   * an offer carries no quantity of its own, so nothing downstream disambiguates
   * it. Saying "each" on the reference line at least fixes the anchor. Only ever
   * meaningful in `mode="offer"`; a counter references a specific prior offer.
   */
  perUnit?: boolean;
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
  /**
   * SF-M11 — the quantity field's value and setter, as typed. Supplied by the
   * caller (which owns the state and does the sending) so `onSend` keeps its
   * one-argument signature and every pre-existing call site is untouched.
   *
   * The field renders ONLY when `perUnit` is true AND `onChangeQuantity` is
   * given, i.e. a multi-unit listing whose caller is ready to send the value.
   * A single-item listing shows nothing new, which is the same rule the server
   * applies (`Message#discard_meaningless_offer_quantity`).
   */
  quantity?: string;
  onChangeQuantity?: (v: string) => void;
  /**
   * `listing.availableUnits` — the ceiling. Used to catch "I'll take 20" on a
   * 15-unit batch inline, instead of letting it become a server 422 the buyer
   * has to decode. Mirrors the server's own ceiling rather than a softer one.
   */
  availableUnits?: number | null;
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
  perUnit = false,
  inThread = false,
  quantity,
  onChangeQuantity,
  availableUnits,
}: OfferSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency, formatNumber } = useLocalization();
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

  // SF-M11 — a counter names its own quantity too (a seller countering
  // "3 for 40,000" must be able to restate how many, or the quantity is lost
  // the moment either side moves the price), so this is NOT gated on !isCounter.
  const showQuantity = perUnit && typeof onChangeQuantity === "function";
  const parsedQuantity = useMemo(
    () => parseOfferQuantity(quantity ?? "", availableUnits),
    [quantity, availableUnits]
  );
  // The line the buyer reads back before sending. Only shown once BOTH numbers
  // are usable — a running total next to an invalid field is noise.
  const lineTotal = useMemo(() => {
    const amount = parseOfferAmount(offerAmount);
    const units = parsedQuantity.value;
    if (amount == null || units == null || units <= 1) return null;
    return { units, total: amount * units };
  }, [offerAmount, parsedQuantity.value]);

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
          {!isCounter && perUnit ? ` (${t("listing.stock.each")})` : ""}
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
                // A horizontal scroller is ALREADY laid out right-to-left when
                // I18nManager.isRTL, so reversing its content container on top of that
                // flips it back: the first item lands at the far edge while the scroller
                // opens scrolled the other way. Same defect as CategoryChipRow (the
                // category chips the user reported as clipped at the border).
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

        {/* SF-M11 — units, for a multi-unit listing only.
            This is the field that used to not exist: the buyer's "how many"
            lived in prose ("3 × AFN 14,000"), the seller had to re-read it,
            and mark-sold opened at 1 regardless — so a batch silently kept
            units that were already gone. `perUnit`'s own docstring named the
            hole; this is the field that fills it. */}
        {showQuantity && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.foreground,
                marginBottom: 8,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("chat.offer.quantityLabel")}
            </Text>
            <Input
              value={quantity ?? ""}
              onChangeText={onChangeQuantity}
              placeholder="1"
              keyboardType="numeric"
              style={{ textAlign: isRtl ? "right" : "left" }}
              testID="offer-quantity-input"
              accessibilityLabel={t("chat.offer.quantityLabel")}
            />
            {/* Available-units hint, so the ceiling is visible BEFORE it is hit. */}
            {availableUnits != null && availableUnits > 0 && (
              <Text
                style={{
                  fontSize: 11,
                  color: colors.mutedForeground,
                  marginTop: 6,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("listing.stock.unitsAvailable", { count: availableUnits })}
              </Text>
            )}
            {/* Inline error — the same rules the server enforces, so the buyer
                never has to decode a 422 for a mistake we can see locally. */}
            {parsedQuantity.errorKey && (
              <Text
                testID="offer-quantity-error"
                style={{
                  fontSize: 12,
                  color: colors.destructive,
                  marginTop: 6,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t(parsedQuantity.errorKey, { available: formatNumber(availableUnits ?? 0) })}
              </Text>
            )}
            {/* Read-back line: "3 × AFN 14,000 = AFN 42,000". The buyer sees
                the total they are committing to before they send it. */}
            {lineTotal && (
              <Text
                testID="offer-quantity-total"
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginTop: 8,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("chat.offer.quantityTotal", {
                  // formatNumber, not the raw value: prices here go through
                  // formatCurrency, so a bare "3" beside "۱۴٬۰۰۰" would mix
                  // Latin and Arabic-Indic digits in one line (mobile.prompt.md
                  // §4: never render a number without useLocalization).
                  units: formatNumber(lineTotal.units),
                  unitPrice: formatCurrency(parseOfferAmount(offerAmount) ?? 0, currency),
                  total: formatCurrency(lineTotal.total, currency),
                })}
              </Text>
            )}
          </View>
        )}

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
          // SF-M11: an unusable quantity blocks Send the same way an unusable
          // amount does. Without this the sheet would happily send an offer for
          // "20 of 15", which the server rejects — the buyer would get a toast
          // for something the sheet already knew was wrong.
          disabled={isBusy || !isAmountValid || (showQuantity && parsedQuantity.errorKey !== null)}
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

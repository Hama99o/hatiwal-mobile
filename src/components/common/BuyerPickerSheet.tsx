/**
 * BuyerPickerSheet — slide-up modal shown when a seller reserves or marks a
 * listing sold. Lets them identify the real buyer from the listing's own
 * conversations (avatar + name + last message), with a "Someone else / skip"
 * fallback that preserves the legacy no-buyer flow, plus an optional
 * final-price override (defaults to the listing's asking price).
 *
 * Uses raw RN <Modal> — matches ReportSheet/OfferSheet: all sheets in this
 * project use raw Modal because @gorhom/bottom-sheet has native-only platform
 * splits that crash the web dev runner. All inner UI is RNR components.
 *
 * Entry points (TASK-TX01): SellerListingCard, MyListingDetail,
 * chat ListingHeader (TASK-F084) — all pass listingId/price/currency/action
 * and forward the result to their existing reserve/sold mutation.
 *
 * Confirm mode (TASK-O947, cycle-4 design review): pass `preselectedBuyer`
 * when the buyer is already known (e.g. the conversation whose offer the
 * seller just accepted) — the sheet then skips the conversations query, the
 * "someone else / skip" fallback and the editable final-price input, and
 * instead renders a locked confirmation: the listing thumbnail, the buyer's
 * identity via the shared `UserIdentity`, and the agreed price via
 * `PriceTag`. `onConfirm` fires immediately with `{ buyerId, finalPrice }`
 * built from the caller-supplied values — there is nothing left to pick.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { X, Check, UserX, CheckCircle2 } from "lucide-react-native";

import { conversationsAPI, type Conversation } from "@/api/conversations";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { UserIdentity } from "@/components/common/UserIdentity";
import { PriceTag } from "@/components/common/PriceTag";
import { RemoteImage } from "@/components/common/RemoteImage";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface BuyerPickerResult {
  /** undefined when the seller picked "Someone else / skip" — legacy no-buyer path. */
  buyerId?: number;
  /** undefined when left blank — backend defaults to the listing price. */
  finalPrice?: number;
  /**
   * How many units this sale covered. undefined for a single-unit listing, and
   * undefined when the seller sold the whole remaining stock — the backend
   * defaults to "all of it", so the common case sends nothing and costs no taps
   * (docs/SPIKE_LISTING_QUANTITY.md §0c).
   */
  quantity?: number;
  /**
   * TASK-TX02 (review fix, MAJOR) — true ONLY when the seller explicitly
   * tapped "Someone else / skip". On the wire, an absent `buyerId` alone is
   * ambiguous — it could mean either this explicit skip OR a legacy client
   * that never sends buyer info at all. Those two cases must be handled
   * differently server-side (skip cancels any stale reservation instead of
   * silently closing it out against the previously-reserved buyer), so this
   * flag is the distinguishing signal sent to `PUT .../sold`. See
   * src/api/listings.ts markSold and Listing#sold_with_buyer! (hatiwal-api).
   */
  clearBuyer?: boolean;
}

interface BuyerPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  listingId: number;
  /** Listing asking price — used as the final-price input placeholder/default. */
  price: number;
  currency: string;
  /** Which lifecycle action triggered the sheet — only changes the copy. */
  action: "reserve" | "sold";
  /**
   * Units still unsold. Pass it only for a multi-unit listing; when it is
   * absent or 1 the sheet renders exactly as it always has, so a seller with one
   * item sees no new field. Reserve never asks — reserve stays advisory in Tier 1.
   */
  remainingQuantity?: number;
  onConfirm: (result: BuyerPickerResult) => void;
  isSubmitting?: boolean;
  /**
   * TASK-O947 confirm mode — when set, the buyer is already known and the
   * sheet renders a locked confirmation instead of a pick-a-buyer list (no
   * conversations query, no "someone else" skip, no editable final price).
   * `onConfirm` fires with `{ buyerId: preselectedBuyer.id, finalPrice: price }`.
   */
  preselectedBuyer?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    /**
     * TASK-O947 review fix (TRUST) — `conversation.buyer` already carries
     * these (conversation_serializer.rb `field(:buyer)`), so the locked
     * confirm-mode identity below can show the same verified tag + city
     * subtitle every other `UserIdentity` render does, instead of a bare
     * name. Zero API work — the caller just has to pass them through.
     */
    verified?: boolean;
    city?: string | null;
  } | null;
  /** Listing thumbnail shown above the locked buyer row in confirm mode. */
  listingThumbnailUrl?: string | null;
  listingTitle?: string | null;
  /** Overrides the sheet's default title in confirm mode. */
  confirmTitle?: string;
  /** Confirmation sentence shown below the price in confirm mode (buyer name
   *  + price already bidi-isolated by the caller — see reserveAfterAccept.ts). */
  confirmBody?: string;
  /** Overrides the footer's Cancel label in confirm mode (e.g. "Not now"). */
  cancelLabel?: string;
  /**
   * Review fix (MEDIUM, STATES/ERROR FEEDBACK) — inline failure message
   * rendered above the footer (destructive-tinted). The sheet's own raw RN
   * `<Modal>` is a separate native window on Android that occludes
   * sonner-native's toast entirely, so a reserve/sold failure needs a
   * signal INSIDE the sheet too, or the stay-open-on-failure retry contract
   * (the sheet deliberately stays mounted after a failed mutation) reads as
   * a dead tap: spinner runs, spinner stops, sheet still open, nothing
   * visibly explains why. The caller sets this from its `onConfirm` handler
   * when the mutation rejects, and clears it on the next confirm tap.
   */
  errorMessage?: string | null;
}

const SKIP = "skip" as const;

export function BuyerPickerSheet({
  visible,
  onClose,
  listingId,
  price,
  currency,
  action,
  remainingQuantity,
  onConfirm,
  isSubmitting = false,
  preselectedBuyer = null,
  listingThumbnailUrl,
  listingTitle,
  confirmTitle,
  confirmBody,
  cancelLabel,
  errorMessage,
}: BuyerPickerSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const isConfirmMode = !!preselectedBuyer;

  const [selected, setSelected] = useState<number | typeof SKIP | null>(null);
  const [finalPriceText, setFinalPriceText] = useState("");
  // Pre-filled with the FULL remainder, because "I sold the lot" is the common
  // case and the seller should not have to type a number to say it. A partial
  // sale is then one edit to one field.
  const asksQuantity = action === "sold" && (remainingQuantity ?? 1) > 1;
  const [quantityText, setQuantityText] = useState(String(remainingQuantity ?? 1));
  // Typed more than exists. Drives the destructive hint below — the confirm is
  // still allowed (it clamps, and so does the API), because refusing outright
  // would strand a seller whose stock changed under them mid-sheet. Declared
  // AFTER quantityText: a const reading it above its own declaration is a TDZ
  // crash, not a lint nit.
  const exceedsStock =
    asksQuantity && Number(quantityText) > (remainingQuantity ?? 1);
  useEffect(() => {
    setQuantityText(String(remainingQuantity ?? 1));
  }, [remainingQuantity]);
  const [priceError, setPriceError] = useState(false);

  // Confirm mode already knows the buyer — never fetch the conversation list.
  const { data, isLoading } = useQuery({
    queryKey: ["conversations", listingId, "buyer-picker"],
    queryFn: () => conversationsAPI.getConversations({ listingId }),
    enabled: visible && !!listingId && !isConfirmMode,
  });

  const conversations: Conversation[] = data?.items ?? [];

  // Reset local state every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setFinalPriceText("");
      setPriceError(false);
    }
  }, [visible]);

  // SHOULD-FIX (CORRECTNESS) — a dismiss while a reserve/sold PUT is in
  // flight must be a no-op, exactly like the footer's Cancel already is
  // (:isSubmitting below), or a mid-request dismiss can land a "reserved"
  // toast after the seller believes they cancelled. Shared by the Android
  // back button, the backdrop tap, and the header X.
  const handleDismiss = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const handleConfirm = useCallback(() => {
    // Confirm mode: buyer + price are already known — nothing left to pick.
    if (preselectedBuyer) {
      onConfirm({ buyerId: preselectedBuyer.id, finalPrice: price });
      return;
    }

    if (selected === null) return;

    let finalPrice: number | undefined;
    if (finalPriceText.trim().length > 0) {
      const parsed = Number(finalPriceText);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setPriceError(true);
        return;
      }
      finalPrice = parsed;
    }
    setPriceError(false);

    // Clamp to what is actually left; the API clamps too, but a client that
    // sends an impossible number is a client bug worth not having.
    const parsedQty = Number(quantityText);
    const quantity =
      asksQuantity && Number.isFinite(parsedQty) && parsedQty > 0
        ? Math.min(Math.trunc(parsedQty), remainingQuantity ?? 1)
        : undefined;

    onConfirm({
      buyerId: selected === SKIP ? undefined : selected,
      finalPrice: selected === SKIP ? undefined : finalPrice,
      // NOT conditional on the buyer: this is how many UNITS were sold, true whoever
      // bought them. A missing quantity means "sold the lot" to the API
      // (my/listings_controller.rb), so tying it to the buyer destroyed the remaining
      // stock on every off-platform sale.
      quantity,
      // TASK-TX02 (review fix, MAJOR) — explicit skip must be distinguishable
      // on the wire from a legacy client that never sends buyer info at all.
      clearBuyer: selected === SKIP ? true : undefined,
    });
  }, [selected, finalPriceText, quantityText, asksQuantity, remainingQuantity, onConfirm, preselectedBuyer, price]);

  const defaultTitle = action === "reserve" ? t("buyerPicker.reserveTitle") : t("buyerPicker.soldTitle");
  const title = isConfirmMode ? confirmTitle ?? defaultTitle : defaultTitle;
  // Generic — never carries the price (a price baked into a button label
  // truncates/garbles in ps/fa; the price only ever appears in the sheet body).
  const confirmLabel = action === "reserve" ? t("buyerPicker.confirmReserve") : t("buyerPicker.confirmSold");
  const resolvedCancelLabel = isConfirmMode ? cancelLabel ?? t("buyerPicker.cancel") : t("buyerPicker.cancel");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismiss}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable
          testID="buyer-picker-backdrop"
          style={[styles.backdrop, { backgroundColor: colors.darkScrim }]}
          onPress={handleDismiss}
        />

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text className="text-lg font-semibold" style={{ color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }}>
              {title}
            </Text>
            <Pressable
              onPress={handleDismiss}
              disabled={isSubmitting}
              hitSlop={12}
              android_ripple={{ color: colors.muted, borderless: true }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              testID="buyer-picker-close"
            >
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {!isConfirmMode && (
            <>
              <Text className="text-sm" style={{ color: colors.mutedForeground, marginBottom: 8, textAlign: isRtl ? "right" : "left" }}>
                {t("buyerPicker.subtitle")}
              </Text>

              {/* REV2 nudge — makes picking a real buyer attractive: it's the
                  only way for both sides to leave a double-blind review
                  afterward. */}
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  marginBottom: 12,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("buyerPicker.nudge")}
              </Text>

              <Separator className="mb-2" />
            </>
          )}

          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {isConfirmMode && preselectedBuyer ? (
              /* TASK-O947 confirm mode — listing thumb + locked buyer identity
                 + PriceTag + the confirmation sentence. No conversation list,
                 no "someone else" skip, no editable final price: the buyer
                 and the agreed price are already known. */
              <View style={{ gap: 14, paddingBottom: 4 }}>
                {/* Review fix (MEDIUM, self-explaining) — confirm mode is only
                    ever reached right after a successful offer accept (see
                    reserveAfterAccept.ts), but the sheet itself opens with no
                    other acknowledgement of that accept — the toast fired one
                    tick earlier is easy to miss. This pill reuses the exact
                    label/tone the accepted-offer bubble itself shows
                    (chat.offer.accepted / colors.success), never a new
                    string, so the sheet reads as a continuation of the accept
                    instead of an unprompted interruption. */}
                <View
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignSelf: isRtl ? "flex-end" : "flex-start",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: colors.successAlpha,
                  }}
                >
                  <CheckCircle2 size={13} color={colors.success} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>
                    {t("chat.offer.accepted")}
                  </Text>
                </View>

                {(listingThumbnailUrl || listingTitle) && (
                  <View
                    style={{
                      flexDirection: isRtl ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: colors.muted,
                    }}
                  >
                    <RemoteImage uri={listingThumbnailUrl} style={{ width: 60, height: 60, borderRadius: 8 }} />
                    {listingTitle ? (
                      <Text
                        numberOfLines={2}
                        style={{ flex: 1, fontSize: 16, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
                      >
                        {listingTitle}
                      </Text>
                    ) : null}
                  </View>
                )}

                <UserIdentity
                  name={preselectedBuyer.name}
                  avatarUrl={preselectedBuyer.avatarUrl}
                  verified={preselectedBuyer.verified}
                  subtitle={preselectedBuyer.city ?? undefined}
                  size={48}
                />

                {/* Review fix (LOW, price read unlabelled + stated twice) —
                    a bare 24sp PriceTag with no caption is ambiguous (asking
                    price? accepted offer?), and the body sentence below used
                    to repeat the same number. The caption disambiguates it;
                    `confirmBody` (see reserveAfterAccept.ts) now carries only
                    the consequence sentence, never the price again. */}
                <View style={{ alignItems: isRtl ? "flex-end" : "flex-start", paddingVertical: 4, gap: 2 }}>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}>
                    {t("buyerPicker.agreedPrice")}
                  </Text>
                  <PriceTag price={price} currency={currency} size="lg" />
                </View>

                {confirmBody ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.mutedForeground,
                      textAlign: isRtl ? "right" : "left",
                      lineHeight: 20,
                    }}
                  >
                    {confirmBody}
                  </Text>
                ) : null}

                {/* Review fix (LOW, trust add-on) — confirm mode hid the REV2
                    nudge entirely (`!isConfirmMode` above), even though a real
                    buyer IS already recorded here — the nudge is just as true
                    at this moment, and arguably lands better right as the
                    seller commits to reserving. Reuses the exact same
                    translated copy as the picker mode's nudge, no new key. */}
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.primary,
                    textAlign: isRtl ? "right" : "left",
                  }}
                >
                  {t("buyerPicker.nudge")}
                </Text>
              </View>
            ) : isLoading ? (
              <View testID="buyer-picker-loading">
                <ConversationRowSkeleton />
                <ConversationRowSkeleton />
              </View>
            ) : (
              <>
                {conversations.length === 0 && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, paddingVertical: 12, textAlign: isRtl ? "right" : "left" }}>
                    {t("buyerPicker.noConversations")}
                  </Text>
                )}

                {conversations.map((conv) => {
                  const other = conv.otherParticipant;
                  const isSelected = selected === other?.id;
                  return (
                    <Pressable
                      key={conv.id}
                      onPress={() => other && setSelected(other.id)}
                      testID={`buyer-row-${other?.id}`}
                      style={[
                        styles.row,
                        {
                          flexDirection: isRtl ? "row-reverse" : "row",
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primaryAlpha : "transparent",
                        },
                      ]}
                      android_ripple={{ color: colors.muted }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <UserAvatar name={other?.name ?? "?"} avatarUrl={other?.avatarUrl} size={40} />
                      <View style={{ flex: 1, minWidth: 0, marginHorizontal: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }} numberOfLines={1}>
                          {other?.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }} numberOfLines={1}>
                          {conv.lastMessageBody ?? t("buyerPicker.noMessages")}
                        </Text>
                      </View>
                      {isSelected && <Check size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}

                {/* Someone else / skip — preserves the legacy no-buyer flow */}
                <Pressable
                  onPress={() => setSelected(SKIP)}
                  testID="buyer-row-skip"
                  style={[
                    styles.row,
                    {
                      flexDirection: isRtl ? "row-reverse" : "row",
                      borderColor: selected === SKIP ? colors.primary : colors.border,
                      backgroundColor: selected === SKIP ? colors.primaryAlpha : "transparent",
                    },
                  ]}
                  android_ripple={{ color: colors.muted }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected === SKIP }}
                >
                  <View style={[styles.skipIcon, { backgroundColor: colors.muted }]}>
                    <UserX size={18} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                      {t("buyerPicker.someoneElse")}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}>
                      {t("buyerPicker.someoneElseHint")}
                    </Text>
                  </View>
                  {selected === SKIP && <Check size={18} color={colors.primary} />}
                </Pressable>

                {/* How many units — multi-unit sold only, so a single-item listing
                    renders nothing new here. Sits ABOVE the final price because
                    "how many" is answered before "for how much", and it is
                    pre-filled with the whole remainder so the common case is
                    still confirm-and-done. */}
                {/* Shown on the SKIP path too. When a seller ticks "sold to someone
                    not on Hatiwal" only the BUYER is unknown — the unit count is not,
                    and hiding the field left them no way to say it. A missing quantity
                    means "sold the lot" to the API, so the sheet's silence retired the
                    listing: reported from a device with 50 in stock, one sale, and
                    "0 of 50 left" afterwards. */}
                {asksQuantity && selected !== null && (
                  <View style={{ marginTop: 16 }}>
                    <Label className="mb-2" style={{ textAlign: isRtl ? "right" : "left" }}>
                      {t("listing.form.howManySold")}
                    </Label>
                    <Input
                      value={quantityText}
                      onChangeText={(v) => setQuantityText(v.replace(/[^0-9]/g, ""))}
                      placeholder={String(remainingQuantity ?? 1)}
                      keyboardType="numeric"
                      // THE FIELD IS PRE-FILLED with the whole remainder, so a
                      // plain tap just places a cursor and typing INSERTS: a
                      // seller who means 3 produces "153", which the clamp below
                      // then silently turns into "sold all 15" — the listing
                      // retires and their remaining stock is gone. Found on a
                      // real device (QA run-018: typed 3, recorded 15).
                      // Selecting on focus makes typing REPLACE, which is the
                      // only sane behaviour for a pre-filled numeric field.
                      selectTextOnFocus
                      style={{ textAlign: isRtl ? "right" : "left" }}
                      testID="buyer-picker-quantity"
                    />
                    <Text
                      style={{
                        // Destructive when the number exceeds what is left. It
                        // still clamps (the API clamps too), but silently
                        // clamping is how a typo became a sold-out listing —
                        // the seller has to be able to SEE that the number they
                        // typed is not the number that will be recorded.
                        color: exceedsStock ? colors.destructive : colors.mutedForeground,
                        fontSize: 12,
                        marginTop: 4,
                        textAlign: isRtl ? "right" : "left",
                      }}
                      testID="buyer-picker-quantity-hint"
                    >
                      {t("listing.stock.unitsAvailable", { count: remainingQuantity ?? 1 })}
                    </Text>
                  </View>
                )}

                {/* Optional final price — only meaningful when a real buyer is selected */}
                {selected !== null && selected !== SKIP && (
                  <View style={{ marginTop: 16 }}>
                    <Label className="mb-2" style={{ textAlign: isRtl ? "right" : "left" }}>
                      {t("buyerPicker.finalPriceLabel")}
                    </Label>
                    <Input
                      value={finalPriceText}
                      onChangeText={(v) => { setFinalPriceText(v); setPriceError(false); }}
                      placeholder={formatCurrency(price, currency)}
                      keyboardType="numeric"
                      style={{ textAlign: isRtl ? "right" : "left" }}
                      testID="buyer-picker-final-price"
                    />
                    {/* Multi-unit only: say out loud that this figure is per
                        item. The placeholder is already the listing's own
                        per-unit price, so a seller who sold 3 bags at 13,000
                        each will naturally type 13,000 — but "final price" on a
                        3-unit deal could just as easily be read as 39,000, and
                        the number ends up in the sale record and the review. */}
                    {asksQuantity && !priceError && (
                      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4, textAlign: isRtl ? "right" : "left" }}>
                        {t("buyerPicker.finalPricePerUnitHint")}
                      </Text>
                    )}
                    {priceError && (
                      <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 4, textAlign: isRtl ? "right" : "left" }}>
                        {t("buyerPicker.errors.invalidPrice")}
                      </Text>
                    )}
                  </View>
                )}

                <View style={{ height: 8 }} />
              </>
            )}
          </ScrollView>

          {/* Review fix (MEDIUM, ERROR FEEDBACK) — inline failure signal that
              survives the sheet's own <Modal> occluding the error toast on
              Android (see the `errorMessage` prop doc above). Rendered right
              above the footer buttons so it's the first thing seen on retry. */}
          {errorMessage ? (
            <Text
              testID="buyer-picker-error"
              style={{
                color: colors.destructive,
                fontSize: 13,
                textAlign: isRtl ? "right" : "left",
                marginBottom: 8,
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              variant="default"
              onPress={handleConfirm}
              disabled={isConfirmMode ? isSubmitting : selected === null || isSubmitting}
              testID="buyer-picker-confirm"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text>{confirmLabel}</Text>
              )}
            </Button>
            {/* Review fix (NIT) — route through the SAME `handleDismiss` guard
                as the backdrop, header X and hardware back, instead of
                calling `onClose` directly. Behaviour was already identical
                (this button also carries `disabled={isSubmitting}`), but the
                mid-submit invariant now lives in exactly one place. */}
            <Button variant="ghost" onPress={handleDismiss} disabled={isSubmitting} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.mutedForeground }}>{resolvedCancelLabel}</Text>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: "88%",
  },
  handleContainer: { alignItems: "center", paddingVertical: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 },
  row: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 60,
    marginBottom: 8,
  },
  skipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingTop: 12, borderTopWidth: 1 },
});

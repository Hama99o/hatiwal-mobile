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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { X, Check, UserX } from "lucide-react-native";

import { conversationsAPI, type Conversation } from "@/api/conversations";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface BuyerPickerResult {
  /** undefined when the seller picked "Someone else / skip" — legacy no-buyer path. */
  buyerId?: number;
  /** undefined when left blank — backend defaults to the listing price. */
  finalPrice?: number;
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
  onConfirm: (result: BuyerPickerResult) => void;
  isSubmitting?: boolean;
}

const SKIP = "skip" as const;

export function BuyerPickerSheet({
  visible,
  onClose,
  listingId,
  price,
  currency,
  action,
  onConfirm,
  isSubmitting = false,
}: BuyerPickerSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<number | typeof SKIP | null>(null);
  const [finalPriceText, setFinalPriceText] = useState("");
  const [priceError, setPriceError] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", listingId, "buyer-picker"],
    queryFn: () => conversationsAPI.getConversations({ listingId }),
    enabled: visible && !!listingId,
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

  const handleConfirm = useCallback(() => {
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

    onConfirm({
      buyerId: selected === SKIP ? undefined : selected,
      finalPrice: selected === SKIP ? undefined : finalPrice,
    });
  }, [selected, finalPriceText, onConfirm]);

  const title = action === "reserve" ? t("buyerPicker.reserveTitle") : t("buyerPicker.soldTitle");
  const confirmLabel = action === "reserve" ? t("buyerPicker.confirmReserve") : t("buyerPicker.confirmSold");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text className="text-lg font-semibold" style={{ color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} android_ripple={{ color: colors.muted, borderless: true }}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text className="text-sm" style={{ color: colors.mutedForeground, marginBottom: 12, textAlign: isRtl ? "right" : "left" }}>
            {t("buyerPicker.subtitle")}
          </Text>

          <Separator className="mb-2" />

          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {isLoading ? (
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

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              variant="default"
              onPress={handleConfirm}
              disabled={selected === null || isSubmitting}
              testID="buyer-picker-confirm"
            >
              <Text>{confirmLabel}</Text>
            </Button>
            <Button variant="ghost" onPress={onClose} disabled={isSubmitting} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.mutedForeground }}>{t("buyerPicker.cancel")}</Text>
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

/**
 * SaleRowEditSheet — correct or void a recorded sale (SF-M5,
 * `docs/SELL_FLOW_REDESIGN.md` §10.3.1).
 *
 * A new component rather than a fork of `BuyerPickerSheet`: editing an
 * EXISTING row (quantity/buyer/price already recorded, a Delete affordance,
 * a possible "already reviewed" refusal) is a different interaction from
 * that sheet's job of PICKING a new buyer for a fresh sale — but it is
 * composed from the same shared pieces (`UserIdentity`, `UserAvatar`,
 * `QuantityStepper`, the same conversation-row presentation BuyerPickerSheet
 * uses for its own picker list), never re-invented from scratch.
 *
 * Raw RN <Modal> — matches every other sheet in this project
 * (BuyerPickerSheet, ComposerActionsSheet, ReportSheet): @gorhom/bottom-sheet
 * has native-only platform splits that crash the web dev runner.
 *
 * SF-B4's one deliberate refusal: voiding or reassigning the buyer on a sale
 * that already has a review is refused with a 422, `code: "sale_has_review"`
 * (`Transaction::REVIEWED_SALE_CODE`, hatiwal-api). The mobile client cannot
 * know this UP FRONT — `TransactionSerializer` carries no "has a review"
 * flag — so this sheet always renders Delete + "Change buyer" enabled, and
 * only hides/disables them (keeping quantity/price editable) after the
 * server actually answers with that code. Never the server's raw English —
 * `listing.sale.voidBlockedReviewed` renders it, matching the identical
 * inline-error pattern `BuyerPickerSheet.errorMessage` already established
 * (a sheet's own raw `<Modal>` occludes a toast entirely on Android).
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
import { X, Check, UserX } from "lucide-react-native";

import { conversationsAPI, type Conversation } from "@/api/conversations";
import type { Transaction } from "@/api/transactions";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { Label } from "@/components/reusables/label";
import { UserAvatar } from "@/components/common/UserAvatar";
import { UserIdentity } from "@/components/common/UserIdentity";
import { QuantityStepper } from "@/components/common/QuantityStepper";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { confirmAlert } from "@/utils/alert";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

const SKIP = "skip" as const;
type BuyerChoice = number | typeof SKIP;

export interface SaleRowEditResult {
  quantity: number;
  finalPrice?: number;
  buyerId?: number;
  clearBuyer?: boolean;
}

/**
 * Never thrown — a discriminated result instead, so the parent's
 * error-handling (toast for a real failure, or the `sale_has_review` refusal
 * this sheet needs to react to) never has to cross a callback boundary via
 * an exception. `blockedReviewed` is the ONLY thing that changes this
 * sheet's own UI (see the file header); any other `ok: false` just means
 * "the caller already toasted, stay open, let them retry".
 */
export type SaleRowEditOutcome = { ok: true } | { ok: false; blockedReviewed: boolean };

export interface SaleRowEditSheetProps {
  visible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  multiUnit: boolean;
  /** `availableUnits + transaction.quantity` — this row's own live ceiling. */
  maxQuantity: number;
  onSave: (result: SaleRowEditResult) => Promise<SaleRowEditOutcome>;
  onDelete: () => Promise<SaleRowEditOutcome>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function SaleRowEditSheet({
  visible,
  onClose,
  transaction,
  multiUnit,
  maxQuantity,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: SaleRowEditSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [quantity, setQuantity] = useState(1);
  const [finalPriceText, setFinalPriceText] = useState("");
  const [priceError, setPriceError] = useState(false);
  const [changingBuyer, setChangingBuyer] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerChoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // SF-B4's one refusal — set once the server actually answers 422
  // "sale_has_review"; never assumed up front (see file header).
  const [reviewBlocked, setReviewBlocked] = useState(false);

  const isSubmitting = isSaving || isDeleting;

  // Reset local state every time a NEW row opens.
  useEffect(() => {
    if (visible && transaction) {
      setQuantity(transaction.quantity ?? 1);
      setFinalPriceText("");
      setPriceError(false);
      setChangingBuyer(false);
      setSelectedBuyer(null);
      setErrorMessage(null);
      setReviewBlocked(false);
    }
  }, [visible, transaction?.id]);

  const listingId = transaction?.listing?.id;
  const { data, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations", listingId, "sale-edit"],
    queryFn: () => conversationsAPI.getConversations({ listingId }),
    enabled: visible && changingBuyer && !!listingId,
  });
  const conversations: Conversation[] = data?.items ?? [];

  const handleDismiss = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const applyBlockedOutcome = useCallback(
    (outcome: SaleRowEditOutcome) => {
      if (outcome.ok) return;
      if (outcome.blockedReviewed) {
        setReviewBlocked(true);
        setChangingBuyer(false);
        setSelectedBuyer(null);
        setErrorMessage(t("listing.sale.voidBlockedReviewed"));
      }
      // A plain (non-reviewed) failure already got its toast from the
      // caller — nothing further to show here, the sheet just stays open.
    },
    [t]
  );

  const handleSave = useCallback(async () => {
    if (!transaction) return;
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
    setErrorMessage(null);

    const buyerPart =
      selectedBuyer === null
        ? {}
        : selectedBuyer === SKIP
        ? { clearBuyer: true as const }
        : { buyerId: selectedBuyer };

    const outcome = await onSave({ quantity, finalPrice, ...buyerPart });
    applyBlockedOutcome(outcome);
  }, [transaction, finalPriceText, selectedBuyer, quantity, onSave, applyBlockedOutcome]);

  // Destructive → confirmAlert first, exactly like every other destructive
  // action in the app (never a raw Alert.alert). The actual DELETE only
  // fires from the confirm button's own onPress.
  const handleDeletePress = useCallback(() => {
    confirmAlert(
      t("listing.sale.voidConfirm"),
      t("listing.sale.voidConfirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            setErrorMessage(null);
            const outcome = await onDelete();
            applyBlockedOutcome(outcome);
          },
        },
      ]
    );
  }, [onDelete, applyBlockedOutcome, t]);

  if (!transaction) return null;

  const currentBuyerName = transaction.buyer?.name ?? t("listing.sale.outsideBuyer");
  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismiss}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable
          testID="sale-edit-backdrop"
          style={[styles.backdrop, { backgroundColor: colors.darkScrim }]}
          onPress={handleDismiss}
        />

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { flexDirection: rowDir }]}>
            <Text className="text-lg font-semibold" style={{ color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }}>
              {t("listing.sale.editSale")}
            </Text>
            <Pressable onPress={handleDismiss} disabled={isSubmitting} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("common.close")} testID="sale-edit-close">
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 16, paddingBottom: 4 }}>
              {/* Current buyer identity + Change buyer link */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: rowDir, alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <UserIdentity
                    name={currentBuyerName}
                    avatarUrl={transaction.buyer?.avatarUrl ?? null}
                    size={40}
                    testID="sale-edit-current-buyer"
                  />
                  {!reviewBlocked && (
                    <Pressable onPress={() => setChangingBuyer((v) => !v)} hitSlop={8} testID="sale-edit-change-buyer">
                      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                        {t("listing.sale.changeBuyer")}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {changingBuyer && !reviewBlocked && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {conversationsLoading ? (
                      <View testID="sale-edit-buyer-loading">
                        <ConversationRowSkeleton />
                      </View>
                    ) : (
                      <>
                        {conversations.map((conv) => {
                          const other = conv.otherParticipant;
                          const isSelected = selectedBuyer === other?.id;
                          return (
                            <Pressable
                              key={conv.id}
                              onPress={() => other && setSelectedBuyer(other.id)}
                              testID={`sale-edit-buyer-${other?.id}`}
                              style={[
                                styles.row,
                                {
                                  flexDirection: rowDir,
                                  borderColor: isSelected ? colors.primary : colors.border,
                                  backgroundColor: isSelected ? colors.primaryAlpha : "transparent",
                                },
                              ]}
                              android_ripple={{ color: colors.muted }}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: isSelected }}
                            >
                              <UserAvatar name={other?.name ?? "?"} avatarUrl={other?.avatarUrl} size={36} />
                              <Text style={{ flex: 1, marginHorizontal: 10, fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }} numberOfLines={1}>
                                {other?.name}
                              </Text>
                              {isSelected && <Check size={16} color={colors.primary} />}
                            </Pressable>
                          );
                        })}

                        <Pressable
                          onPress={() => setSelectedBuyer(SKIP)}
                          testID="sale-edit-buyer-outside"
                          style={[
                            styles.row,
                            {
                              flexDirection: rowDir,
                              borderColor: selectedBuyer === SKIP ? colors.primary : colors.border,
                              backgroundColor: selectedBuyer === SKIP ? colors.primaryAlpha : "transparent",
                            },
                          ]}
                          android_ripple={{ color: colors.muted }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selectedBuyer === SKIP }}
                        >
                          <View style={[styles.skipIcon, { backgroundColor: colors.muted }]}>
                            <UserX size={16} color={colors.mutedForeground} />
                          </View>
                          <Text style={{ flex: 1, marginHorizontal: 10, fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                            {t("listing.sale.outsideBuyer")}
                          </Text>
                          {selectedBuyer === SKIP && <Check size={16} color={colors.primary} />}
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Quantity */}
              <View style={{ gap: 6 }}>
                <Label style={{ textAlign: isRtl ? "right" : "left" }}>{t("listing.form.howManySold")}</Label>
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={Math.max(maxQuantity, 1)}
                  testID="sale-edit-quantity"
                  disabled={!multiUnit}
                />
              </View>

              {/* Final price */}
              <View style={{ gap: 6 }}>
                <Label style={{ textAlign: isRtl ? "right" : "left" }}>{t("buyerPicker.finalPriceLabel")}</Label>
                <Input
                  value={finalPriceText}
                  onChangeText={(v) => { setFinalPriceText(v); setPriceError(false); }}
                  placeholder={formatCurrency(transaction.finalPrice, transaction.currency)}
                  keyboardType="numeric"
                  style={{ textAlign: isRtl ? "right" : "left" }}
                  testID="sale-edit-price"
                />
                {multiUnit && !priceError && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: isRtl ? "right" : "left" }}>
                    {t("buyerPicker.finalPricePerUnitHint")}
                  </Text>
                )}
                {priceError && (
                  <Text style={{ color: colors.destructive, fontSize: 12, textAlign: isRtl ? "right" : "left" }}>
                    {t("buyerPicker.errors.invalidPrice")}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {errorMessage ? (
            <Text testID="sale-edit-error" style={{ color: colors.destructive, fontSize: 13, textAlign: isRtl ? "right" : "left", marginBottom: 8 }}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.border, gap: 8 }]}>
            <Button variant="default" onPress={handleSave} disabled={isSubmitting} testID="sale-edit-save">
              {isSaving ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text>{t("common.save")}</Text>}
            </Button>

            {!reviewBlocked && (
              <Button variant="ghost" onPress={handleDeletePress} disabled={isSubmitting} testID="sale-edit-delete">
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Text style={{ color: colors.destructive, fontWeight: "600" }}>{t("common.delete")}</Text>
                )}
              </Button>
            )}

            <Button variant="ghost" onPress={handleDismiss} disabled={isSubmitting}>
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
  header: { alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  row: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 52,
  },
  skipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingTop: 12, borderTopWidth: 1 },
});

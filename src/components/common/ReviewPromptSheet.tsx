/**
 * ReviewPromptSheet — REV2 double-blind review prompt.
 *
 * Slide-up modal (same raw RN <Modal> pattern as BuyerPickerSheet/ReportSheet —
 * @gorhom/bottom-sheet has native-only platform splits that crash the web dev
 * runner). Two entry points:
 *   (a) right after a sale is recorded (MyListingDetail markSold with a buyer)
 *   (b) the "Rate your recent deals" pending-reviews nudge on Profile
 *
 * Double-blind UX: after submitting, the review is created HIDDEN. This sheet
 * never shows the counterparty's rating and never claims the review is public
 * immediately — it shows one of two confirmation panels:
 *   - "visible" — this was the SECOND submit, so both reviews just revealed
 *     together right now → t('reviews.thanks')
 *   - "pending" — still hidden, waiting on the other party (or the 14-day
 *     deadline sweep) → t('reviews.submittedPendingTitle'/'Body')
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight, keyboardSafeBottom } from "@/hooks/useKeyboardVisible";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { X, CheckCircle2, Clock, Info } from "lucide-react-native";
import { toast } from "@/lib/toast";

import { reviewsAPI, type Review } from "@/api/reviews";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Textarea } from "@/components/reusables/textarea";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";
import { UserIdentity } from "@/components/common/UserIdentity";
import { StarRatingInput } from "@/components/common/StarRatingInput";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { triggerHaptic, useReduceMotion } from "@/lib/animation";

export interface ReviewPromptSheetProps {
  visible: boolean;
  onClose: () => void;
  transactionId: number;
  /** The CALLER's role in this transaction — decides the prompt title and which side is being rated. */
  callerRole: "buyer" | "seller";
  counterpartyName: string;
  counterpartyAvatarUrl?: string | null;
  /** Called once the review is successfully submitted (visible or still pending). */
  onSubmitted?: (review: Review) => void;
}

type Step = "form" | "submitted-visible" | "submitted-pending";

export function ReviewPromptSheet({
  visible,
  onClose,
  transactionId,
  callerRole,
  counterpartyName,
  counterpartyAvatarUrl,
  onSubmitted,
}: ReviewPromptSheetProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // The sheet lifts ITSELF on Android — see the note on KeyboardAvoidingView below.
  const keyboardHeight = useKeyboardHeight();
  const androidLift = Platform.OS === "android" ? keyboardHeight : 0;
  const reduceMotion = useReduceMotion();

  const [step, setStep] = useState<Step>("form");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Reset local state every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setStep("form");
      setRating(0);
      setComment("");
    }
  }, [visible]);

  const submit = useMutation({
    mutationFn: () => reviewsAPI.createReview(transactionId, { rating, comment: comment.trim() || undefined }),
    onSuccess: (review) => {
      // Rewarding confirmation, not an alert — a review always "succeeds" from
      // the submitter's point of view whether it reveals now or stays pending.
      triggerHaptic("success", reduceMotion);
      setStep(review.visible ? "submitted-visible" : "submitted-pending");
      onSubmitted?.(review);
    },
    onError: () => toast.error(t("reviews.errors.generic")),
  });

  const handleSubmit = useCallback(() => {
    if (rating < 1) return;
    submit.mutate();
  }, [rating, submit]);

  const title =
    callerRole === "seller"
      ? t("reviews.promptSellerTitle", { name: counterpartyName })
      : t("reviews.promptBuyerTitle", { name: counterpartyName });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill}        // Platform audit superseded — the Android half of
        // `behavior={... : "height"}` never worked here, for the same two reasons
        // it did not work in MeetupSheet (fixed there in d46c896, verified 7/7 at
        // both widths):
        //   1. this KAV has no height to shrink — the backdrop above it is
        //      `flex: 1`, so the KAV is content-sized;
        //   2. under the edge-to-edge Expo SDK 54 enforces, the IME is an inset
        //      drawn OVER a full-height window and
        //      `windowSoftInputMode="adjustResize"` no longer shrinks anything,
        //      so `behavior="height"` computes its offset from wrong numbers.
        //      See the header of `useKeyboardVisible.ts`, which exists because
        //      the chat composer lost four rounds to this same assumption.
        // A native <Modal> is its own window on top of that, so it would not
        // inherit a resize anyway.
        //
        // So Android lifts the sheet by the keyboard's height, from the event
        // payload — the only source that is right under edge-to-edge. iOS keeps
        // "padding", untouched: there is no Mac here to verify a change to it.
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              // Lift by the keyboard's height on Android, and drop the safe-area
              // inset while the IME covers the gesture bar — the same pair
              // MeetupSheet and the chat composer use.
              paddingBottom: keyboardSafeBottom(keyboardHeight > 0, insets.bottom, 16, 12),
              marginBottom: androidLift,
            },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {step === "form" ? (
            <>
              <View style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Text
                  className="text-lg font-semibold"
                  style={{ color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }}
                >
                  {title}
                </Text>
                <Pressable onPress={onClose} hitSlop={10} android_ripple={{ color: colors.muted, borderless: true }}>
                  <X size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={{ marginBottom: 16 }}>
                <UserIdentity name={counterpartyName} avatarUrl={counterpartyAvatarUrl} size={44} />
              </View>

              <Separator className="mb-4" />

              <Label className="mb-2" style={{ textAlign: isRtl ? "right" : "left" }}>
                {t("reviews.ratingLabel")}
              </Label>
              <View style={{ marginBottom: 20, alignItems: isRtl ? "flex-end" : "flex-start" }}>
                <StarRatingInput value={rating} onChange={setRating} testID="review-prompt-stars" />
              </View>

              <Label className="mb-2" style={{ textAlign: isRtl ? "right" : "left" }}>
                {t("reviews.commentLabel")}
              </Label>
              <Textarea
                value={comment}
                onChangeText={setComment}
                placeholder={t("reviews.commentPlaceholder")}
                maxLength={1000}
                numberOfLines={3}
                style={{ minHeight: 80, textAlign: isRtl ? "right" : "left", marginBottom: 16 }}
                testID="review-prompt-comment"
              />

              {/* Sets expectations upfront so the double-blind confirmation afterwards
                  never feels like a bait-and-switch — mirrors the "no payment required"
                  disclaimer pattern on the Make-an-Offer sheet. */}
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "flex-start",
                  gap: 6,
                  marginBottom: 20,
                }}
              >
                <Info size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: colors.mutedForeground,
                    lineHeight: 17,
                    textAlign: isRtl ? "right" : "left",
                  }}
                  testID="review-prompt-blind-notice"
                >
                  {t("reviews.blindNotice")}
                </Text>
              </View>

              <Button
                variant="default"
                onPress={handleSubmit}
                disabled={rating < 1 || submit.isPending}
                testID="review-prompt-submit"
              >
                <Text>{t("reviews.submit")}</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={onClose}
                disabled={submit.isPending}
                style={{ marginTop: 8 }}
                testID="review-prompt-skip"
              >
                <Text style={{ color: colors.mutedForeground }}>{t("reviews.skip")}</Text>
              </Button>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 24, paddingHorizontal: 8, gap: 12 }}>
              {/* Icon-in-a-soft-circle — same "finished" confirmation treatment as
                  the onboarding slides (Alpha-token background), so this reads as
                  a calm, settled result rather than a bare floating glyph. Both
                  branches are a SUCCESS from the submitter's point of view — the
                  only difference is whether it's visible yet — so neither uses a
                  destructive/error tone. */}
              <Animated.View
                entering={reduceMotion ? undefined : ZoomIn.duration(350).springify().damping(14).stiffness(120)}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: step === "submitted-visible" ? colors.successAlpha : colors.primaryAlpha,
                }}
              >
                {step === "submitted-visible" ? (
                  <CheckCircle2 size={36} color={colors.success} />
                ) : (
                  <Clock size={36} color={colors.primary} />
                )}
              </Animated.View>

              {step === "submitted-visible" ? (
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.foreground, textAlign: "center" }}
                  testID="review-prompt-thanks"
                >
                  {t("reviews.thanks")}
                </Text>
              ) : (
                <>
                  <Text
                    className="text-base font-semibold"
                    style={{ color: colors.foreground, textAlign: "center" }}
                    testID="review-prompt-pending-title"
                  >
                    {t("reviews.submittedPendingTitle")}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: colors.mutedForeground, textAlign: "center" }}
                    testID="review-prompt-pending-body"
                  >
                    {t("reviews.submittedPendingBody", { name: counterpartyName })}
                  </Text>
                </>
              )}
              <Button variant="default" onPress={onClose} style={{ marginTop: 8, minWidth: 140 }}>
                <Text>{t("reviews.gotIt")}</Text>
              </Button>
            </View>
          )}
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
  header: { alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
});

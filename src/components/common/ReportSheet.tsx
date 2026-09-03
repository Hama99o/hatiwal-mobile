/**
 * ReportSheet — slide-up modal for reporting a Listing or User.
 *
 * Uses raw RN <Modal animationType="slide"> — all sheets in this project use
 * raw Modal because @gorhom/bottom-sheet has native-only platform splits
 * that crash the web dev runner (Metro can't resolve .native.js files on web).
 * All inner UI is RNR components.
 *
 * Props:
 *   visible         — controls visibility
 *   onClose         — called when the sheet should close
 *   reportableType  — "Listing" | "User"
 *   reportableId    — numeric id of the target
 *
 * Endpoint: POST /reports
 * Body:     { report: { reportable_type, reportable_id, reason, description? } }
 * 422 → toast error (self-report / duplicate)
 * 201 → success toast + onClose
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight, keyboardSafeBottom } from "@/hooks/useKeyboardVisible";
import { toast } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { X, Flag } from "lucide-react-native";

import { reportsAPI, ReportableType, ReportReason } from "@/api/reports";
import { usersAPI } from "@/api/users";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Textarea } from "@/components/reusables/textarea";
import { Separator } from "@/components/reusables/separator";
import { Label } from "@/components/reusables/label";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { confirmAlert } from "@/utils/alert";

// ─── types ──────────────────────────────────────────────────────────────────

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  reportableType: ReportableType;
  reportableId: number;
  /**
   * Called when the sheet successfully blocks the reported user.
   * Host screens (UserProfile, SellerProfile) use this to sync their own
   * local `isBlocked` flag so the Block/Unblock button stays in the correct
   * state without a full refetch.
   * Only invoked when reportableType === "User" and the user confirmed block.
   */
  onBlocked?: () => void;
}

const REASONS: ReportReason[] = [
  "spam",
  "inappropriate",
  "fraud",
  "wrong_category",
  "prohibited_item",
  "other",
];

// ─── component ───────────────────────────────────────────────────────────────

export function ReportSheet({
  visible,
  onClose,
  reportableType,
  reportableId,
  onBlocked,
}: ReportSheetProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // The sheet lifts ITSELF on Android — see the note on KeyboardAvoidingView below.
  const keyboardHeight = useKeyboardHeight();
  const androidLift = Platform.OS === "android" ? keyboardHeight : 0;
  // CAP THE SHEET TO WHAT IS LEFT ABOVE THE KEYBOARD.
  //
  // The lift alone was not enough here, and the reason is this sheet's shape: a
  // ScrollView of six reason rows plus a Textarea, with a PINNED footer holding
  // Submit and Cancel. `styles.sheet` caps it at a static `maxHeight: "88%"` of
  // the screen, which does not shrink when the IME appears — so the sheet stays
  // tall, the lift moves it up, and the pinned footer lands UNDER the keyboard.
  //
  // Measured, not guessed: run-4xx's screenshot at 411dp shows the sheet filling
  // the screen with the typed note visible, the Textarea clipped at the keyboard's
  // edge, and Submit and Cancel gone from the hierarchy entirely — while the same
  // sheet with no keyboard has both present.
  //
  // 88% of the REMAINING height keeps the original proportion on a roomy window
  // (where androidLift is 0, this is exactly the old value) and shrinks the sheet
  // to fit once the keyboard is up, which is what keeps the footer on screen.
  const { height: windowH } = useWindowDimensions();
  const sheetMaxHeight = Math.max(240, (windowH - androidLift) * 0.88);

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [reasonError, setReasonError] = useState(false);

  // ── reset state when sheet opens ──────────────────────────────────────────
  const handleOpen = useCallback(() => {
    setSelectedReason(null);
    setNote("");
    setReasonError(false);
  }, []);

  // ── close + reset ─────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setNote("");
    setReasonError(false);
    onClose();
  }, [onClose]);

  // ── mutation ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedReason) throw new Error("no_reason");
      return reportsAPI.createReport({
        reportableType,
        reportableId,
        reason: selectedReason,
        description: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("report.success"));
      // For User reports, offer to also block the reported user.
      // For Listing reports, just close — no block prompt.
      if (reportableType === "User") {
        handleClose();
        // Defer confirmAlert to next tick so the Modal has started its dismiss
        // animation before the Alert is presented. Presenting an Alert while a
        // Modal is still animating out is a known iOS footgun where the Alert
        // can be silently dropped.
        setTimeout(() => {
          confirmAlert(
            t("report.block.title"),
            t("report.block.body"),
            [
              {
                text: t("report.block.cancel"),
                style: "cancel",
              },
              {
                text: t("report.block.confirmCta"),
                style: "destructive",
                onPress: () => {
                  usersAPI
                    .blockUser(reportableId)
                    .then(() => {
                      toast.success(t("report.block.success"));
                      // Notify the host screen so its local isBlocked flag
                      // stays in sync with the server state — prevents a
                      // subsequent tap on the host's Block button re-POSTing
                      // /block when the user is already blocked.
                      onBlocked?.();
                    })
                    .catch(() => {
                      toast.error(t("report.block.error"));
                    });
                },
              },
            ]
          );
        }, 0);
      } else {
        handleClose();
      }
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { status?: number; data?: { errors?: string[] } } };
      const status = axiosErr?.response?.status;
      const messages: string[] = axiosErr?.response?.data?.errors ?? [];

      if (status === 422) {
        const joined = messages.join(" ").toLowerCase();
        if (joined.includes("own") || joined.includes("yourself")) {
          toast.error(t("report.errors.selfReport"));
        } else if (joined.includes("already") || joined.includes("duplicate")) {
          toast.error(t("report.errors.duplicate"));
        } else {
          toast.error(messages[0] ?? t("report.errors.generic"));
        }
      } else {
        toast.error(t("report.errors.generic"));
      }
    },
  });

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!selectedReason) {
      setReasonError(true);
      return;
    }
    setReasonError(false);
    mutation.mutate();
  }, [selectedReason, mutation]);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      onShow={handleOpen}
    >
      {/* KeyboardAvoidingView lifts the sheet above the keyboard so the note
          field is never covered. Tapping the backdrop or swiping the list
          (keyboardDismissMode) also dismisses the keyboard. */}
      <KeyboardAvoidingView
        style={styles.fill}
        // Platform audit superseded — the Android half of
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      {/* backdrop */}
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={handleClose} />

      {/* sheet surface */}
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
            // Overrides the static 88% in styles.sheet — see sheetMaxHeight.
            maxHeight: sheetMaxHeight,
          },
        ]}
      >
        {/* drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* header */}
        <View
          style={[
            styles.header,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[
              styles.headerLeft,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Flag size={18} color={colors.destructive} style={styles.headerIcon} />
            <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
              {t("report.title")}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            hitSlop={10}
            style={styles.closeBtn}
            android_ripple={{ color: colors.muted, borderless: true }}
          >
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text
          className="text-sm"
          style={{
            color: colors.mutedForeground,
            marginBottom: 16,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t("report.subtitle")}
        </Text>

        <Separator className="mb-4" />

        <ScrollView
          style={{ flexShrink: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* reason label */}
          <Label
            className="mb-2"
            style={{ textAlign: isRtl ? "right" : "left" }}
          >
            {t("report.reasonLabel")}
          </Label>

          {/* radio group — built as a custom composition of Pressable rows */}
          <View style={styles.radioGroup}>
            {REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => {
                    setSelectedReason(reason);
                    setReasonError(false);
                  }}
                  style={[
                    styles.radioRow,
                    {
                      flexDirection: isRtl ? "row-reverse" : "row",
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.muted : "transparent",
                    },
                  ]}
                  android_ripple={{ color: colors.muted }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                >
                  {/* radio indicator */}
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        marginEnd: isRtl ? 0 : 10,
                        marginStart: isRtl ? 10 : 0,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </View>

                  <Text
                    className="text-sm"
                    style={{ flex: 1, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
                  >
                    {t(`report.reasons.${reason}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* reason validation error */}
          {reasonError && (
            <Text
              className="text-xs"
              style={{
                color: colors.destructive,
                marginTop: 4,
                marginBottom: 8,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("report.reasonRequired")}
            </Text>
          )}

          {/* optional note */}
          <View style={styles.noteSection}>
            <Label
              className="mb-2"
              style={{ textAlign: isRtl ? "right" : "left" }}
            >
              {t("report.noteLabel")}
            </Label>
            <Textarea
              value={note}
              onChangeText={setNote}
              placeholder={t("report.notePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              style={{ textAlign: isRtl ? "right" : "left" }}
              maxLength={500}
            />
          </View>

          {/* spacer so the last field isn't flush against the pinned footer */}
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Pinned action footer — stays OUTSIDE the scroll so Submit/Cancel are
            always visible, including when the keyboard is open and the sheet
            has lifted above it. */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            variant="destructive"
            onPress={handleSubmit}
            disabled={mutation.isPending}
          >
            <Text>
              {mutation.isPending ? t("report.submitting") : t("report.submit")}
            </Text>
          </Button>

          <Button
            variant="ghost"
            onPress={handleClose}
            disabled={mutation.isPending}
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: colors.mutedForeground }}>
              {t("common.cancel")}
            </Text>
          </Button>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: "88%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerIcon: {
    flexShrink: 0,
  },
  closeBtn: {
    padding: 4,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 8,
  },
  radioRow: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noteSection: {
    marginTop: 16,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

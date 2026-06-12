/**
 * ReportSheet — slide-up modal for reporting a Listing or User.
 *
 * Uses raw RN <Modal animationType="slide"> because @gorhom/bottom-sheet
 * requires a native build setup that is not yet in this project. All inner
 * UI is RNR components.
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
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { useMutation } from "@tanstack/react-query";
import { X, Flag } from "lucide-react-native";

import { reportsAPI, ReportableType, ReportReason } from "@/api/reports";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Textarea } from "@/components/reusables/textarea";
import { Separator } from "@/components/reusables/separator";
import { Label } from "@/components/reusables/label";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

// ─── types ──────────────────────────────────────────────────────────────────

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  reportableType: ReportableType;
  reportableId: number;
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
}: ReportSheetProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

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
      handleClose();
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
      {/* backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      {/* sheet surface */}
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
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
            <Text className="text-lg font-semibold text-foreground">
              {t("report.title")}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            hitSlop={10}
            style={styles.closeBtn}
          >
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text className="text-sm text-muted-foreground mb-4" style={{ textAlign: isRtl ? "right" : "left" }}>
          {t("report.subtitle")}
        </Text>

        <Separator className="mb-4" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                    className="text-sm text-foreground flex-1"
                    style={{ textAlign: isRtl ? "right" : "left" }}
                  >
                    {t(`report.reasons.${reason}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* reason validation error */}
          {reasonError && (
            <Text className="text-xs text-destructive mt-1 mb-2" style={{ textAlign: isRtl ? "right" : "left" }}>
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

          {/* submit */}
          <Button
            variant="destructive"
            onPress={handleSubmit}
            disabled={mutation.isPending}
            className="mt-4 mb-2"
          >
            <Text className="text-primary-foreground font-semibold">
              {mutation.isPending
                ? t("report.submitting")
                : t("report.submit")}
            </Text>
          </Button>

          <Button variant="ghost" onPress={handleClose} disabled={mutation.isPending}>
            <Text className="text-muted-foreground">
              {t("common.cancel")}
            </Text>
          </Button>

          {/* bottom padding for safe area */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
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
});

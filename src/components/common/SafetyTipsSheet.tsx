/**
 * SafetyTipsSheet — slide-up modal with localized in-person meetup safety guidance.
 *
 * Hatiwal has no online payment and no delivery — every deal is completed by
 * meeting in person. This reusable sheet surfaces a short, icon-led list of
 * safety tips from two entry points:
 *   1. A quiet link on the listing detail screen (near location / beneath the
 *      sticky "Message Seller" CTA).
 *   2. A quiet link inside the chat meetup-proposal sheet (MeetupSheet).
 *
 * Uses raw RN <Modal animationType="slide"> — all sheets in this project use
 * raw Modal because @gorhom/bottom-sheet has native-only platform splits that
 * crash the web dev runner (Metro can't resolve .native.js files on web).
 * All inner UI is RNR components. See ReportSheet.tsx for the same pattern.
 *
 * Props:
 *   visible — controls visibility
 *   onClose — called when the sheet should close
 */

import React from "react";
import { View, Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  ShieldCheck,
  Users,
  Sun,
  UserPlus,
  Eye,
  Ban,
  Sparkles,
  Flag,
  type LucideIcon,
} from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useReduceMotion } from "@/lib/animation";

// ─── types ──────────────────────────────────────────────────────────────────

interface SafetyTipsSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Ordered tip keys — must match safety.meetup.tips.* in all 3 locale files.
const TIPS: { key: string; icon: LucideIcon }[] = [
  { key: "publicPlace", icon: Users },
  { key: "daylight", icon: Sun },
  { key: "bringFriend", icon: UserPlus },
  { key: "inspectItem", icon: Eye },
  { key: "noAdvancePayment", icon: Ban },
  { key: "trustInstincts", icon: Sparkles },
  { key: "reportSuspicious", icon: Flag },
];

// ─── component ───────────────────────────────────────────────────────────────

export function SafetyTipsSheet({ visible, onClose }: SafetyTipsSheetProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "none" : "slide"}
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* header */}
        <View style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <View style={[styles.headerLeft, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <ShieldCheck size={18} color={colors.success} style={styles.headerIcon} />
            <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
              {t("safety.meetup.title")}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.closeBtn}
            android_ripple={{ color: colors.muted, borderless: true }}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
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
          {t("safety.meetup.subtitle")}
        </Text>

        <Separator className="mb-4" />

        <ScrollView
          style={{ flexShrink: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tipList}>
            {TIPS.map(({ key, icon: TipIcon }) => (
              <View
                key={key}
                style={[styles.tipRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}
              >
                <View
                  style={[
                    styles.tipIconWrap,
                    {
                      backgroundColor: colors.successAlpha,
                      marginEnd: isRtl ? 0 : 12,
                      marginStart: isRtl ? 12 : 0,
                    },
                  ]}
                >
                  <TipIcon size={16} color={colors.success} />
                </View>
                <Text
                  className="text-sm"
                  style={{ flex: 1, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
                >
                  {t(`safety.meetup.tips.${key}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* spacer so the last tip isn't flush against the pinned footer */}
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Pinned footer — stays OUTSIDE the scroll so Close is always visible. */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button variant="ghost" onPress={onClose}>
            <Text style={{ color: colors.mutedForeground }}>{t("common.close")}</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  tipList: {
    gap: 14,
  },
  tipRow: {
    alignItems: "flex-start",
  },
  tipIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

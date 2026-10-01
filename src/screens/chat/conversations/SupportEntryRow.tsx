/**
 * SupportEntryRow — the permanent "Hatiwal Support" entry at the top of the
 * inbox, shown while the user has no support thread yet. Once one exists the
 * server pins the real thread first and ConversationRow renders it instead, so
 * there is always exactly one Support row in the inbox.
 *
 * Pattern from real apps (Mobbin, 2026-10-01): BlaBlaCar's inbox keeps a
 * permanent brand row on top — bold name, one-line purpose, chevron — even
 * with no conversation; Airbnb and Vinted render their support/brand thread
 * as an ordinary inbox row with the brand logo + verified tick. This row is
 * the BlaBlaCar shape drawn with ConversationRow's geometry (54px thumb,
 * 14/12 type), so it reads as part of the list, not a banner.
 *
 * Tapping goes through useOpenSupport (POST /support_conversation — creates
 * the thread on first use, retry toast on failure).
 */
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Logomark } from "@/components/common/Logomark";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

const THUMB = 54;

export function SupportEntryRow({ onPress, isOpening = false }: { onPress: () => void; isOpening?: boolean }) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const name = t("chat.support.name");

  return (
    <Pressable
      onPress={onPress}
      disabled={isOpening}
      testID="support-entry-row"
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${t("chat.support.entrySubtitle")}`}
      accessibilityState={{ busy: isOpening }}
      android_ripple={{ color: colors.muted }}
      style={[
        styles.row,
        {
          flexDirection: isRtl ? "row-reverse" : "row",
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.thumb}>
        <Logomark size={THUMB} />
      </View>

      <View style={styles.content}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 5 }}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
            {name}
          </Text>
          <VerifiedBadge size={14} />
        </View>
        <Text
          numberOfLines={1}
          style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }]}
        >
          {t("chat.support.entrySubtitle")}
        </Text>
      </View>

      {isOpening ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        // Mirror on the wrapping View, never on the <Svg> (draws nothing on Android).
        <View style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  content: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 19, flexShrink: 1 },
  subtitle: { fontSize: 12, lineHeight: 17 },
});

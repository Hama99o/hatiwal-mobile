/**
 * DaySeparator — non-bubble row rendered inline in the conversation thread's
 * FlatList (TASK-D428). Two variants:
 *  - variant="day": a centered muted pill labelled "Today" / "Yesterday" /
 *    a locale-formatted date (via useLocalization().formatDate) for anything
 *    older — so Dari/Pashto get their own date formatting.
 *  - variant="unread": a hairline `colors.primary` rule with a centered
 *    "Unread messages" label, marking where new messages start.
 */
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { classifyDay } from "./groupMessagesByDay";

export type DaySeparatorProps = { variant: "day"; iso: string } | { variant: "unread" };

export function DaySeparator(props: DaySeparatorProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { formatDate } = useLocalization();

  if (props.variant === "unread") {
    const label = t("chat.unreadDivider");
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={label}
        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: colors.primary }} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{label}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.primary }} />
      </View>
    );
  }

  const kind = classifyDay(props.iso);
  const label =
    kind === "today" ? t("chat.day.today") : kind === "yesterday" ? t("chat.day.yesterday") : formatDate(props.iso);

  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={{ alignItems: "center", paddingVertical: 10 }}>
      <View style={{ backgroundColor: colors.muted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>{label}</Text>
      </View>
    </View>
  );
}

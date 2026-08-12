/**
 * DaySeparator — non-bubble row rendered inline in the conversation thread's
 * FlatList (TASK-D428). Two variants:
 *  - variant="day": a centered muted pill labelled "Today" / "Yesterday" /
 *    a locale-formatted date (via useLocalization().formatDate) for anything
 *    older — so Dari/Pashto get their own date formatting.
 *  - variant="unread": a hairline `colors.primary` rule with a centered
 *    "Unread messages" label, marking where new messages start.
 *
 * Review fix (CR MED): both variants now build on the shared RNR `Badge`
 * (the day pill) and `Separator` (the unread rule) instead of hand-rolling
 * an equivalent `View`+`Text` — the house rule is to extend a shared
 * component, never fork one; `Separator` gained an optional `color`/`style`
 * so this is the only caller that needs a non-default line color.
 */
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { Separator } from "@/components/reusables/separator";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { classifyDay } from "./groupMessagesByDay";

export type DaySeparatorProps = { variant: "day"; iso: string } | { variant: "unread" };

/**
 * Milliseconds until the next local midnight (plus a 1s buffer so the timer
 * never fires a hair early and reads the still-current day).
 */
function msUntilNextMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return nextMidnight.getTime() - now.getTime();
}

export function DaySeparator(props: DaySeparatorProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { formatDate } = useLocalization();

  // Review fix (CR LOW): `classifyDay` is pure and re-evaluates `now` fresh
  // on every call, but a thread left open across a real midnight rollover
  // would otherwise keep showing a render from BEFORE midnight (e.g. "Today"
  // for a message that is now "Yesterday") until something unrelated forces
  // a re-render. `tick` forces exactly one re-render right after the next
  // local midnight, then reschedules itself for the one after that — no
  // polling interval, just a single timer per mount.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (props.variant !== "day") return;
    const timeout = setTimeout(() => setTick((n) => n + 1), msUntilNextMidnight());
    return () => clearTimeout(timeout);
    // `tick` in the deps is what re-arms the timer for the FOLLOWING
    // midnight once this one fires — not read for anything else.
  }, [props.variant, tick]);

  if (props.variant === "unread") {
    const label = t("chat.unreadDivider");
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={label}
        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        <Separator color={colors.primary} style={{ flex: 1, width: undefined }} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{label}</Text>
        <Separator color={colors.primary} style={{ flex: 1, width: undefined }} />
      </View>
    );
  }

  const kind = classifyDay(props.iso);
  const label =
    kind === "today" ? t("chat.day.today") : kind === "yesterday" ? t("chat.day.yesterday") : formatDate(props.iso);

  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={{ alignItems: "center", paddingVertical: 10 }}>
      <Badge label={label} variant="muted" style={{ paddingHorizontal: 12 }} />
    </View>
  );
}

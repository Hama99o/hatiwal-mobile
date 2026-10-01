/**
 * SupportSenderLabel — the "Hatiwal Support" line shown above the first bubble
 * of each run of incoming messages in a support thread, so every message reads
 * as coming from Support and not from a person. Ordinary 1:1 threads carry no
 * sender name on bubbles (the header already says who it is); a support thread
 * is different because the admin replying is not the user's counterpart in
 * any marketplace sense.
 *
 * Aligned to the incoming side: start in LTR, end in RTL — the same rule
 * MessageBubble's `bubbleAlign` applies to `!isMine` bubbles.
 */
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import type { ThreadRow } from "./groupMessagesByDay";

/**
 * True when the message row at `index` opens a run of incoming messages —
 * i.e. it is not mine, and the row before it is not an incoming message from
 * the same sender. A day separator or unread divider breaks the run, so the
 * label repeats after one (the reader has lost the visual thread there).
 */
export function startsIncomingRun(
  rows: ThreadRow[],
  index: number,
  currentUserId: number | string | null | undefined
): boolean {
  const row = rows[index];
  if (!row || row.type !== "message" || currentUserId == null) return false;
  if (Number(row.message.sender.id) === Number(currentUserId)) return false;
  const prev = rows[index - 1];
  if (!prev || prev.type !== "message") return true;
  return Number(prev.message.sender.id) !== Number(row.message.sender.id);
}

export function SupportSenderLabel() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const name = t("chat.support.name");

  return (
    <View
      testID="support-sender-label"
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignSelf: isRtl ? "flex-end" : "flex-start",
        alignItems: "center",
        gap: 6,
        marginHorizontal: 14,
        marginTop: 8,
        marginBottom: 2,
      }}
    >
      <UserAvatar name={name} size={16} variant="support" />
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.mutedForeground }}>{name}</Text>
    </View>
  );
}

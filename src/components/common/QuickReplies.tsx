/**
 * QuickReplies — horizontally scrollable chip row of canned phrases for the
 * chat composer. Shown above the input bar so the user can tap a phrase to
 * insert it into the draft without typing from scratch.
 *
 * Props:
 *   role       — 'buyer' or 'seller'. Controls which phrase set is shown.
 *   onSelect   — called with the localized phrase string when a chip is tapped.
 *                The Conversation screen appends/replaces the composer draft and
 *                focuses the input. No auto-send occurs.
 *
 * Design decisions:
 *   - Always visible when canSend is true; hidden on a closed conversation
 *     (the parent gates rendering, not this component).
 *   - Chips are always visible regardless of existing draft length — simpler UX,
 *     avoids flicker, and lets the user add a follow-up phrase to an existing draft.
 *   - Each chip uses Pressable (not RNR Badge) so we can guarantee ≥44 pt touch
 *     target without fighting Badge's internal padding.
 *   - Colors come from useColors() inline styles; className is layout-only.
 *   - RTL: the ScrollView's contentContainerStyle reverses chip order via
 *     flexDirection so chips appear in the correct reading order.
 *
 * Rules followed:
 *   - All strings via t() — no hardcoded phrases.
 *   - No raw Alert.
 *   - No hardcoded hex.
 *   - useColors() for all color tokens.
 */

import React from "react";
import { ScrollView, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuickRepliesRole = "buyer" | "seller";

export interface QuickRepliesProps {
  /** Whether the current user owns the listing (seller) or is inquiring (buyer). */
  role: QuickRepliesRole;
  /** Called with the localized phrase text when a chip is tapped. */
  onSelect: (text: string) => void;
}

// ── Translation key tuples ────────────────────────────────────────────────────

const BUYER_KEYS = [
  "chat.quickReplies.buyer.stillAvailable",
  "chat.quickReplies.buyer.lowestPrice",
  "chat.quickReplies.buyer.whereMeet",
  "chat.quickReplies.buyer.morePhotos",
  "chat.quickReplies.buyer.negotiable",
] as const;

const SELLER_KEYS = [
  "chat.quickReplies.seller.yesAvailable",
  "chat.quickReplies.seller.meetAtPlace",
  "chat.quickReplies.seller.priceFirm",
  "chat.quickReplies.seller.whenFree",
  "chat.quickReplies.seller.sendMorePhotos",
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickReplies({ role, onSelect }: QuickRepliesProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  const keys = role === "seller" ? SELLER_KEYS : BUYER_KEYS;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.card,
      }}
      accessibilityRole="toolbar"
      accessibilityLabel={t("chat.quickReplies.toolbarLabel")}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 10,
          paddingVertical: 8,
          gap: 8,
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
        }}
      >
        {keys.map((key) => {
          const phrase = t(key);
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(phrase)}
              accessibilityRole="button"
              accessibilityLabel={phrase}
              android_ripple={{ color: colors.primaryForeground }}
              style={{
                minHeight: 44,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.foreground,
                  textAlign: isRtl ? "right" : "left",
                }}
                numberOfLines={1}
              >
                {phrase}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

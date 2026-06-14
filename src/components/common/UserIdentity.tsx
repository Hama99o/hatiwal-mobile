import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { UserAvatar } from "./UserAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

interface UserIdentityProps {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
  /** Secondary line under the name — e.g. city, "posted X ago", member-since. */
  subtitle?: string | null;
  /** Avatar diameter. */
  size?: number;
  /** Name font size (defaults scale with avatar size). */
  nameSize?: number;
  /** "row" (avatar beside name — cards/lists) or "stacked" (centered — headers). */
  layout?: "row" | "stacked";
  /** Hide the name (avatar-only). */
  showName?: boolean;
  onPress?: () => void;
}

/**
 * The single source of truth for showing a person in the app: avatar + name +
 * verified tag (+ optional subtitle). Use this everywhere a user/seller appears
 * — listing detail, profiles, lists — instead of re-assembling the pieces.
 * Composes the shared UserAvatar + VerifiedBadge so there is one avatar impl.
 */
export function UserIdentity({
  name,
  avatarUrl,
  verified = false,
  subtitle,
  size = 44,
  nameSize,
  layout = "row",
  showName = true,
  onPress,
}: UserIdentityProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const resolvedNameSize = nameSize ?? Math.max(14, Math.round(size * 0.34));
  const stacked = layout === "stacked";

  const nameRow = (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: stacked ? "center" : "flex-start",
        gap: 5,
      }}
    >
      <Text
        style={{
          fontSize: resolvedNameSize,
          fontWeight: "700",
          color: colors.foreground,
          textAlign: stacked ? "center" : isRtl ? "right" : "left",
        }}
        numberOfLines={1}
      >
        {name}
      </Text>
      {verified && <VerifiedBadge size={Math.round(resolvedNameSize)} />}
    </View>
  );

  const body = (
    <View
      style={{
        flexDirection: stacked ? "column" : isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: stacked ? 8 : 12,
      }}
    >
      <UserAvatar name={name} avatarUrl={avatarUrl} size={size} />
      {showName && (
        <View style={{ flex: stacked ? undefined : 1, gap: 2, alignItems: stacked ? "center" : undefined }}>
          {nameRow}
          {subtitle ? (
            <Text
              style={{ fontSize: 13, color: colors.mutedForeground, textAlign: stacked ? "center" : isRtl ? "right" : "left" }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
        {body}
      </Pressable>
    );
  }
  return body;
}

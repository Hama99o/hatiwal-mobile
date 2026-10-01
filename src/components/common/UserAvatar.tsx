import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { Logomark } from "./Logomark";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  /**
   * "support" — the official Hatiwal Support account: always the brand
   * Logomark, never the account's uploaded photo or an initial, so it can't be
   * mistaken for (or imitated by) an ordinary user.
   */
  variant?: "user" | "support";
}

/**
 * Shows the user's avatar photo if available, otherwise a colored circle
 * with the first letter of their name.
 */
export function UserAvatar({ name, avatarUrl, size = 44, variant = "user" }: UserAvatarProps) {
  const colors = useColors();
  const radius = size / 2;
  const fontSize = size * 0.38;
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  if (variant === "support") {
    return (
      <View
        testID="support-avatar"
        style={[
          styles.container,
          { width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: colors.brandLapis },
        ]}
      >
        <Logomark size={size} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: avatarUrl ? "transparent" : colors.primaryAlpha,
          borderWidth: 1.5,
          borderColor: colors.primary,
          overflow: "hidden",
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Text style={{ fontSize, fontWeight: "700", color: colors.primary }}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

/**
 * Shows the user's avatar photo if available, otherwise a colored circle
 * with the first letter of their name.
 */
export function UserAvatar({ name, avatarUrl, size = 44 }: UserAvatarProps) {
  const colors = useColors();
  const radius = size / 2;
  const fontSize = size * 0.38;
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

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

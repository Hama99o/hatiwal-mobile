import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useAppTransitionStore } from "@/stores/appTransition.store";

/**
 * Full-screen "applying a change" layer for app-wide switches (language,
 * theme). Mounted once at the root; driven by runAppTransition. It covers and
 * blocks the whole app so the tap is visibly acknowledged and cannot repeat.
 */
export function AppTransitionOverlay() {
  const message = useAppTransitionStore((s) => s.message);
  const colors = useColors();
  if (message === null) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="assertive"
      testID="app-transition-overlay"
    >
      <View style={styles.box}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 1000, elevation: 1000, alignItems: "center", justifyContent: "center" },
  box: { alignItems: "center", gap: 16, paddingHorizontal: 32 },
});

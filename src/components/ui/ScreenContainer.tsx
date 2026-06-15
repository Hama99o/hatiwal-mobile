// src/components/ui/ScreenContainer.tsx
// The mandatory outermost wrapper for every screen.
// Applies the correct background color (via useColors() — never a className
// color token), the device safe-area insets, optional padding, and optionally
// wraps children in a ScrollView.

import { View, ScrollView, type ViewStyle, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type SafeAreaEdge = "top" | "bottom";

interface ScreenContainerProps extends Pick<ViewProps, "accessible" | "accessibilityLabel" | "accessibilityRole" | "testID"> {
  children: React.ReactNode;
  /**
   * Wrap children in a ScrollView. Defaults to true.
   * Set to false for list screens that manage their own scroll
   * (e.g. UniversalList), or for a full-bleed splash/loading screen.
   */
  scrollable?: boolean;
  /**
   * Add 16px horizontal padding. Defaults to true.
   * Set to false for full-bleed layouts (galleries, splash, etc.).
   */
  padded?: boolean;
  /**
   * Which device safe-area edges to pad so content clears the notch /
   * status bar (top) and home indicator (bottom). Defaults to ['top'].
   *
   * Pass [] for full-bleed screens that draw their own overlay header
   * with insets (ListingDetail, MyListingDetail) or a screen rendered
   * under a native navigation header. Add 'bottom' for screens with a
   * pinned footer that must clear the home indicator.
   */
  safeArea?: SafeAreaEdge[];
  /**
   * Extra styles applied to the innermost container View.
   */
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = true,
  padded = true,
  safeArea = ["top"],
  style,
  accessible,
  accessibilityLabel,
  accessibilityRole,
  testID,
}: ScreenContainerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const safeAreaPadding: ViewStyle = {
    ...(safeArea.includes("top") ? { paddingTop: insets.top } : {}),
    ...(safeArea.includes("bottom") ? { paddingBottom: insets.bottom } : {}),
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    ...(padded ? { paddingHorizontal: 16 } : {}),
    ...safeAreaPadding,
    ...style,
  };

  const a11yProps = { accessible, accessibilityLabel, accessibilityRole, testID };

  if (scrollable) {
    // For a scroll view the inset padding belongs on the CONTENT container so
    // the scrollable background still bleeds up behind the status bar.
    const scrollContentStyle: ViewStyle = {
      flexGrow: 1,
      backgroundColor: colors.background,
      ...(padded ? { paddingHorizontal: 16 } : {}),
      ...safeAreaPadding,
      ...style,
    };
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={scrollContentStyle}
        keyboardShouldPersistTaps="handled"
        {...a11yProps}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={containerStyle} {...a11yProps}>
      {children}
    </View>
  );
}

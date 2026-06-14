import { View, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Text } from "@/components/reusables/text";
import { RemoteImage } from "./RemoteImage";
import { Heart, MapPin, Camera, Eye } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { useRouter } from "expo-router";

import { type Listing } from "@/api/listings";
import { PriceTag } from "./PriceTag";
import { StatusBadge } from "./StatusBadge";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export interface ListingCardProps {
  listing: Listing;
  /** Show StatusBadge — defaults true for seller mode, false for buyer feed */
  showStatus?: boolean;
  /** Controlled save state — pass undefined to hide the heart */
  isSaved?: boolean;
  onSaveToggle?: (listingId: number, newValue: boolean) => void;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * ListingCard — the core marketplace card used across Browse, Saved,
 * My Listings, and Profile screens.
 *
 * Composition:
 *   expo-image  →  4:3 photo with blurhash placeholder
 *   PriceTag    →  locale-aware currency (second-most prominent)
 *   StatusBadge →  draft/active/reserved/sold token mapping
 *   save-heart  →  animated Reanimated toggle (optimistic)
 *   android_ripple + opacity press feedback
 *   RTL-safe via useLocalization().isRtl
 */
export function ListingCard({
  listing,
  showStatus = false,
  isSaved,
  onSaveToggle,
  onPress,
  style,
}: ListingCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { formatDate, isRtl } = useLocalization();
  const colors = useColors();

  // ── Heart animation ──────────────────────────────────────────────────────
  const heartScale = useSharedValue(1);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleSaveToggle = useCallback(() => {
    if (!onSaveToggle) return;
    // Pop animation
    heartScale.value = withSpring(1.4, { damping: 4, stiffness: 300 }, () => {
      heartScale.value = withSpring(1, { damping: 6, stiffness: 200 });
    });
    onSaveToggle(listing.id, !isSaved);
  }, [onSaveToggle, listing.id, isSaved, heartScale]);

  // ── Card press ───────────────────────────────────────────────────────────
  const cardOpacity = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: withTiming(cardOpacity.value, { duration: 100 }),
  }));

  const handlePressIn = useCallback(() => {
    cardOpacity.value = 0.92;
  }, [cardOpacity]);

  const handlePressOut = useCallback(() => {
    cardOpacity.value = 1;
  }, [cardOpacity]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(main)/listing/${listing.id}` as never);
    }
  }, [onPress, router, listing.id]);

  // ── Derived values ───────────────────────────────────────────────────────
  // Show the LISTING's own location — not the seller's profile city. An item
  // can be listed in a different place than where the seller lives.
  const listingLocation = listing.location ?? null;
  const postedAgo = listing.createdAt ? formatDate(listing.createdAt) : null;
  // "Seen" state — the buyer has already opened this listing.
  const isViewed = listing.isViewed ?? false;

  const metaRowDirection = isRtl ? "row-reverse" : "row";

  return (
    <Animated.View style={[{ overflow: "hidden", borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }, cardAnimStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: colors.muted, foreground: false }}
        accessibilityRole="button"
        accessibilityLabel={listing.title}
        style={styles.card}
      >
        {/* ── Photo ──────────────────────────────────────────────────── */}
        <View style={[styles.imageContainer, { backgroundColor: colors.imagePlaceholder }]}>
          {listing.thumbnailUrl ? (
            <RemoteImage
              uri={listing.thumbnailUrl}
              transition={300}
              style={[styles.image, isViewed && { opacity: 0.62 }]}
              accessibilityLabel={listing.title}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Camera size={28} color={colors.mutedForeground} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{t("listing.noPhoto")}</Text>
            </View>
          )}

          {/* "Seen" badge — shown when the buyer already opened this listing */}
          {isViewed && (
            <View
              style={[
                styles.seenBadge,
                isRtl ? { right: 8 } : { left: 8 },
                { backgroundColor: colors.overlay },
              ]}
            >
              <Eye size={11} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#fff" }}>
                {t("listing.seen")}
              </Text>
            </View>
          )}

          {/* StatusBadge overlay (top-left / top-right depending on RTL) */}
          {showStatus && (
            <View
              style={[
                styles.statusOverlay,
                isRtl ? styles.statusOverlayRtl : styles.statusOverlayLtr,
              ]}
            >
              <StatusBadge status={listing.status} />
            </View>
          )}

          {/* Save heart (top-right / top-left depending on RTL) */}
          {isSaved !== undefined && onSaveToggle && (
            <Pressable
              onPress={handleSaveToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.heartButton,
                isRtl ? styles.heartButtonRtl : styles.heartButtonLtr,
              ]}
              accessibilityRole="togglebutton"
              accessibilityLabel={
                isSaved ? t("listing.unsave") : t("listing.save")
              }
              accessibilityState={{ checked: isSaved }}
            >
              <Animated.View style={heartAnimStyle}>
                <Heart
                  size={20}
                  color={isSaved ? colors.destructive : colors.primaryForeground}
                  fill={isSaved ? colors.destructive : "transparent"}
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>
          )}
        </View>

        {/* ── Card body ──────────────────────────────────────────────── */}
        <View style={{ padding: 12, gap: 6 }}>
          {/* Price — hero element */}
          <PriceTag
            price={listing.price}
            currency={listing.currency}
            size="md"
          />

          {/* Title */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              textAlign: isRtl ? "right" : "left",
              color: isViewed ? colors.mutedForeground : colors.foreground,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>

          {/* Meta row: listing location + posted date */}
          <View style={{ flexDirection: metaRowDirection, gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {listingLocation ? (
              <View style={{ flexDirection: metaRowDirection, alignItems: "center", gap: 2 }}>
                <MapPin size={11} color={colors.mutedForeground} />
                <Text
                  style={{ fontSize: 12, color: colors.mutedForeground }}
                  numberOfLines={1}
                >
                  {listingLocation}
                </Text>
              </View>
            ) : null}
            {postedAgo ? (
              <Text
                style={{ fontSize: 12, color: colors.mutedForeground }}
                numberOfLines={1}
              >
                {postedAgo}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  statusOverlay: {
    position: "absolute",
    top: 8,
  },
  statusOverlayLtr: {
    left: 8,
  },
  statusOverlayRtl: {
    right: 8,
  },
  seenBadge: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heartButton: {
    position: "absolute",
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartButtonLtr: {
    right: 8,
  },
  heartButtonRtl: {
    left: 8,
  },
});

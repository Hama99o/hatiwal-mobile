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
import { useListItemEntering, triggerHaptic, useReduceMotion } from "@/lib/animation";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { useRouter } from "expo-router";

import { type Listing } from "@/api/listings";
import { PriceTag } from "./PriceTag";
import { StatusBadge } from "./StatusBadge";
import { PriceDropBadge } from "./PriceDropBadge";
import { VerifiedBadge } from "./VerifiedBadge";
import { Badge } from "@/components/reusables/badge";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export interface ListingCardProps {
  listing: Listing;
  /** Position in the list — used for staggered entrance animation */
  index?: number;
  /** Show StatusBadge — defaults true for seller mode, false for buyer feed */
  showStatus?: boolean;
  /** Controlled save state — pass undefined to hide the heart */
  isSaved?: boolean;
  onSaveToggle?: (listingId: number, newValue: boolean) => void;
  onPress?: () => void;
  style?: ViewStyle;
  /**
   * Layout variant:
   *   'grid'  — vertical card (photo top, info bottom). DEFAULT. Used by Browse grid,
   *             Saved, My Listings — all existing callers get this automatically.
   *   'list'  — horizontal compact row (photo leading, info trailing). Used by
   *             Browse list mode only.
   */
  variant?: "grid" | "list";
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
  index,
  showStatus = false,
  isSaved,
  onSaveToggle,
  onPress,
  style,
  variant = "grid",
}: ListingCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { formatDate, isRtl } = useLocalization();
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  // Reduce-motion aware entering animation factory — returns undefined when
  // the OS "Reduce Motion" setting is on, so Reanimated skips the transition.
  const getEntering = useListItemEntering();

  // ── Heart animation ──────────────────────────────────────────────────────
  const heartScale = useSharedValue(1);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleSaveToggle = useCallback(() => {
    if (!onSaveToggle) return;
    triggerHaptic("light", reduceMotion);
    if (!reduceMotion) {
      heartScale.value = withSpring(1.4, { damping: 4, stiffness: 300 }, () => {
        heartScale.value = withSpring(1, { damping: 6, stiffness: 200 });
      });
    }
    onSaveToggle(listing.id, !isSaved);
  }, [onSaveToggle, listing.id, isSaved, heartScale, reduceMotion]);

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
      // Route confirmed at app/(main)/listing/[id].tsx
      router.push({ pathname: "/(main)/listing/[id]", params: { id: String(listing.id) } });
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

  // ── List variant (horizontal compact row) ────────────────────────────────
  if (variant === "list") {
    // In RTL the photo sits on the right — achieved by row-reverse.
    return (
      <Animated.View
        entering={index !== undefined ? getEntering(index) : undefined}
        style={[
          {
            overflow: "hidden",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
          cardAnimStyle,
          style,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          android_ripple={{ color: colors.muted, foreground: false }}
          accessibilityRole="button"
          accessibilityLabel={listing.title}
          testID="listing-card"
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            minHeight: 96,
          }}
        >
          {/* ── Thumbnail ──────────────────────────────────────────── */}
          <View
            style={[
              styles.listImageContainer,
              { backgroundColor: colors.imagePlaceholder },
            ]}
          >
            {listing.thumbnailUrl ? (
              <RemoteImage
                uri={listing.thumbnailUrl}
                transition={300}
                style={[styles.listImage, isViewed && { opacity: 0.62 }]}
                accessibilityLabel={listing.title}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Camera size={22} color={colors.mutedForeground} />
              </View>
            )}

            {/* "Seen" badge */}
            {isViewed && (
              <View
                style={[
                  styles.seenBadge,
                  isRtl ? { right: 6 } : { left: 6 },
                  { backgroundColor: colors.overlay },
                ]}
              >
                <Eye size={10} color={colors.overlayForeground} />
                <Text style={{ fontSize: 10, fontWeight: "600", color: colors.overlayForeground }}>
                  {t("listing.seen")}
                </Text>
              </View>
            )}
          </View>

          {/* ── Info ────────────────────────────────────────────────── */}
          <View
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 3,
              justifyContent: "center",
            }}
          >
            {/* Price — hero in list mode too */}
            <PriceTag
              price={listing.price}
              currency={listing.currency}
              size="md"
            />

            {/* Price-drop badge in list mode — tiny pill after price */}
            {listing.priceDropPercent != null && listing.priceDropPercent > 0 && (
              <PriceDropBadge percent={listing.priceDropPercent} variant="card" />
            )}

            {/* Firm-price badge in list mode */}
            {listing.negotiable === false && (
              <View
                testID="firm-price-badge"
                style={{ alignSelf: isRtl ? "flex-end" : "flex-start" }}
              >
                <Badge
                  label={t("listing.firmPrice")}
                  variant="muted"
                />
              </View>
            )}

            {/* Title */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "400",
                lineHeight: 18,
                textAlign: isRtl ? "right" : "left",
                color: isViewed ? colors.mutedForeground : colors.foreground,
              }}
              numberOfLines={2}
            >
              {listing.title}
            </Text>

            {/* Meta row: location + VerifiedBadge + StatusBadge */}
            {(listingLocation || showStatus || listing.seller?.verified) ? (
              <View
                style={{
                  flexDirection: metaRowDirection,
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 2,
                }}
              >
                {listingLocation ? (
                  <View
                    style={{
                      flexDirection: metaRowDirection,
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <MapPin size={10} color={colors.mutedForeground} />
                    <Text
                      style={{ fontSize: 11, color: colors.mutedForeground }}
                      numberOfLines={1}
                    >
                      {listingLocation}
                    </Text>
                  </View>
                ) : null}
                {listing.seller?.verified && (
                  <VerifiedBadge size={12} accessibilityLabel={t("listing.card.verifiedSeller")} />
                )}
                {showStatus && <StatusBadge status={listing.status} />}
              </View>
            ) : null}
          </View>

          {/* ── Save heart ──────────────────────────────────────────── */}
          {isSaved !== undefined && onSaveToggle && (
            <Pressable
              onPress={handleSaveToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 44,
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center",
                paddingRight: isRtl ? 0 : 4,
                paddingLeft: isRtl ? 4 : 0,
              }}
              accessibilityRole="togglebutton"
              accessibilityLabel={isSaved ? t("listing.unsave") : t("listing.save")}
              accessibilityState={{ checked: isSaved }}
            >
              <Animated.View style={heartAnimStyle}>
                <Heart
                  size={20}
                  color={isSaved ? colors.destructive : colors.mutedForeground}
                  fill={isSaved ? colors.destructive : "transparent"}
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── Grid variant (default — vertical card) ───────────────────────────────
  return (
    <Animated.View
      entering={index !== undefined ? getEntering(index) : undefined}
      style={[
        {
          overflow: "hidden",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        cardAnimStyle,
        style,
      ]}
    >
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
              <Eye size={11} color={colors.overlayForeground} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.overlayForeground }}>
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

          {/* Price-drop corner badge — bottom-right (LTR) / bottom-left (RTL) overlay */}
          {listing.priceDropPercent != null && listing.priceDropPercent > 0 && (
            <View
              style={[
                styles.priceDropOverlay,
                isRtl ? styles.priceDropOverlayRtl : styles.priceDropOverlayLtr,
              ]}
            >
              <PriceDropBadge percent={listing.priceDropPercent} variant="card" />
            </View>
          )}

          {/* Save heart — outer 44px Pressable (touch target), inner 36px scrim circle */}
          {isSaved !== undefined && onSaveToggle && (
            <Pressable
              onPress={handleSaveToggle}
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
              <View style={[styles.heartScrim, { backgroundColor: colors.darkScrim }]}>
                <Animated.View style={heartAnimStyle}>
                  <Heart
                    size={18}
                    // The heart sits on a dark rgba scrim — use overlayForeground (white)
                    // for unfilled state regardless of theme so it's legible on any photo.
                    color={isSaved ? colors.destructive : colors.overlayForeground}
                    fill={isSaved ? colors.destructive : "transparent"}
                    strokeWidth={2.5}
                  />
                </Animated.View>
              </View>
            </Pressable>
          )}
        </View>

        {/* ── Card body ──────────────────────────────────────────────── */}
        <View style={{ padding: 10, paddingTop: 8, gap: 3, minHeight: 80 }}>
          {/* Price — hero element: larger, bolder, more vertical space */}
          <PriceTag
            price={listing.price}
            currency={listing.currency}
            size="md"
          />

          {/* Firm-price badge — only when negotiable is explicitly false */}
          {listing.negotiable === false && (
            <View
              testID="firm-price-badge"
              style={{ alignSelf: isRtl ? "flex-end" : "flex-start" }}
            >
              <Badge
                label={t("listing.firmPrice")}
                variant="muted"
              />
            </View>
          )}

          {/* Title — secondary to price */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "400",
              lineHeight: 18,
              textAlign: isRtl ? "right" : "left",
              color: isViewed ? colors.mutedForeground : colors.foreground,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>

          {/* Meta row: listing location + VerifiedBadge */}
          {(listingLocation || listing.seller?.verified) ? (
            <View
              style={{
                flexDirection: metaRowDirection,
                alignItems: "center",
                gap: 4,
                marginTop: 2,
                flexWrap: "wrap",
              }}
            >
              {listingLocation ? (
                <View
                  style={{
                    flexDirection: metaRowDirection,
                    alignItems: "center",
                    gap: 2,
                    flex: 1,
                  }}
                >
                  <MapPin size={10} color={colors.mutedForeground} />
                  <Text
                    style={{ fontSize: 11, color: colors.mutedForeground, flex: 1 }}
                    numberOfLines={1}
                  >
                    {listingLocation}
                  </Text>
                </View>
              ) : null}
              {listing.seller?.verified && (
                <VerifiedBadge size={12} accessibilityLabel={t("listing.card.verifiedSeller")} />
              )}
            </View>
          ) : null}
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
  // ── List variant ───────────────────────────────────────────────────
  listImageContainer: {
    width: 108,
    aspectRatio: 4 / 3,
    position: "relative",
    flexShrink: 0,
    borderRadius: 0,
  },
  listImage: {
    width: "100%",
    height: "100%",
  },
  // ── Shared overlays ────────────────────────────────────────────────
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
  // 44×44 touch target — the visible scrim circle is 36px, centered inside.
  heartButton: {
    position: "absolute",
    top: 4,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heartButtonLtr: {
    right: 4,
  },
  heartButtonRtl: {
    left: 4,
  },
  heartScrim: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor applied inline via colors.darkScrim (useColors token)
    alignItems: "center",
    justifyContent: "center",
  },
  // Price-drop badge corner overlay — bottom-right (LTR) / bottom-left (RTL).
  // IMPORTANT: seenBadge sits at bottom-LEFT (LTR) / bottom-RIGHT (RTL), and
  // priceDropOverlay sits at bottom-RIGHT (LTR) / bottom-LEFT (RTL) — opposite
  // corners intentionally so they never overlap.  If either badge is ever moved
  // to the same corner as the other, add a vertical offset to prevent collision.
  priceDropOverlay: {
    position: "absolute",
    bottom: 8,
  },
  priceDropOverlayLtr: {
    right: 8,
  },
  priceDropOverlayRtl: {
    left: 8,
  },
});

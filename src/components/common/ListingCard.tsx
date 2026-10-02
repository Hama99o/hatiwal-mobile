import { View, Pressable, StyleSheet, ViewStyle, Modal, Text as RNText } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/reusables/text";
import { RemoteImage } from "./RemoteImage";
import { Heart, MapPin, Camera, Eye, EyeOff } from "lucide-react-native";
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
import { agoParts, shortLocation } from "@/lib/listingMeta";
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
  /**
   * "Not interested" — when provided, a long-press on the card opens a small
   * action menu with a single "Not interested" row that dismisses the listing
   * from the current user's own feed. Distinct from the save-heart.
   */
  onHide?: (listingId: number) => void;
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
  onHide,
  style,
  variant = "grid",
}: ListingCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { formatNumber, isRtl } = useLocalization();
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  // Reduce-motion aware entering animation factory — returns undefined when
  // the OS "Reduce Motion" setting is on, so Reanimated skips the transition.
  const getEntering = useListItemEntering();

  // ── "Not interested" action menu ─────────────────────────────────────────
  const [menuVisible, setMenuVisible] = useState(false);
  const handleLongPress = useCallback(() => {
    if (!onHide) return;
    setMenuVisible(true);
  }, [onHide]);
  const handleHide = useCallback(() => {
    setMenuVisible(false);
    onHide?.(listing.id);
  }, [onHide, listing.id]);

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
  // A feed card carries an `entering` layout animation (see `getEntering`
  // below), and Reanimated's layout-animation mechanism OWNS `opacity` on that
  // shadow node to fade the card in. Writing opacity from `useAnimatedStyle` on
  // the same node fights it, which Reanimated reports on every app launch:
  //
  //   [Reanimated] Property "opacity" of AnimatedComponent(View) may be
  //   overwritten by a layout animation.
  //
  // That warning is the yellow LogBox strip at the bottom of the screen on a
  // dev build — and it is not only noise: the fade can fail to play, or settle
  // at the pressed opacity instead of animating.
  //
  // Same fix `AnimatedPressable` already uses for the identical clash: when an
  // entering animation is active, the layout animation exclusively owns opacity
  // and press feedback is expressed as SCALE instead. Scale does not conflict,
  // so the card still responds to touch on both platforms — unlike simply
  // dropping the opacity, which would leave iOS with no feedback at all
  // (Android has android_ripple either way).
  const hasEntering = index !== undefined;
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() =>
    hasEntering
      ? { transform: [{ scale: withTiming(cardScale.value, { duration: 100 }) }] }
      : { opacity: withTiming(cardOpacity.value, { duration: 100 }) }
  );

  const handlePressIn = useCallback(() => {
    if (hasEntering) cardScale.value = 0.98;
    else cardOpacity.value = 0.92;
  }, [hasEntering, cardScale, cardOpacity]);

  const handlePressOut = useCallback(() => {
    if (hasEntering) cardScale.value = 1;
    else cardOpacity.value = 1;
  }, [hasEntering, cardScale, cardOpacity]);

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
  // Shortened ("10th District, Kabul, Kabul District" → "10th District, Kabul")
  // and led by the listing's age, as Nextdoor and Facebook Marketplace do:
  // "2d · 10th District, Kabul" (docs/design/LISTING_CARDS.md).
  const listingLocation = shortLocation(listing.location);
  const ago = agoParts(listing.createdAt);
  const agoLabel = ago
    ? t(`listing.card.ago.${ago.unit}`, { n: formatNumber(ago.n) })
    : null;
  const metaText = [agoLabel, listingLocation].filter(Boolean).join(" · ") || null;
  // "Seen" state — the buyer has already opened this listing.
  const isViewed = listing.isViewed ?? false;

  const metaRowDirection = isRtl ? "row-reverse" : "row";

  // ── List variant (horizontal compact row) ────────────────────────────────
  if (variant === "list") {
    // In RTL the photo sits on the right — achieved by row-reverse.
    return (
      <>
      {/* Two nodes on purpose: the entering layout animation (fade + slide)
          on the wrapper, the press scale on the inner view. On one node,
          Reanimated 4.5 lets the press transform overwrite the entering one,
          and rows were left invisible mid-list (owner report, 2026-10-02). */}
      <Animated.View
        entering={hasEntering ? getEntering(index!) : undefined}
        style={style}
      >
      <Animated.View
        style={[
          // No bordered box: the photo carries the card (Depop, Nextdoor, eBay
          // on Mobbin, docs/design/LISTING_CARDS.md). A box around a dark card
          // read as a large empty panel once the text block was short.
          { borderRadius: 12 },
          cardAnimStyle,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={onHide ? handleLongPress : undefined}
          android_ripple={{ color: colors.muted, foreground: false }}
          accessibilityRole="button"
          accessibilityLabel={listing.title}
          testID="listing-card"
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 4,
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
              gap: 3,
              justifyContent: "center",
            }}
          >
            {/* Price — hero in list mode too, with the firm-price chip on the
                same line instead of a row of its own. */}
            <View style={{ flexDirection: metaRowDirection, alignItems: "center", gap: 8 }}>
              <PriceTag
                price={listing.price}
                currency={listing.currency}
                size="md"
                perUnit={listing.multiUnit === true}
              />
              {listing.negotiable === false && (
                <View testID="firm-price-badge">
                  <Badge label={t("listing.firmPrice")} variant="muted" />
                </View>
              )}
            </View>

            {/* Price-drop badge in list mode — tiny pill after price. Suppressed when
                the per-buyer saved badge below is already showing a drop signal for
                this card — showing both is a redundant, competing "price dropped"
                message (TASK-Y316 review). */}
            {listing.priceDropPercent != null &&
              listing.priceDropPercent > 0 &&
              !listing.priceDropped && (
                <PriceDropBadge percent={listing.priceDropPercent} variant="card" />
              )}

            {/* Per-buyer "price dropped since you saved it" badge — Saved screen only (TASK-Y316) */}
            {listing.priceDropped && (
              <PriceDropBadge
                variant="saved"
                oldPrice={listing.priceAtSave ?? undefined}
                newPrice={listing.price}
                currency={listing.currency}
              />
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
            {(metaText || showStatus || listing.seller?.verified) ? (
              <View
                style={{
                  flexDirection: metaRowDirection,
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 2,
                }}
              >
                {metaText ? (
                  <View
                    style={{
                      flexDirection: metaRowDirection,
                      alignItems: "center",
                      gap: 2,
                      flexShrink: 1,
                    }}
                  >
                    {listingLocation ? <MapPin size={10} color={colors.mutedForeground} /> : null}
                    <Text
                      style={{ fontSize: 11, color: colors.mutedForeground, flexShrink: 1 }}
                      numberOfLines={1}
                      testID="listing-card-meta"
                    >
                      {metaText}
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
              // The card's save heart had an accessibilityLabel but no testID, and
              // that label is both translated AND state-dependent (Save/Unsave), so
              // it is unusable as a handle. Flows were targeting "save-button-0",
              // "-1", "-2", which existed nowhere; with a stable id they select the
              // Nth card's heart via Maestro's `index`. Same id in both the list and
              // grid variants so the two behave identically.
              testID="save-button"
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
      </Animated.View>
      {onHide && (
        <NotInterestedMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onHide={handleHide}
        />
      )}
      </>
    );
  }

  // ── Grid variant (default — vertical card) ───────────────────────────────
  return (
    <>
    {/* Wrapper owns the entering animation, inner view the press scale:
        see the list variant above for why they must not share a node. */}
    <Animated.View
      entering={hasEntering ? getEntering(index!) : undefined}
      style={style}
    >
    <Animated.View style={[{ borderRadius: 12 }, cardAnimStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onHide ? handleLongPress : undefined}
        android_ripple={{ color: colors.muted, foreground: false }}
        accessibilityRole="button"
        accessibilityLabel={listing.title}
        testID="listing-card"
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

          {/* Price-drop corner badge — bottom-right (LTR) / bottom-left (RTL).
              One corner, one signal: the per-buyer "dropped since you saved it"
              badge (Saved screen, TASK-Y316) when present, else the listing's own
              percent drop. It lived in a fixed 26dp body row before, which sat
              empty on almost every card (the gap the owner reported 2026-10-02). */}
          {(listing.priceDropped ||
            (listing.priceDropPercent != null && listing.priceDropPercent > 0)) && (
            <View
              style={[
                styles.priceDropOverlay,
                isRtl ? styles.priceDropOverlayRtl : styles.priceDropOverlayLtr,
              ]}
            >
              {listing.priceDropped ? (
                <PriceDropBadge
                  variant="saved"
                  compact
                  oldPrice={listing.priceAtSave ?? undefined}
                  newPrice={listing.price}
                  currency={listing.currency}
                />
              ) : (
                <PriceDropBadge percent={listing.priceDropPercent!} variant="card" />
              )}
            </View>
          )}

          {/* Save heart — outer 44px Pressable (touch target), inner 36px scrim circle */}
          {isSaved !== undefined && onSaveToggle && (
            <Pressable
              onPress={handleSaveToggle}
              // The card's save heart had an accessibilityLabel but no testID, and
              // that label is both translated AND state-dependent (Save/Unsave), so
              // it is unusable as a handle. Flows were targeting "save-button-0",
              // "-1", "-2", which existed nowhere; with a stable id they select the
              // Nth card's heart via Maestro's `index`. Same id in both the list and
              // grid variants so the two behave identically.
              testID="save-button"
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
        {/*
          Every row below is a FIXED-HEIGHT slot that is ALWAYS rendered — even
          when its content is empty — so a card's total height never depends on
          which optional bits (firm-price badge, price-drop badge, a short
          1-line title, a missing location) happen to apply to THIS listing.

          This matters because @shopify/flash-list's numColumns grid has no
          `columnWrapperStyle` (that's a FlatList-only prop that stretches row
          siblings to match height) — so the only way to keep the two cards in
          every grid row bottom-aligned is to give every card the SAME total
          height, regardless of content.
        */}
        <View style={{ paddingTop: 8, paddingHorizontal: 2, gap: 2 }}>
          {/* Price row — the hero, with the firm-price chip beside it. Fixed
              height so every card in a FlashList row stays the same height
              (no columnWrapperStyle there), but nothing is reserved empty. */}
          <View
            style={{
              height: 24,
              flexDirection: metaRowDirection,
              alignItems: "center",
              gap: 6,
              overflow: "hidden",
            }}
          >
            <PriceTag
              price={listing.price}
              currency={listing.currency}
              size="md"
              perUnit={listing.multiUnit === true}
            />
            {listing.negotiable === false && (
              <View testID="firm-price-badge" style={{ flexShrink: 1 }}>
                <Badge label={t("listing.firmPrice")} variant="muted" />
              </View>
            )}
          </View>

          {/* Title — one line, like Depop, Nextdoor and Facebook Marketplace.
              The full title is one tap away; two fixed lines left a blank line
              under every short title. */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "400",
              lineHeight: 18,
              height: 18,
              textAlign: isRtl ? "right" : "left",
              color: isViewed ? colors.mutedForeground : colors.foreground,
            }}
            numberOfLines={1}
          >
            {listing.title}
          </Text>

          {/* Meta row slot — listing location + VerifiedBadge. Fixed height,
              always reserved: `location` is an optional field, so some listings
              have it and some don't — leaving the row out of the tree entirely
              when absent would shrink that card versus its row neighbor. */}
          <View
            style={{
              height: 16,
              flexDirection: metaRowDirection,
              alignItems: "center",
              gap: 4,
            }}
          >
            {metaText ? (
              <View
                style={{
                  flexDirection: metaRowDirection,
                  alignItems: "center",
                  gap: 2,
                  flex: 1,
                }}
              >
                {listingLocation ? <MapPin size={10} color={colors.mutedForeground} /> : null}
                <Text
                  style={{ fontSize: 11, color: colors.mutedForeground, flex: 1, textAlign: isRtl ? "right" : "left" }}
                  numberOfLines={1}
                  testID="listing-card-meta"
                >
                  {metaText}
                </Text>
              </View>
            ) : null}
            {listing.seller?.verified && (
              <VerifiedBadge size={12} accessibilityLabel={t("listing.card.verifiedSeller")} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
    </Animated.View>
    {onHide && (
      <NotInterestedMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onHide={handleHide}
      />
    )}
    </>
  );
}

/**
 * NotInterestedMenu — bottom-slide action menu with a single "Not interested"
 * row. Mirrors the ConversationRow action-menu pattern (RNText for labels).
 */
function NotInterestedMenu({
  visible,
  onClose,
  onHide,
}: {
  visible: boolean;
  onClose: () => void;
  onHide: () => void;
}) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="listing-not-interested-menu"
    >
      <View style={{ flex: 1, backgroundColor: colors.darkScrim }} onTouchEnd={onClose}>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            // Clear the Android system nav bar — Math.max keeps the existing
            // 32pt minimum on devices with no bottom inset.
            paddingBottom: Math.max(insets.bottom, 32) + 12,
          }}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <Pressable
              onPress={onHide}
              testID="menu-not-interested"
              android_ripple={{ color: colors.muted }}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 4,
                gap: 12,
              }}
            >
              <EyeOff size={20} color={colors.foreground} />
              <RNText style={{ fontSize: 15, color: colors.foreground, fontWeight: "500", flex: 1 }}>
                {t("listing.notInterested")}
              </RNText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  // ── List variant ───────────────────────────────────────────────────
  listImageContainer: {
    width: 96,
    aspectRatio: 1,
    position: "relative",
    flexShrink: 0,
    borderRadius: 10,
    overflow: "hidden",
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

/**
 * ListingDetail — full buyer view of a single listing.
 *
 * Sections:
 *  1. Photo gallery   — swipeable FlatList, dot pagination, overlay controls
 *  2. Main info       — price (hero), title, category chip, location, views
 *  3. Description     — optional, with full text
 *  4. Seller          — avatar, name, city, "Ask Seller" button
 *  5. Similar         — horizontal row from same category
 *
 * Sticky bottom: "Make an Offer" (outline) + "Contact Seller" (primary)
 *
 * "Make an Offer" opens a bottom sheet where buyer types a price.
 * Both actions call conversationsAPI.startConversation → navigate to chat.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import {
  ChevronLeft,
  Heart,
  MoreHorizontal,
  MapPin,
  Eye,
  Camera,
  X,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeInDown,
} from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { Separator } from "@/components/reusables/separator";
import { Skeleton } from "@/components/reusables/skeleton";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { listingsAPI } from "@/api/listings";
import { conversationsAPI } from "@/api/conversations";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingCard } from "@/components/common/ListingCard";
import { UserAvatar } from "@/components/common/UserAvatar";

const { width: SW } = Dimensions.get("window");
const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
// Gallery shrinks to this fraction when scrolled to COLLAPSE_DISTANCE
const GALLERY_COLLAPSE_RATIO = 0.65;
const COLLAPSE_DISTANCE = 180;

// ── Skeleton ──────────────────────────────────────────────────────────────────
// Uses the RNR Skeleton component (which already pulses) with staggered entrance
// animations so the blocks fade in one after another rather than all at once.

function ListingDetailSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Photo area — 4:3 matches the gallery default ratio */}
      <Skeleton
        style={{
          width: SW,
          aspectRatio: 4 / 3,
          borderRadius: 0,
          backgroundColor: colors.muted,
        }}
      />

      <View style={{ padding: 16, gap: 14 }}>
        {/* Price block */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
          <Skeleton
            style={{ width: 140, height: 30, backgroundColor: colors.muted, borderRadius: 8 }}
          />
        </Animated.View>

        {/* Title lines */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ gap: 8 }}>
          <Skeleton
            style={{ width: "100%", height: 18, backgroundColor: colors.muted, borderRadius: 6 }}
          />
          <Skeleton
            style={{ width: "72%", height: 18, backgroundColor: colors.muted, borderRadius: 6 }}
          />
        </Animated.View>

        {/* Meta row */}
        <Animated.View
          entering={FadeInDown.delay(180).duration(300)}
          style={{ flexDirection: "row", gap: 12 }}
        >
          <Skeleton
            style={{ width: 80, height: 14, backgroundColor: colors.muted, borderRadius: 4 }}
          />
          <Skeleton
            style={{ width: 64, height: 14, backgroundColor: colors.muted, borderRadius: 4 }}
          />
        </Animated.View>

        {/* Description lines */}
        <Animated.View entering={FadeInDown.delay(240).duration(300)} style={{ gap: 8, marginTop: 4 }}>
          <Skeleton
            style={{ width: "100%", height: 14, backgroundColor: colors.muted, borderRadius: 4 }}
          />
          <Skeleton
            style={{ width: "100%", height: 14, backgroundColor: colors.muted, borderRadius: 4 }}
          />
          <Skeleton
            style={{ width: "80%", height: 14, backgroundColor: colors.muted, borderRadius: 4 }}
          />
        </Animated.View>

        {/* Seller row */}
        <Animated.View
          entering={FadeInDown.delay(320).duration(300)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}
        >
          <Skeleton
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              flexShrink: 0,
              backgroundColor: colors.muted,
            }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton
              style={{ width: 120, height: 14, backgroundColor: colors.muted, borderRadius: 4 }}
            />
            <Skeleton
              style={{ width: 80, height: 12, backgroundColor: colors.muted, borderRadius: 4 }}
            />
          </View>
          <Skeleton
            style={{ width: 72, height: 34, borderRadius: 8, backgroundColor: colors.muted }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ── Animated dot — width spring-animates between active (16px) and idle (6px) ─
function GalleryDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 16 : 6);
  const opacity = useSharedValue(active ? 1 : 0.4);

  useEffect(() => {
    width.value = withSpring(active ? 16 : 6, { damping: 12, stiffness: 220 });
    opacity.value = withTiming(active ? 1 : 0.4, { duration: 200 });
  }, [active, width, opacity]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

// ── Content section wrapper that fades + slides in ────────────────────────────
function AnimatedSection({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380).springify()} style={style}>
      {children}
    </Animated.View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isRtl, formatDate } = useLocalization();
  const colors = useColors();
  const qc = useQueryClient();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryPhotoIndex, setGalleryPhotoIndex] = useState(0);
  const galleryFlatListRef = useRef<FlatList>(null);

  // scrollY lives on the UI thread — driven by the animated scroll handler below.
  const scrollY = useSharedValue(0);

  // FlatList requires these to be stable references — inline functions cause
  // "Changing onViewableItemsChanged on the fly is not supported" invariant.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems[0]) setPhotoIndex(viewableItems[0].index ?? 0);
    },
    []
  );
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const [isSaved, setIsSaved] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showOfferSheet, setShowOfferSheet] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");

  const heartScale = useSharedValue(1);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // ── Animated scroll handler (runs on UI thread — no JS jank) ────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Gallery collapses from 4:3 ratio at top → GALLERY_COLLAPSE_RATIO * 4:3 when
  // scrolled COLLAPSE_DISTANCE px down. All runs on the UI thread.
  const GALLERY_H = SW * (3 / 4); // 4:3 aspect ratio
  const galleryHeightAnim = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [1, GALLERY_COLLAPSE_RATIO],
      Extrapolate.CLAMP
    );
    const overlayOpacity = interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE * 0.6],
      [1, 0.6],
      Extrapolate.CLAMP
    );
    return {
      height: GALLERY_H * scale,
      opacity: overlayOpacity,
    };
  });

  // The overlay controls (back / heart / more) are fixed relative to the screen
  // top — they must NOT be inside the ScrollView so they stay pinned as content
  // scrolls underneath. They are rendered after the ScrollView in absolute position.
  const overlayOpacityAnim = useAnimatedStyle(() => {
    // Fade out just slightly as user scrolls deep, so they know controls are
    // still tappable without obscuring content.
    const opacity = interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [1, 0.85],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  // ── Fetch listing detail ─────────────────────────────────────────────────
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => listingsAPI.getListing(Number(id)),
    enabled: !!id,
  });

  // Re-fetch whenever the screen regains focus (e.g. returning from conversation)
  useFocusEffect(
    useCallback(() => {
      if (id) qc.invalidateQueries({ queryKey: ["listing", id] });
    }, [id, qc])
  );

  // ── Fetch similar listings (same category, exclude current) ─────────────
  const { data: similar } = useQuery({
    queryKey: ["listings-similar", listing?.categoryId],
    queryFn: () =>
      listingsAPI.getListings({ categoryId: listing!.categoryId, pageSize: 10 }),
    enabled: !!listing?.categoryId,
    select: (data) =>
      data.items.filter((l) => l.id !== Number(id)).slice(0, 6),
  });

  // Sync isSaved from API response
  useEffect(() => {
    if (listing?.isSaved !== undefined) {
      setIsSaved(listing.isSaved);
    }
  }, [listing?.isSaved]);

  // ── Save / unsave ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      isSaved
        ? listingsAPI.unsaveListing(Number(id))
        : listingsAPI.saveListing(Number(id)),
    onMutate: () => {
      setIsSaved((prev) => !prev);
      heartScale.value = withSpring(1.45, { damping: 4, stiffness: 320 }, () => {
        heartScale.value = withSpring(1, { damping: 6, stiffness: 200 });
      });
    },
    onError: () => {
      setIsSaved((prev) => !prev);
      toast.error(t("common.error"));
    },
  });

  // ── Start conversation ───────────────────────────────────────────────────
  const contactMutation = useMutation({
    mutationFn: (message: string) =>
      conversationsAPI.startConversation(Number(id), message),
    onSuccess: (conversation) => {
      router.push(`/(main)/conversation/${conversation.id}` as never);
    },
    onError: () => toast.error(t("common.error")),
  });

  // Offer mutation: always sends the offer as an explicit message so it's
  // never dropped when a conversation already exists (StartService returns
  // the existing conversation without creating a new message).
  // Body format: "amount|currency|listedPrice" — parsed by OfferBubble in MessageBubble.
  const offerMutation = useMutation({
    mutationFn: async (offerBody: string) => {
      const defaultMsg = t("listing.detail.defaultMessage");
      const conversation = await conversationsAPI.startConversation(Number(id), defaultMsg);
      await conversationsAPI.sendMessage(conversation.id, offerBody, "offer");
      return conversation;
    },
    onSuccess: (conversation) => {
      router.push(`/(main)/conversation/${conversation.id}` as never);
    },
    onError: () => toast.error(t("common.error")),
  });

  const handleContactSeller = useCallback(() => {
    contactMutation.mutate(t("listing.detail.defaultMessage"));
  }, [contactMutation, t]);

  const handleSendOffer = useCallback(() => {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      toast.error(t("listing.detail.offerInvalid"));
      return;
    }
    const currency = listing?.currency ?? "AFN";
    const listedPrice = listing?.price ?? 0;
    // Structured body: "amount|currency|listedPrice" — parsed by OfferBubble
    const offerBody = `${amount}|${currency}|${listedPrice}`;
    setShowOfferSheet(false);
    setOfferAmount("");
    offerMutation.mutate(offerBody);
  }, [offerAmount, offerMutation, listing, t]);

  const handleShare = useCallback(async () => {
    setShowMoreSheet(false);
    try {
      await Share.share({
        title: listing?.title ?? "",
        message: `${listing?.title} — ${listing?.currency} ${Number(listing?.price).toLocaleString()}`,
      });
    } catch {}
  }, [listing]);

  const handleReport = useCallback(() => {
    setShowMoreSheet(false);
    toast.success(t("listing.detail.reportSent"));
  }, [t]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return <ListingDetailSkeleton colors={colors} />;
  }

  if (!listing) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>{t("common.notFound")}</Text>
      </View>
    );
  }

  const photos = listing.images?.length ? listing.images : [];
  const hasPhotos = photos.length > 0;
  const isBusy = contactMutation.isPending || offerMutation.isPending;
  const screenHeight = Dimensions.get("window").height;
  const galleryContentHeight = screenHeight - 120;

  const categoryName =
    i18n.language === "ps"
      ? listing.category.namePs
      : i18n.language === "fa"
      ? listing.category.nameFa
      : listing.category.nameEn;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* ── Scrollable content ──────────────────────────────────────── */}
      <Animated.ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* ── Photo gallery ─────────────────────────────────────────── */}
        <Animated.View style={galleryHeightAnim}>
          {hasPhotos ? (
            <View style={styles.galleryContainer}>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={({ item: uri, index }) => (
                  // Pressable wraps each photo so swipes pass through to the
                  // FlatList's paging scroll while taps still open the fullscreen
                  // modal. RN's touch system naturally prefers the parent
                  // ScrollView/FlatList for directional drags and only fires
                  // onPress when the finger lifts without significant movement.
                  <Pressable
                    onPress={() => {
                      setGalleryPhotoIndex(index);
                      setShowGalleryModal(true);
                    }}
                    style={{ width: SW, aspectRatio: 4 / 3 }}
                    android_ripple={null}
                  >
                    <Image
                      source={{ uri }}
                      placeholder={{ blurhash: BLURHASH }}
                      contentFit="cover"
                      transition={300}
                      style={StyleSheet.absoluteFill}
                    />
                  </Pressable>
                )}
              />

              {/* Dot pagination — lives inside gallery so it collapses with it */}
              {photos.length > 1 && (
                <View style={styles.dotsRow}>
                  {photos.map((_, i) => (
                    <GalleryDot key={i} active={i === photoIndex} />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={[styles.noPhotoBox, { backgroundColor: colors.imagePlaceholder }]}
            >
              <Camera size={40} color={colors.mutedForeground} />
              <Text
                style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 8 }}
              >
                {t("listing.noPhoto")}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── Main info ─────────────────────────────────────────────── */}
        <AnimatedSection delay={40} style={styles.section}>
          {/* Non-active status badge */}
          {listing.status !== "active" && (
            <View style={{ marginBottom: 4 }}>
              <StatusBadge status={listing.status} />
            </View>
          )}

          {/* Price — hero element */}
          <PriceTag price={listing.price} currency={listing.currency} size="lg" />

          {/* Title */}
          <Text
            style={[
              styles.titleText,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {listing.title}
          </Text>

          {/* Category chip */}
          <View
            style={[
              styles.row,
              { flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap" },
            ]}
          >
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {categoryName}
              </Text>
            </View>
          </View>

          {/* Location (province) */}
          {listing.location ? (
            <View
              style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}
            >
              <MapPin size={13} color={colors.mutedForeground} />
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                {listing.location}
              </Text>
            </View>
          ) : null}

          {/* Address (meeting point) */}
          {listing.address ? (
            <View
              style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}
            >
              <MapPin size={13} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.foreground, flex: 1 }}>
                {listing.address}
              </Text>
            </View>
          ) : null}

          {/* Views + posted date */}
          <View
            style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}
          >
            <Eye size={13} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {t("listing.viewsCount", { count: listing.viewsCount })}
            </Text>
            {listing.createdAt ? (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {" · "}
                {formatDate(listing.createdAt)}
              </Text>
            ) : null}
          </View>
        </AnimatedSection>

        {/* ── Description ───────────────────────────────────────────── */}
        {listing.description ? (
          <>
            <Separator />
            <AnimatedSection delay={100} style={styles.section}>
              <Text
                style={[
                  styles.sectionHead,
                  { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
                ]}
              >
                {t("listing.detail.description")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: colors.foreground,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {listing.description}
              </Text>
            </AnimatedSection>
          </>
        ) : null}

        {/* ── Seller section ────────────────────────────────────────── */}
        <Separator />
        <AnimatedSection delay={160} style={styles.section}>
          <Text
            style={[
              styles.sectionHead,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("listing.detail.seller")}
          </Text>
          <View
            style={[
              styles.sellerRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <UserAvatar
              name={listing.seller.name}
              avatarUrl={listing.seller.avatarUrl}
              size={48}
            />

            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}
              >
                {listing.seller.name}
              </Text>
              {listing.seller.city ? (
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  {listing.seller.city}
                </Text>
              ) : null}
            </View>

            <Button
              variant="outline"
              size="sm"
              onPress={handleContactSeller}
              disabled={isBusy}
            >
              <Text style={{ fontSize: 13 }}>{t("listing.detail.askSeller")}</Text>
            </Button>
          </View>
        </AnimatedSection>

        {/* ── Similar listings ──────────────────────────────────────── */}
        {similar && similar.length > 0 ? (
          <>
            <Separator />
            <AnimatedSection delay={220} style={{ paddingTop: 16 }}>
              <Text
                style={[
                  styles.sectionHead,
                  {
                    color: colors.foreground,
                    paddingHorizontal: 16,
                    marginBottom: 12,
                    textAlign: isRtl ? "right" : "left",
                  },
                ]}
              >
                {t("listing.detail.similarListings")}
              </Text>
              <FlatList
                data={similar}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  gap: 10,
                  paddingBottom: 16,
                }}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <ListingCard
                    listing={item}
                    className="w-40"
                    onPress={() =>
                      router.replace(`/(main)/listing/${item.id}` as never)
                    }
                  />
                )}
              />
            </AnimatedSection>
          </>
        ) : null}
      </Animated.ScrollView>

      {/* ── Overlay controls: back | heart + "…"
           Fixed to screen, NOT inside ScrollView, so they stay pinned ── */}
      <Animated.View
        style={[
          styles.overlayRow,
          { flexDirection: isRtl ? "row-reverse" : "row" },
          overlayOpacityAnim,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.overlayBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </Pressable>

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }}>
          <Pressable
            onPress={() => saveMutation.mutate()}
            style={styles.overlayBtn}
            hitSlop={12}
            accessibilityRole="togglebutton"
            accessibilityLabel={
              isSaved ? t("listing.unsave") : t("listing.save")
            }
          >
            <Animated.View style={heartAnimStyle}>
              <Heart
                size={20}
                color={isSaved ? colors.destructive : "#fff"}
                fill={isSaved ? colors.destructive : "transparent"}
                strokeWidth={2}
              />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={() => setShowMoreSheet(true)}
            style={styles.overlayBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("listing.detail.moreOptions")}
          >
            <MoreHorizontal size={20} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Sticky action bar ─────────────────────────────────────── */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        <Button
          variant="outline"
          onPress={() => setShowOfferSheet(true)}
          style={styles.actionBtn}
          disabled={isBusy}
        >
          <Text>{t("listing.detail.makeOffer")}</Text>
        </Button>
        <Button
          variant="default"
          onPress={handleContactSeller}
          disabled={isBusy}
          style={styles.actionBtn}
        >
          <Text>{t("listing.detail.contactSeller")}</Text>
        </Button>
      </View>

      {/* ── More options sheet ────────────────────────────────────── */}
      <Modal
        visible={showMoreSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowMoreSheet(false)} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <Pressable
            style={[styles.sheetRow, { borderBottomColor: colors.border }]}
            onPress={handleShare}
          >
            <Text style={{ fontSize: 16, color: colors.foreground }}>
              {t("listing.detail.share")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sheetRow, { borderBottomColor: colors.border }]}
            onPress={handleReport}
          >
            <Text style={{ fontSize: 16, color: colors.destructive }}>
              {t("listing.detail.report")}
            </Text>
          </Pressable>
          <Pressable
            style={styles.sheetRow}
            onPress={() => setShowMoreSheet(false)}
          >
            <Text style={{ fontSize: 16, color: colors.mutedForeground }}>
              {t("common.close")}
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Make an offer sheet ───────────────────────────────────── */}
      <Modal
        visible={showOfferSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOfferSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowOfferSheet(false)} />
        <View
          style={[
            styles.offerSheet,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}
            >
              {t("listing.detail.offerTitle")}
            </Text>
            <Pressable onPress={() => setShowOfferSheet(false)} hitSlop={12}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Listed price reference */}
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 16 }}>
            {t("listing.detail.listedPrice", {
              price: `${listing.currency} ${Number(listing.price).toLocaleString()}`,
            })}
          </Text>

          {/* Offer input */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.foreground,
              marginBottom: 8,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("listing.detail.yourOffer")}
          </Text>
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              gap: 8,
              alignItems: "center",
            }}
          >
            <View
              style={[
                styles.currencyTag,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}
              >
                {listing.currency}
              </Text>
            </View>
            <Input
              value={offerAmount}
              onChangeText={setOfferAmount}
              placeholder="0"
              keyboardType="numeric"
              style={{ flex: 1, textAlign: isRtl ? "right" : "left" }}
              autoFocus
            />
          </View>

          {/* Disclaimer */}
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 12,
              lineHeight: 17,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("listing.detail.noPaymentNote")}
          </Text>

          {/* Send button */}
          <Button
            variant="default"
            onPress={handleSendOffer}
            disabled={isBusy || !offerAmount}
            style={{ marginTop: 20 }}
          >
            <Text>{t("listing.detail.sendOffer")}</Text>
          </Button>
        </View>
      </Modal>

      {/* ── Fullscreen photo gallery modal ────────────────────────── */}
      <Modal
        visible={showGalleryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGalleryModal(false)}
      >
        <View style={[styles.fullscreenGallery, { backgroundColor: "#000" }]}>
          {/* Header with close button */}
          <View
            style={[
              styles.galleryHeader,
              {
                backgroundColor: colors.card,
                borderBottomColor: colors.border,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
              {galleryPhotoIndex + 1} / {photos.length}
            </Text>
            <Pressable
              onPress={() => setShowGalleryModal(false)}
              hitSlop={12}
              style={{ marginLeft: isRtl ? 0 : "auto", marginRight: isRtl ? "auto" : 0 }}
            >
              <X size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Photo carousel */}
          <View style={[styles.galleryContent, { backgroundColor: "#000" }]}>
            <FlatList
              ref={galleryFlatListRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const currentIndex = Math.round(
                  e.nativeEvent.contentOffset.x / SW
                );
                setGalleryPhotoIndex(currentIndex);
              }}
              initialScrollIndex={galleryPhotoIndex}
              getItemLayout={(_, index) => ({
                length: SW,
                offset: SW * index,
                index,
              })}
              renderItem={({ item: uri, index }) => (
                <View
                  style={{
                    width: SW,
                    height: galleryContentHeight,
                    backgroundColor: "#000",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {uri ? (
                    <Image
                      source={{ uri }}
                      placeholder={{ blurhash: BLURHASH }}
                      contentFit="contain"
                      transition={300}
                      style={{ width: "100%", height: "100%" }}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={{ alignItems: "center", gap: 12 }}>
                      <Camera size={40} color={colors.mutedForeground} />
                      <Text style={{ color: colors.mutedForeground }}>
                        {t("listing.noPhoto")} {index + 1}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          </View>

          {/* Bottom pagination dots */}
          {photos.length > 1 && (
            <View
              style={[styles.galleryDots, { backgroundColor: "rgba(0,0,0,0.3)" }]}
            >
              {photos.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setGalleryPhotoIndex(i);
                    galleryFlatListRef.current?.scrollToIndex({
                      index: i,
                      animated: true,
                    });
                  }}
                  style={[
                    styles.galleryDot,
                    {
                      backgroundColor:
                        i === galleryPhotoIndex
                          ? colors.primary
                          : "rgba(255,255,255,0.3)",
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  galleryContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
    backgroundColor: "#111",
    overflow: "hidden",
  },
  noPhotoBox: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayRow: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 16,
    left: 12,
    right: 12,
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  overlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    alignItems: "center",
    zIndex: 5,
  },
  fullscreenGallery: {
    flex: 1,
    backgroundColor: "#000",
  },
  galleryHeader: {
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  galleryContent: {
    flex: 1,
  },
  galleryDots: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  galleryDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  sectionHead: {
    fontSize: 16,
    fontWeight: "600",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  row: {
    gap: 5,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sellerRow: {
    gap: 12,
    alignItems: "center",
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    overflow: "hidden",
  },
  sheetRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  offerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 38 : 24,
  },
  currencyTag: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    alignItems: "center",
  },
});

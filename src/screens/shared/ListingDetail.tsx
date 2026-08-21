/**
 * ListingDetail — full detail view of a single listing (shared screen).
 *
 * Sections:
 *  1. ListingGallery — swipeable photos with animated page dots + fullscreen modal
 *  2. StatusBadge + ExpiryBadge (owner only)
 *  3. PriceTag (lg, hero) → title → category + condition chips → location → views
 *  4. Description
 *  5. Location map snippet (if lat/long present)
 *  6. SellerCard — UserIdentity → tap → public profile (F3)
 *  7. Similar listings horizontal rail
 *
 * Sticky bottom bar:
 *  - active + not own listing  → "Make an Offer" (outline) + "Message Seller" (primary)
 *  - sold / reserved / own     → status notice banner (no CTA)
 *
 * Header overlay (pinned, outside ScrollView):
 *  - Back  · Save heart (animated pop)  · More options (report / share)
 *
 * Sub-components live in ./listing-detail/ to keep this file under ~300 lines.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Share,
  Platform,
  RefreshControl,
} from "react-native";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MoreHorizontal,
  MapPin,
  Eye,
  Ban,
  Clock,
  ShieldCheck,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  interpolate,
  Extrapolate,
  FadeInDown,
} from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryName } from "@/hooks/useCategoryName";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listingsAPI, type Listing } from "@/api/listings";
import { conversationsAPI } from "@/api/conversations";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ListingStatusBanner } from "@/components/common/ListingStatusBanner";
import { ListingUnavailableActions } from "@/components/common/ListingUnavailableActions";
import { ConditionBadge } from "@/components/common/ConditionBadge";
import { ExpiryBadge } from "@/components/common/ExpiryBadge";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ListingCard } from "@/components/common/ListingCard";
import { ListingMapSection } from "@/components/common/ListingMapSection";
import { ReportSheet } from "@/components/common/ReportSheet";
import { SafetyTipsSheet } from "@/components/common/SafetyTipsSheet";
import { useAuthStore } from "@/stores/auth.store";

import { ListingGallery } from "./listing-detail/ListingGallery";
import { FirstMessageSheet } from "./listing-detail/FirstMessageSheet";
import { OfferSheet } from "./listing-detail/OfferSheet";
import { DetailSkeleton } from "./listing-detail/DetailSkeleton";
import { SellerPhoneReveal } from "./listing-detail/SellerPhoneReveal";
import { PriceDropBadge } from "@/components/common/PriceDropBadge";
import { Badge } from "@/components/reusables/badge";
import { ResponseRateBadge } from "@/components/common/ResponseRateBadge";
import { AwayBanner } from "@/components/common/AwayBanner";
import { useReduceMotion } from "@/lib/animation";
import { getActiveLabelText } from "@/utils/activeLabelUtil";
import { resolveShareUrl } from "@/utils/shareUtils";
import { availableUnitsOf, totalUnitsOf, isLowStock, hasStockToShow } from "@/utils/stock";

const { width: SW } = Dimensions.get("window");
const GALLERY_COLLAPSE_RATIO = 0.65;
const COLLAPSE_DISTANCE = 180;

// ── Fade + slide section wrapper ──────────────────────────────────────────────
// reduceMotion is passed from the parent screen so the hook is only called once.
function AnimatedSection({
  children,
  delay = 0,
  style,
  reduceMotion = false,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
  reduceMotion?: boolean;
}) {
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(delay).duration(380).springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { requireAuth } = useRequireAuth();
  const authReturnTo = `/(main)/listing/${id}`;
  const { t } = useTranslation();
  const { isRtl, formatDate, formatCurrency, formatNumber } = useLocalization();
  const getCategoryName = useCategoryName();
  const colors = useColors();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [isSaved, setIsSaved] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showMessageSheet, setShowMessageSheet] = useState(false);
  const [showOfferSheet, setShowOfferSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showSafetyTips, setShowSafetyTips] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");

  // ── Animations ─────────────────────────────────────────────────────────────
  const heartScale = useSharedValue(1);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const GALLERY_H = SW * (3 / 4);
  const galleryHeightAnim = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [1, GALLERY_COLLAPSE_RATIO],
      Extrapolate.CLAMP
    );
    return { height: GALLERY_H * scale };
  });
  const overlayOpacityAnim = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [1, 0.85], Extrapolate.CLAMP),
  }));

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: listing, isLoading, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => listingsAPI.getListing(Number(id)),
    enabled: !!id,
  });

  // Stock, derived once, from the shared rules in @/utils/stock so this screen,
  // the seller's own detail screen and the web client can never disagree about
  // what counts as "low" on the same listing.
  const availableUnits = availableUnitsOf(listing);
  const totalUnits = totalUnitsOf(listing);
  const lowStock = isLowStock(availableUnits, totalUnits);

  // Pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Refetch whenever the screen regains focus (e.g. returning from conversation)
  useFocusEffect(
    useCallback(() => {
      if (id) qc.invalidateQueries({ queryKey: ["listing", id] });
    }, [id, qc])
  );

  // Similar listings — dedicated endpoint: same category, excludes current listing,
  // browsable only (draft/sold/expired never leak), ordered by recency, max 8.
  const { data: similar } = useQuery({
    queryKey: ["listings-similar", Number(id)],
    queryFn: () => listingsAPI.getSimilarListings(Number(id)),
    enabled: !!id,
  });

  // More from this seller — reuses the general listings endpoint filtered to
  // the seller's OTHER active listings (TASK-M547). Guarded on a resolved
  // sellerId; the current listing is filtered out client-side and the rail
  // is capped at 8 items.
  const sellerId = listing?.seller?.id;
  const { data: sellerListingsResponse } = useQuery({
    queryKey: ["listings-by-seller", sellerId],
    queryFn: () => listingsAPI.getListings({ userId: sellerId, status: "active" }),
    enabled: !!sellerId,
  });
  const sellerListings: Listing[] = (sellerListingsResponse?.items ?? [])
    .filter((item: Listing) => item.id !== Number(id))
    .slice(0, 8);

  // Sync saved state from API response
  useEffect(() => {
    if (listing?.isSaved !== undefined) setIsSaved(listing.isSaved);
  }, [listing?.isSaved]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    // The desired direction is passed as the mutate() argument (captured at tap
    // time) — NOT read from `isSaved` state. onMutate flips that state, and React
    // Query reads mutationFn from the re-rendered component, so reading the state
    // here would fire the OPPOSITE operation (the save→unsave bug).
    mutationFn: (currentlySaved: boolean) =>
      currentlySaved
        ? listingsAPI.unsaveListing(Number(id))
        : listingsAPI.saveListing(Number(id)),
    onMutate: (currentlySaved: boolean) => {
      setIsSaved(!currentlySaved);
      if (!reduceMotion) {
        heartScale.value = withSpring(1.45, { damping: 4, stiffness: 320 }, () => {
          heartScale.value = withSpring(1, { damping: 6, stiffness: 200 });
        });
      }
    },
    onError: (_err, currentlySaved) => {
      setIsSaved(currentlySaved); // revert to the pre-tap state
      toast.error(t("common.error"));
    },
    onSuccess: () => {
      // Sync every cache that reflects saved state so the change actually sticks:
      // the detail query (re-opening this listing must not show the stale
      // "unsaved" cache), plus the Saved list and browse feed. Without this the
      // optimistic heart reverts on the next refetch and looks like it never saved.
      if (id) qc.invalidateQueries({ queryKey: ["listing", id] });
      qc.invalidateQueries({ queryKey: ["saved-listings"] });
      if (sellerId) qc.invalidateQueries({ queryKey: ["listings-by-seller", sellerId] });
    },
  });

  // Offer: start conversation then post an offer message.
  // On 422 (listing no longer active, or another service error), fall back to
  // fetching the existing conversation for this listing and posting the offer
  // message there directly, mirroring the duplicate-handling in FirstMessageSheet.
  const offerMutation = useMutation({
    mutationFn: async (offerBody: string) => {
      const defaultMsg = t("listing.detail.defaultMessage");
      try {
        const conversation = await conversationsAPI.startConversation(Number(id), defaultMsg);
        await conversationsAPI.sendMessage(conversation.id, offerBody, "offer");
        return conversation;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status === 422) {
          // Conversation already exists for this buyer+listing — fetch it and
          // post the offer message directly to avoid silently dropping the offer.
          const existing = await conversationsAPI.getConversations({ listingId: Number(id) });
          const conversation = existing.items[0];
          if (!conversation) throw err;
          await conversationsAPI.sendMessage(conversation.id, offerBody, "offer");
          return conversation;
        }
        throw err;
      }
    },
    onSuccess: (conversation) => {
      setShowOfferSheet(false);
      setOfferAmount("");
      router.push(`/(main)/conversation/${conversation.id}` as never);
    },
    onError: () => toast.error(t("common.error")),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMessageSeller = useCallback(() => {
    requireAuth(() => setShowMessageSheet(true), authReturnTo);
  }, [requireAuth, authReturnTo]);

  const handleSaveToggle = useCallback(() => {
    // Capture the current saved state at tap time and pass it to the mutation.
    requireAuth(() => saveMutation.mutate(isSaved), authReturnTo);
  }, [requireAuth, authReturnTo, saveMutation, isSaved]);

  const handleOpenOffer = useCallback(() => {
    requireAuth(() => setShowOfferSheet(true), authReturnTo);
  }, [requireAuth, authReturnTo]);

  const handleSendOffer = useCallback((inputAmount: string) => {
    const amount = Number(inputAmount);
    if (!amount || amount <= 0) {
      toast.error(t("listing.detail.offerInvalid"));
      return;
    }
    const currency = listing?.currency ?? "AFN";
    const listedPrice = listing?.price ?? 0;
    // Body format "amount|currency|listedPrice" — parsed by OfferBubble in chat
    offerMutation.mutate(`${amount}|${currency}|${listedPrice}`);
  }, [offerMutation, listing, t]);

  const handleShare = useCallback(async () => {
    setShowMoreSheet(false);
    if (!listing) return;
    try {
      // Prefer the server-supplied https share URL; fall back to a hatiwal:// deep link
      // so the share always carries a tappable link regardless of backend config.
      // createURL("listing/<id>") with scheme "hatiwal" → "hatiwal://listing/<id>"
      // which Expo Router resolves to app/(main)/listing/[id].tsx.
      const url = resolveShareUrl(
        listing.shareUrl,
        listing.id,
        (path) => Linking.createURL(path)
      );
      const price = formatCurrency(listing.price, listing.currency);
      const message = t("listing.share.body", {
        title: listing.title,
        price,
        url,
      });
      // On iOS, passing both `message` (which already embeds the URL) and a
      // separate `url` field causes some share targets to render the link twice
      // or drop the message body entirely. Pass `url` only on Android where the
      // field is used as a standalone attachment rather than concatenated text.
      // Q3 platform audit (2026-07-03): both branches are intentional — iOS omits
      // `url`, every non-iOS platform (i.e. Android, the only other target) gets it.
      // No silent omission on either side.
      await Share.share(
        Platform.OS === "ios"
          ? { title: listing.title, message }
          : { title: listing.title, message, url }
      );
    } catch {}
  }, [listing, formatCurrency, t]);

  const handleReport = useCallback(() => {
    setShowMoreSheet(false);
    requireAuth(() => setShowReportSheet(true), authReturnTo);
  }, [requireAuth, authReturnTo]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />;

  if (!listing) {
    return (
      <ScreenContainer scrollable={false} padded={false} style={{ alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>{t("listing.detail.notFound")}</Text>
      </ScreenContainer>
    );
  }

  const photos = listing.images?.length ? listing.images : [];
  const categoryName = getCategoryName(listing.category);
  const isOwnListing = !!currentUser && currentUser.id === listing.seller?.id;
  // CTA only shown for active listings the current user does NOT own
  const canContact = listing.status === "active" && !isOwnListing;
  // TASK-G083 / TASK-N071: treat missing/undefined negotiable as true (negotiable by default).
  // When the backend ships the negotiable flag and it is explicitly false, hide the
  // "Make an Offer" button and OfferSheet entirely.
  const isNegotiable = listing.negotiable !== false;
  const isBusy = offerMutation.isPending;

  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      {/* ── Status banner: sold / reserved — slides in from top ──────────── */}
      {(listing.status === "sold" || listing.status === "reserved") && !isOwnListing && (
        <ListingStatusBanner
          status={listing.status as "reserved" | "sold"}
          title={
            listing.status === "sold"
              ? t("listing.detail.soldNotice")
              : t("listing.detail.reservedNotice")
          }
          layout="strip"
          reduceMotion={reduceMotion}
          testID="listing-detail-status-banner"
        />
      )}

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <Animated.ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Gallery collapses gently as user scrolls */}
        <Animated.View style={galleryHeightAnim}>
          <ListingGallery photos={photos} aspectRatio={4 / 3} />
        </Animated.View>

        {/* ── Main info ───────────────────────────────────────────────── */}
        <AnimatedSection delay={40} style={styles.section} reduceMotion={reduceMotion}>
          {/* Status + expiry badges — owner or non-active listings */}
          {(listing.status !== "active" || isOwnListing) && (
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 2,
              }}
            >
              {listing.status !== "active" && <StatusBadge status={listing.status} />}
              {isOwnListing && (
                <ExpiryBadge
                  expiresAt={listing.expiresAt}
                  expired={listing.expired}
                  status={listing.status}
                />
              )}
            </View>
          )}

          {/* Price — most prominent text element on screen. TASK-N317: sold is
              final and reads as archived (tone="muted"); reserved can still
              fall through to a real sale, so it keeps the full-strength price. */}
          <PriceTag
            price={listing.price}
            currency={listing.currency}
            size="lg"
            tone={listing.status === "sold" ? "muted" : "default"}
            // "each" whenever there is more than one, so a buyer asking for 3
            // and a seller quoting a figure cannot mean different totals — the
            // failure this feature has to avoid is discovering that at the
            // meetup (docs/SPIKE_LISTING_QUANTITY.md §0c).
            perUnit={listing.multiUnit === true}
          />

          {/* Stock — reuses the firm-price badge treatment below, deliberately:
              no new visual language, and it renders ONLY for a multi-unit
              listing, so a single-item listing is byte-identical to before.
              Detail only, never the browse card: every card row is a
              fixed-height slot (FlashList's grid needs equal heights) and a chip
              would grow every card in the feed, including the single-item
              majority. The buyer sees this before tapping Message, which is
              where the decision is actually made. */}
          {hasStockToShow(listing) && (
            <View
              testID="stock-badge-detail"
              style={{ alignSelf: isRtl ? "flex-end" : "flex-start", marginTop: 4 }}
            >
              <Badge
                label={
                  lowStock
                    ? t("listing.stock.leftOfTotal", {
                        available: formatNumber(availableUnits),
                        total: formatNumber(totalUnits),
                      })
                    : t("listing.stock.inStock", { count: availableUnits })
                }
                // Amber only when it is genuinely running out — the same token
                // StatusBadge already uses for "reserved", not a new colour.
                variant={lowStock ? "warning" : "muted"}
              />
            </View>
          )}

          {/* Price-drop badge — subtle pill below price, only when a recent drop exists */}
          {listing.priceDropPercent != null && listing.priceDropPercent > 0 && (
            <PriceDropBadge percent={listing.priceDropPercent} variant="detail" />
          )}

          {/* Firm-price badge — quiet trust signal when negotiable is false */}
          {listing.negotiable === false && (
            <View
              testID="firm-price-badge-detail"
              style={{ alignSelf: isRtl ? "flex-end" : "flex-start", marginTop: 4 }}
            >
              <Badge
                label={t("listing.firmPrice")}
                variant="muted"
              />
            </View>
          )}

          {/* Title — directly below price, strong but secondary */}
          <Text
            style={[
              styles.titleText,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left", marginTop: 2 },
            ]}
          >
            {listing.title}
          </Text>

          {/* Category + condition chips — visual metadata */}
          <View
            style={[
              styles.row,
              { flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", marginTop: 4 },
            ]}
          >
            <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{categoryName}</Text>
            </View>
            {listing.condition ? <ConditionBadge condition={listing.condition} /> : null}
          </View>

          {/* Province / city */}
          {listing.location ? (
            <View style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row", marginTop: 2 }]}>
              <MapPin size={13} color={colors.mutedForeground} />
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{listing.location}</Text>
            </View>
          ) : null}

          {/* Meeting address */}
          {listing.address ? (
            <View style={[styles.row, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <MapPin size={13} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.foreground, flex: 1 }}>{listing.address}</Text>
            </View>
          ) : null}

          {/* Views + saved-by + posted date — muted meta row at the bottom */}
          <View
            style={[
              styles.row,
              { flexDirection: isRtl ? "row-reverse" : "row", marginTop: 4 },
            ]}
          >
            <Eye size={12} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {t("listing.viewsCount", { count: listing.viewsCount })}
            </Text>
            {listing.createdAt ? (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {" · "}{formatDate(listing.createdAt)}
              </Text>
            ) : null}
          </View>

          {/* Saved-by-N social proof — only shown when at least one save exists */}
          {listing.savesCount && listing.savesCount > 0 ? (
            <View
              style={[
                styles.row,
                { flexDirection: isRtl ? "row-reverse" : "row", marginTop: 4 },
              ]}
            >
              <Heart size={12} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {t("listing.savesCount", { count: listing.savesCount })}
              </Text>
            </View>
          ) : null}
        </AnimatedSection>

        {/* ── Description ─────────────────────────────────────────────── */}
        {listing.description ? (
          <>
            <Separator />
            <AnimatedSection delay={100} style={styles.section} reduceMotion={reduceMotion}>
              <Text
                style={[styles.sectionHead, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
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

        {/* ── Location map ────────────────────────────────────────────── */}
        {!!listing.latitude && !!listing.longitude && (
          <>
            <Separator />
            <AnimatedSection delay={140} style={styles.section} reduceMotion={reduceMotion}>
              <Text
                style={[styles.sectionHead, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
              >
                {t("listing.detail.location")}
              </Text>
              <ListingMapSection
                latitude={listing.latitude}
                longitude={listing.longitude}
                location={listing.location}
                address={listing.address}
              />
            </AnimatedSection>
          </>
        )}

        {/* ── Meetup safety tips — quiet link near location ───────────────
            Not gated on lat/long: every listing ends in an in-person meetup,
            so the reminder should always be reachable here regardless of
            whether a map is shown above. Kept small/muted so it never
            competes with the sticky "Message Seller" CTA below. */}
        <View style={[styles.section, { paddingTop: 0, paddingBottom: 4 }]}>
          <Pressable
            onPress={() => setShowSafetyTips(true)}
            style={[
              styles.safetyLinkRow,
              { flexDirection: isRtl ? "row-reverse" : "row", alignSelf: isRtl ? "flex-end" : "flex-start" },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("safety.link.listingDetail")}
            testID="safety-tips-link"
          >
            <ShieldCheck size={14} color={colors.mutedForeground} />
            <Text
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
                textDecorationLine: "underline",
              }}
            >
              {t("safety.link.listingDetail")}
            </Text>
          </Pressable>
        </View>

        {/* ── Seller card ──────────────────────────────────────────────── */}
        <Separator />
        <AnimatedSection delay={200} style={styles.section} reduceMotion={reduceMotion}>
          <Text
            style={[styles.sectionHead, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
          >
            {t("listing.detail.seller")}
          </Text>
          {/* Seller identity → tap opens the public profile. The "Ask Seller"
              button that used to live here was removed: it called the exact
              same handler as the sticky "Message Seller" CTA below, so it was a
              duplicate. Chatting now has ONE entry point (the sticky bar); this
              card is for identity + the distinct direct-call action. */}
          <View style={[styles.sellerRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={{ flex: 1 }}>
              <UserIdentity
                name={listing.seller.name}
                avatarUrl={listing.seller.avatarUrl}
                verified={listing.seller.verified}
                subtitle={listing.seller.city}
                size={48}
                testID="seller-profile-link"
                onPress={() => router.push(`/(main)/seller/${listing.seller.id}` as never)}
              />
              {/* Response rate badge — suppressed when rate is null or 0 (false trust signal). */}
              <ResponseRateBadge
                responseRatePercent={listing.seller.responseRatePercent}
                responseTimeLabel={listing.seller.responseTimeLabel}
              />
              {/* Last-active recency label — quiet trust signal; omitted when null. */}
              {!!getActiveLabelText(listing.seller.lastActiveLabel, t) && (
                <View
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 4,
                  }}
                >
                  <Clock size={12} color={colors.mutedForeground} />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {getActiveLabelText(listing.seller.lastActiveLabel, t)}
                  </Text>
                </View>
              )}
            </View>
            {isRtl ? (
              <ChevronLeft size={20} color={colors.mutedForeground} />
            ) : (
              <ChevronRight size={20} color={colors.mutedForeground} />
            )}
          </View>

          {/* Phone reveal — shown only when seller.phone present + canContact */}
          {listing.seller.phone ? (
            <SellerPhoneReveal
              phone={listing.seller.phone}
              isOwnListing={isOwnListing}
              isActive={listing.status === "active"}
              authReturnTo={authReturnTo}
            />
          ) : null}

          {/* Away banner — shown only when seller is currently away and buyer is not the owner */}
          {!isOwnListing && listing.seller.sellerIsAway && (
            <AwayBanner
              awayUntil={listing.seller.sellerAwayUntil}
              style={{ marginTop: 12 }}
            />
          )}
        </AnimatedSection>

        {/* ── Similar listings ─────────────────────────────────────────── */}
        {similar && similar.length > 0 ? (
          <>
            <Separator />
            <AnimatedSection delay={260} style={{ paddingTop: 16 }} reduceMotion={reduceMotion}>
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
                contentContainerStyle={{ paddingHorizontal: 12, gap: 10, paddingBottom: 16 }}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <ListingCard
                    listing={item}
                    style={{ width: 160 }}
                    onPress={() => router.replace(`/(main)/listing/${item.id}` as never)}
                  />
                )}
              />
            </AnimatedSection>
          </>
        ) : null}

        {/* ── More from this seller ────────────────────────────────────── */}
        {!isOwnListing && sellerListings.length > 0 ? (
          <>
            <Separator />
            <AnimatedSection delay={300} style={{ paddingTop: 16 }} reduceMotion={reduceMotion}>
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
                {t("listing.detail.moreFromSeller")}
              </Text>
              <FlatList
                data={sellerListings}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 10, paddingBottom: 16 }}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <ListingCard
                    listing={item}
                    style={{ width: 160 }}
                    onPress={() => router.replace(`/(main)/listing/${item.id}` as never)}
                  />
                )}
              />
            </AnimatedSection>
          </>
        ) : null}
      </Animated.ScrollView>

      {/* ── Overlay: Back | Heart | More — pinned above ScrollView ──────── */}
      <Animated.View
        style={[
          styles.overlayRow,
          {
            flexDirection: isRtl ? "row-reverse" : "row",
            top: insets.top + 8,
          },
          overlayOpacityAnim,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.overlayBtn, { backgroundColor: colors.darkScrim }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={22} color={colors.overlayForeground} strokeWidth={2.5} />
        </Pressable>

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }}>
          <Pressable
            onPress={handleSaveToggle}
            style={[styles.overlayBtn, { backgroundColor: colors.darkScrim }]}
            hitSlop={12}
            accessibilityRole="togglebutton"
            accessibilityLabel={isSaved ? t("listing.unsave") : t("listing.save")}
          >
            <Animated.View style={heartAnimStyle}>
              <Heart
                size={20}
                color={isSaved ? colors.destructive : colors.overlayForeground}
                fill={isSaved ? colors.destructive : "transparent"}
                strokeWidth={2}
              />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={() => setShowMoreSheet(true)}
            style={[styles.overlayBtn, { backgroundColor: colors.darkScrim }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("listing.detail.moreOptions")}
            testID="more-options-button"
          >
            <MoreHorizontal size={20} color={colors.overlayForeground} strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Sticky action bar ────────────────────────────────────────────── */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        {canContact ? (
          <>
            {/* Firm-price notice — shown when offer button is hidden so buyer
                understands why the offer option is absent (trust signal). */}
            {!isNegotiable && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                  marginBottom: 4,
                }}
                testID="firm-notice-caption"
              >
                {t("chat.offer.firmNotice")}
              </Text>
            )}
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 10,
              }}
            >
              {/* Make an Offer — secondary, narrower. Hidden if listing is non-negotiable. */}
              {isNegotiable && (
                <Button
                  variant="outline"
                  onPress={handleOpenOffer}
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  disabled={isBusy}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600" }}>
                    {t("listing.detail.makeOffer")}
                  </Text>
                </Button>
              )}
              {/* Contact Seller — primary, wider, taller */}
              <Button
                variant="default"
                onPress={handleMessageSeller}
                disabled={isBusy}
                style={[styles.actionBtn, styles.actionBtnPrimary]}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.primaryForeground,
                  }}
                >
                  {t("listing.detail.contactSeller")}
                </Text>
              </Button>
            </View>
          </>
        ) : isOwnListing ? (
          /* Owner's own listing → informational notice only — unchanged. */
          <View
            style={[
              styles.noticeBanner,
              {
                flexDirection: isRtl ? "row-reverse" : "row",
                backgroundColor: colors.muted,
              },
            ]}
          >
            <Ban size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
              {t("listing.detail.ownListingNotice")}
            </Text>
          </View>
        ) : listing.status === "sold" || listing.status === "reserved" ? (
          /* TASK-N317: the sold/reserved dead end — was a flat notice box with
             no next action. Now offers "See similar in {category}" (+ a ±30%
             price band when the already-fetched `similar` rail proves it holds
             live stock) and "More from {seller}", degrading to whichever of
             the two is actually reachable, never an empty button row. */
          <ListingUnavailableActions
            status={listing.status}
            category={listing.category}
            price={listing.price}
            currency={listing.currency}
            similarPrices={(similar ?? []).map((l: Listing) => l.price)}
            sellerId={listing.seller?.id}
            sellerName={listing.seller?.name}
          />
        ) : (
          /* Any other non-contactable, non-owner state (e.g. a draft that
             somehow reached this screen) → generic notice, unchanged. */
          <View
            style={[
              styles.noticeBanner,
              {
                flexDirection: isRtl ? "row-reverse" : "row",
                backgroundColor: colors.muted,
              },
            ]}
          >
            <Ban size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
              {t("listing.detail.unavailableNotice")}
            </Text>
          </View>
        )}
      </View>

      {/* ── More options sheet (action menu) ────────────────────────────── */}
      <Modal
        visible={showMoreSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreSheet(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setShowMoreSheet(false)}
        />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.sheetRow, { borderBottomColor: colors.border }]}
            onPress={handleShare}
          >
            <Text style={{ fontSize: 16, color: colors.foreground }}>
              {t("listing.detail.share")}
            </Text>
          </Pressable>
          {!isOwnListing && (
            <Pressable
              style={[styles.sheetRow, { borderBottomColor: colors.border }]}
              onPress={handleReport}
            >
              <Text style={{ fontSize: 16, color: colors.destructive }}>
                {t("listing.detail.report")}
              </Text>
            </Pressable>
          )}
          <Pressable style={styles.sheetRow} onPress={() => setShowMoreSheet(false)}>
            <Text style={{ fontSize: 16, color: colors.mutedForeground }}>
              {t("common.close")}
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Make an offer sheet — only rendered when listing is negotiable ─── */}
      {isNegotiable && <OfferSheet
        visible={showOfferSheet}
        onClose={() => setShowOfferSheet(false)}
        onSend={handleSendOffer}
        offerAmount={offerAmount}
        onChangeAmount={setOfferAmount}
        currency={listing.currency}
        price={listing.price}
        isBusy={isBusy}
      />}

      {/* ── First message sheet — D2 start flow ─────────────────────────── */}
      {listing && (
        <FirstMessageSheet
          visible={showMessageSheet}
          onClose={() => setShowMessageSheet(false)}
          listingId={listing.id}
          listingTitle={listing.title}
          listingPrice={listing.price}
          listingCurrency={listing.currency}
          perUnit={hasStockToShow(listing)}
        />
      )}

      {/* ── Report sheet — G1 ────────────────────────────────────────────── */}
      <ReportSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        reportableType="Listing"
        reportableId={Number(id)}
      />

      {/* ── Meetup safety tips sheet ─────────────────────────────────────── */}
      <SafetyTipsSheet
        visible={showSafetyTips}
        onClose={() => setShowSafetyTips(false)}
      />
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlayRow: {
    position: "absolute",
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
    // backgroundColor applied inline via colors.darkScrim (useColors token)
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8,
  },
  sectionHead: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 19,
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
  safetyLinkRow: {
    alignItems: "center",
    gap: 6,
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  // Secondary "Make an Offer" — takes 2/5 of the bar width
  actionBtnSecondary: {
    flex: 2,
    minHeight: 50,
  },
  // Primary "Contact Seller" — takes 3/5 of the bar, taller touch target
  actionBtnPrimary: {
    flex: 3,
    minHeight: 50,
  },
  noticeBanner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingBottom: 16,
    overflow: "hidden",
  },
  sheetRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});

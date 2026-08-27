/**
 * MyListingDetail — owner-facing detail screen for a single listing.
 *
 * Sections (in order):
 *  1. ListingGallery — swipeable photos
 *  2. StatusBadge + ExpiryBadge
 *  3. PriceTag (lg) → title
 *  4. Analytics row — views_count + conversations_count
 *  5. Description
 *  6. Location map (if lat/long present)
 *  7. Actions block — primary lifecycle action by state (Draft→Publish,
 *     Active→Reserve, Reserved→Mark Sold) + Edit + Delete
 *  8. "View conversations" row
 *
 * Route: app/(main)/my-listings/[id].tsx
 * API: GET /my/listings/:id via listingsAPI.getMyListing
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import {
  BarChart2,
  ChevronLeft,
  Eye,
  MessageCircle,
  MapPin,
  MoreHorizontal,
  ChevronRight,
  WifiOff,
  PackageX,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/animation";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useListingLifecycle } from "@/hooks/useListingLifecycle";
import { listingsAPI } from "@/api/listings";
import type { ListingAnalyticsEntry } from "@/api/listings";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ExpiryBadge } from "@/components/common/ExpiryBadge";
import { Badge } from "@/components/reusables/badge";
import { availableUnitsOf, totalUnitsOf, isLowStock, hasStockToShow, hasSoldSome, heldUnitsOf } from "@/utils/stock";
import { SaleBuyerCard } from "@/components/common/SaleBuyerCard";
import { ListingMapSection } from "@/components/common/ListingMapSection";
import { BuyerPickerSheet } from "@/components/common/BuyerPickerSheet";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";
import { ListingActionsSheet } from "@/components/common/ListingActionsSheet";
import { PublishSuccessSheet } from "@/screens/seller/listing-form/PublishSuccessSheet";

import { ListingGallery } from "@/screens/shared/listing-detail/ListingGallery";
import { DetailSkeleton } from "@/screens/shared/listing-detail/DetailSkeleton";
import { ViewsSparkline } from "@/components/common/ViewsSparkline";
import { EmptyState } from "@/components/common/EmptyState";

const MY_LISTING_QK = "my-listing";

// Fade + slide section wrapper (native-only animation).
// reduceMotion is passed from the parent screen so the hook is only called once.
function Section({
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
      entering={reduceMotion ? undefined : FadeInDown.delay(delay).duration(350).springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export default function MyListingDetailScreen() {
  // TASK-J952: `published=1` arrives once, right after ListingForm's publish
  // success, to trigger the one-time PublishSuccessSheet below.
  const { id, published } = useLocalSearchParams<{ id: string; published?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { isRtl, formatNumber, formatDate } = useLocalization();
  const colors = useColors();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);
  // TASK-J952: shown exactly once per publish — the param is cleared via
  // router.setParams the instant it's read, so it can never reappear on a
  // subsequent focus or back-navigation into this same screen.
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  useEffect(() => {
    if (published === "1") {
      setShowPublishSuccess(true);
      router.setParams({ published: undefined });
    }
  }, [published]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ──────────────────────────────────────────────────────────
  // `error` IS destructured (design review fix, CYCLE-5) — but see the
  // `!listing` guard below: it drives COPY ONLY, never gating. React Query
  // keeps the last-known-good `data` around when a BACKGROUND refetch fails
  // (focus-refetch, a flaky blip while the PublishSuccessSheet is open),
  // so `error` can be set while `listing` still holds real data — the
  // screen must keep showing that real data, never blank it.
  const { data: listing, isLoading, error, refetch } = useQuery({
    queryKey: [MY_LISTING_QK, id],
    queryFn: () => listingsAPI.getMyListing(Number(id)),
    enabled: !!id,
  });

  // CYCLE-5 design review fix: discriminate the fallback's copy on the REAL
  // HTTP status, not on `isError`. `listingsAPI.getMyListing` is
  // `await http.get(...)` + `convertKeysToCamel(...)` — it throws (an axios
  // error carrying `response.status`) on every non-2xx response, so a plain
  // `isError` boolean can never tell a genuine 404 (listing deleted — a
  // stale deep link, or deleted from the web client) apart from an offline
  // seller's network error. Only a real 404 gets the "not found" copy;
  // every other error (no network, 500, timeout) gets the generic
  // connectivity copy so an online-but-unlucky seller is never told their
  // listing doesn't exist.
  const isMissing =
    (error as { response?: { status?: number } } | null)?.response?.status === 404;

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      if (result.isError) {
        toast.error(t("common.errorTitle"));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, t]);

  // Refetch whenever this screen regains focus (mandatory per mobile.prompt.md §12)
  useFocusEffect(
    useCallback(() => {
      if (id) {
        qc.invalidateQueries({ queryKey: [MY_LISTING_QK, id] });
        qc.invalidateQueries({ queryKey: ["listing-analytics", id] });
      }
    }, [id, qc])
  );

  // ── Analytics (7-day daily view counts) ───────────────────────────────────
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
  } = useQuery({
    queryKey: ["listing-analytics", id],
    queryFn: () => listingsAPI.getListingAnalytics(Number(id)),
    enabled: !!id,
  });

  const analyticsEntries: ListingAnalyticsEntry[] = analyticsData?.entries ?? [];
  const allZero = analyticsEntries.length > 0 && analyticsEntries.every((e) => e.count === 0);

  // TASK-L863: all seven lifecycle mutations, confirmAlert copy, invalidation
  // and BuyerPickerSheet/ReviewPromptSheet wiring live in this ONE hook —
  // shared with SellerListingCard so the two surfaces can never disagree
  // again about e.g. an `active` listing's primary action. Called
  // unconditionally, BEFORE the loading/not-found early returns below
  // (Rules of Hooks) — `listing` is `undefined` for a render or two while
  // the query above is still loading, which the hook tolerates (see its
  // own doc comment).
  const {
    primaryAction,
    moreActions,
    isBusy,
    buyerPicker,
    reviewPrompt,
  } = useListingLifecycle({
    listingId: Number(id),
    listing,
    // This screen IS the listing being deleted — navigate away since
    // there's nothing left here to show (SellerListingCard's row just
    // disappears from the already-invalidated list, so it doesn't need this).
    // TASK-J952 (review fix): never the Browse tab — that's the exact
    // seller-dumped-on-the-buyer-feed defect this card exists to eliminate.
    // My Listings is the seller's own space (same destination used by the
    // 404 fallback's "Back to my listings" action below).
    onDeleted: () => router.replace("/(main)/(tabs)/my-listings" as never),
  });

  // A draft has never been published, so every published-listing
  // affordance is empty for it by definition.
  const isDraft = listing?.status === "draft";

  const handleViewConversations = useCallback(() => {
    router.push({
      pathname: "/(main)/listing-conversations/[id]" as never,
      params: { id: String(id), listingTitle: listing?.title ?? "" },
    } as never);
  }, [router, id, listing?.title]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  // CYCLE-3 CR fix (gating), CYCLE-4/5 design review fix (copy): guard on
  // `!listing` alone, never the error state — the old `isError || !listing`
  // guard threw an already-loaded listing away and replaced the whole
  // screen (sheet included) with the fallback on any background-refetch
  // blip. Only show the fallback when there truly is no listing data at
  // all (first load failed, or a real 404).
  //
  // `isMissing` (a genuine 404) drives the fallback's COPY + action: a
  // confirmed-deleted listing gets the "not found" copy and a "Back to my
  // listings" escape hatch (Retry can never succeed against a 404). Any
  // other error (offline, 500, timeout) gets the generic connectivity copy
  // + Retry, matching every other screen — an online-but-unlucky seller is
  // never told their listing doesn't exist.
  //
  // Both branches render the same floating back-button overlay as the
  // loaded screen below: this route is `headerShown: false`
  // (app/(main)/_layout.tsx), so without it there is no visible way back
  // besides an iOS swipe / Android hardware back button.
  if (!listing) {
    return (
      <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
        <View
          style={[styles.backHeader, { top: insets.top + 4, flexDirection: isRtl ? "row-reverse" : "row" }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.darkScrim }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <ChevronLeft size={22} color={colors.overlayForeground} strokeWidth={2.5} />
          </Pressable>
        </View>
        <EmptyState
          icon={isMissing ? PackageX : WifiOff}
          title={isMissing ? t("listing.ownerDetail.notFound") : t("common.errorTitle")}
          description={
            isMissing ? t("listing.ownerDetail.notFoundDescription") : t("common.errorDescription")
          }
          action={
            isMissing
              ? {
                  label: t("listing.ownerDetail.backToMyListings"),
                  onPress: () => router.replace("/(main)/(tabs)/my-listings"),
                }
              : { label: t("common.retry"), onPress: () => refetch() }
          }
        />
      </ScreenContainer>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const photos = listing.images?.length
    ? listing.images
    : listing.imageUrls?.length
    ? listing.imageUrls
    : listing.thumbnailUrl
    ? [listing.thumbnailUrl]
    : [];

  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      {/* ── Back header overlay (pinned above scroll) ───────────────────── */}
      <View
        style={[
          styles.backHeader,
          {
            top: insets.top + 4,
            flexDirection: rowDir,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.darkScrim }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <ChevronLeft size={22} color={colors.overlayForeground} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        testID="my-listing-detail-scroll"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 1 — Photo gallery */}
        <ListingGallery photos={photos} aspectRatio={4 / 3} />

        {/* 2 — Status + Expiry row */}
        <Section delay={40} style={[styles.section, { gap: 6 }]} reduceMotion={reduceMotion}>
          <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge status={listing.status} />
            <ExpiryBadge
              expiresAt={listing.expiresAt}
              expired={listing.expired}
              status={listing.status}
            />
            {/* Stock — docs/SPIKE_LISTING_QUANTITY.md. This is the seller's
                answer to "how do I know when they're all gone?", and it belongs
                in the status row rather than under the price: for the OWNER it
                is lifecycle information ("6 of 15 left" is why this listing is
                still active), not a buying signal. Always the "N of M left"
                phrasing here, never the buyer's bare "N in stock" — a seller
                needs to see progress through the batch, not just what remains.
                Renders only for a multi-unit listing, so a single-item listing
                is byte-identical to before. */}
            {hasStockToShow(listing) && (
              <View testID="stock-badge-owner">
                <Badge
                  label={
                    // "15 of 15 left" is noise before the first sale — no
                    // progress to show, and the second number just repeats the
                    // first. Switch to the progress phrasing only once it says
                    // something (QA run-017).
                    (hasSoldSome(listing)
                      ? t("listing.stock.leftOfTotal", {
                          available: formatNumber(availableUnitsOf(listing)),
                          total: formatNumber(totalUnitsOf(listing)),
                        })
                      : t("listing.stock.inStock", { count: availableUnitsOf(listing) })) +
                    // SF-M4 (docs/SELL_FLOW_REDESIGN.md §4.2.2/§4.5) — the
                    // OWNER's held clause names the buyer (`sale.buyer.name`
                    // is owner-only and only ever populated on this
                    // `owner_detailed` view, never on the public
                    // ListingDetail.tsx). Falls back to the nameless phrasing
                    // for a legacy buyer-less hold, same defensive pattern as
                    // SaleBuyerCard's `noBuyerRecorded`.
                    (heldUnitsOf(listing) > 0
                      ? ` · ${
                          listing.sale?.buyer?.name
                            ? t("listing.stock.heldForBuyer", {
                                count: heldUnitsOf(listing),
                                name: listing.sale.buyer.name,
                              })
                            : t("listing.stock.held", { count: heldUnitsOf(listing) })
                        }`
                      : "")
                  }
                  variant={isLowStock(availableUnitsOf(listing), totalUnitsOf(listing)) ? "warning" : "muted"}
                />
              </View>
            )}
          </View>

          {/* 2b — TASK-R418: who reserved/bought it, with a one-tap Message CTA */}
          <SaleBuyerCard listing={listing} />

          {/* 3 — Price + title */}
          <PriceTag price={listing.price} currency={listing.currency} size="lg" perUnit={listing.multiUnit === true} />
          <Text
            style={[styles.titleText, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
          >
            {listing.title}
          </Text>

          {/* Location chip */}
          {listing.location && (
            <View style={[styles.rowGap, { flexDirection: rowDir }]}>
              <MapPin size={13} color={colors.mutedForeground} />
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                {listing.location}
              </Text>
            </View>
          )}

          {/* Posted date */}
          {listing.createdAt && (
            <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}>
              {t("listing.ownerDetail.posted", { date: formatDate(listing.createdAt) })}
            </Text>
          )}
        </Section>

        {/* 4 — Analytics, only for a listing that has actually been published.
            A DRAFT has never been visible to anyone, so its views and chats are
            zero by definition — yet the screen rendered "Views 0 / Chats 0" plus a
            full "Views — last 7 days" card with a "No views yet" empty state, which
            pushed the one control that matters — Publish — off the first screen.
            QA hit exactly that: assertVisible "Publish" failed on a draft whose
            visible screen was nothing but empty analytics. */}
        {!isDraft && (
          <>
          <Separator />

          {/* 4 — Analytics row */}
          <Section delay={80} style={[styles.section, { flexDirection: rowDir, gap: 24 }]} reduceMotion={reduceMotion}>
            <View
              style={[styles.statBox, { backgroundColor: colors.muted, borderColor: colors.border }]}
              testID="analytics-views"
            >
              <View style={[styles.rowGap, { flexDirection: rowDir, justifyContent: "center" }]}>
                <Eye size={16} color={colors.mutedForeground} />
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
                  {formatNumber(listing.viewsCount ?? 0)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center" }}>
                {t("listing.ownerDetail.views")}
              </Text>
            </View>

            <Pressable
              style={[styles.statBox, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handleViewConversations}
              testID="analytics-conversations"
            >
              <View style={[styles.rowGap, { flexDirection: rowDir, justifyContent: "center" }]}>
                <MessageCircle size={16} color={colors.primary} />
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
                  {formatNumber(listing.conversationsCount ?? 0)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center" }}>
                {t("listing.ownerDetail.conversations")}
              </Text>
            </Pressable>
          </Section>

          {/* 4b — Daily views sparkline */}
          {(isAnalyticsLoading || analyticsEntries.length > 0) && (
            <>
              <Separator />
              <Section delay={100} style={styles.section} reduceMotion={reduceMotion}>
                <Text
                  style={[
                    styles.sectionHead,
                    { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
                  ]}
                >
                  {t("listing.ownerDetail.dailyViews")}
                </Text>
                {allZero && !isAnalyticsLoading ? (
                  <EmptyState
                    icon={BarChart2}
                    title={t("listing.ownerDetail.noViewsYet")}
                  />
                ) : (
                  <ViewsSparkline
                    entries={analyticsEntries}
                    loading={isAnalyticsLoading}
                  />
                )}
              </Section>
            </>
          )}
          </>
        )}

        {/* 5 — Description */}
        {listing.description ? (
          <>
            <Separator />
            <Section delay={120} style={styles.section} reduceMotion={reduceMotion}>
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
            </Section>
          </>
        ) : null}

        {/* 6 — Location map */}
        {!!listing.latitude && !!listing.longitude && (
          <>
            <Separator />
            <Section delay={160} style={styles.section} reduceMotion={reduceMotion}>
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
            </Section>
          </>
        )}

        <Separator />

        {/* 7 — Lifecycle actions (TASK-L863): exactly two controls — the
            primary action (or, on a terminal `sold` listing with no
            primary, More alone takes the full width) plus a compact "More"
            trigger for everything else, identical to SellerListingCard. */}
        <Section delay={200} style={styles.section} reduceMotion={reduceMotion}>
          <Text
            style={[styles.sectionHead, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
          >
            {t("listing.ownerDetail.actions")}
          </Text>

          <View style={{ flexDirection: rowDir, gap: 8 }}>
            {primaryAction && (
              <Button
                variant="default"
                onPress={primaryAction.onPress}
                disabled={isBusy}
                style={{ flex: 1 }}
                testID="lifecycle-primary-action"
              >
                <Text style={{ fontWeight: "700", color: colors.primaryForeground }}>
                  {primaryAction.label}
                </Text>
              </Button>
            )}
            <Button
              variant="outline"
              onPress={() => setMoreVisible(true)}
              disabled={isBusy}
              style={primaryAction ? styles.moreBtnCompact : { flex: 1 }}
              testID="lifecycle-more-action"
            >
              <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
                <MoreHorizontal size={16} color={colors.foreground} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                  {t("listing.actions.more")}
                </Text>
              </View>
            </Button>
          </View>
        </Section>

        <Separator />

        {/* 8 — View conversations link */}
        <Section delay={240} reduceMotion={reduceMotion}>
          <Pressable
            onPress={handleViewConversations}
            style={[
              styles.conversationsRow,
              {
                flexDirection: rowDir,
                borderTopColor: colors.border,
                borderBottomColor: colors.border,
              },
            ]}
            android_ripple={{ color: colors.muted }}
            testID="view-conversations-link"
          >
            <View style={{ flexDirection: rowDir, alignItems: "center", gap: 12, flex: 1 }}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.primaryAlpha },
                ]}
              >
                <MessageCircle size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                  {t("listing.ownerDetail.viewConversations")}
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}>
                  {t("listing.ownerDetail.conversationsCount", {
                    count: formatNumber(listing.conversationsCount ?? 0),
                  })}
                </Text>
              </View>
            </View>
            <ChevronRight
              size={18}
              color={colors.mutedForeground}
              style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          </Pressable>
        </Section>
      </ScrollView>

      {/* TASK-L863: overflow sheet for every action besides the primary */}
      <ListingActionsSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        actions={moreActions}
        disabled={isBusy}
      />

      {/* TASK-TX01: buyer picker for Reserve / Mark-sold */}
      <BuyerPickerSheet
        visible={buyerPicker.visible}
        onClose={buyerPicker.onClose}
        listingId={Number(id)}
        price={listing.price}
        currency={listing.currency}
        action={buyerPicker.action}
        remainingQuantity={buyerPicker.remainingQuantity}
        onConfirm={buyerPicker.onConfirm}
        isSubmitting={buyerPicker.isSubmitting}
      />

      {/* REV2: rate the buyer right after a sold sale records them */}
      <ReviewPromptSheet
        visible={reviewPrompt.visible}
        onClose={reviewPrompt.onClose}
        transactionId={reviewPrompt.transactionId}
        callerRole="seller"
        counterpartyName={reviewPrompt.buyerName}
        counterpartyAvatarUrl={reviewPrompt.buyerAvatarUrl}
      />

      {/* TASK-J952: post-publish success moment — share / view as buyer / post
          another. Only ever shown right after ListingForm's publish success
          (see the `published` param effect above); dismissing leaves the
          seller right here on their own owner detail. */}
      <PublishSuccessSheet
        visible={showPublishSuccess}
        listing={listing ?? null}
        onClose={() => setShowPublishSuccess(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backHeader: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 10,
    alignItems: "flex-start",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  sectionHead: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  rowGap: {
    gap: 5,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  moreBtnCompact: {
    minWidth: 92,
  },
  conversationsRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

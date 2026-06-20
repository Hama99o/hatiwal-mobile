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

import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import {
  BarChart2,
  ChevronLeft,
  Eye,
  MessageCircle,
  MapPin,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/animation";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { listingsAPI } from "@/api/listings";
import type { ListingAnalyticsEntry } from "@/api/listings";
import { confirmAlert } from "@/utils/alert";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ExpiryBadge } from "@/components/common/ExpiryBadge";
import { ListingMapSection } from "@/components/common/ListingMapSection";

import { ListingGallery } from "@/screens/shared/listing-detail/ListingGallery";
import { DetailSkeleton } from "@/screens/shared/listing-detail/DetailSkeleton";
import { ViewsSparkline } from "@/components/common/ViewsSparkline";
import { EmptyState } from "@/components/common/EmptyState";

const MY_LISTINGS_QK = "my-listings";
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { isRtl, formatNumber, formatDate } = useLocalization();
  const colors = useColors();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const [isActionLoading, setIsActionLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: listing, isLoading, isError, refetch } = useQuery({
    queryKey: [MY_LISTING_QK, id],
    queryFn: () => listingsAPI.getMyListing(Number(id)),
    enabled: !!id,
  });

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

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: [MY_LISTING_QK, id] });
    qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
  }, [qc, id]);

  const publish = useMutation({
    mutationFn: () => listingsAPI.publishListing(Number(id)),
    onSuccess: () => { invalidate(); toast.success(t("listing.publishSuccess")); },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  const reserve = useMutation({
    mutationFn: () => listingsAPI.reserveListing(Number(id)),
    onSuccess: () => { invalidate(); toast.success(t("listing.reserveSuccess")); },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  const markSold = useMutation({
    mutationFn: () => listingsAPI.markSold(Number(id)),
    onSuccess: () => { invalidate(); toast.success(t("listing.markSoldSuccess")); },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  const unpublish = useMutation({
    mutationFn: () => listingsAPI.unpublishListing(Number(id)),
    onSuccess: () => { invalidate(); toast.success(t("listing.unpublishSuccess")); },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  const activate = useMutation({
    mutationFn: () => listingsAPI.activateListing(Number(id)),
    onSuccess: () => { invalidate(); toast.success(t("listing.activateSuccess")); },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  const renew = useMutation({
    mutationFn: () => listingsAPI.renewListing(Number(id)),
    onSuccess: () => { invalidate(); toast.success(t("listing.renewSuccess")); },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  const deleteListing = useMutation({
    mutationFn: () => listingsAPI.deleteListing(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.deleteSuccess"));
      router.replace("/(main)/(tabs)/browse" as never);
    },
    onError: () => toast.error(t("common.error")),
    onSettled: () => setIsActionLoading(false),
  });

  // ── Confirm handlers ───────────────────────────────────────────────────────

  const handlePublish = useCallback(() => {
    confirmAlert(
      t("listing.confirmPublish"),
      t("listing.confirmPublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.publish"), onPress: () => { setIsActionLoading(true); publish.mutate(); } },
      ]
    );
  }, [t, publish]);

  const handleReserve = useCallback(() => {
    confirmAlert(
      t("listing.confirmReserve"),
      t("listing.confirmReserveDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.markReserved"), onPress: () => { setIsActionLoading(true); reserve.mutate(); } },
      ]
    );
  }, [t, reserve]);

  const handleMarkSold = useCallback(() => {
    confirmAlert(
      t("listing.confirmMarkSold"),
      t("listing.markSoldConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.markSold"), onPress: () => { setIsActionLoading(true); markSold.mutate(); } },
      ]
    );
  }, [t, markSold]);

  const handleUnpublish = useCallback(() => {
    confirmAlert(
      t("listing.confirmUnpublish"),
      t("listing.confirmUnpublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.unpublish"), onPress: () => { setIsActionLoading(true); unpublish.mutate(); } },
      ]
    );
  }, [t, unpublish]);

  const handleActivate = useCallback(() => {
    confirmAlert(
      t("listing.confirmActivate"),
      t("listing.confirmActivateDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.activate"), onPress: () => { setIsActionLoading(true); activate.mutate(); } },
      ]
    );
  }, [t, activate]);

  const handleRenew = useCallback(() => {
    confirmAlert(
      t("listing.confirmRenew"),
      t("listing.confirmRenewDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.renew"), onPress: () => { setIsActionLoading(true); renew.mutate(); } },
      ]
    );
  }, [t, renew]);

  const handleDelete = useCallback(() => {
    confirmAlert(
      t("listing.confirmDelete"),
      t("listing.confirmDeleteDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => { setIsActionLoading(true); deleteListing.mutate(); },
        },
      ]
    );
  }, [t, deleteListing]);

  const handleEdit = useCallback(() => {
    router.push(`/(main)/listing/edit/${id}` as never);
  }, [router, id]);

  const handleViewConversations = useCallback(() => {
    router.push({
      pathname: "/(main)/listing-conversations/[id]" as never,
      params: { id: String(id), listingTitle: listing?.title ?? "" },
    } as never);
  }, [router, id, listing?.title]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (isError || !listing) {
    return (
      <ScreenContainer
        scrollable={false}
        padded={false}
        style={{ alignItems: "center", justifyContent: "center", gap: 16 }}
      >
        <Text style={{ color: colors.mutedForeground, fontSize: 16, textAlign: "center" }}>
          {t("listing.ownerDetail.notFound")}
        </Text>
        <Button variant="outline" onPress={() => refetch()}>
          <Text>{t("common.retry")}</Text>
        </Button>
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

  const isExpired = !!listing.expired;
  const busy = isActionLoading ||
    publish.isPending ||
    reserve.isPending ||
    markSold.isPending ||
    unpublish.isPending ||
    activate.isPending ||
    renew.isPending ||
    deleteListing.isPending;

  // Primary lifecycle action — the single most obvious next step
  const primaryAction = (() => {
    if (isExpired) return { label: t("listing.renew"), onPress: handleRenew };
    switch (listing.status) {
      case "draft":    return { label: t("listing.publish"),  onPress: handlePublish };
      case "active":   return { label: t("listing.markReserved"), onPress: handleReserve };
      case "reserved": return { label: t("listing.markSold"), onPress: handleMarkSold };
      default:         return null; // sold — terminal, no further lifecycle step
    }
  })();

  // Secondary actions for this status
  const secondaryActions: { key: string; label: string; onPress: () => void; danger?: boolean }[] = [];
  if (listing.status === "active" && !isExpired) {
    secondaryActions.push({ key: "sold",      label: t("listing.markSold"),    onPress: handleMarkSold });
    secondaryActions.push({ key: "unpublish", label: t("listing.unpublish"),   onPress: handleUnpublish });
  }
  if (listing.status === "active" && isExpired) {
    secondaryActions.push({ key: "sold",      label: t("listing.markSold"),    onPress: handleMarkSold });
  }
  if (listing.status === "reserved") {
    secondaryActions.push({ key: "activate",  label: t("listing.activate"),    onPress: handleActivate });
  }
  secondaryActions.push({ key: "edit",   label: t("common.edit"),   onPress: handleEdit });
  secondaryActions.push({ key: "delete", label: t("common.delete"), onPress: handleDelete, danger: true });

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
          </View>

          {/* 3 — Price + title */}
          <PriceTag price={listing.price} currency={listing.currency} size="lg" />
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

        {/* 7 — Lifecycle actions */}
        <Section delay={200} style={styles.section} reduceMotion={reduceMotion}>
          <Text
            style={[styles.sectionHead, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
          >
            {t("listing.ownerDetail.actions")}
          </Text>

          {/* Primary lifecycle action */}
          {primaryAction && (
            <Button
              variant="default"
              onPress={primaryAction.onPress}
              disabled={busy}
              style={{ width: "100%" }}
              testID="lifecycle-primary-action"
            >
              <Text style={{ fontWeight: "700", color: colors.primaryForeground }}>
                {primaryAction.label}
              </Text>
            </Button>
          )}

          {/* Secondary actions row */}
          <View style={{ flexDirection: rowDir, flexWrap: "wrap", gap: 10 }}>
            {secondaryActions.map((a) => (
              <Button
                key={a.key}
                variant="outline"
                size="sm"
                onPress={a.onPress}
                disabled={busy}
                style={styles.secondaryBtn}
              >
                {a.key === "edit" ? (
                  <View style={{ flexDirection: rowDir, alignItems: "center", gap: 4 }}>
                    <Pencil size={13} color={colors.foreground} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                      {a.label}
                    </Text>
                  </View>
                ) : a.key === "delete" ? (
                  <View style={{ flexDirection: rowDir, alignItems: "center", gap: 4 }}>
                    <Trash2 size={13} color={colors.destructive} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.destructive }}>
                      {a.label}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                    {a.label}
                  </Text>
                )}
              </Button>
            ))}
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
  secondaryBtn: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 88,
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

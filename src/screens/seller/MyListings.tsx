/**
 * MyListings — seller mode screen.
 *
 * Features:
 *   - Status tab filter: All · Draft · Active · Reserved · Sold
 *   - Per-card next-action: Draft→Publish, Active→Reserve, Reserved→Mark sold
 *   - Edit / Delete (with confirmAlert + sonner-native toast)
 *   - "+ Post" FAB header button → C1 (listing/new)
 *   - Skeleton loading (ListingCardSkeleton)
 *   - EmptyState with "Post a listing" CTA
 *   - useFocusEffect refetch
 *   - Full RTL support
 *   - All strings via t() — 3 locales
 */
import React, { useCallback, useState } from "react";
import { View, FlatList, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { ShoppingBag, Plus } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ListingCardSkeleton } from "@/components/common/ListingCardSkeleton";
import { listingsAPI, type Listing } from "@/api/listings";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { cn } from "@/lib/utils";
import { SellerListingCard } from "./my-listings/SellerListingCard";

// ─── Status filter tabs ───────────────────────────────────────────────────────

type StatusFilter = "all" | Listing["status"];

const STATUS_TABS: StatusFilter[] = ["all", "draft", "active", "reserved", "sold"];

// ─── Skeleton list ────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <View className="px-4 pt-4 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [refetchKey, setRefetchKey] = useState(0);

  // Re-fetch whenever the screen gains focus (after create/edit/delete)
  useFocusEffect(
    useCallback(() => {
      setRefetchKey((k) => k + 1);
    }, [])
  );

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", activeTab, refetchKey],
    queryFn: () =>
      listingsAPI.getMyListings(
        activeTab !== "all" ? { status: activeTab } : undefined
      ),
  });

  const listings = data?.items ?? [];

  const handlePostNew = useCallback(() => {
    router.push("/(main)/listing/new" as never);
  }, [router]);

  // ─── Header ────────────────────────────────────────────────────────────────
  const header = (
    <View
      style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}
    >
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        {t("listing.myListings")}
      </Text>
      <Button
        variant="default"
        size="sm"
        onPress={handlePostNew}
        accessibilityLabel={t("listing.postListing")}
      >
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
          <Plus size={15} color={colors.primaryForeground} />
          <Text style={{ fontSize: 12, fontWeight: "600" }}>
            {t("listing.postListing")}
          </Text>
        </View>
      </Button>
    </View>
  );

  // ─── Status filter tabs ────────────────────────────────────────────────────
  const filterTabs = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        flexDirection: isRtl ? "row-reverse" : "row",
      }}
      style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      {STATUS_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            android_ripple={{ color: colors.muted }}
            style={{
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderWidth: 1,
              backgroundColor: isActive ? colors.primary : colors.card,
              borderColor: isActive ? colors.primary : colors.border,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t(`listing.filter.${tab}`)}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? colors.primaryForeground : colors.mutedForeground }}>
              {t(`listing.filter.${tab}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  // ─── Empty state ───────────────────────────────────────────────────────────
  const emptyState =
    activeTab === "all" ? (
      <EmptyState
        icon={ShoppingBag}
        title={t("listing.emptyAll.title")}
        description={t("listing.emptyAll.description")}
        action={{ label: t("listing.postListing"), onPress: handlePostNew }}
      />
    ) : (
      <EmptyState
        icon={ShoppingBag}
        title={t("listing.emptyFiltered.title", {
          status: t(`listing.filter.${activeTab}`),
        })}
        description={t("listing.emptyFiltered.description")}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      {filterTabs}

      {isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList<Listing>
          data={listings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 48, flexGrow: 1 }}
          renderItem={({ item }) => <SellerListingCard listing={item} />}
          ListEmptyComponent={
            <View className="flex-1">{emptyState}</View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

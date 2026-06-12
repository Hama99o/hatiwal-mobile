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
      className="bg-card border-b border-border px-4 pt-4 pb-3"
      style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}
    >
      <Text className="text-xl font-bold text-foreground">
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
          <Text className="text-primary-foreground text-xs font-semibold">
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
      className="bg-card border-b border-border"
    >
      {STATUS_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            android_ripple={{ color: colors.muted }}
            className={cn(
              "rounded-full px-4 py-1.5 border",
              isActive
                ? "bg-primary border-primary"
                : "bg-card border-border"
            )}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t(`listing.filter.${tab}`)}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
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
    <View className="flex-1 bg-background">
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

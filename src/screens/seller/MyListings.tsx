import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useFocusEffect } from "expo-router";
import { ShoppingBag, Plus } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ListingFeed, type ListingFeedViewMode } from "@/components/common/ListingFeed";
import { ListingFiltersBar } from "@/components/common/ListingFiltersBar";
import { listingsAPI, type Listing } from "@/api/listings";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useCategories } from "@/hooks/useCategories";
import { SellerListingCard } from "./my-listings/SellerListingCard";

// "expired" is a virtual filter (active listings past their 30-day clock),
// resolved server-side — not a real status enum value.
type StatusFilter = "all" | Listing["status"] | "expired";
const STATUS_TABS: StatusFilter[] = ["all", "draft", "active", "expired", "reserved", "sold"];

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ListingFeedViewMode>("list");
  const [refetchKey, setRefetchKey] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categories } = useCategories();

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Bump refetchKey on focus — causes UniversalList to re-mount and re-fetch
  // so newly created / edited listings appear immediately without a stale list.
  useFocusEffect(
    useCallback(() => {
      setRefetchKey((k) => k + 1);
    }, [])
  );

  // Header: screen title + "Post a listing" button + status filter tabs.
  // Passed as ListHeaderComponent so it scrolls with the list on short lists
  // but stays pinned via the outer ScreenContainer structure.
  const ListHeader = (
    <View>
      {/* Title row */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          flexDirection: isRtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>
          {t("listing.myListings")}
        </Text>
        <Button
          variant="default"
          size="sm"
          onPress={() => router.push("/(main)/listing/new" as never)}
        >
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={15} color={colors.primaryForeground} />
            <Text className="text-sm font-semibold">
              {t("listing.postListing")}
            </Text>
          </View>
        </Button>
      </View>

      {/* Filter tabs — fixed height horizontal scroll */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          height: 52,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            gap: 8,
            alignItems: "center",
            flexDirection: isRtl ? "row-reverse" : "row",
            height: 52,
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                android_ripple={{ color: colors.muted, borderless: true }}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1.5,
                  backgroundColor: isActive ? colors.primary : "transparent",
                  borderColor: isActive ? colors.primary : colors.border,
                  minHeight: 44,
                  justifyContent: "center",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: isActive ? colors.primaryForeground : colors.mutedForeground,
                  }}
                >
                  {t(`listing.filter.${tab}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search + category chips + view toggle */}
      <ListingFiltersBar
        search={search}
        onSearchChange={setSearch}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder={t("listing.searchPlaceholder")}
      />
    </View>
  );

  const fetcher = useCallback(
    async (query: { page: number; perPage: number }) => {
      const result = await listingsAPI.getMyListings({
        pageNumber: query.page,
        pageSize: query.perPage,
        ...(activeTab !== "all" ? { status: activeTab } : {}),
        search: debouncedSearch || undefined,
        categoryId: categoryId ?? undefined,
      });
      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, debouncedSearch, categoryId]
  );

  return (
    <ScreenContainer scrollable={false} padded={false}>
      <ListingFeed
        id={`my-listings-${activeTab}-${debouncedSearch}-${categoryId}-${viewMode}`}
        refreshKey={refetchKey}
        fetcher={fetcher}
        viewMode={viewMode}
        showStatus
        skeletonCount={3}
        renderListItem={({ item }) => (
          <View style={{ paddingBottom: 16 }}>
            <SellerListingCard listing={item} />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        emptyIcon={ShoppingBag}
        emptyTitle={
          activeTab === "all"
            ? t("listing.emptyAll.title")
            : t("listing.emptyFiltered.title", { status: t(`listing.filter.${activeTab}`) })
        }
        emptyDescription={
          activeTab === "all"
            ? t("listing.emptyAll.description")
            : t("listing.emptyFiltered.description")
        }
        emptyAction={
          activeTab === "all"
            ? { label: t("listing.postListing"), onPress: () => router.push("/(main)/listing/new" as never) }
            : undefined
        }
        contentPaddingBottom={48}
      />
    </ScreenContainer>
  );
}

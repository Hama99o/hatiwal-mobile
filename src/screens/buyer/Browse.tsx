import { View, FlatList, TextInput, TouchableOpacity, RefreshControl } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import type { Category } from "@/api/categories";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { listingsAPI, Listing } from "@/api/listings";
import { categoriesAPI } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { ListingCard } from "@/components/common/ListingCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ListingCardSkeletonGrid } from "@/components/common/ListingCardSkeleton";
import { Search } from "lucide-react-native";

export default function BrowseScreen() {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();

  const getCategoryName = useCallback((cat: Category) => {
    if (i18n.language === "ps") return cat.namePs ?? cat.nameEn;
    if (i18n.language === "fa") return cat.nameFa ?? cat.nameEn;
    return cat.nameEn;
  }, [i18n.language]);
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  // Optimistic save state: listingId → boolean
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});

  // Debounce search — wait 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useFocusEffect(useCallback(() => { setRefetchKey((k) => k + 1); }, []));

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesAPI.getCategories,
    staleTime: 1000 * 60 * 60,
  });

  const { data: listings, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["browse-listings", { search: debouncedSearch, categoryId, refetchKey }],
    queryFn: () => listingsAPI.getListings({ search: debouncedSearch || undefined, categoryId: categoryId ?? undefined }),
  });

  // Seed saved state from fresh server data (don't overwrite optimistic updates)
  useEffect(() => {
    if (!listings) return;
    setSavedMap((prev) => {
      const init: Record<number, boolean> = {};
      listings.items.forEach((l) => { if (l.isSaved !== undefined) init[l.id] = !!l.isSaved; });
      return { ...init, ...prev };
    });
  }, [listings]);

  const saveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.saveListing(id),
    onError: (_e, id) => setSavedMap((prev) => ({ ...prev, [id]: false })),
  });

  const unsaveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unsaveListing(id),
    onError: (_e, id) => setSavedMap((prev) => ({ ...prev, [id]: true })),
  });

  const handleSaveToggle = useCallback((listingId: number, newValue: boolean) => {
    setSavedMap((prev) => ({ ...prev, [listingId]: newValue }));
    if (newValue) {
      saveMutation.mutate(listingId);
    } else {
      unsaveMutation.mutate(listingId);
    }
  }, [saveMutation, unsaveMutation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar */}
      <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 12, gap: 8, height: 44 }}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder={t("browse.searchPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
          />
        </View>
      </View>

      {/* Category chips */}
      {categories && categories.length > 0 && (
        <View style={{ height: 50, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <FlatList
            horizontal
            data={[{ id: null, nameEn: t("browse.all") } as any, ...categories]}
            keyExtractor={(c) => String(c.id ?? "all")}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: "center", flexDirection: isRtl ? "row-reverse" : "row", height: 50 }}
            renderItem={({ item }: { item: Category & { id: null; nameEn: string } }) => {
              const isActive = categoryId === item.id;
              const label = item.id === null ? item.nameEn : getCategoryName(item as Category);
              return (
                <TouchableOpacity
                  onPress={() => setCategoryId(item.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    backgroundColor: isActive ? colors.primary : "transparent",
                    borderColor: isActive ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? colors.primaryForeground : colors.foreground }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Listings grid */}
      {isLoading ? (
        <ListingCardSkeletonGrid count={6} />
      ) : (
        <FlatList
          data={listings?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }: { item: Listing }) => {
            const saved = savedMap[item.id] ?? item.isSaved ?? false;
            return (
              <View style={{ flex: 1 }}>
                <ListingCard
                  listing={item}
                  isSaved={saved}
                  onSaveToggle={handleSaveToggle}
                  onPress={() => router.push(`/(main)/listing/${item.id}` as never)}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={Search}
              title={t("browse.noResults")}
              description={t("browse.noResultsDescription")}
            />
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

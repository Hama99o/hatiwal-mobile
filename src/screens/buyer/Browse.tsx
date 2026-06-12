import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { listingsAPI, Listing } from "@/api/listings";
import { categoriesAPI, Category } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { ListingCard } from "@/components/common/ListingCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ListingCardSkeleton } from "@/components/common/ListingCardSkeleton";
import { Search } from "lucide-react-native";

export default function BrowseScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useFocusEffect(useCallback(() => { setRefetchKey((k) => k + 1); }, []));

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesAPI.getCategories,
    staleTime: 1000 * 60 * 60,
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["browse-listings", { search, categoryId, refetchKey }],
    queryFn: () => listingsAPI.getListings({ search: search || undefined, categoryId: categoryId ?? undefined }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar */}
      <View style={{ padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 12, gap: 8 }}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder={t("browse.searchPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
          />
        </View>
      </View>

      {/* Category chips */}
      {categories && categories.length > 0 && (
        <FlatList
          horizontal
          data={[{ id: null, nameEn: t("browse.all") } as any, ...categories]}
          keyExtractor={(c) => String(c.id ?? "all")}
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: isRtl ? "row-reverse" : "row" }}
          renderItem={({ item }: { item: Category & { id: null; nameEn: string } }) => {
            const isActive = categoryId === item.id;
            return (
              <TouchableOpacity
                onPress={() => setCategoryId(item.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, color: isActive ? colors.primaryForeground : colors.foreground }}>
                  {item.nameEn}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Listings */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <ListingCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={listings?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }: { item: Listing }) => (
            <View style={{ flex: 1, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
              <ListingCard listing={item} />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Search}
              title={t("browse.noResults")}
              description={t("browse.noResultsDescription")}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

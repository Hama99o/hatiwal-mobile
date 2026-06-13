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

      {/* Category chips — fixed height container prevents z-index bleed into list */}
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
                    {item.nameEn}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Listings grid */}
      {isLoading ? (
        <View style={{ padding: 12, gap: 12 }}>
          {[1, 2].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><ListingCardSkeleton /></View>
              <View style={{ flex: 1 }}><ListingCardSkeleton /></View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={listings?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }: { item: Listing }) => (
            <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
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

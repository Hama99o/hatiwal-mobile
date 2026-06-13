import { View, FlatList, RefreshControl } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { Heart } from "lucide-react-native";
import { listingsAPI, type Listing } from "@/api/listings";
import { useColors } from "@/hooks/useColors";
import { ListingCard } from "@/components/common/ListingCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ListingCardSkeletonGrid } from "@/components/common/ListingCardSkeleton";
import { useLocalization } from "@/hooks/useLocalization";

export default function SavedListingsScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const [refetchKey, setRefetchKey] = useState(0);
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});

  useFocusEffect(useCallback(() => { setRefetchKey((k) => k + 1); }, []));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["saved-listings", refetchKey],
    queryFn: listingsAPI.getSavedListings,
  });

  const unsaveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unsaveListing(id),
    onError: (_e, id) => setSavedMap((prev) => ({ ...prev, [id]: true })),
  });

  const handleSaveToggle = useCallback((listingId: number, newValue: boolean) => {
    setSavedMap((prev) => ({ ...prev, [listingId]: newValue }));
    if (!newValue) {
      unsaveMutation.mutate(listingId);
    }
  }, [unsaveMutation]);

  const items = (data?.items ?? []).filter((l) => savedMap[l.id] !== false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 14,
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 10,
      }}>
        <Heart size={22} color={colors.destructive} fill={colors.destructive} />
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          {t("saved.title")}
        </Text>
      </View>

      {isLoading ? (
        <ListingCardSkeletonGrid count={6} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }: { item: Listing }) => (
            <View style={{ flex: 1 }}>
              <ListingCard
                listing={item}
                isSaved={savedMap[item.id] ?? true}
                onSaveToggle={handleSaveToggle}
                onPress={() => router.push(`/(main)/listing/${item.id}` as never)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Heart}
              title={t("saved.empty")}
              description={t("saved.emptyDescription")}
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

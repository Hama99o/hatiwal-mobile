import { View, FlatList, TextInput, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { Sliders, MapPin, ChevronRight, ChevronLeft } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import type { Category } from "@/api/categories";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { listingsAPI, Listing } from "@/api/listings";
import { categoriesAPI } from "@/api/categories";
import { savedSearchesAPI, type SavedSearch } from "@/api/saved-searches";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import type { MapCanvasCoords } from "@/components/common/map/MapCanvas.types";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { ListingCard } from "@/components/common/ListingCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ListingCardSkeletonGrid } from "@/components/common/ListingCardSkeleton";
import { SavedSearches } from "@/components/common/SavedSearches";
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
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<MapCanvasCoords | null>(null);
  const [distance, setDistance] = useState<number>(5);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // Optimistic save state: listingId → boolean
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

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
    queryKey: [
      "browse-listings",
      { search: debouncedSearch, categoryId, priceMin, priceMax, coordinates, distance, location, refetchKey },
    ],
    queryFn: () =>
      listingsAPI.getListings({
        search: debouncedSearch || undefined,
        categoryId: categoryId ?? undefined,
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
        location: coordinates ? undefined : location ?? undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        radius: coordinates ? distance : undefined,
      }),
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

  // Auto-save filter combination when user applies filters
  useEffect(() => {
    if (debouncedSearch || categoryId || location || priceMin || priceMax || coordinates) {
      // Save the current filter combination silently in the background
      savedSearchesAPI.create({
        categoryId: categoryId ?? undefined,
        location: location ?? undefined,
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        radius: coordinates ? distance : undefined,
      }).then(() => {
        qc.invalidateQueries({ queryKey: ["saved-searches"] });
      }).catch(() => {
        // Fail silently — don't disrupt user experience
      });
    }
  }, [debouncedSearch, categoryId, location, distance, priceMin, priceMax, coordinates, qc]);

  // Apply the location + range chosen in the map picker
  const handleConfirmLocation = useCallback(
    ({ coords, radiusKm, label }: { coords: MapCanvasCoords; radiusKm: number; label: string | null }) => {
      setCoordinates(coords);
      setDistance(radiusKm);
      setLocation(label ?? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
    },
    []
  );

  // Clear the location/range filter
  const handleClearLocation = useCallback(() => {
    setCoordinates(null);
    setLocation(null);
    setDistance(5);
  }, []);

  // Apply a saved search's filters
  const handleApplySavedSearch = useCallback((savedSearch: SavedSearch) => {
    setCategoryId(savedSearch.categoryId ?? null);
    setLocation(savedSearch.location ?? null);
    setPriceMin(savedSearch.priceMin ?? null);
    setPriceMax(savedSearch.priceMax ?? null);
    if (savedSearch.locationBased && savedSearch.latitude && savedSearch.longitude) {
      setCoordinates({
        latitude: savedSearch.latitude,
        longitude: savedSearch.longitude,
      });
      // Always reset distance so location + radius never go out of sync.
      setDistance(savedSearch.radius ?? 5);
    } else {
      setCoordinates(null);
      setDistance(5);
    }
    // Reveal the filter panel so the applied location/price are visible.
    setShowFilters(true);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar + Filters button */}
      <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 12, gap: 8, height: 44 }}>
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
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: showFilters ? colors.primary : colors.muted,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Sliders size={20} color={showFilters ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Filter panel */}
        {showFilters && (
          <View style={{ gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            {/* Location & range — opens the map picker */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>
                {t("browse.location")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLocationPicker(true)}
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: colors.background,
                }}
              >
                <MapPin size={18} color={coordinates ? colors.primary : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  {coordinates ? (
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                      {t("browse.withinRadius", { km: distance })}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}>
                      {t("browse.setLocationRange")}
                    </Text>
                  )}
                </View>
                {coordinates ? (
                  <TouchableOpacity onPress={handleClearLocation} hitSlop={10} style={{ padding: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
                      {t("common.clear")}
                    </Text>
                  </TouchableOpacity>
                ) : isRtl ? (
                  <ChevronLeft size={18} color={colors.mutedForeground} />
                ) : (
                  <ChevronRight size={18} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>

            {/* Price filter */}
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground, marginBottom: 6 }}>
                  {t("browse.priceMin") || "Min Price"}
                </Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  value={priceMin?.toString() || ""}
                  onChangeText={(val) => setPriceMin(val ? parseInt(val) : null)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground, marginBottom: 6 }}>
                  {t("browse.priceMax") || "Max Price"}
                </Text>
                <TextInput
                  placeholder="∞"
                  placeholderTextColor={colors.mutedForeground}
                  value={priceMax?.toString() || ""}
                  onChangeText={(val) => setPriceMax(val ? parseInt(val) : null)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  }}
                />
              </View>
            </View>
          </View>
        )}
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

      {/* Saved searches — quick filter history */}
      <SavedSearches onSelectSearch={handleApplySavedSearch} />

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

      {/* Map-based location & range picker */}
      <LocationRangePicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialCoords={coordinates}
        initialRadius={distance}
        onConfirm={handleConfirmLocation}
      />
    </View>
  );
}

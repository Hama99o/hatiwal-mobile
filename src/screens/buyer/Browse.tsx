/**
 * BrowseScreen — photo-first marketplace feed.
 *
 * Features:
 *   - UniversalList (FlashList) with infinite scroll + pull-to-refresh
 *   - Debounced RNR Input search bar (in BrowseHeader)
 *   - Horizontal category chip row + full filter panel (in BrowseHeader)
 *   - Saved searches (auto-save + quick-apply)
 *   - ListingCard with optimistic save-heart toggle
 *   - Skeleton grid on load, EmptyState on empty/no-results, error+retry
 *   - useFocusEffect refetch
 *   - RTL + dark mode correct
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react-native";
import { NoResultsIllustration } from "@/components/common/empty-illustrations";

import { ListingFeed } from "@/components/common/ListingFeed";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import { BrowseHeader } from "./browse/BrowseHeader";
import { computeActiveFilterCount } from "@/utils/browseFilters";

import { listingsAPI, type Listing, type ListingCondition, type ListingSort } from "@/api/listings";
import type { ListQuery, ListFetchResult } from "@/components/common/UniversalList";
import { savedSearchesAPI, type SavedSearch } from "@/api/saved-searches";
import { useCategories } from "@/hooks/useCategories";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useColors } from "@/hooks/useColors";
import { useBrowseViewModeStore } from "@/stores/browseViewMode.store";
import { useSearchHistoryStore } from "@/stores/searchHistory.store";
import type { MapCanvasCoords } from "@/components/common/map/MapCanvas.types";

export default function BrowseScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();

  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useRequireAuth();
  // ── View mode (grid / list) — persisted via zustand + AsyncStorage ──────────
  const viewMode = useBrowseViewModeStore((s) => s.viewMode);
  const setViewMode = useBrowseViewModeStore((s) => s.setViewMode);

  // ── Search history — persisted locally ───────────────────────────────────
  const addToSearchHistory = useSearchHistoryStore((s) => s.add);

  // ── URL params — support pre-filtering via ?categoryId=<n> (from category hub) ──
  // subcategoryName is passed when the user tapped a subcategory chip in the hub,
  // so Browse can show a labelled removable active-filter chip in the header.
  const { categoryId: categoryIdParam, subcategoryName: subcategoryNameParam } =
    useLocalSearchParams<{ categoryId?: string; subcategoryName?: string }>();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(
    categoryIdParam ? Number(categoryIdParam) : null
  );
  // subcategoryLabel is non-null only when a subcategory (leaf) filter is active;
  // clearing it (via the X chip) reverts to showing all listings.
  const [subcategoryLabel, setSubcategoryLabel] = useState<string | null>(
    subcategoryNameParam ?? null
  );
  const [location, setLocation] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<MapCanvasCoords | null>(null);
  const [distance, setDistance] = useState<number>(5);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [condition, setCondition] = useState<ListingCondition | null>(null);
  const [sort, setSort] = useState<ListingSort | null>(null);
  const [sellerActiveDays, setSellerActiveDays] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // ── Optimistic save state: listingId → boolean ────────────────────────────
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});

  // ── Focus refetch ─────────────────────────────────────────────────────────
  const [refetchKey, setRefetchKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRefetchKey((k) => k + 1);
    }, [])
  );

  // ── Sync category from URL param when navigated to from the category hub ──
  // Browse is a tab and stays mounted, so router.push with params won't
  // re-mount the screen. useLocalSearchParams updates reactively, and this
  // effect applies the category param whenever it changes.
  //
  // IMPORTANT: after applying the param we immediately clear it via
  // router.setParams so that the dependency [categoryIdParam] transitions
  // from "5" → undefined. Without this clear, a second tap on the SAME
  // category card in the hub produces a push with an identical param value;
  // the effect dependency has not changed, the effect does NOT re-fire, and
  // the category filter is silently not re-applied.
  useEffect(() => {
    if (categoryIdParam) {
      setCategoryId(Number(categoryIdParam));
      // When a subcategoryName param is present the filter is a subcategory leaf.
      // Store its label so BrowseHeader can show a removable chip with the name.
      // When absent the buyer tapped a top-level card → clear any prior subcategory label.
      setSubcategoryLabel(subcategoryNameParam ?? null);
      // Clear params so the next hub-tap (same or different id) is always a
      // genuine param transition that re-fires this effect.
      router.setParams({ categoryId: undefined, subcategoryName: undefined });
    }
    // Intentionally NOT clearing the filter state when param is absent — the
    // user may still have set a category through the inline chip row.
  }, [categoryIdParam, subcategoryNameParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search debounce ───────────────────────────────────────────────────────
  // Once a search term settles, record it in history so BrowseHeader's "recent
  // searches" chips populate. The store ignores empty / <2-char terms, dedupes,
  // and caps the list, so it is safe to call on every settle.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      addToSearchHistory(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, addToSearchHistory]);

  // ── Categories ────────────────────────────────────────────────────────────
  const { data: categories } = useCategories();

  // ── Save / unsave mutations ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.saveListing(id),
    onError: (_e, id) => setSavedMap((prev) => ({ ...prev, [id]: false })),
  });
  const unsaveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unsaveListing(id),
    onError: (_e, id) => setSavedMap((prev) => ({ ...prev, [id]: true })),
  });

  const handleSaveToggle = useCallback(
    (listingId: number, newValue: boolean) => {
      requireAuth(() => {
        setSavedMap((prev) => ({ ...prev, [listingId]: newValue }));
        if (newValue) saveMutation.mutate(listingId);
        else unsaveMutation.mutate(listingId);
      }, "/(main)/(tabs)/browse");
    },
    [requireAuth, saveMutation, unsaveMutation]
  );

  // ── Auto-save filter combos ───────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const hasFilters = categoryId || location || priceMin || priceMax || coordinates;
    if (!hasFilters) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      savedSearchesAPI
        .create({
          categoryId: categoryId ?? undefined,
          location: location ?? undefined,
          priceMin: priceMin ? parseInt(priceMin) : undefined,
          priceMax: priceMax ? parseInt(priceMax) : undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          radius: coordinates ? distance : undefined,
        })
        .then(() => qc.invalidateQueries({ queryKey: ["saved-searches"] }))
        .catch(() => {});
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [categoryId, location, priceMin, priceMax, coordinates, distance, qc]);

  // ── Location picker ───────────────────────────────────────────────────────
  const handleConfirmLocation = useCallback(
    ({ coords, radiusKm, label }: { coords: MapCanvasCoords; radiusKm: number; label: string | null }) => {
      setCoordinates(coords);
      setDistance(radiusKm);
      setLocation(label ?? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
    },
    []
  );
  const handleClearLocation = useCallback(() => {
    setCoordinates(null);
    setLocation(null);
    setDistance(5);
  }, []);

  // ── Saved search apply ────────────────────────────────────────────────────
  const handleApplySavedSearch = useCallback((saved: SavedSearch) => {
    setCategoryId(saved.categoryId ?? null);
    setLocation(saved.location ?? null);
    setPriceMin(saved.priceMin ? String(saved.priceMin) : "");
    setPriceMax(saved.priceMax ? String(saved.priceMax) : "");
    if (saved.locationBased && saved.latitude && saved.longitude) {
      setCoordinates({ latitude: saved.latitude, longitude: saved.longitude });
      setDistance(saved.radius ?? 5);
    } else {
      setCoordinates(null);
      setDistance(5);
    }
    setShowFilters(true);
  }, []);

  // ── Reset all filters ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryId(null);
    setSubcategoryLabel(null);
    setLocation(null);
    setCoordinates(null);
    setDistance(5);
    setPriceMin("");
    setPriceMax("");
    setCondition(null);
    setSort(null);
    setSellerActiveDays(null);
  }, []);

  // ── UniversalList fetcher key (triggers page reset on filter/mode change) ──
  // viewMode is included so FlashList re-mounts cleanly when switching grid↔list
  // (numColumns change requires a full re-layout, not just a re-render).
  const fetcherKey = `${debouncedSearch}|${categoryId}|${condition}|${priceMin}|${priceMax}|${coordinates?.latitude}|${coordinates?.longitude}|${distance}|${location}|${sort}|${sellerActiveDays}|${viewMode}`;

  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Listing>> => {
      const result = await listingsAPI.getListings({
        pageNumber: query.page,
        pageSize: query.perPage,
        search: debouncedSearch || undefined,
        categoryId: categoryId ?? undefined,
        condition: condition ?? undefined,
        priceMin: priceMin ? parseInt(priceMin) : undefined,
        priceMax: priceMax ? parseInt(priceMax) : undefined,
        location: coordinates ? undefined : (location ?? undefined),
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        radius: coordinates ? distance : undefined,
        sort: sort ?? undefined,
        sellerActiveDays: sellerActiveDays ?? undefined,
      });

      // Seed saved map from server data without overwriting optimistic state
      setSavedMap((prev) => {
        const defaults: Record<number, boolean> = {};
        result.items.forEach((l) => {
          if (l.isSaved !== undefined) defaults[l.id] = !!l.isSaved;
        });
        return { ...defaults, ...prev };
      });

      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcherKey]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(
    debouncedSearch || categoryId !== null || location || priceMin || priceMax || condition || sellerActiveDays
  );

  // Count of individually-active filters/sorts for the summary pill.
  // Default sort (null = newest) is NOT counted. subcategoryLabel is counted
  // via categoryId (subcategory filter always implies a categoryId).
  const activeFilterCount = computeActiveFilterCount({
    debouncedSearch,
    categoryId,
    condition,
    priceMin,
    priceMax,
    coordinates,
    sellerActiveDays,
    sort,
  });

  const listHeader = (
    <BrowseHeader
      search={search}
      onSearchChange={setSearch}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters((v) => !v)}
      coordinates={coordinates}
      distance={distance}
      location={location}
      priceMin={priceMin}
      priceMax={priceMax}
      condition={condition}
      onOpenLocationPicker={() => setShowLocationPicker(true)}
      onClearLocation={handleClearLocation}
      onPriceMinChange={setPriceMin}
      onPriceMaxChange={setPriceMax}
      onConditionChange={setCondition}
      categories={categories}
      categoryId={categoryId}
      onCategoryChange={(id) => {
        // Changing the top-level category from the chip row clears the subcategory label
        setCategoryId(id);
        setSubcategoryLabel(null);
      }}
      onSelectSavedSearch={handleApplySavedSearch}
      sort={sort}
      onSortChange={setSort}
      sellerActiveDays={sellerActiveDays}
      onSellerActiveDaysChange={setSellerActiveDays}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      subcategoryLabel={subcategoryLabel}
      onClearSubcategory={() => {
        setCategoryId(null);
        setSubcategoryLabel(null);
      }}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleReset}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────
  //
  // BrowseHeader lives OUTSIDE ListingFeed so it is NEVER unmounted when
  // loading/error/empty/list state changes. This keeps the TextInput mounted
  // at all times — the keyboard stays open and focus is never lost mid-typing,
  // even when each debounced keystroke flips the feed id and causes a full
  // data-reset cycle. BrowseHeader owns the grid/list toggle — ListingFeed
  // only receives viewMode (no onViewModeChange) so no duplicate toggle appears.
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {listHeader}

      <ListingFeed
        id={`buyer-browse-${fetcherKey}`}
        refreshKey={refetchKey}
        fetcher={fetcher}
        viewMode={viewMode}
        savedMap={Object.fromEntries(
          Object.entries(savedMap).map(([k, v]) => [Number(k), v])
        )}
        onSaveToggle={handleSaveToggle}
        skeletonCount={6}
        emptyIllustration={<NoResultsIllustration size={96} />}
        emptyIcon={Search}
        emptyTitle={hasActiveFilters ? t("browse.noResults") : t("browse.empty.title")}
        emptyDescription={
          hasActiveFilters ? t("browse.noResultsDescription") : t("browse.empty.description")
        }
        emptyAction={
          hasActiveFilters
            ? { label: t("browse.resetFilters"), onPress: handleReset }
            : undefined
        }
        perPage={20}
        contentPaddingBottom={96}
      />

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

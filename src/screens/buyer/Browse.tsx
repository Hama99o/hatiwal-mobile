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
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react-native";

import { ListingFeed } from "@/components/common/ListingFeed";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import { BrowseHeader } from "./browse/BrowseHeader";

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

  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useRequireAuth();
  // ── View mode (grid / list) — persisted via zustand + AsyncStorage ──────────
  const viewMode = useBrowseViewModeStore((s) => s.viewMode);
  const setViewMode = useBrowseViewModeStore((s) => s.setViewMode);

  // ── Search history — persisted locally ───────────────────────────────────
  const addToSearchHistory = useSearchHistoryStore((s) => s.add);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<MapCanvasCoords | null>(null);
  const [distance, setDistance] = useState<number>(5);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [condition, setCondition] = useState<ListingCondition | null>(null);
  const [sort, setSort] = useState<ListingSort | null>(null);
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
    setLocation(null);
    setCoordinates(null);
    setDistance(5);
    setPriceMin("");
    setPriceMax("");
    setCondition(null);
    setSort(null);
  }, []);

  // ── UniversalList fetcher key (triggers page reset on filter/mode change) ──
  // viewMode is included so FlashList re-mounts cleanly when switching grid↔list
  // (numColumns change requires a full re-layout, not just a re-render).
  const fetcherKey = `${debouncedSearch}|${categoryId}|${condition}|${priceMin}|${priceMax}|${coordinates?.latitude}|${coordinates?.longitude}|${distance}|${location}|${sort}|${viewMode}`;

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
    debouncedSearch || categoryId !== null || location || priceMin || priceMax || condition
  );

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
      onCategoryChange={setCategoryId}
      onSelectSavedSearch={handleApplySavedSearch}
      sort={sort}
      onSortChange={setSort}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
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

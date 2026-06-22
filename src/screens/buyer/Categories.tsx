/**
 * CategoriesScreen — Browse-by-category hub.
 *
 * Features:
 *   - 2-column grid of all top-level categories
 *   - Each card shows the category emoji icon, localized name, and active listing count
 *   - Tapping a card with subcategories expands an inline SubcategoryPanel showing
 *     subcategory chips + "All in <Parent>" chip. Tapping a subcategory chip
 *     navigates to Browse pre-filtered by that subcategory's id.
 *   - Tapping a card with no subcategories navigates to Browse filtered by that category
 *   - Tapping an already-expanded card collapses the panel
 *   - Loading skeleton grid, EmptyState when no categories exist
 *   - useFocusEffect refetch
 *   - RTL-safe + dark mode correct via useColors() / useLocalization().isRtl
 */

import React, { useCallback, useState } from "react";
import { View, Pressable, FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Skeleton } from "@/components/reusables/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SubcategoryPanel } from "./categories/SubcategoryPanel";

import { categoriesAPI, type Category } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useCategoryName } from "@/hooks/useCategoryName";

const NUM_COLUMNS = 2;
const SKELETON_COUNT = 8;

// ── Skeleton card ─────────────────────────────────────────────────────────────
function CategoryCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        gap: 10,
        minHeight: 120,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Skeleton style={{ width: 48, height: 48, borderRadius: 24 }} />
      <Skeleton style={{ width: 80, height: 14, borderRadius: 4 }} />
      <Skeleton style={{ width: 56, height: 12, borderRadius: 4 }} />
    </View>
  );
}

// ── Category card ─────────────────────────────────────────────────────────────
interface CategoryCardProps {
  category: Category;
  isExpanded: boolean;
  onPress: (cat: Category) => void;
}

function CategoryCard({ category, isExpanded, onPress }: CategoryCardProps) {
  const colors = useColors();
  const getCategoryName = useCategoryName();
  const { t } = useTranslation();
  const [pressed, setPressed] = useState(false);

  const count = category.activeListingsCount ?? 0;
  const countLabel =
    count === 0
      ? t("categories.itemCountZero")
      : t("categories.itemCount", { count });

  const hasChildren = (category.subcategories?.length ?? 0) > 0;

  return (
    <Pressable
      onPress={() => onPress(category)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={getCategoryName(category)}
      accessibilityState={{ expanded: hasChildren ? isExpanded : undefined }}
      accessibilityHint={hasChildren ? t("categories.tapToExpand") : undefined}
    >
      <View
        style={{
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: isExpanded ? colors.primaryAlpha : colors.card,
          borderWidth: 1,
          borderColor: isExpanded ? colors.primary : (pressed ? colors.primary : colors.border),
          padding: 20,
          alignItems: "center",
          gap: 8,
          opacity: pressed ? 0.85 : 1,
          minHeight: 120,
          justifyContent: "center",
        }}
      >
        {/* Emoji icon or fallback */}
        {category.icon ? (
          <Text style={{ fontSize: 36, lineHeight: 44 }}>{category.icon}</Text>
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.muted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LayoutGrid size={24} color={colors.mutedForeground} />
          </View>
        )}

        {/* Localized category name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: isExpanded ? colors.primary : colors.foreground,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {getCategoryName(category)}
        </Text>

        {/* Active listing count */}
        <Text
          style={{
            fontSize: 11,
            color: count > 0 ? colors.primary : colors.mutedForeground,
            textAlign: "center",
            fontWeight: count > 0 ? "600" : "400",
          }}
        >
          {countLabel}
        </Text>

        {/* Expand/collapse indicator for categories that have subcategories */}
        {hasChildren && (
          <View
            style={{
              position: "absolute",
              top: 8,
              right: 8,
            }}
          >
            {isExpanded ? (
              <ChevronUp size={14} color={colors.primary} />
            ) : (
              <ChevronDown size={14} color={colors.mutedForeground} />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Screen header (shared across states) ─────────────────────────────────────
function ScreenHeader() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: colors.foreground,
          flex: 1,
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {t("categories.hubTitle")}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const getCategoryName = useCategoryName();

  // ── Expanded category (shows subcategory panel below its grid row) ────────
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);

  // ── Fetch categories with counts (also includes subcategories) ────────────
  const { data: categories, isLoading, isError, refetch } = useQuery<Category[]>({
    queryKey: ["categories-with-counts"],
    queryFn: categoriesAPI.getCategoriesWithCounts,
    staleTime: 1000 * 60 * 5,
  });

  // ── Focus refetch — call refetch() directly so cached data stays in place
  //    (no isLoading flash) instead of bumping a queryKey which discards the
  //    cache and forces a skeleton re-render that changes numColumns → crash.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // ── Navigate to Browse pre-filtered by category (or parent category) ──────
  const handleCategoryPress = useCallback(
    (cat: Category) => {
      const hasChildren = (cat.subcategories?.length ?? 0) > 0;
      if (hasChildren) {
        // Toggle expansion — second tap collapses
        setExpandedCategoryId((prev) => (prev === cat.id ? null : cat.id));
      } else {
        // No subcategories — navigate directly to Browse
        router.push({
          pathname: "/(main)/(tabs)/browse",
          params: { categoryId: String(cat.id) },
        } as never);
      }
    },
    [router]
  );

  // ── Navigate to Browse filtered by a specific subcategory ─────────────────
  const handleSubcategoryPress = useCallback(
    (sub: Category) => {
      setExpandedCategoryId(null);
      router.push({
        pathname: "/(main)/(tabs)/browse",
        params: {
          categoryId: String(sub.id),
          // Pass the localized name so BrowseHeader chip shows the correct locale
          subcategoryName: getCategoryName(sub),
        },
      } as never);
    },
    [router, getCategoryName]
  );

  // ── Navigate from "All in <Parent>" chip ─────────────────────────────────
  const handleParentAllPress = useCallback(
    (parent: Category) => {
      setExpandedCategoryId(null);
      router.push({
        pathname: "/(main)/(tabs)/browse",
        params: { categoryId: String(parent.id) },
      } as never);
    },
    [router]
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    const skeletonItems = Array.from({ length: SKELETON_COUNT }, (_, i) => i);
    return (
      <ScreenContainer scrollable={false} padded={false}>
        <ScreenHeader />
        <FlatList
          key="categories-skeleton"
          data={skeletonItems}
          keyExtractor={(i) => String(i)}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 32 }}
          renderItem={() => <CategoryCardSkeleton />}
          scrollEnabled={false}
        />
      </ScreenContainer>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ScreenContainer scrollable={false} padded={false}>
        <ScreenHeader />
        <EmptyState
          icon={LayoutGrid}
          title={t("common.errorTitle")}
          description={t("common.errorDescription")}
          action={{ label: t("common.retry"), onPress: refetch }}
        />
      </ScreenContainer>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!categories || categories.length === 0) {
    return (
      <ScreenContainer scrollable={false} padded={false}>
        <ScreenHeader />
        <EmptyState
          icon={LayoutGrid}
          title={t("categories.empty.title")}
          description={t("categories.empty.description")}
        />
      </ScreenContainer>
    );
  }

  // ── Build rows: pair up categories, insert SubcategoryPanel after the row
  //    containing the expanded parent ────────────────────────────────────────
  //
  // FlatList numColumns=2 handles the pairing automatically. We need to inject
  // the SubcategoryPanel BELOW the row that contains the expanded parent.
  // The cleanest approach: convert the flat categories array into a mixed list
  // where each "row" item is either a pair of categories or a panel item.
  type RowItem =
    | { type: "pair"; left: Category; right: Category | null; rowIndex: number }
    | { type: "panel"; parent: Category; key: string };

  const rows: RowItem[] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const left = categories[i];
    const right = categories[i + 1] ?? null;
    const rowIndex = i / 2;
    rows.push({ type: "pair", left, right, rowIndex });
    // After this row, insert panel if either card in this row is expanded
    if (
      expandedCategoryId !== null &&
      (left.id === expandedCategoryId || right?.id === expandedCategoryId)
    ) {
      const expandedCat =
        left.id === expandedCategoryId ? left : (right as Category);
      rows.push({ type: "panel", parent: expandedCat, key: `panel-${expandedCat.id}` });
    }
  }

  return (
    <ScreenContainer scrollable={false} padded={false}>
      <ScreenHeader />

      <FlatList
        key="categories-data"
        data={rows}
        keyExtractor={(item) => {
          if (item.type === "panel") return item.key;
          return `row-${item.rowIndex}`;
        }}
        contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.background }}
        renderItem={({ item }) => {
          if (item.type === "panel") {
            return (
              <SubcategoryPanel
                parent={item.parent}
                onSelectParent={handleParentAllPress}
                onSelectSubcategory={handleSubcategoryPress}
              />
            );
          }
          // type === "pair"
          return (
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 12,
                paddingHorizontal: 16,
              }}
            >
              <CategoryCard
                category={item.left}
                isExpanded={expandedCategoryId === item.left.id}
                onPress={handleCategoryPress}
              />
              {item.right ? (
                <CategoryCard
                  category={item.right}
                  isExpanded={expandedCategoryId === item.right.id}
                  onPress={handleCategoryPress}
                />
              ) : (
                // Placeholder to keep the grid balanced
                <View style={{ flex: 1 }} />
              )}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

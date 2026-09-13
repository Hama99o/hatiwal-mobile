/**
 * CategoryPicker — shared two-step hierarchical category picker sheet.
 *
 * Promoted from src/screens/seller/listing-form/CategoryPickerSheet.tsx so
 * both the ListingForm (seller) and any future buyer flow can reuse it.
 *
 * Step 1: shows top-level categories (icon + localised name).
 *   - Tapping a category that HAS subcategories → advances to step 2.
 *   - Tapping a leaf category → selects it immediately and closes.
 * Step 2: shows subcategories of the selected parent, with a back button.
 *   - Tapping a subcategory → selects it and closes.
 *
 * Uses raw RN <Modal animationType="slide"> — @gorhom/bottom-sheet requires
 * native-only platform splits that break the web dev runner (Metro can't resolve
 * the .native.js platform-split files on web). All inner UI is RNR components.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { Category } from "@/api/categories";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryName } from "@/hooks/useCategoryName";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { Check, Search, X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";

/** A visible row: the category, plus its parent when the row is a search hit
 *  from one level down. */
type Row = { cat: Category; parent: Category | null };

/** Match across every localized name we carry, not just English.
 *
 *  `nameUr` is included because the API has always sent it and the client
 *  ignored it — an Urdu-speaking seller could not find a category by typing its
 *  Urdu name even though that name is exactly what the picker was showing them. */
function matchesQuery(c: Category, q: string): boolean {
  return (
    c.nameEn.toLowerCase().includes(q) ||
    (c.namePs ?? "").toLowerCase().includes(q) ||
    (c.nameFa ?? "").toLowerCase().includes(q) ||
    (c.nameUr ?? "").toLowerCase().includes(q)
  );
}

export interface CategoryPickerProps {
  visible: boolean;
  selectedId: number | null;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export function CategoryPicker({ visible, selectedId, onSelect, onClose }: CategoryPickerProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  const [step, setStep] = useState<"parent" | "sub">("parent");
  const [activeParent, setActiveParent] = useState<Category | null>(null);
  const [search, setSearch] = useState("");

  const { data: categories = [], isLoading } = useCategories();
  const getCategoryName = useCategoryName();

  // A row is a category plus, for a search hit that lives one level down, the
  // parent it belongs to — so the sheet can say WHERE the match is instead of
  // showing a bare name with no context.
  const rows = useMemo<Row[]>(() => {
    const q = search.trim().toLowerCase();

    // No query: exactly the old behaviour, one level at a time.
    if (!q) {
      const base =
        step === "sub" && activeParent ? (activeParent.subcategories ?? []) : categories;
      return base.map((cat: Category) => ({ cat, parent: null }));
    }

    // Already drilled in: stay inside this parent. Searching the whole tree here
    // would be surprising — the user explicitly narrowed to one branch.
    if (step === "sub" && activeParent) {
      return (activeParent.subcategories ?? [])
        .filter((c: Category) => matchesQuery(c, q))
        .map((cat: Category) => ({ cat, parent: activeParent }));
    }

    // Top level WITH a query: search the WHOLE tree, parents and children alike.
    //
    // This is the bug the owner hit. The filter used to run against the current
    // level only, so a query typed here was matched against the 16 top-level
    // names and nothing else — "Phones" exists, sits one level down, and the
    // sheet said there was nothing. It got far worse with the gemstones work:
    // all 18 stone types (Ruby, Lapis Lazuli, Emerald…) are SUBcategories, so
    // searching the exact word a seller has in mind returned an empty sheet.
    const out: Row[] = [];
    for (const parent of categories as Category[]) {
      if (matchesQuery(parent, q)) out.push({ cat: parent, parent: null });
      for (const child of parent.subcategories ?? []) {
        if (matchesQuery(child, q)) out.push({ cat: child, parent });
      }
    }
    return out;
  }, [categories, step, activeParent, search]);

  const handleClose = useCallback(() => {
    setSearch("");
    setStep("parent");
    setActiveParent(null);
    onClose();
  }, [onClose]);

  function handleSelectParent(cat: Category) {
    const hasSubs = (cat.subcategories?.length ?? 0) > 0;
    if (hasSubs) {
      setSearch("");
      setActiveParent(cat);
      setStep("sub");
    } else {
      handlePick(cat);
    }
  }

  function handlePick(cat: Category) {
    setSearch("");
    setStep("parent");
    setActiveParent(null);
    onSelect(cat);
  }

  function handleBack() {
    setSearch("");
    setStep("parent");
    setActiveParent(null);
  }

  const headerTitle =
    step === "sub" && activeParent
      ? getCategoryName(activeParent)
      : t("listing.form.selectCategory");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      {/* Backdrop — tap to close */}
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={handleClose} />

      {/* Sheet surface */}
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View
          // `gap` on the header rather than marginEnd on the back button: this
          // row is manually reversed, so a directional margin sat on the wrong
          // side of the chevron.
          style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }]}
        >
          {step === "sub" ? (
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              style={styles.backButton}
              android_ripple={{ color: colors.muted, borderless: true }}
            >
              {isRtl ? (
                <ChevronRight size={22} color={colors.primary} />
              ) : (
                <ChevronLeft size={22} color={colors.primary} />
              )}
            </Pressable>
          ) : null}

          <Text
            className="text-lg font-semibold"
            style={[
              styles.headerTitle,
              { color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {headerTitle}
          </Text>

          {step === "parent" && (
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              android_ripple={{ color: colors.muted, borderless: true }}
            >
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {step === "sub" && activeParent && (
          <Text
            className="text-xs"
            style={[
              styles.backToCategories,
              { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("listing.form.backToCategories")}
          </Text>
        )}

        <Separator className="mb-3" />

        {/* Search */}
        <View
          style={[styles.searchRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}
        >
          <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t("listing.form.searchCategories")}
            className="flex-1"
            style={{ textAlign: isRtl ? "right" : "left" }}
          />
        </View>

        {/* List */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <Text
              className="text-sm"
              style={{
                color: colors.mutedForeground,
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              {t("common.loading")}
            </Text>
          ) : rows.length === 0 ? (
            // A FIXED MINIMUM HEIGHT, deliberately. The sheet is content-sized
            // (maxHeight 88%, list flexGrow 0), so when the query matched
            // nothing the panel collapsed to a thin strip — which is what the
            // owner described as the list "disappearing". The empty state was
            // rendering the whole time; there was just nothing holding the
            // sheet open around it.
            <View style={styles.emptyState}>
              <Search size={28} color={colors.mutedForeground} />
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.foreground, textAlign: "center", marginTop: 12 }}
              >
                {t("listing.form.noCategoryMatch", { query: search.trim() })}
              </Text>
              <Text
                className="text-xs"
                style={{
                  color: colors.mutedForeground,
                  textAlign: "center",
                  marginTop: 6,
                  paddingHorizontal: 24,
                }}
              >
                {t("listing.form.noCategoryMatchHint")}
              </Text>
              <Button
                variant="outline"
                onPress={() => setSearch("")}
                style={{ marginTop: 16 }}
              >
                <Text className="text-sm">{t("common.clear")}</Text>
              </Button>
            </View>
          ) : (
            rows.map(({ cat, parent }) => {
              const isSelected = cat.id === selectedId;
              // A row that came back as a search hit from inside a parent is a
              // LEAF here: drilling into its parent would throw away the query
              // the user just typed and make them find it a second time.
              const isSearchHit = parent !== null;
              const hasSubs =
                step === "parent" && !isSearchHit && (cat.subcategories?.length ?? 0) > 0;

              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.row,
                    {
                      flexDirection: isRtl ? "row-reverse" : "row",
                      borderBottomColor: colors.border,
                    },
                    isSelected && { backgroundColor: colors.muted },
                  ]}
                  onPress={() =>
                    step === "parent" && !isSearchHit
                      ? handleSelectParent(cat)
                      : handlePick(cat)
                  }
                  android_ripple={{ color: colors.muted }}
                >
                  {/* Icon */}
                  <Text
                    style={[
                      styles.rowIcon,
                      {
                        marginEnd: isRtl ? 0 : 10,
                        marginStart: isRtl ? 10 : 0,
                      },
                    ]}
                  >
                    {cat.icon}
                  </Text>

                  {/* Name, plus where the match lives when it came from a
                      search across the tree. Without this a hit like "Ruby" is
                      a bare word with no clue it sits under Gemstones. */}
                  <View style={{ flex: 1 }}>
                    <Text
                      className={isSelected ? "text-sm font-semibold" : "text-sm font-normal"}
                      style={{
                        color: colors.foreground,
                        textAlign: isRtl ? "right" : "left",
                      }}
                    >
                      {getCategoryName(cat)}
                    </Text>
                    {parent && (
                      <Text
                        className="text-xs"
                        style={{
                          color: colors.mutedForeground,
                          textAlign: isRtl ? "right" : "left",
                          marginTop: 2,
                        }}
                      >
                        {t("listing.form.inCategory", { name: getCategoryName(parent) })}
                      </Text>
                    )}
                  </View>

                  {/* Right indicator */}
                  {isSelected && <Check size={16} color={colors.primary} />}
                  {!isSelected && hasSubs &&
                    (isRtl ? (
                      <ChevronLeft size={16} color={colors.mutedForeground} />
                    ) : (
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    ))}
                </Pressable>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>

        <Button variant="outline" onPress={handleClose} className="mt-2 mx-4 mb-4">
          <Text>{t("common.cancel")}</Text>
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    maxHeight: "88%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    flexShrink: 0,
  },
  headerTitle: {
    // fontSize/weight handled via className="text-lg font-semibold"
  },
  backToCategories: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  searchRow: {
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchIcon: {
    flexShrink: 0,
  },
  list: {
    flexGrow: 0,
  },
  emptyState: {
    // minHeight is what stops the sheet collapsing to a strip on a no-match
    // query; alignItems/justifyContent centre the state inside it.
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
});

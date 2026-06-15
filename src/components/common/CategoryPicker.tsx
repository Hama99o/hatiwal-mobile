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

  const currentList = useMemo<Category[]>(() => {
    const base =
      step === "sub" && activeParent ? (activeParent.subcategories ?? []) : categories;

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (c: Category) =>
        c.nameEn.toLowerCase().includes(q) ||
        (c.namePs ?? "").toLowerCase().includes(q) ||
        (c.nameFa ?? "").toLowerCase().includes(q)
    );
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
          style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}
        >
          {step === "sub" ? (
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              style={[styles.backButton, { marginEnd: 8 }]}
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
          ) : currentList.length === 0 ? (
            <Text
              className="text-sm"
              style={{
                color: colors.mutedForeground,
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              {t("common.noResults")}
            </Text>
          ) : (
            currentList.map((cat) => {
              const isSelected = cat.id === selectedId;
              const hasSubs = step === "parent" && (cat.subcategories?.length ?? 0) > 0;

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
                    step === "parent" ? handleSelectParent(cat) : handlePick(cat)
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

                  {/* Name */}
                  <Text
                    className={isSelected ? "text-sm font-semibold" : "text-sm font-normal"}
                    style={{
                      flex: 1,
                      color: colors.foreground,
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    {getCategoryName(cat)}
                  </Text>

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

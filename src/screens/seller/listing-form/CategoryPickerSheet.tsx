/**
 * CategoryPickerSheet — searchable category picker in a slide-up modal.
 *
 * Uses raw RN <Modal animationType="slide"> because @gorhom/bottom-sheet
 * requires native build setup. All inner UI is from RNR.
 *
 * Fetches categories from GET /categories on mount, caches via react-query.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { categoriesAPI, Category } from "@/api/categories";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { Check, Search, X } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  selectedId: number | null;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export function CategoryPickerSheet({ visible, selectedId, onSelect, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const [search, setSearch] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesAPI.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const lang = i18n.language as "en" | "ps" | "fa";

  function getCategoryName(cat: Category): string {
    if (lang === "ps") return cat.namePs;
    if (lang === "fa") return cat.nameFa;
    return cat.nameEn;
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.namePs.includes(q) ||
        c.nameFa.includes(q)
    );
  }, [categories, search]);

  function handleClose() {
    setSearch("");
    onClose();
  }

  function handleSelect(cat: Category) {
    setSearch("");
    onSelect(cat);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={{ fontSize: 18, fontWeight: "600", flex: 1 }}>
            {t("listing.form.selectCategory")}
          </Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Separator className="mb-3" />

        {/* Search */}
        <View style={[styles.searchRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
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
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingVertical: 32 }}>
              {t("common.loading")}
            </Text>
          ) : filtered.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingVertical: 32 }}>
              {t("common.noResults")}
            </Text>
          ) : (
            filtered.map((cat) => {
              const isSelected = cat.id === selectedId;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.row,
                    { flexDirection: isRtl ? "row-reverse" : "row" },
                    isSelected && { backgroundColor: colors.muted },
                  ]}
                  onPress={() => handleSelect(cat)}
                  android_ripple={{ color: colors.muted }}
                >
                  <Text
                    style={{ flex: 1, fontSize: 14, fontWeight: isSelected ? "600" : "400", textAlign: isRtl ? "right" : "left" }}
                  >
                    {getCategoryName(cat)}
                  </Text>
                  {isSelected && (
                    <Check size={16} color={colors.primary} />
                  )}
                </Pressable>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>

        <Button variant="outline" onPress={handleClose} className="mt-2">
          <Text>{t("common.cancel")}</Text>
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
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
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
});

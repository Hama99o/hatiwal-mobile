/**
 * ProvincePickerSheet — searchable list of all 34 Afghan provinces.
 * Follows the exact same pattern as CategoryPickerSheet.
 * Province names are shown in the user's current language.
 */

import React, { useState, useMemo } from "react";
import { View, Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { Check, Search, X } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import {
  AFGHAN_PROVINCES,
  getProvinceName,
  type Province,
} from "@/data/afghan_provinces";

interface Props {
  visible: boolean;
  selectedValue: string | null;
  onSelect: (province: Province) => void;
  onClose: () => void;
}

export function ProvincePickerSheet({
  visible,
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return AFGHAN_PROVINCES;
    const q = search.toLowerCase();
    return AFGHAN_PROVINCES.filter(
      (p) =>
        p.en.toLowerCase().includes(q) ||
        p.ps.includes(search) ||
        p.fa.includes(search)
    );
  }, [search]);

  function handleClose() {
    setSearch("");
    onClose();
  }

  function handleSelect(province: Province) {
    setSearch("");
    onSelect(province);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={handleClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            // Clear the Android system nav bar — Math.max keeps the existing
            // 32pt minimum on devices with no bottom inset.
            paddingBottom: Math.max(insets.bottom, 32) + 12,
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", flex: 1 }}>
            {t("listing.form.selectProvince")}
          </Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Separator className="mb-3" />

        {/* Search */}
        <View
          style={[
            styles.searchRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <Search size={16} color={colors.mutedForeground} />
          <Input
            value={search}
            onChangeText={setSearch}
            testID="province-search-input"
            placeholder={t("listing.form.searchProvinces")}
            className="flex-1"
            style={{ textAlign: isRtl ? "right" : "left" }}
          />
        </View>

        {/* List */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {filtered.length === 0 ? (
            <Text
              style={{
                fontSize: 14,
                color: colors.mutedForeground,
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              {t("common.noResults")}
            </Text>
          ) : (
            filtered.map((province) => {
              const isSelected = province.value === selectedValue;
              return (
                <Pressable
                  key={province.value}
                  // A handle for the filtered result rows. Province names are data,
                  // not translations, so a flow cannot rely on their wording — and
                  // with nothing to target, flows fell back to a bare
                  // `tapOn: index:`, which selects no particular element at all.
                  testID="province-option"
                  style={[
                    styles.row,
                    {
                      flexDirection: isRtl ? "row-reverse" : "row",
                      borderBottomColor: colors.border,
                    },
                    isSelected && { backgroundColor: colors.muted },
                  ]}
                  onPress={() => handleSelect(province)}
                  android_ripple={{ color: colors.muted }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: isSelected ? "600" : "400",
                      color: colors.foreground,
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    {getProvinceName(province, i18n.language)}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
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
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
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
  list: {
    flexGrow: 0,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

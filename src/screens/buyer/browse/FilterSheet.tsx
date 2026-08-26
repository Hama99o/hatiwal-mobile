/**
 * FilterSheet — bottom-sheet modal for the Bazaar/Browse filter controls.
 *
 * Replaces the old inline expanding panel that used to live inside
 * BrowseHeader (which had no "tap outside to dismiss" surface and pushed the
 * feed off-screen). Uses the same raw RN <Modal transparent animationType
 * "slide"> pattern as ReportSheet / OfferSheet / BuyerPickerSheet — a dimmed
 * backdrop Pressable closes the sheet, a rounded sheet is pinned to the
 * bottom, and a pinned footer holds "Clear all" + "Show results".
 *
 * All filter state/logic still lives in Browse.tsx — this component only
 * hosts the UI and forwards the exact same callbacks it already receives.
 * Filters apply live as they change, so "Show results" simply closes the
 * sheet (it does not re-fetch or hold any local draft state).
 */

import React from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Sliders,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowUpDown,
  UserCheck,
  Navigation,
  TrendingDown,
} from "lucide-react-native";

import { Input } from "@/components/reusables/input";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ConditionChips } from "@/components/common/ConditionChips";

import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import type { ListingCondition, ListingSort } from "@/api/listings";
import type { MapCanvasCoords } from "@/components/common/map/MapCanvas.types";

const SORT_OPTIONS: { key: ListingSort; labelKey: string }[] = [
  { key: "newest",      labelKey: "browse.sort.newest" },
  { key: "oldest",      labelKey: "browse.sort.oldest" },
  { key: "price_asc",   labelKey: "browse.sort.priceAsc" },
  { key: "price_desc",  labelKey: "browse.sort.priceDesc" },
  { key: "most_viewed", labelKey: "browse.sort.mostViewed" },
];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  coordinates: MapCanvasCoords | null;
  distance: number;
  /** City/text location label — displayed when coordinates are set */
  location: string | null;
  priceMin: string;
  priceMax: string;
  condition: ListingCondition | null;
  onOpenLocationPicker: () => void;
  onClearLocation: () => void;
  onPriceMinChange: (val: string) => void;
  onPriceMaxChange: (val: string) => void;
  onConditionChange: (val: ListingCondition | null) => void;
  sort: ListingSort | null;
  onSortChange: (val: ListingSort | null) => void;
  /** True while the "Nearest" chip is acquiring the device's GPS location. */
  nearestLoading: boolean;
  /** Tapping the "Nearest" chip — parent acquires location, sets/clears sort=nearest, toasts on failure. */
  onToggleNearest: () => void;
  /** When non-null, only listings from sellers active within this many days are shown. */
  sellerActiveDays: number | null;
  onSellerActiveDaysChange: (val: number | null) => void;
  /** TASK-B384: true when the "Deals" (recent price-drop) chip is toggled on. */
  priceDropped: boolean;
  onTogglePriceDropped: () => void;
  /** Resets every filter to its default in one tap. */
  onClearAllFilters: () => void;
}

export function FilterSheet({
  visible,
  onClose,
  coordinates,
  distance,
  location: locationLabel,
  priceMin,
  priceMax,
  condition,
  onOpenLocationPicker,
  onClearLocation,
  onPriceMinChange,
  onPriceMaxChange,
  onConditionChange,
  sort,
  onSortChange,
  nearestLoading,
  onToggleNearest,
  sellerActiveDays,
  onSellerActiveDaysChange,
  priceDropped,
  onTogglePriceDropped,
  onClearAllFilters,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop — tapping it closes the sheet (the "tap outside" surface
            the old inline panel never had). */}
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.darkScrim }]}
          onPress={onClose}
        />

        {/* Sheet surface */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          {/* Grabber handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View
            style={[styles.header, { flexDirection: isRtl ? "row-reverse" : "row" }]}
          >
            <View
              style={[styles.headerLeft, { flexDirection: isRtl ? "row-reverse" : "row" }]}
            >
              <Sliders size={18} color={colors.primary} />
              <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                {t("browse.filters.title")}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              android_ripple={{ color: colors.muted, borderless: true }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Scrollable body — the exact same filter controls that used to
              live inline in BrowseHeader, unchanged in behavior. */}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 18, paddingTop: 6, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Location & range */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("browse.location")}
              </Text>
              <Pressable
                onPress={onOpenLocationPicker}
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
                accessibilityRole="button"
              >
                <MapPin
                  size={18}
                  color={coordinates ? colors.primary : colors.mutedForeground}
                />
                <View style={{ flex: 1 }}>
                  {coordinates ? (
                    <>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.foreground,
                          textAlign: isRtl ? "right" : "left",
                        }}
                      >
                        {t("browse.withinRadius", { km: distance })}
                      </Text>
                      {locationLabel ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                            textAlign: isRtl ? "right" : "left",
                          }}
                          numberOfLines={1}
                        >
                          {locationLabel}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.mutedForeground,
                        textAlign: isRtl ? "right" : "left",
                      }}
                    >
                      {t("browse.setLocationRange")}
                    </Text>
                  )}
                </View>
                {coordinates ? (
                  <Pressable
                    onPress={onClearLocation}
                    hitSlop={10}
                    style={{ padding: 2 }}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.clear")}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.primary,
                      }}
                    >
                      {t("common.clear")}
                    </Text>
                  </Pressable>
                ) : isRtl ? (
                  <ChevronLeft size={18} color={colors.mutedForeground} />
                ) : (
                  <ChevronRight size={18} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>

            {/* Price range */}
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                    textAlign: isRtl ? "right" : "left",
                  }}
                >
                  {t("browse.priceMin")}
                </Text>
                <Input
                  value={priceMin}
                  onChangeText={onPriceMinChange}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{ textAlign: isRtl ? "right" : "left" }}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                    textAlign: isRtl ? "right" : "left",
                  }}
                >
                  {t("browse.priceMax")}
                </Text>
                <Input
                  value={priceMax}
                  onChangeText={onPriceMaxChange}
                  placeholder="∞"
                  keyboardType="numeric"
                  style={{ textAlign: isRtl ? "right" : "left" }}
                />
              </View>
            </View>

            {/* Condition */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("listing.condition.label")}
              </Text>
              <ConditionChips value={condition} onChange={onConditionChange} allowClear />
            </View>

            {/* Sort */}
            <View style={{ gap: 6 }}>
              <View
                style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
              >
                <ArrowUpDown size={14} color={colors.mutedForeground} />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}
                >
                  {t("browse.sort.label")}
                </Text>
              </View>
              {/* Horizontal scroll keeps all 5 pills readable at their natural
                  width. RTL: content wrapper uses row-reverse so the leading
                  pill (Newest first) stays on the start edge in ps/fa. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  // A horizontal scroller is ALREADY laid out right-to-left when
                  // I18nManager.isRTL, so reversing its content container on top of that
                  // flips it back: the first item lands at the far edge while the scroller
                  // opens scrolled the other way. Same defect as CategoryChipRow (the
                  // category chips the user reported as clipped at the border).
                  gap: 8,
                  paddingHorizontal: 2,
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      // Toggle: tapping the active sort clears it (back to the
                      // default newest order), mirroring the condition chips.
                      onPress={() => onSortChange(isActive ? null : opt.key)}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        backgroundColor: isActive ? colors.primary : "transparent",
                        borderColor: isActive ? colors.primary : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: isActive ? colors.primaryForeground : colors.foreground,
                        }}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* "Nearest" chip — acquires the device's GPS location on tap
                    (via expo-location, see Browse.tsx `handleToggleNearest`)
                    instead of being a plain value like the pills above. */}
                <Pressable
                  onPress={onToggleNearest}
                  disabled={nearestLoading}
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 9,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    backgroundColor: sort === "nearest" ? colors.primary : "transparent",
                    borderColor: sort === "nearest" ? colors.primary : colors.border,
                    opacity: nearestLoading ? 0.7 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === "nearest", busy: nearestLoading }}
                  accessibilityLabel={t("browse.sort.nearest")}
                >
                  {nearestLoading ? (
                    <ActivityIndicator
                      size={13}
                      color={sort === "nearest" ? colors.primaryForeground : colors.mutedForeground}
                    />
                  ) : (
                    <Navigation
                      size={13}
                      color={sort === "nearest" ? colors.primaryForeground : colors.mutedForeground}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: sort === "nearest" ? colors.primaryForeground : colors.foreground,
                    }}
                  >
                    {nearestLoading ? t("browse.nearestLocationLoading") : t("browse.sort.nearest")}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Active sellers chip */}
            <View style={{ gap: 6 }}>
              <View
                style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
              >
                <UserCheck size={14} color={colors.mutedForeground} />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}
                >
                  {t("browse.sellerActivity")}
                </Text>
              </View>
              <Pressable
                onPress={() => onSellerActiveDaysChange(sellerActiveDays === 7 ? null : 7)}
                style={{
                  alignSelf: isRtl ? "flex-end" : "flex-start",
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  backgroundColor: sellerActiveDays === 7 ? colors.primary : "transparent",
                  borderColor: sellerActiveDays === 7 ? colors.primary : colors.border,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: sellerActiveDays === 7 }}
                accessibilityHint={t("browse.activeSellersHint")}
              >
                <UserCheck
                  size={14}
                  color={sellerActiveDays === 7 ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: sellerActiveDays === 7 ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {t("browse.activeSellers")}
                </Text>
                {sellerActiveDays === 7 && <X size={12} color={colors.primaryForeground} />}
              </Pressable>
            </View>

            {/* Deals chip — TASK-B384: toggles the recent price-drop filter */}
            <View style={{ gap: 6 }}>
              <View
                style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
              >
                <TrendingDown size={14} color={colors.mutedForeground} />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}
                >
                  {t("browse.filters.dealsLabel")}
                </Text>
              </View>
              <Pressable
                onPress={onTogglePriceDropped}
                style={{
                  alignSelf: isRtl ? "flex-end" : "flex-start",
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  backgroundColor: priceDropped ? colors.primary : "transparent",
                  borderColor: priceDropped ? colors.primary : colors.border,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: priceDropped }}
                accessibilityHint={t("browse.filters.dealsHint")}
              >
                <TrendingDown
                  size={14}
                  color={priceDropped ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: priceDropped ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {t("browse.filters.deals")}
                </Text>
                {priceDropped && <X size={12} color={colors.primaryForeground} />}
              </Pressable>
            </View>
          </ScrollView>

          {/* Pinned footer — stays OUTSIDE the scroll so both actions are
              always visible, even when the keyboard is open. Filters already
              apply live as they change, so "Show results" just closes the
              sheet — it never re-fetches anything itself. */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Button
              variant="outline"
              onPress={onClearAllFilters}
              style={{ flex: 1 }}
              testID="filter-sheet-clear-all"
            >
              <Text>{t("browse.clearAllFilters")}</Text>
            </Button>
            <Button
              variant="default"
              onPress={onClose}
              style={{ flex: 2 }}
              testID="filter-sheet-apply"
            >
              <Text>{t("browse.filters.apply")}</Text>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "85%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerLeft: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
});

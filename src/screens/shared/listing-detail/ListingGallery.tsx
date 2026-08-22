/**
 * ListingGallery — swipeable photo gallery for the listing detail screen.
 *
 * Uses a horizontal FlatList with pagingEnabled and animated page dots.
 * Tapping any photo opens a fullscreen modal viewer.
 * Uses expo-image (RemoteImage) for caching + blurhash placeholders.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/lib/animation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { RemoteImage } from "@/components/common/RemoteImage";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { galleryHeight } from "@/utils/gallery";

// ── Animated page dot ─────────────────────────────────────────────────────────
function GalleryDot({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotion();
  const width = useSharedValue(active ? 16 : 6);
  const opacity = useSharedValue(active ? 1 : 0.4);

  useEffect(() => {
    if (reduceMotion) {
      // Snap immediately — no spring/timing when Reduce Motion is on.
      width.value = active ? 16 : 6;
      opacity.value = active ? 1 : 0.4;
      return;
    }
    width.value = withSpring(active ? 16 : 6, { damping: 12, stiffness: 220 });
    opacity.value = withTiming(active ? 1 : 0.4, { duration: 200 });
  }, [active, width, opacity, reduceMotion]);

  const colors = useColors();
  const style = useAnimatedStyle(() => ({
    width: width.value,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.overlayForeground,
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

interface ListingGalleryProps {
  photos: string[];
  aspectRatio?: number;
}

export function ListingGallery({ photos, aspectRatio = 4 / 3 }: ListingGalleryProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Photo galleries always scroll left-to-right regardless of locale.
  // RN's horizontal FlatList auto-reverses in RTL mode which breaks pagingEnabled.
  // The scaleX:-1 trick on the outer View + counter-flip on each item keeps the
  // scroll direction and content orientation correct in all locales.
  const { isRtl } = useLocalization();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const modalFlatListRef = useRef<FlatList>(null);

  // MEASURED PER RENDER, not once at module load.
  //
  // This used to be `const { width: SW } = Dimensions.get("window")` at module
  // scope, which freezes the page width at the first import. Every page of a
  // `pagingEnabled` list is SW wide, so after a rotation or a split-screen
  // resize the pages no longer match the viewport and paging lands between
  // photos. A hook re-measures on every dimension change.
  const { width: winW, height: winH } = useWindowDimensions();

  // Height comes from the SHARED rule in @/utils/gallery — ListingDetail wraps
  // this component in an animated container sized by the same function, and if
  // the two ever disagree the screen below the hero is pushed out of view.
  const heroHeight = galleryHeight(winW, winH, aspectRatio);
  const galleryContentHeight = winH - 120;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (!photos.length) {
    return (
      <View
        style={[
          styles.noPhotoBox,
          { height: heroHeight, backgroundColor: colors.imagePlaceholder },
        ]}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.muted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Camera size={36} color={colors.mutedForeground} />
        </View>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 12 }}>
          {t("listing.noPhoto")}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.galleryContainer, { height: heroHeight, backgroundColor: colors.galleryBg }]}>
        {/* scaleX flip: forces LTR scroll in RTL locales; each item counter-flips content */}
        <View style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item: uri, index }) => (
            <Pressable
              onPress={() => {
                setModalIndex(index);
                setShowModal(true);
              }}
              style={[
                { width: winW, height: heroHeight },
                isRtl ? { transform: [{ scaleX: -1 }] } : undefined,
              ]}
              android_ripple={null}
            >
              <RemoteImage
                uri={uri}
                transition={300}
                style={StyleSheet.absoluteFill}
              />
            </Pressable>
          )}
        />
        </View>

        {/* Animated page dots */}
        {photos.length > 1 && (
          <View style={styles.dotsRow}>
            {photos.map((_, i) => (
              <GalleryDot key={i} active={i === activeIndex} />
            ))}
          </View>
        )}

        {/* Photo counter */}
        {photos.length > 1 && (
          <View style={[styles.counter, { top: insets.top + 8, backgroundColor: colors.darkScrim }]}>
            <Text style={{ color: colors.overlayForeground, fontSize: 12, fontWeight: "600" }}>
              {activeIndex + 1} / {photos.length}
            </Text>
          </View>
        )}
      </View>

      {/* Fullscreen modal gallery */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.fullscreenGallery, { backgroundColor: colors.photoViewerBg }]}>
          {/* Header — fully dark, immersive */}
          <View
            style={[
              styles.galleryHeader,
              {
                paddingTop: insets.top + 8,
                backgroundColor: colors.darkScrimHeavy,
                borderBottomColor: colors.overlayBorder,
              },
            ]}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.overlayTextMuted }}>
              {modalIndex + 1} / {photos.length}
            </Text>
            <Pressable
              onPress={() => setShowModal(false)}
              hitSlop={12}
              style={[styles.closeBtn, { marginLeft: "auto", backgroundColor: colors.overlayButtonBg }]}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <X size={22} color={colors.overlayForeground} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Photo carousel — scaleX trick keeps scroll direction LTR in RTL locales */}
          <View style={[styles.galleryContent, isRtl ? { transform: [{ scaleX: -1 }] } : undefined]}>
            <FlatList
              ref={modalFlatListRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const currentIndex = Math.round(
                  e.nativeEvent.contentOffset.x / winW
                );
                setModalIndex(currentIndex);
              }}
              initialScrollIndex={modalIndex}
              getItemLayout={(_, index) => ({
                length: winW,
                offset: winW * index,
                index,
              })}
              renderItem={({ item: uri, index }) => (
                <View
                  style={[
                    {
                      width: winW,
                      height: galleryContentHeight,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    isRtl ? { transform: [{ scaleX: -1 }] } : undefined,
                  ]}
                >
                  {uri ? (
                    <RemoteImage
                      uri={uri}
                      contentFit="contain"
                      transition={300}
                      style={{ width: "100%", height: "100%" }}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={{ alignItems: "center", gap: 12 }}>
                      <Camera size={40} color={colors.mutedForeground} />
                      <Text style={{ color: colors.mutedForeground }}>
                        {t("listing.noPhoto")} {index + 1}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          </View>

          {/* Bottom dots */}
          {photos.length > 1 && (
            <View style={[styles.galleryDots, { paddingBottom: insets.bottom + 16 }]}>
              {photos.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setModalIndex(i);
                    modalFlatListRef.current?.scrollToIndex({ index: i, animated: true });
                  }}
                  style={[
                    styles.galleryDot,
                    {
                      backgroundColor:
                        i === modalIndex ? colors.overlayForeground : colors.overlayDotInactive,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  galleryContainer: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  noPhotoBox: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    alignItems: "center",
    zIndex: 5,
  },
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
  },
  fullscreenGallery: {
    flex: 1,
  },
  galleryHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  galleryContent: {
    flex: 1,
  },
  galleryDots: {
    paddingVertical: 12,
    // Platform audit (2026-06-18): iOS home indicator occupies ~28pt at the bottom
    // of the full-screen gallery overlay; Android has no equivalent inset → 16pt
    // is the correct fallback. Intentional on both platforms.
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  galleryDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
});

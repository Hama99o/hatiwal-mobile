/**
 * PhotosSection — multi-photo picker with reorder support.
 *
 * Empty state:   full-width dashed card, tap to open source picker.
 * With photos:   horizontal strip of 104×104 thumbnails + single "+" tile at end.
 * First photo:   "Cover" badge — always displayed first.
 * Reorder:       long-press any thumb to enter select mode, then tap another to swap.
 * Source picker: bottom sheet (Photo Library | Take Photo | Cancel).
 */

import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LISTING_BLURHASH } from "@/constants/images";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { Text } from "@/components/reusables/text";
import { Camera, ImageIcon, Plus, Star, X, ArrowLeftRight } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";

export interface PhotoItem {
  uri: string;
  /** true if this is an already-uploaded remote URL (edit mode) */
  isRemote?: boolean;
}

interface Props {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
}

const MAX_DEFAULT = 8;
const THUMB = 104;

export function PhotosSection({
  photos,
  onChange,
  maxPhotos = MAX_DEFAULT,
}: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const [pickerVisible, setPickerVisible] = useState(false);
  // reorder: index of the photo currently "picked up" for swapping (-1 = none)
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const canAddMore = photos.length < maxPhotos;

  // ── Source picker ─────────────────────────────────────────────────────────

  async function pickFromLibrary() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("listing.form.permissionRequired"),
        t("listing.form.galleryPermission")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: maxPhotos - photos.length,
    });
    if (!result.canceled) {
      const newPhotos: PhotoItem[] = result.assets.map((a) => ({ uri: a.uri }));
      onChange([...photos, ...newPhotos]);
    }
  }

  async function pickFromCamera() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("listing.form.permissionRequired"),
        t("listing.form.cameraPermission")
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      onChange([...photos, { uri: result.assets[0].uri }]);
    }
  }

  // ── Photo management ──────────────────────────────────────────────────────

  function removePhoto(index: number) {
    setSelectedIdx(-1);
    onChange(photos.filter((_, i) => i !== index));
  }

  function promoteToFirst(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    setSelectedIdx(-1);
    onChange(next);
  }

  function handleThumbPress(index: number) {
    if (selectedIdx === -1) {
      // Nothing selected — enter select mode
      setSelectedIdx(index);
      return;
    }
    if (selectedIdx === index) {
      // Tapped same photo — deselect
      setSelectedIdx(-1);
      return;
    }
    // Swap selectedIdx ↔ index
    const next = [...photos];
    [next[selectedIdx], next[index]] = [next[index], next[selectedIdx]];
    setSelectedIdx(-1);
    onChange(next);
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (photos.length === 0) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.labelRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
            {t("listing.form.photos")}
          </Text>
        </View>

        <Pressable
          style={[
            styles.emptyCard,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={() => setPickerVisible(true)}
        >
          <Camera size={32} color={colors.mutedForeground} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: colors.foreground,
              marginTop: 10,
            }}
          >
            {t("listing.form.addPhotos")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            {t("listing.form.photosHint")}
          </Text>
        </Pressable>

        <SourcePickerSheet
          visible={pickerVisible}
          onLibrary={pickFromLibrary}
          onCamera={pickFromCamera}
          onClose={() => setPickerVisible(false)}
        />
      </View>
    );
  }

  // ── Strip with photos ─────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Label + count + hint */}
      <View
        style={[
          styles.labelRow,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
          {t("listing.form.photos")}
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginLeft: 6 }}>
          {`${photos.length}/${maxPhotos}`}
        </Text>
      </View>

      {selectedIdx !== -1 && (
        <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 4 }}>
          {t("listing.form.reorderHint")}
        </Text>
      )}

      {/* Horizontal strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.strip,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        {photos.map((photo, index) => {
          const isSelected = index === selectedIdx;
          return (
            <Pressable
              key={photo.uri + index}
              onPress={() => handleThumbPress(index)}
              onLongPress={() => setSelectedIdx(index)}
              delayLongPress={300}
              style={[
                styles.thumb,
                isSelected && {
                  borderWidth: 2.5,
                  borderColor: colors.primary,
                  borderRadius: 10,
                },
              ]}
            >
              <Image
                source={{ uri: photo.uri }}
                style={styles.thumbImg}
                contentFit="cover"
                placeholder={{ blurhash: LISTING_BLURHASH }}
                transition={200}
              />

              {/* Cover badge — first photo only */}
              {index === 0 && (
                <View
                  style={[styles.coverBadge, { backgroundColor: colors.primary }]}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: colors.primaryForeground,
                    }}
                  >
                    {t("listing.form.coverLabel")}
                  </Text>
                </View>
              )}

              {/* Swap indicator when selected */}
              {isSelected && (
                <View style={styles.swapOverlay}>
                  <ArrowLeftRight size={16} color="#fff" />
                </View>
              )}

              {/* Remove × (only when not in reorder mode) */}
              {selectedIdx === -1 && (
                <Pressable
                  style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => removePhoto(index)}
                  hitSlop={8}
                >
                  <X size={9} color="#fff" strokeWidth={3} />
                </Pressable>
              )}

              {/* Set as cover ★ (non-first only, when not in reorder mode) */}
              {index !== 0 && selectedIdx === -1 && (
                <Pressable
                  style={styles.coverBtn}
                  onPress={() => promoteToFirst(index)}
                  hitSlop={6}
                >
                  <Star size={11} color="#fff" />
                </Pressable>
              )}
            </Pressable>
          );
        })}

        {/* Single + add tile */}
        {canAddMore && selectedIdx === -1 && (
          <Pressable
            style={[
              styles.addTile,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={() => setPickerVisible(true)}
          >
            <Plus size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </ScrollView>

      <SourcePickerSheet
        visible={pickerVisible}
        onLibrary={pickFromLibrary}
        onCamera={pickFromCamera}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

// ── Internal source picker bottom sheet ──────────────────────────────────────

interface SourcePickerProps {
  visible: boolean;
  onLibrary: () => void;
  onCamera: () => void;
  onClose: () => void;
}

function SourcePickerSheet({
  visible,
  onLibrary,
  onCamera,
  onClose,
}: SourcePickerProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.sheetRow,
            {
              flexDirection: isRtl ? "row-reverse" : "row",
              borderBottomColor: colors.border,
            },
          ]}
          onPress={onLibrary}
        >
          <ImageIcon size={18} color={colors.foreground} />
          <Text style={{ fontSize: 16, color: colors.foreground, marginLeft: 12 }}>
            {t("listing.form.gallery")}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.sheetRow,
            {
              flexDirection: isRtl ? "row-reverse" : "row",
              borderBottomColor: colors.border,
            },
          ]}
          onPress={onCamera}
        >
          <Camera size={18} color={colors.foreground} />
          <Text style={{ fontSize: 16, color: colors.foreground, marginLeft: 12 }}>
            {t("listing.form.camera")}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.sheetRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
          onPress={onClose}
        >
          <Text
            style={{ fontSize: 16, color: colors.mutedForeground, textAlign: "center", flex: 1 }}
          >
            {t("common.cancel")}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 10 },
  labelRow: { alignItems: "center", gap: 4 },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  strip: {
    gap: 10,
    paddingVertical: 4,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: {
    width: THUMB,
    height: THUMB,
  },
  coverBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  swapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  coverBtn: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  sheetRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});

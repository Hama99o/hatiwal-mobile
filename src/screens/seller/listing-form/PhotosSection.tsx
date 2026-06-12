/**
 * PhotosSection — multi-photo picker strip.
 *
 * Uses expo-image-picker for camera + library access.
 * Uses expo-image for display (disk-cached, placeholders).
 * Supports reorder (drag via long-press swap), cover indicator (first photo),
 * and per-photo remove.
 *
 * Props are intentionally simple: the parent ListingForm owns the photos array.
 */

import React from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { X, Camera, ImageIcon, Star } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";

export interface PhotoItem {
  uri: string;
  /** true if this is an already-uploaded URL (edit mode) */
  isRemote?: boolean;
}

interface Props {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
}

const MAX_DEFAULT = 8;

export function PhotosSection({ photos, onChange, maxPhotos = MAX_DEFAULT }: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  const canAddMore = photos.length < maxPhotos;

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("listing.form.permissionRequired"), t("listing.form.galleryPermission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: maxPhotos - photos.length,
    });
    if (!result.canceled) {
      const newPhotos: PhotoItem[] = result.assets.map((a) => ({ uri: a.uri }));
      onChange([...photos, ...newPhotos]);
    }
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("listing.form.permissionRequired"), t("listing.form.cameraPermission"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onChange([...photos, { uri: result.assets[0].uri }]);
    }
  }

  function removePhoto(index: number) {
    const next = photos.filter((_, i) => i !== index);
    onChange(next);
  }

  function moveToFront(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.labelRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          {t("listing.form.photos")}
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginLeft: 8 }}>
          {`${photos.length}/${maxPhotos}`}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.strip,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        {photos.map((photo, index) => (
          <View key={photo.uri + index} style={styles.thumb}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.thumbImage}
              contentFit="cover"
              placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
              transition={200}
            />
            {/* Cover badge on first photo */}
            {index === 0 && (
              <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                <Star size={10} color={colors.primaryForeground} fill={colors.primaryForeground} />
              </View>
            )}
            {/* Remove button */}
            <Pressable
              style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
              onPress={() => removePhoto(index)}
              hitSlop={8}
            >
              <X size={10} color={colors.destructiveForeground} strokeWidth={3} />
            </Pressable>
            {/* Tap to set as cover (not index 0) */}
            {index !== 0 && (
              <Pressable
                style={styles.setCoverBtn}
                onPress={() => moveToFront(index)}
                hitSlop={4}
              >
                <Star size={12} color="#fff" />
              </Pressable>
            )}
          </View>
        ))}

        {/* Add photo button */}
        {canAddMore && (
          <View style={[styles.addGroup, { flexDirection: isRtl ? "row-reverse" : "column" }]}>
            <Pressable
              style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={pickFromLibrary}
            >
              <ImageIcon size={22} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                {t("listing.form.gallery")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.card }, styles.addBtnCamera]}
              onPress={pickFromCamera}
            >
              <Camera size={22} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                {t("listing.form.camera")}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {photos.length === 0 && (
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 8 }}>
          {t("listing.form.photosHint")}
        </Text>
      )}
    </View>
  );
}

const THUMB_SIZE = 90;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelRow: {
    alignItems: "center",
    gap: 4,
  },
  strip: {
    gap: 10,
    paddingVertical: 4,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
  },
  coverBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  setCoverBtn: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  addGroup: {
    gap: 8,
  },
  addBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnCamera: {
    marginTop: 0,
  },
});

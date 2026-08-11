/**
 * PhotosSection — multi-photo picker with reorder support.
 *
 * Empty state:   full-width dashed card, tap to open source picker.
 * With photos:   horizontal strip of 104×104 thumbnails + single "+" tile at end.
 * First photo:   "Cover" badge — always displayed first.
 * Reorder:       long-press any thumb to enter select mode, then tap another to swap.
 * Source picker: raw RN <Modal animationType="slide"> — all sheets in this project
 *                use raw Modal because @gorhom/bottom-sheet has native-only platform
 *                splits that crash the web dev runner (can't resolve .native.js files).
 *                iOS uses ActionSheetIOS instead (avoids modal-conflict black screen).
 */

import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  ActionSheetIOS,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RemoteImage } from "@/components/common/RemoteImage";
import { FieldError } from "@/components/common/FieldError";
import { FieldLabel } from "@/components/common/FieldLabel";
import { showPermissionDeniedAlert, showLimitedPhotoAccessAlert } from "@/lib/permissions";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { Text } from "@/components/reusables/text";
import { Camera, ImageIcon, Plus, Star, X, ArrowLeftRight } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import { triggerHaptic } from "@/lib/animation/haptics";
import { useReduceMotion } from "@/lib/animation/useReduceMotion";

export interface PhotoItem {
  uri: string;
  /** true if this is an already-uploaded remote URL (edit mode) */
  isRemote?: boolean;
  /** blob signed_id for a remote photo — sent in removed_image_ids when deleted */
  id?: string;
}

interface Props {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  /**
   * TASK-P736 — set by ListingForm when Publish (or saving an already-
   * published listing) was blocked because there are zero photos. Renders a
   * destructive border on the photo card/strip plus the message; the caller
   * clears it as soon as a photo is added.
   */
  error?: string;
}

const MAX_DEFAULT = 8;
const THUMB = 104;

export function PhotosSection({
  photos,
  onChange,
  maxPhotos = MAX_DEFAULT,
  error,
}: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [pickerVisible, setPickerVisible] = useState(false);
  // reorder: index of the photo currently "picked up" for swapping (-1 = none)
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const canAddMore = photos.length < maxPhotos;

  // ── Source picker ─────────────────────────────────────────────────────────

  async function launchLibrary() {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // Platform audit (2026-06-18):
    //   The "limited" access state (iOS 14+ "Select Photos" / Android API 34+) is
    //   NOT a separate PermissionStatus value — `status` stays "granted". Instead,
    //   expo-image-picker surfaces it via `accessPrivileges === "limited"` on the
    //   MediaLibraryPermissionResponse object.
    //   • "granted" + accessPrivileges "all"     → full library access; proceed silently.
    //   • "granted" + accessPrivileges "limited"  → partial access; inform user, continue.
    //   • "denied" / "none"                       → block and show Settings CTA (centralized
    //     helper — see src/lib/permissions.ts).
    if (permResult.status !== "granted") {
      showPermissionDeniedAlert("photos", t);
      return;
    }
    if (permResult.accessPrivileges === "limited") {
      // Show a friendly notice about partial access, then continue launching the picker
      // (the user can still pick from their allowed subset of photos).
      showLimitedPhotoAccessAlert(t);
      // Intentionally fall through — proceed to launchImageLibraryAsync so the user can
      // still select photos from their allowed subset. Returning here would block them
      // entirely, which is worse than proceeding with partial access.
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: maxPhotos - photos.length,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => ({ uri: a.uri }))]);
    }
  }

  async function launchCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    // Platform audit (2026-06-18):
    //   Camera permission only has "granted" / "denied" / "undetermined" on both iOS and
    //   Android — there is no "limited" state for camera. This check is correct on both
    //   platforms. Intentional fallback: non-granted → show Settings prompt (centralized
    //   helper — see src/lib/permissions.ts).
    if (status !== "granted") {
      showPermissionDeniedAlert("camera", t);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      onChange([...photos, { uri: result.assets[0].uri }]);
    }
  }

  // Platform audit (2026-06-18):
  //   iOS: ActionSheetIOS.showActionSheetWithOptions() is a native sheet that dismisses
  //   synchronously, which allows the image picker to present without a modal-conflict
  //   black screen. Intentional iOS-only path — no "web" fallback needed (web removed).
  //   Android: raw <Modal animationType="slide"> is used instead. Intentional — the
  //   Android path has a correct fallback and is the default for non-iOS platforms.
  //
  // TASK-P736 (review fix) — single place both "add a photo" entry points
  // (the empty-state card AND the "+" tile once photos exist) call through,
  // so the haptic tap-confirmation fires identically from either one.
  function showSourcePicker() {
    triggerHaptic("light", reduceMotion);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t("listing.form.gallery"),
            t("listing.form.camera"),
            t("common.cancel"),
          ],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) launchLibrary();
          else if (index === 1) launchCamera();
        }
      );
    } else {
      setPickerVisible(true);
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
          {/* TASK-P736 (review fix) — Photos is a publish-required field just
              like Title/Price/Category/Location; it must carry the same " *"
              marker as those, via the shared `FieldLabel` (review fix, CR
              round 2: was still a copy-pasted `<Label>...<Text>{" "}*</Text>`
              — the exact duplication `FieldError` was extracted to kill). */}
          <FieldLabel required className="text-lg font-semibold">
            {t("listing.form.photos")}
          </FieldLabel>
        </View>

        <Pressable
          testID="photos-add-button"
          accessibilityRole="button"
          accessibilityLabel={t("listing.form.addPhotos")}
          style={[
            styles.emptyCard,
            {
              borderColor: error ? colors.destructive : colors.border,
              backgroundColor: colors.card,
            },
          ]}
          onPress={showSourcePicker}
          android_ripple={{ color: colors.muted }}
        >
          <Camera size={32} color={error ? colors.destructive : colors.mutedForeground} />
          <Text
            className="text-base font-medium"
            style={{ color: colors.foreground, marginTop: 10 }}
          >
            {t("listing.form.addPhotos")}
          </Text>
          <Text
            className="text-xs"
            style={{ color: colors.mutedForeground, marginTop: 4, textAlign: "center" }}
          >
            {t("listing.form.photosHint")}
          </Text>
        </Pressable>

        {error && <FieldError message={error} />}

        <SourcePickerSheet
          visible={pickerVisible}
          onLibrary={() => { setPickerVisible(false); launchLibrary(); }}
          onCamera={() => { setPickerVisible(false); launchCamera(); }}
          onClose={() => setPickerVisible(false)}
        />
      </View>
    );
  }

  // ── Strip with photos ─────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Label + count — RTL-safe: marginStart/marginEnd for the count */}
      <View
        style={[
          styles.labelRow,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        {/* TASK-P736 (review fix) — same " *" treatment as the empty state
            (see above) so the required marker never disappears once the
            seller has added at least one photo; both now go through the
            shared `FieldLabel` (review fix, CR round 2). */}
        <FieldLabel required className="text-lg font-semibold">
          {t("listing.form.photos")}
        </FieldLabel>
        <Text
          className="text-xs"
          style={{
            color: colors.mutedForeground,
            // RTL-safe: count sits at the logical end of the label
            marginStart: isRtl ? 0 : 6,
            marginEnd: isRtl ? 6 : 0,
          }}
        >
          {`${photos.length}/${maxPhotos}`}
        </Text>
      </View>

      {selectedIdx !== -1 && (
        <Text className="text-xs" style={{ color: colors.primary, marginBottom: 4 }}>
          {t("listing.form.reorderHint")}
        </Text>
      )}

      {/* Horizontal strip — destructive border wraps the whole strip when the
          seller tried to publish/save with zero photos and then re-added
          some (brief window before the error clears). */}
      <View
        style={
          error
            ? {
                borderWidth: 1.5,
                borderColor: colors.destructive,
                borderRadius: 12,
                padding: 6,
              }
            : undefined
        }
      >
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
              <RemoteImage
                uri={photo.uri}
                style={styles.thumbImg}
                transition={200}
              />

              {/* Cover badge — first photo only */}
              {index === 0 && (
                <View
                  style={[styles.coverBadge, { backgroundColor: colors.primary }]}
                >
                  <Text
                    className="font-bold"
                    style={{
                      fontSize: 9,
                      color: colors.primaryForeground,
                    }}
                  >
                    {t("listing.form.coverLabel")}
                  </Text>
                </View>
              )}

              {/* Swap indicator when selected */}
              {isSelected && (
                <View style={[styles.swapOverlay, { backgroundColor: colors.darkScrim }]}>
                  <ArrowLeftRight size={16} color={colors.overlayForeground} />
                </View>
              )}

              {/* Remove × (only when not in reorder mode) */}
              {selectedIdx === -1 && (
                <Pressable
                  style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => removePhoto(index)}
                  hitSlop={8}
                >
                  <X size={13} color={colors.overlayForeground} strokeWidth={3} />
                </Pressable>
              )}

              {/* Set as cover ★ (non-first only, when not in reorder mode) */}
              {index !== 0 && selectedIdx === -1 && (
                <Pressable
                  style={[styles.coverBtn, { backgroundColor: colors.darkScrim }]}
                  onPress={() => promoteToFirst(index)}
                  hitSlop={8}
                >
                  <Star size={14} color={colors.overlayForeground} />
                </Pressable>
              )}
            </Pressable>
          );
        })}

        {/* Single + add tile */}
        {canAddMore && selectedIdx === -1 && (
          <Pressable
            testID="photos-add-button"
            accessibilityRole="button"
            accessibilityLabel={t("listing.form.addPhotos")}
            style={[
              styles.addTile,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={showSourcePicker}
            android_ripple={{ color: colors.muted }}
          >
            <Plus size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </ScrollView>
      </View>

      {error && <FieldError message={error} />}

      <SourcePickerSheet
        visible={pickerVisible}
        onLibrary={() => { setPickerVisible(false); launchLibrary(); }}
        onCamera={() => { setPickerVisible(false); launchCamera(); }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

// ── Internal source picker (Android only) ────────────────────────────────────
// iOS uses ActionSheetIOS (see showSourcePicker above).
// Raw <Modal> is consistent with all other sheets in this project.

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
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        {/* TASK-P736 (review fix) — the "add a photo" flow has 4 tap targets
            in total (empty-state card / "+" tile, both testID="photos-add-button"
            above, PLUS these two source-choice rows); each gets its own
            distinct testID, an accessibilityLabel, and haptic confirmation
            so the whole flow is consistently testable and accessible. */}
        <Pressable
          testID="photos-add-button-gallery"
          accessibilityRole="button"
          accessibilityLabel={t("listing.form.gallery")}
          style={[
            styles.sheetRow,
            {
              flexDirection: isRtl ? "row-reverse" : "row",
              borderBottomColor: colors.border,
            },
          ]}
          onPress={() => {
            triggerHaptic("light", reduceMotion);
            onLibrary();
          }}
          android_ripple={{ color: colors.muted }}
        >
          <ImageIcon size={18} color={colors.foreground} />
          <Text
            className="text-base"
            style={{
              color: colors.foreground,
              marginStart: isRtl ? 0 : 12,
              marginEnd: isRtl ? 12 : 0,
            }}
          >
            {t("listing.form.gallery")}
          </Text>
        </Pressable>

        <Pressable
          testID="photos-add-button-camera"
          accessibilityRole="button"
          accessibilityLabel={t("listing.form.camera")}
          style={[
            styles.sheetRow,
            {
              flexDirection: isRtl ? "row-reverse" : "row",
              borderBottomColor: colors.border,
            },
          ]}
          onPress={() => {
            triggerHaptic("light", reduceMotion);
            onCamera();
          }}
          android_ripple={{ color: colors.muted }}
        >
          <Camera size={18} color={colors.foreground} />
          <Text
            className="text-base"
            style={{
              color: colors.foreground,
              marginStart: isRtl ? 0 : 12,
              marginEnd: isRtl ? 12 : 0,
            }}
          >
            {t("listing.form.camera")}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.sheetRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
          onPress={onClose}
          android_ripple={{ color: colors.muted }}
        >
          <Text
            className="text-base"
            style={{ color: colors.mutedForeground, textAlign: "center", flex: 1 }}
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
  // TASK-P736 (review fix, CR round 2) — `start`/`end` (logical, RTL-aware)
  // replace the previous hardcoded `left`/`right`, matching DESIGN_SYSTEM.md
  // §8 ("never hard-code left/right"). Without this, the Cover badge, the
  // remove ✕, and the set-as-cover ★ all stayed pinned to the same physical
  // corner under ps/fa instead of mirroring with the rest of the RTL layout.
  coverBadge: {
    position: "absolute",
    bottom: 5,
    start: 5,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  swapOverlay: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    // backgroundColor applied inline via colors.darkScrim (useColors token)
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    end: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  coverBtn: {
    position: "absolute",
    top: 4,
    start: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    // backgroundColor applied inline via colors.darkScrim (useColors token)
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
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    // Platform audit (2026-06-18): iOS bottom safe-area is 34pt (home indicator);
    // Android has no equivalent inset so 16pt is the correct fallback.
    // useSafeAreaInsets().bottom is preferred at runtime (handled in the component
    // via Math.max(insets.bottom, 16)) — this StyleSheet default is a secondary guard.
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  sheetRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});

/**
 * ComposerActionsSheet — the chat composer's single "+" bottom sheet (TASK-K487).
 *
 * Collapses the four attachment controls that used to crowd the composer row
 * (Calendar / Paperclip / ImageIcon / Tag, all squeezed next to the multiline
 * input) into ONE raw RN <Modal transparent animationType="slide"> bottom
 * sheet — the house convention for sheets in this project (see
 * PhotosSection.tsx's SourcePickerSheet and the currency sheet in
 * ListingForm.tsx; @gorhom/bottom-sheet is not used here because its
 * native-only platform splits crash the web dev runner).
 *
 * Rows, in order: Photo, File, Propose meetup, Make an offer (offer row only
 * when `canMakeOffer` is true — mirrors Conversation.tsx's `canOfferInThread`
 * matrix exactly: open conversation, listing exists, not deleted, not sold,
 * negotiable !== false).
 *
 * iOS BLACK-SCREEN GUARD (do not skip): every row calls `onClose()` FIRST and
 * THEN invokes its handler — launching expo-image-picker / expo-document-picker
 * while this JS Modal is still mounted is the documented modal-conflict black
 * screen on iOS. Mirrors the exact
 * `onPress={() => { setPickerVisible(false); launchLibrary(); }}` pattern used
 * by PhotosSection's SourcePickerSheet.
 */
import React from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar, ImageIcon, Paperclip, Tag } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface ComposerActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Opens the photo library picker — Conversation.tsx's `handlePhotoAttachment`. */
  onPhoto: () => void;
  /** Opens the document picker — Conversation.tsx's `handleAttachment`. */
  onFile: () => void;
  /** Opens the meetup proposal sheet. */
  onProposeMeetup: () => void;
  /** Opens the make/counter-an-offer sheet. */
  onMakeOffer: () => void;
  /**
   * Mirrors Conversation.tsx's `canOfferInThread`: true only on an open
   * conversation about a listing that exists, isn't deleted, isn't sold, and
   * is negotiable (negotiable !== false). Hides the offer row when false.
   */
  canMakeOffer: boolean;
  /** True while a photo or file upload is in flight — disables every row. */
  disabled?: boolean;
}

interface Row {
  key: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  testID: string;
}

export function ComposerActionsSheet({
  visible,
  onClose,
  onPhoto,
  onFile,
  onProposeMeetup,
  onMakeOffer,
  canMakeOffer,
  disabled = false,
}: ComposerActionsSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();

  // iOS BLACK-SCREEN GUARD: close the sheet BEFORE calling the handler — see
  // file header. `onClose` runs synchronously; the handler (async picker /
  // sheet-open) is invoked right after.
  const runAndClose = (handler: () => void) => {
    onClose();
    handler();
  };

  const rows: Row[] = [
    {
      key: "photo",
      icon: <ImageIcon size={20} color={colors.primary} />,
      label: t("chat.attachPhoto"),
      onPress: () => runAndClose(onPhoto),
      testID: "composer-action-photo",
    },
    {
      key: "file",
      icon: <Paperclip size={20} color={colors.foreground} />,
      label: t("chat.attachFile"),
      onPress: () => runAndClose(onFile),
      testID: "composer-action-file",
    },
    {
      key: "meetup",
      icon: <Calendar size={20} color={colors.foreground} />,
      label: t("chat.proposeMeetup"),
      onPress: () => runAndClose(onProposeMeetup),
      testID: "composer-action-meetup",
    },
  ];

  // TASK-C381 / TASK-K487: only shown when the pinned listing still supports
  // an in-thread offer — see `canMakeOffer` doc above.
  if (canMakeOffer) {
    rows.push({
      key: "offer",
      icon: <Tag size={20} color={colors.warning} />,
      label: t("chat.offer.makeOffer"),
      onPress: () => runAndClose(onMakeOffer),
      testID: "composer-action-offer",
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.darkScrim }]}
        onPress={onClose}
        testID="composer-actions-backdrop"
      />
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
        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>

        <Text
          className="text-lg font-semibold"
          style={{
            color: colors.foreground,
            marginBottom: 4,
            paddingHorizontal: 20,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t("chat.composer.actionsTitle")}
        </Text>

        {rows.map((row, index) => (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            disabled={disabled}
            testID={row.testID}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            android_ripple={{ color: colors.muted }}
            style={[
              styles.row,
              {
                flexDirection: isRtl ? "row-reverse" : "row",
                borderBottomWidth: index < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.border,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            {row.icon}
            <Text
              className="text-base"
              style={{
                color: colors.foreground,
                marginStart: isRtl ? 0 : 14,
                marginEnd: isRtl ? 14 : 0,
              }}
            >
              {row.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // backgroundColor applied inline via colors.darkScrim (useColors token)
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  handleRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  row: {
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
});

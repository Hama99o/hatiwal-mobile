/**
 * FirstMessageSheet — slide-up modal for sending the first message to a seller.
 *
 * Shows a preset default message (editable) before starting a conversation.
 * Submits via conversationsAPI.startConversation and navigates to the thread.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { toast } from "@/lib/toast";
import { X, MessageCircle } from "lucide-react-native";

import { conversationsAPI } from "@/api/conversations";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Textarea } from "@/components/reusables/textarea";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { PriceTag } from "@/components/common/PriceTag";
import { apiErrorMessage } from "@/utils/apiError";

interface FirstMessageSheetProps {
  visible: boolean;
  onClose: () => void;
  listingId: number;
  listingTitle: string;
  listingPrice: number;
  listingCurrency: string;
  /**
   * Multi-quantity — renders the price as "14,000 each". This sheet is the last
   * thing a buyer sees before their first message, so it is the last chance to
   * correct a per-unit price they may have read as the batch price
   * (docs/SPIKE_LISTING_QUANTITY.md §0c).
   */
  perUnit?: boolean;
}

export function FirstMessageSheet({
  visible,
  onClose,
  listingId,
  listingTitle,
  listingPrice,
  listingCurrency,
  perUnit = false,
}: FirstMessageSheetProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [message, setMessage] = useState(t("listing.detail.defaultMessage"));

  const mutation = useMutation({
    mutationFn: () =>
      conversationsAPI.startConversation(listingId, message.trim() || t("listing.detail.defaultMessage")),
    onSuccess: (conversation) => {
      onClose();
      router.push(`/(main)/conversation/${conversation.id}` as never);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { status?: number; data?: { errors?: string[] } } };
      const status = axiosErr?.response?.status;
      const messages: string[] = axiosErr?.response?.data?.errors ?? [];

      if (status === 422) {
        // Duplicate conversation — navigate to existing
        toast.error(messages[0] ?? apiErrorMessage(err, t));
      } else {
        toast.error(apiErrorMessage(err, t));
      }
    },
  });

  const handleClose = useCallback(() => {
    setMessage(t("listing.detail.defaultMessage"));
    onClose();
  }, [onClose, t]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    mutation.mutate();
  }, [message, mutation]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      onShow={() => setMessage(t("listing.detail.defaultMessage"))}
    >
      {/* Backdrop */}
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={handleClose} />

      <KeyboardAvoidingView
        // Platform audit (2026-06-18):
        //   iOS "padding" — lifts the sheet so the keyboard doesn't cover the Textarea.
        //   Android "height" — shrinks the KAV so the bottom sheet recalculates its
        //   layout and the Send button stays visible above the keyboard. Was previously
        //   `undefined` which left the keyboard overlapping the message input on Android.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kvContainer}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View
            style={[
              styles.header,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <View
              style={[
                styles.headerLeft,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <MessageCircle size={18} color={colors.primary} />
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground }}>
                {t("listing.detail.messageSeller")}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Listing reference */}
          <View
            style={[
              styles.listingRef,
              {
                backgroundColor: colors.muted,
                borderRadius: 10,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.foreground,
                  textAlign: isRtl ? "right" : "left",
                }}
                numberOfLines={2}
              >
                {listingTitle}
              </Text>
              {/* Design review fix (TASK-F513): "md" (17sp/700) — the price
                  must outrank the 13sp/600 title on this listing-reference
                  row, mirroring PublishSuccessSheet's summary-row treatment
                  where price is the dominant text on every listing surface. */}
              <PriceTag price={listingPrice} currency={listingCurrency} size="md" perUnit={perUnit} />
            </View>
          </View>

          {/* Message input */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.foreground,
              marginBottom: 8,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("listing.detail.yourMessage")}
          </Text>
          <Textarea
            value={message}
            onChangeText={setMessage}
            placeholder={t("listing.detail.defaultMessage")}
            placeholderTextColor={colors.mutedForeground}
            style={{ textAlign: isRtl ? "right" : "left", minHeight: 80 }}
            maxLength={500}
          />

          {/* Note */}
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 8,
              lineHeight: 17,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("listing.detail.messageNote")}
          </Text>

          {/* Send button */}
          <Button
            variant="default"
            onPress={handleSend}
            disabled={mutation.isPending || !message.trim()}
            style={{ marginTop: 16 }}
          >
            <Text style={{ fontWeight: "600" }}>
              {mutation.isPending
                ? t("common.loading")
                : t("listing.detail.sendMessage")}
            </Text>
          </Button>

          <Button variant="ghost" onPress={handleClose} disabled={mutation.isPending} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.mutedForeground }}>{t("common.cancel")}</Text>
          </Button>

          <View style={{ height: Math.max(insets.bottom, 8) + 12 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
  },
  kvContainer: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
    marginBottom: 16,
    gap: 8,
  },
  headerLeft: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  listingRef: {
    padding: 12,
    marginBottom: 16,
    gap: 8,
    alignItems: "center",
  },
});

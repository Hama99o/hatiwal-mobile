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
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight, keyboardSafeBottom } from "@/hooks/useKeyboardVisible";
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
import { buildFirstMessageText } from "./firstMessageQuantity";

interface FirstMessageSheetProps {
  visible: boolean;
  onClose: () => void;
  listingId: number;
  listingTitle: string;
  listingPrice: number;
  listingCurrency: string;
  /**
   * Multi-quantity — renders the price as "14,000 each" AND (SF-M6) doubles as
   * the `multiUnit` gate for the quantity-aware message template below. This
   * sheet is the last thing a buyer sees before their first message, so it is
   * the last chance to correct a per-unit price they may have read as the
   * batch price (docs/SPIKE_LISTING_QUANTITY.md §0c).
   */
  perUnit?: boolean;
  /**
   * SF-M6 — the buyer's quantity from ListingDetail's `QuantityStepper`.
   * Defaults to 1 so every call site that predates this ticket (a single-item
   * listing, or a multi-unit one left at the default) renders the exact same
   * plain `defaultMessage` as before — see `buildFirstMessageText`.
   */
  quantity?: number;
}

export function FirstMessageSheet({
  visible,
  onClose,
  listingId,
  listingTitle,
  listingPrice,
  listingCurrency,
  perUnit = false,
  quantity = 1,
}: FirstMessageSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency, formatNumber } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // The sheet lifts ITSELF on Android — see the note on KeyboardAvoidingView below.
  const keyboardHeight = useKeyboardHeight();
  const androidLift = Platform.OS === "android" ? keyboardHeight : 0;
  // HOW MUCH ROOM IS LEFT once the sheet has been lifted onto the keyboard.
  //
  // The lift alone is not enough on a small screen. At 360dp the window is
  // ~640dp tall and the IME takes ~345dp of it, leaving under 300dp — and this
  // sheet is taller than that (header + listing preview + label + an 80dp-min
  // Textarea + note + Send + Cancel). Lifting a sheet that does not FIT just
  // pushes its top off the screen instead of under the keyboard: run-446, with
  // the lift in place, still had no "Message Seller" header in the hierarchy
  // while `first-message-send` was present — the title had been clipped away.
  //
  // So the content is capped and scrolls inside the cap. `maxHeight` rather than
  // a fixed height, so on a roomy window nothing changes at all and the sheet
  // stays exactly as tall as its content.
  const { height: windowH } = useWindowDimensions();
  const contentMaxHeight = Math.max(200, windowH - androidLift - 24);
  const router = useRouter();

  // SF-M6: qty>1 on a multi-unit listing states unit×qty=total IN WRITING —
  // docs/SELL_FLOW_REDESIGN.md §4.3. `buildFirstMessageText` returns the
  // plain `defaultMessage` untouched for a single-item listing or qty<=1, so
  // this is byte-identical to the pre-SF-M6 sheet in both of those cases.
  const buildMessage = useCallback(
    () =>
      buildFirstMessageText({
        quantity,
        multiUnit: perUnit,
        unitPrice: listingPrice,
        currency: listingCurrency,
        defaultMessage: t("listing.detail.defaultMessage"),
        formatCurrency,
        formatNumber,
        t,
      }),
    [quantity, perUnit, listingPrice, listingCurrency, formatCurrency, formatNumber, t]
  );

  const [message, setMessage] = useState(buildMessage);

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
      onShow={() => setMessage(buildMessage())}
    >
      {/* Backdrop */}
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={handleClose} />

      <KeyboardAvoidingView
        // Platform audit (2026-06-18):
        //   iOS "padding" — lifts the sheet so the keyboard doesn't cover the Textarea.
        //   Android "height" — shrinks the KAV so the bottom sheet recalculates its
        //   layout and the Send button stays visible above the keyboard. Was previously
        //   `undefined` which left the keyboard overlapping the message input on Android.
        // Platform audit superseded — the Android half of
        // `behavior={... : "height"}` never worked here, for the same two reasons
        // it did not work in MeetupSheet (fixed there in d46c896, verified 7/7 at
        // both widths):
        //   1. this KAV has no height to shrink — the backdrop above it is
        //      `flex: 1`, so the KAV is content-sized;
        //   2. under the edge-to-edge Expo SDK 54 enforces, the IME is an inset
        //      drawn OVER a full-height window and
        //      `windowSoftInputMode="adjustResize"` no longer shrinks anything,
        //      so `behavior="height"` computes its offset from wrong numbers.
        //      See the header of `useKeyboardVisible.ts`, which exists because
        //      the chat composer lost four rounds to this same assumption.
        // A native <Modal> is its own window on top of that, so it would not
        // inherit a resize anyway.
        //
        // So Android lifts the sheet by the keyboard's height, from the event
        // payload — the only source that is right under edge-to-edge. iOS keeps
        // "padding", untouched: there is no Mac here to verify a change to it.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kvContainer}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              // Lift by the keyboard's height on Android. Without this the
              // sheet is drawn UNDER the IME: run-442's screenshot shows it
              // clipped mid listing-preview, with the Textarea, the note, Send
              // and Cancel all behind the keys — so the first message to a
              // seller is typed into a field the buyer cannot see, with no
              // reachable Send. Same pair MeetupSheet uses (verified 7/7).
              marginBottom: androidLift,
            },
          ]}
        >
          {/* CAPPED AND SCROLLABLE — see contentMaxHeight above. `bounces={false}`
              so it does not rubber-band on a window where everything already fits,
              and `keyboardShouldPersistTaps="handled"` so a tap on Send while the
              Textarea is focused reaches the button instead of just dismissing the
              keyboard. */}
        <ScrollView
          style={{ maxHeight: contentMaxHeight }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
          {/* testIDs, because this sheet had NONE — the reason nothing covers the
              action every conversation on this marketplace starts with, and the
              reason a probe had to aim at the localized "Your message" LABEL
              instead of the field. That tap landed somewhere else entirely and
              the run measured nothing (run-434/435). A label is not a handle:
              it is copy, it moves, and it is translated three ways. */}
          <Textarea
            testID="first-message-input"
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
            // The label swaps to `common.loading` while sending, so the words
            // cannot identify this button for its whole lifetime.
            testID="first-message-send"
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

          {/* Bottom breathing room. Drops the safe-area inset while the IME
              covers the gesture bar — reserving for it there is dead space. */}
          <View style={{ height: keyboardSafeBottom(keyboardHeight > 0, insets.bottom, 8, 12) }} />
        </ScrollView>
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

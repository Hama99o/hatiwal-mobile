/**
 * MeetupSheet — slide-up modal for proposing a meetup.
 * Uses raw RN Modal (slide-up pattern per mobile.prompt.md §5) with RNR content inside.
 * Sends kind: meetup_proposal with body = "place | time" format.
 */
import React, { useState } from "react";
import { Modal, View, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShieldCheck, MapPin, X } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useKeyboardHeight, keyboardSafeBottom } from "@/hooks/useKeyboardVisible";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import type { MeetupCoords } from "./meetupBody";

interface MeetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onPropose: (place: string, time: string, coords?: MeetupCoords) => Promise<void>;
  isSubmitting?: boolean;
  /**
   * Opens the shared SafetyTipsSheet. Owned/rendered by the host screen
   * (Conversation.tsx) as a single hoisted instance — MeetupSheet only
   * triggers it, it never renders its own SafetyTipsSheet, so the two
   * sheets never stack as two simultaneous native <Modal>s.
   */
  onOpenSafetyTips?: () => void;
}

export function MeetupSheet({ visible, onClose, onPropose, isSubmitting, onOpenSafetyTips }: MeetupSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();
  // The sheet lifts ITSELF on Android. See the fix note on KeyboardAvoidingView
  // below for why the KAV cannot do it there.
  const keyboardHeight = useKeyboardHeight();
  const androidLift = Platform.OS === "android" ? keyboardHeight : 0;

  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [placeError, setPlaceError] = useState("");
  const [timeError, setTimeError] = useState("");
  // Optional exact pin — set via "Pick on map" (LocationRangePicker point mode).
  // Backward compatible: when null, the encoded body stays the legacy 2-part
  // "place | time" format (see meetupBody.ts).
  const [coords, setCoords] = useState<MeetupCoords | null>(null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  const handlePropose = async () => {
    let valid = true;
    if (!place.trim()) {
      setPlaceError(t("chat.meetup.placeRequired"));
      valid = false;
    } else {
      setPlaceError("");
    }
    if (!time.trim()) {
      setTimeError(t("chat.meetup.timeRequired"));
      valid = false;
    } else {
      setTimeError("");
    }
    if (!valid) return;

    await onPropose(place.trim(), time.trim(), coords ?? undefined);
    setPlace("");
    setTime("");
    setCoords(null);
  };

  const handleClose = () => {
    setPlace("");
    setTime("");
    setPlaceError("");
    setTimeError("");
    setCoords(null);
    onClose();
  };

  return (
    <>
    {/* Outer sheet Modal is hidden (not unmounted) while the map picker is
        open — same "one native Modal visible at a time" rule used for the
        safety-tips sheet (see onOpenSafetyTips docs above). Place/Time/coords
        state is preserved because the component itself never unmounts. */}
    <Modal
      visible={visible && !mapPickerVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={handleClose} />
      <KeyboardAvoidingView
        // Platform audit (2026-06-18) — the iOS half stands, the Android half did NOT.
        //
        //   iOS "padding" — lifts the sheet so the keyboard doesn't cover Place/Time.
        //     Kept exactly as it was.
        //
        //   Android "height" — asserted to shrink the KAV "so the sheet layout
        //     recalculates and the Propose button stays reachable". It does not, for
        //     two independent reasons, and the audit's closing claim that "both
        //     branches are intentional and correct; no fallback is missing" was wrong:
        //
        //     1. This KAV has NO height to shrink. The backdrop Pressable above it is
        //        `flex: 1`, so it eats the column and the KAV is content-sized —
        //        `justifyContent: "flex-end"` is what puts the sheet at the bottom,
        //        not the KAV's height.
        //     2. Even with a height, `behavior="height"` is unusable on Android under
        //        the edge-to-edge that Expo SDK 54 enforces: the IME is an inset drawn
        //        OVER a full-height window, `windowSoftInputMode="adjustResize"` no
        //        longer shrinks anything, and the KAV computes its offset from numbers
        //        that are wrong. That is measured, not inferred — see the header of
        //        `useKeyboardVisible.ts`, which exists because the chat composer lost
        //        four rounds to this same assumption. A native <Modal> is its own
        //        window on top of that, so it would not inherit a resize anyway.
        //
        //   Evidence it was broken in practice: qa/reports/run-383's
        //   chat/scroll_to_latest screenshot shows this sheet open with "Propose a
        //   Meetup" and the "Place" LABEL visible while the place input, the whole Time
        //   field and the Propose button sit behind Gboard — the flow failed with
        //   `Element not found: Id matching regex: meetup-time-input` on a sheet that
        //   had rendered correctly. A real user meets the same wall: type the place,
        //   and there is no way to reach Time or Propose without dismissing the IME.
        //
        //   So on Android the sheet lifts itself by the keyboard's height (from the
        //   event payload, the only source that is right under edge-to-edge) and the
        //   KAV is left inert there.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              // With the keyboard up the safe-area inset is dead space — the IME
              // covers the gesture bar — so keyboardSafeBottom drops it. Same
              // helper the chat composer uses; not a second mechanism.
              paddingBottom: keyboardSafeBottom(keyboardHeight > 0, insets.bottom, 20, 12),
              marginBottom: androidLift,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", textAlign: isRtl ? "right" : "left" }}>
              {t("chat.meetup.title")}
            </Text>

            {/* Quiet safety-tips link — small, secondary, never competes with
                the primary Place/Time fields or the Propose action below. */}
            {onOpenSafetyTips && (
              <Pressable
                onPress={onOpenSafetyTips}
                style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}
                accessibilityRole="button"
                accessibilityLabel={t("safety.link.meetupSheet")}
                testID="meetup-safety-tips-link"
              >
                <ShieldCheck size={13} color={colors.mutedForeground} />
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.mutedForeground,
                    textDecorationLine: "underline",
                  }}
                >
                  {t("safety.link.meetupSheet")}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Place field */}
          <Text
            style={{ fontSize: 14, fontWeight: "500", marginBottom: 4, textAlign: isRtl ? "right" : "left" }}
          >
            {t("chat.meetup.place")}
          </Text>
          {/* testIDs: the only stable handles for these two fields. The placeholders
              carry parentheses, and Maestro matches text as an anchored REGEX, so
              "Where? (e.g. …)" never matches the literal placeholder — the parens
              read as a capture group and the "?" makes the preceding "n" optional. */}
          <Input
            testID="meetup-place-input"
            value={place}
            onChangeText={setPlace}
            placeholder={t("chat.meetup.placePlaceholder")}
            style={{ textAlign: isRtl ? "right" : "left" }}
            editable={!isSubmitting}
          />
          {placeError ? (
            <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>{placeError}</Text>
          ) : null}

          {/* Optional exact pin — reuses LocationRangePicker in "point" mode
              (same geocoding flow as EditProfile). Fully optional: Place/Time
              text entry keeps working without ever opening the map. */}
          <Pressable
            onPress={() => setMapPickerVisible(true)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={t("chat.meetup.pickOnMap")}
            hitSlop={12}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              alignSelf: isRtl ? "flex-end" : "flex-start",
              minHeight: 44,
              minWidth: 44,
              paddingVertical: 8,
              paddingHorizontal: 4,
            }}
          >
            <MapPin size={14} color={coords ? colors.primary : colors.mutedForeground} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: coords ? colors.primary : colors.mutedForeground }}>
              {coords ? t("chat.meetup.locationSet") : t("chat.meetup.pickOnMap")}
            </Text>
            {coords ? (
              // Design review fix (TASK-M263): the icon alone is only 13px — give the
              // Pressable an explicit ≥44pt box (design system §"Touch targets ≥44px")
              // instead of relying on hitSlop alone to pad a near-zero-size view.
              <Pressable
                onPress={() => setCoords(null)}
                disabled={isSubmitting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("chat.meetup.clearLocation")}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: isRtl ? 0 : -10,
                  marginRight: isRtl ? -10 : 0,
                }}
              >
                <X size={13} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </Pressable>

          <View style={{ height: 12 }} />

          {/* Time field */}
          <Text
            style={{ fontSize: 14, fontWeight: "500", marginBottom: 4, textAlign: isRtl ? "right" : "left" }}
          >
            {t("chat.meetup.time")}
          </Text>
          <Input
            testID="meetup-time-input"
            value={time}
            onChangeText={setTime}
            placeholder={t("chat.meetup.timePlaceholder")}
            style={{ textAlign: isRtl ? "right" : "left" }}
            editable={!isSubmitting}
          />
          {timeError ? (
            <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>{timeError}</Text>
          ) : null}

          <View style={{ height: 20 }} />

          {/* testID because the label swaps to "Sending…" while submitting, so the
              words cannot identify this button for its whole lifetime. */}
          <Button
            testID="meetup-propose-submit"
            onPress={handlePropose}
            disabled={isSubmitting}
            style={{ width: "100%" }}
          >
            <Text style={{ fontWeight: "600" }}>
              {isSubmitting ? t("chat.thread.sending") : t("chat.meetup.propose")}
            </Text>
          </Button>

          <View style={{ height: 8 }} />

          <Button
            variant="ghost"
            onPress={handleClose}
            disabled={isSubmitting}
            style={{ width: "100%" }}
          >
            <Text>{t("common.cancel")}</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Exact-location picker — point mode (seller/EditProfile pattern).
        Rendered as a sibling <Modal>, never nested inside the sheet's own
        Modal, so only one native Modal is ever visible at once (the sheet's
        `visible` prop above is toggled off while this one is open). */}
    <LocationRangePicker
      visible={mapPickerVisible}
      mode="point"
      initialCoords={coords ? { latitude: coords.lat, longitude: coords.long } : null}
      initialRadius={5}
      initialLabel={place || null}
      onClose={() => setMapPickerVisible(false)}
      onConfirm={({ coords: picked, label }) => {
        setCoords({ lat: picked.latitude, long: picked.longitude });
        if (label) setPlace(label);
        setMapPickerVisible(false);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
});

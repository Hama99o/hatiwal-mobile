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
        // Platform audit (2026-06-18):
        //   iOS "padding" — lifts the sheet so the keyboard doesn't cover Place/Time
        //   inputs. Android "height" — shrinks the KAV so the sheet layout recalculates
        //   and the Propose button stays reachable. Both branches are intentional and
        //   correct; no fallback is missing.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) },
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
          <Input
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

          <Button
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

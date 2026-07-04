/**
 * MeetupSheet — slide-up modal for proposing a meetup.
 * Uses raw RN Modal (slide-up pattern per mobile.prompt.md §5) with RNR content inside.
 * Sends kind: meetup_proposal with body = "place | time" format.
 */
import React, { useState } from "react";
import { Modal, View, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface MeetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onPropose: (place: string, time: string) => Promise<void>;
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

    await onPropose(place.trim(), time.trim());
    setPlace("");
    setTime("");
  };

  const handleClose = () => {
    setPlace("");
    setTime("");
    setPlaceError("");
    setTimeError("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
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

/**
 * MeetupSheet — slide-up modal for proposing a meetup.
 * Uses raw RN Modal (slide-up pattern per mobile.prompt.md §5) with RNR content inside.
 * Sends kind: meetup_proposal with body = "place | time" format.
 */
import React, { useState } from "react";
import { Modal, View, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
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
}

export function MeetupSheet({ visible, onClose, onPropose, isSubmitting }: MeetupSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

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
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text
            style={{ fontSize: 18, fontWeight: "600", marginBottom: 16, textAlign: isRtl ? "right" : "left" }}
          >
            {t("chat.meetup.title")}
          </Text>

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
    backgroundColor: "rgba(0,0,0,0.4)",
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

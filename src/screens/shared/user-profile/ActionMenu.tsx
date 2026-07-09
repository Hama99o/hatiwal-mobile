/**
 * ActionMenu — bottom-slide modal for block/unblock and report actions
 * on the UserProfile screen.
 */

import React from "react";
import { View, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/reusables/text";
import { Flag, Share2, ShieldBan } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface ActionMenuProps {
  visible: boolean;
  isBlocked: boolean;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  onShare?: () => void;
}

export function ActionMenu({
  visible,
  isBlocked,
  onClose,
  onBlock,
  onReport,
  onShare,
}: ActionMenuProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{ flex: 1, backgroundColor: colors.darkScrim }}
        onTouchEnd={onClose}
      >
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            // Android has no system-drawn bottom inset for a translucent gesture/nav
            // bar the way iOS does — without this the Cancel row sits flush against
            // (or behind) the nav bar. Math.max keeps the existing 32pt minimum on
            // devices with no inset (e.g. 3-button nav bars already reserve space).
            paddingBottom: Math.max(insets.bottom, 32) + 12,
          }}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>

          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {/* Share */}
            {onShare && (
              <Pressable
                onPress={onShare}
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  gap: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                android_ripple={{ color: colors.muted }}
              >
                <Share2 size={20} color={colors.foreground} />
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.foreground,
                    fontWeight: "600",
                    flex: 1,
                  }}
                >
                  {t("profile.sellerProfile.share.title")}
                </Text>
              </Pressable>
            )}

            {/* Block / Unblock */}
            <Pressable
              onPress={onBlock}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 12,
                gap: 12,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              android_ripple={{ color: colors.muted }}
            >
              <ShieldBan
                size={20}
                color={isBlocked ? colors.mutedForeground : colors.destructive}
              />
              <Text
                style={{
                  fontSize: 15,
                  color: isBlocked ? colors.mutedForeground : colors.destructive,
                  fontWeight: "600",
                  flex: 1,
                }}
              >
                {isBlocked
                  ? t("profile.userProfile.unblockUser")
                  : t("profile.userProfile.blockUser")}
              </Text>
            </Pressable>

            {/* Report */}
            <Pressable
              onPress={onReport}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 12,
                gap: 12,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              android_ripple={{ color: colors.muted }}
            >
              <Flag size={20} color={colors.destructive} />
              <Text
                style={{
                  fontSize: 15,
                  color: colors.destructive,
                  fontWeight: "600",
                  flex: 1,
                }}
              >
                {t("profile.userProfile.reportUser")}
              </Text>
            </Pressable>

            {/* Cancel */}
            <Pressable
              onPress={onClose}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              android_ripple={{ color: colors.muted }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: colors.foreground,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

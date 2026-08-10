import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
}

export function BackButton({ onPress, color, size = 24 }: BackButtonProps) {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();
  const { isRtl } = useLocalization();

  const handlePress = onPress ?? (() => {
    if (router.canGoBack()) router.back();
  });

  // Review fix (TASK-TX02, LOW — shared-component + RTL consistency): the
  // back chevron must mirror direction under RTL — pointing left is a
  // leading-edge (back) affordance in LTR, but the leading edge is on the
  // RIGHT under ps/fa. Centralized here (instead of duplicated per hand-
  // rolled back Pressable) so every caller of the shared BackButton gets it
  // for free.
  const Icon = isRtl ? ChevronRight : ChevronLeft;

  return (
    <Pressable
      onPress={handlePress}
      style={styles.btn}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel={t("common.goBack")}
      testID="back_button"
    >
      <Icon size={size} color={color ?? colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});

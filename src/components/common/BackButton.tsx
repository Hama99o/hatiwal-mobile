import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
}

export function BackButton({ onPress, color, size = 24 }: BackButtonProps) {
  const router = useRouter();
  const colors = useColors();

  const handlePress = onPress ?? (() => {
    if (router.canGoBack()) router.back();
  });

  return (
    <Pressable
      onPress={handlePress}
      style={styles.btn}
      hitSlop={16}
      accessibilityRole="button"
    >
      <ChevronLeft size={size} color={color ?? colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});

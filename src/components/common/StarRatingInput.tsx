/**
 * StarRatingInput — tappable 1-5 star rating picker (REV2 review prompt).
 *
 * No dedicated star-rating library is on the DESIGN_SYSTEM.md approved list,
 * so this is built minimally from RNR-style primitives: raw `Pressable` as a
 * touch wrapper (per mobile.prompt.md §5) + `lucide-react-native`'s `Star` icon
 * (never emoji as UI icons).
 *
 * Motion: each star pops with a spring scale + a light "selection" haptic on
 * tap (mirrors the house pattern used by the ListingCard save-heart), so
 * picking a rating feels immediate and tactile rather than a flat toggle.
 * Respects the OS "Reduce Motion" setting via `useReduceMotion()`.
 */
import { View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { triggerHaptic, useReduceMotion } from "@/lib/animation";

export interface StarRatingInputProps {
  /** Current rating, 0-5. 0 means no selection yet. */
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
  testID?: string;
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function StarRatingInput({
  value,
  onChange,
  size = 32,
  disabled = false,
  testID,
}: StarRatingInputProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
      accessibilityRole="radiogroup"
      testID={testID}
    >
      {STAR_VALUES.map((n) => (
        <StarButton
          key={n}
          n={n}
          filled={n <= value}
          size={size}
          disabled={disabled}
          color={colors.warning}
          emptyColor={colors.border}
          onPress={onChange}
          accessibilityLabel={t("reviews.starAccessibilityLabel", { count: n })}
        />
      ))}
    </View>
  );
}

// ─── StarButton (private) ──────────────────────────────────────────────────
// Extracted so each star owns its own shared value / animated style (hooks
// can't be called inside the parent's .map callback).

interface StarButtonProps {
  n: number;
  filled: boolean;
  size: number;
  disabled: boolean;
  color: string;
  emptyColor: string;
  onPress: (n: number) => void;
  accessibilityLabel: string;
}

function StarButton({
  n,
  filled,
  size,
  disabled,
  color,
  emptyColor,
  onPress,
  accessibilityLabel,
}: StarButtonProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!reduceMotion) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 400 }),
        withSpring(1, { damping: 8, stiffness: 300 })
      );
    }
    triggerHaptic("selection", reduceMotion);
    onPress(n);
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="radio"
      accessibilityState={{ checked: filled, disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={`star-rating-${n}`}
    >
      <Animated.View style={animatedStyle}>
        <Star size={size} color={filled ? color : emptyColor} fill={filled ? color : "transparent"} />
      </Animated.View>
    </Pressable>
  );
}

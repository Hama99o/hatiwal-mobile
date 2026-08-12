/**
 * SearchBar — the ONE search input row used across the app.
 *
 * Composes: RTL-aware muted container + lucide `Search` icon + RNR `Input`
 * + an animated clear (X) button that only appears once there is text.
 *
 * This is the `<SearchBar>` half of refactor ticket R15
 * (docs/REFACTOR_DUPLICATION.md) — it exists so Browse and Conversations (and
 * any future list screen) share one search-row implementation instead of each
 * hand-rolling the muted container + icon + Input block. R15's
 * `<FilterChip>`/`<ChipScrollRow>`/`<CategoryChips>` work is untouched.
 *
 * Fully controlled, no built-in debounce: `onChangeText` fires on every
 * keystroke and the input always displays exactly `value`. Debouncing is
 * entirely the CALLER's responsibility (per R15 — "debounce-vs-instant ...
 * stays caller's choice") — e.g. Browse.tsx owns its own 400ms `useEffect`
 * before it re-fetches. An earlier version of this component had an
 * internal `debounceMs` prop that mirrored `value` into local state via a
 * sync effect; nothing in the codebase ever passed it, and the sync effect
 * could revert an in-progress keystroke back to a stale external `value`
 * while a debounce timer was pending. Removed rather than fixed — a single
 * controlled input with no internal timers has no such race, and every
 * screen that needs debouncing already implements it upstream (at the
 * point where it actually re-fetches).
 *
 * Colors are 100% via `useColors()` inline styles — never `className` for
 * color (NativeWind v4 dark-mode limitation, see DESIGN_SYSTEM.md §2).
 */

import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { AnimatedPressable, useReduceMotion } from "@/lib/animation";

/** Minimum recommended touch-target size (points), per common a11y guidance. */
const MIN_TAP_TARGET = 44;

export interface SearchBarProps {
  /** Current (controlled) search text. */
  value: string;
  /** Called with the new text on every keystroke. */
  onChangeText: (text: string) => void;
  /** Placeholder shown when empty — always pass a translated string. */
  placeholder: string;
  /** Called right after the clear (X) button empties the field. */
  onClear?: () => void;
  autoFocus?: boolean;
  /** testID on the outer container — used by Maestro/RTL selectors. */
  testID?: string;
  /** testID on the inner TextInput. */
  inputTestID?: string;
  /** testID on the clear (X) button. */
  clearTestID?: string;
  accessibilityLabel?: string;
  /** Extra style merged onto the outer muted container (layout only). */
  containerStyle?: StyleProp<ViewStyle>;
  returnKeyType?: "search" | "done" | "go" | "next";
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onClear,
  autoFocus,
  testID,
  inputTestID,
  clearTestID,
  accessibilityLabel,
  containerStyle,
  returnKeyType = "search",
}: SearchBarProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const reduceMotion = useReduceMotion();

  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: colors.muted,
          borderRadius: 12,
          paddingHorizontal: 12,
          gap: 8,
          minHeight: MIN_TAP_TARGET,
        },
        containerStyle,
      ]}
    >
      <Search size={16} color={colors.mutedForeground} />
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType={returnKeyType}
        autoFocus={autoFocus}
        testID={inputTestID}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        // A search box is never a proper-noun/sentence field and should
        // never be auto-corrected or capitalized — those behaviors actively
        // fight typing a listing title, a partial name, or slang, and a
        // spell-check underline serves no purpose here either.
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={{
          flex: 1,
          // Stretch to the full row height (not just the text's natural
          // height) so the actual tappable/focusable area matches the
          // MIN_TAP_TARGET-tall container instead of collapsing to the font's
          // ~18px line height.
          alignSelf: "stretch",
          fontSize: 14,
          borderWidth: 0,
          backgroundColor: "transparent",
          paddingHorizontal: 0,
          paddingVertical: 0,
          textAlignVertical: "center",
          textAlign: isRtl ? "right" : "left",
        }}
      />
      {value.length > 0 && (
        // DR fix (cycle-4): this used to be wrapped in a separate
        // `Animated.View` just to get FadeIn/FadeOut. That extra View sizes
        // itself to the NET visual footprint of its child (padding 14
        // cancelled by margin -14 → back down to the 16px icon), so on
        // Android the actual 44pt tap target sat inside a 16x16 ancestor and
        // was not hit-testable. `AnimatedPressable` is itself an animated
        // component and can take `entering`/`exiting` directly — one view,
        // whose own measured box IS the 44pt target, nothing smaller
        // wrapping it.
        <AnimatedPressable
          // A11Y fix: gated on the OS "Reduce Motion" setting, matching every
          // other entering/exiting animation in the codebase (ListingDetail,
          // PublishSuccessSheet, MessageBubble, EmptyState).
          entering={reduceMotion ? undefined : FadeIn.duration(180)}
          exiting={reduceMotion ? undefined : FadeOut.duration(140)}
          onPress={handleClear}
          // Real padding (not hitSlop) — icon is 16px, padding 14 on every
          // side brings the Pressable's OWN measured layout box up to the
          // 44pt minimum (16 + 14*2 = 44), so the touch target is an actual
          // hit-testable view rather than an invisible hitSlop extension
          // that some gesture/measurement tooling can miss.
          //
          // Review fix: a full `margin: -14` (all four sides) let the 44pt
          // box overlap ~14pt into the row's leading `gap` AND ~6pt into the
          // flex:1 Input's tail, so tapping just past the typed text hit
          // Clear instead of placing the cursor. Only the vertical margin
          // needs to fully cancel the padding (the row already has no
          // vertical padding of its own); the horizontal cancel is capped at
          // -6 so the hit box stays within the 8pt row `gap` instead of
          // biting into the input.
          style={{ padding: 14, marginVertical: -14, marginHorizontal: -6 }}
          accessibilityRole="button"
          accessibilityLabel={t("common.clear")}
          testID={clearTestID}
          haptic
        >
          <X size={16} color={colors.mutedForeground} />
        </AnimatedPressable>
      )}
    </View>
  );
}

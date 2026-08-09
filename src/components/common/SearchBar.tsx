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
 * Debounce is the CALLER's choice (per R15 — "debounce-vs-instant ... stay
 * caller's choice"):
 *   - Pass no `debounceMs` → fully controlled, `onChangeText` fires on every
 *     keystroke (use this when the parent screen owns its own debounce, e.g.
 *     Browse.tsx's existing 400ms `useEffect`).
 *   - Pass `debounceMs` → the input displays every keystroke instantly (so
 *     typing never feels laggy) but `onChangeText` is only called after the
 *     debounce window settles — useful for a screen that has no debounce
 *     logic of its own yet.
 *
 * Colors are 100% via `useColors()` inline styles — never `className` for
 * color (NativeWind v4 dark-mode limitation, see DESIGN_SYSTEM.md §2).
 */

import React, { useEffect, useRef, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/reusables/input";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { AnimatedPressable } from "@/lib/animation";

export interface SearchBarProps {
  /** Current (controlled) search text. */
  value: string;
  /**
   * Called with the new text. Fires on every keystroke unless `debounceMs`
   * is set, in which case it fires only after the debounce window settles.
   */
  onChangeText: (text: string) => void;
  /** Placeholder shown when empty — always pass a translated string. */
  placeholder: string;
  /**
   * Debounce (ms) applied to the `onChangeText` callback. The input's own
   * displayed text is never debounced — only the upstream notification is.
   * Omit when the caller already owns its own debounce (e.g. Browse.tsx).
   */
  debounceMs?: number;
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
  debounceMs,
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

  // Local text mirrors `value` for instant keystroke feedback. When
  // `debounceMs` is set, `onChangeText` is only called after the debounce
  // window — the displayed text itself never lags behind typing.
  const [text, setText] = useState(value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync when the controlled `value` changes externally (parent
  // clears it, applies a saved search / history chip, etc).
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleChangeText = (next: string) => {
    setText(next);
    if (!debounceMs) {
      onChangeText(next);
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => onChangeText(next), debounceMs);
  };

  const handleClear = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setText("");
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
          minHeight: 44,
        },
        containerStyle,
      ]}
    >
      <Search size={16} color={colors.mutedForeground} />
      <Input
        value={text}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        returnKeyType={returnKeyType}
        autoFocus={autoFocus}
        testID={inputTestID}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={{
          flex: 1,
          fontSize: 14,
          borderWidth: 0,
          backgroundColor: "transparent",
          paddingHorizontal: 0,
          paddingVertical: 0,
          minHeight: 0,
          textAlign: isRtl ? "right" : "left",
        }}
      />
      {text.length > 0 && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
          <AnimatedPressable
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t("common.clear")}
            testID={clearTestID}
            haptic
          >
            <X size={16} color={colors.mutedForeground} />
          </AnimatedPressable>
        </Animated.View>
      )}
    </View>
  );
}

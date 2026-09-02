/**
 * QuantityStepper — shared `−` / tap-to-edit-number / `+` control.
 *
 * SF-M6 (docs/SELL_FLOW_REDESIGN.md §10.4): resolves the tension between "big
 * tech uses a stepper next to its CTA" and the original quantity spike's own
 * rejection of a stepper for a large-batch case (docs/SPIKE_LISTING_QUANTITY.md
 * §12.1 — 14 taps to reach 15 is worse than typing two digits). A single tap
 * on `+`/`−` covers the common small adjustment; tapping the number itself
 * swaps it for a numeric `Input` so a big jump costs two taps (tap, type),
 * never fourteen.
 *
 * Composed entirely from RNR primitives + lucide icons — no new third-party
 * dependency, per `docs/DESIGN_SYSTEM.md` §4/§5 ("extend the shared
 * component, never fork it").
 *
 * IMPORTANT — this is an ENQUIRY control, never a cart/checkout one. Hatiwal
 * has no cart and no payment (CLAUDE.md MVP boundaries): this component never
 * calls an API and never implies a reservation or a purchase by itself — it
 * only ever feeds what a caller's own copy says next (e.g. the structured
 * first-message template, or "how many did you sell"). Callers are
 * responsible for the surrounding label ("How many are you asking about?"),
 * never "Buy"/"Add to cart" framing (docs/SELL_FLOW_REDESIGN.md §3.3).
 *
 * Consumers (docs/SELL_FLOW_REDESIGN.md §10.4): `BuyerPickerSheet`'s sold/
 * reserve quantity field, the chat "Mark sold"/"Place a hold" quantity, the
 * Sales edit sheet's quantity (SF-M5), and the buyer-side `ListingDetail`
 * stepper (SF-M6) — one component, every call site, never forked.
 *
 * SF-M9 (FlowApp #298) — optional `atMaxReason`: this control has always
 * clamped silently at `max`; what it never did was SAY why, which is exactly
 * the standing complaint that killed both alternatives considered for
 * `BuyerPickerSheet`'s over-stock case (a free-text warning that forked this
 * component, and clamping with no explanation at all). `atMaxReason` renders
 * a small caption under the row, but ONLY once the value is actually AT
 * `max` — never while there's still room to grow — so a caller that never
 * passes it (every consumer as of SF-M6) renders byte-for-byte what it did
 * before. The caller owns the copy (and its own `t()`/`formatNumber()`
 * interpolation) because "why" differs by context — a seller can "edit the
 * listing"; a buyer on `ListingDetail` cannot.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export type QuantityStepperSize = "sm" | "md";

export interface QuantityStepperProps {
  /** Current quantity — always a committed, in-range value (never a draft). */
  value: number;
  /** Called with the NEW, already-clamped value — never called with an out-of-range number. */
  onChange: (value: number) => void;
  /** Defaults to 1 — Hatiwal never has a "0 of something" quantity to ask about. */
  min?: number;
  /** Required — the ceiling this control clamps to (typically `availableUnitsOf(listing)`). */
  max: number;
  size?: QuantityStepperSize;
  disabled?: boolean;
  /** Base test id — child controls append `-decrement` / `-increment` / `-value` / `-input` / `-at-max-reason`. */
  testID?: string;
  /** Overrides the tap-to-edit value's accessibility label (defaults to `common.quantity`). */
  accessibilityLabel?: string;
  /**
   * SF-M9 — already-translated caption shown ONLY once `value` reaches `max`
   * (e.g. "Only 15 left. Edit the listing if you have more."). Omit it and
   * nothing renders, exactly as before this prop existed — see the file
   * header. The caller is responsible for interpolating the count via
   * `useLocalization().formatNumber` before passing it in, same as every
   * other quantity-in-a-sentence in this app.
   */
  atMaxReason?: string;
  /**
   * Show the "All" shortcut that jumps straight to `max`.
   *
   * Owner request, 2026-09-02: "what if I have two hundred item and all two
   * hundred item has been sold? we should have a button all also, so we can help
   * user to not tap hundred time".
   *
   * Defaults to ON, since every caller of this stepper is a seller settling a
   * quantity. It renders only when there is genuinely more than one unit to
   * choose from — on a single-unit listing an "All" button is noise.
   */
  showAll?: boolean;
}

const DIMENSIONS: Record<
  QuantityStepperSize,
  { button: number; icon: number; fontSize: number; hitSlop: number }
> = {
  // `hitSlop` tops both sizes up to the design system's ≥44px touch-target
  // floor (DESIGN_SYSTEM.md §3) without growing the visible chip — the
  // `−`/`+` buttons render at their compact `button` size but still accept a
  // touch out to `button + 2*hitSlop`.
  sm: { button: 32, icon: 14, fontSize: 14, hitSlop: 8 },
  md: { button: 40, icon: 16, fontSize: 17, hitSlop: 6 },
};

/** Clamps to `[min, max]` — the one place this component enforces its range. */
function clampQuantity(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  disabled = false,
  testID,
  accessibilityLabel,
  atMaxReason,
  showAll = true,
}: QuantityStepperProps) {
  const { t } = useTranslation();
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  // Keep the draft in sync with an externally-changed value (e.g. the caller
  // resets to 1 when a sheet closes without sending) — but never while the
  // buyer is mid-edit, or a re-render from an unrelated prop would clobber
  // what they're typing.
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const atMin = value <= min;
  const atMax = value >= max;

  const handleDecrement = useCallback(() => {
    if (disabled || atMin) return;
    onChange(clampQuantity(value - 1, min, max));
  }, [disabled, atMin, onChange, value, min, max]);

  const handleIncrement = useCallback(() => {
    if (disabled || atMax) return;
    onChange(clampQuantity(value + 1, min, max));
  }, [disabled, atMax, onChange, value, min, max]);

  const startEditing = useCallback(() => {
    if (disabled) return;
    setDraft(String(value));
    setEditing(true);
  }, [disabled, value]);

  // Commit AS TYPED when the number is already in range, so the parent never
  // holds a stale value while the keypad is still up (run-268 — see this file's
  // A8 note in the QA report). Out of range is deliberately NOT committed here:
  // it is left to `commitEdit` on blur, which clamps it and lets the at-cap
  // reason explain the ceiling, rather than fighting the seller between the
  // first and second digit of "15".
  const handleDraftChange = useCallback(
    (raw: string) => {
      const digitsOnly = raw.replace(/[^0-9]/g, "");
      setDraft(digitsOnly);
      if (digitsOnly.length === 0) return;
      const parsed = Number(digitsOnly);
      if (parsed >= min && parsed <= max && parsed !== value) onChange(parsed);
    },
    [min, max, value, onChange]
  );

  const commitEdit = useCallback(() => {
    setEditing(false);
    const digitsOnly = draft.replace(/[^0-9]/g, "");
    if (digitsOnly.length === 0) {
      // Nothing usable typed — leave the value untouched rather than forcing
      // it to `min`, which would silently change "3" the buyer was about to
      // overwrite into "1" from a stray blur.
      setDraft(String(value));
      return;
    }
    const parsed = Number(digitsOnly);
    const clamped = clampQuantity(parsed, min, max);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  }, [draft, min, max, value, onChange]);

  const dims = DIMENSIONS[size];
  const decrementDisabled = disabled || atMin;
  const incrementDisabled = disabled || atMax;
  // SF-M9 — only once there is genuinely nowhere left to go, and only when
  // the caller opted in. `editing` is excluded on purpose: mid-edit the
  // draft may momentarily read as anything, and the reason is about the
  // COMMITTED ceiling, not a keystroke in progress.
  const showAtMaxReason = !!atMaxReason && atMax && !editing;
  // Only worth offering when there is a range to jump across. `max > min`, not
  // `max > 1`: a caller with min 5 / max 5 has no choice to make either.
  const showAllButton = showAll && max > min;

  return (
    <>
      <View
        testID={testID}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Button
          variant="outline"
          size="icon"
          onPress={handleDecrement}
          disabled={decrementDisabled}
          style={{ width: dims.button, height: dims.button, minHeight: dims.button }}
          hitSlop={dims.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t("common.decreaseQuantity")}
          testID={testID ? `${testID}-decrement` : undefined}
        >
          <Minus size={dims.icon} color={decrementDisabled ? colors.mutedForeground : colors.foreground} />
        </Button>

        {editing ? (
          <TextInput
            value={draft}
            onChangeText={handleDraftChange}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType="numeric"
            selectTextOnFocus
            autoFocus
            style={{
              minWidth: 36,
              textAlign: "center",
              fontSize: dims.fontSize,
              fontWeight: "700",
              color: colors.foreground,
              paddingVertical: 0,
            }}
            testID={testID ? `${testID}-input` : undefined}
          />
        ) : (
          <Pressable
            onPress={startEditing}
            disabled={disabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? t("common.quantity")}
            accessibilityValue={{ now: value, min, max }}
            testID={testID ? `${testID}-value` : undefined}
          >
            <Text
              testID={testID ? `${testID}-value-text` : undefined}
              style={{
                minWidth: 28,
                textAlign: "center",
                fontSize: dims.fontSize,
                fontWeight: "700",
                color: disabled ? colors.mutedForeground : colors.foreground,
              }}
            >
              {formatNumber(value)}
            </Text>
          </Pressable>
        )}

        <Button
          variant="outline"
          size="icon"
          onPress={handleIncrement}
          disabled={incrementDisabled}
          style={{ width: dims.button, height: dims.button, minHeight: dims.button }}
          hitSlop={dims.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t("common.increaseQuantity")}
          testID={testID ? `${testID}-increment` : undefined}
        >
          <Plus size={dims.icon} color={incrementDisabled ? colors.mutedForeground : colors.foreground} />
        </Button>

        {showAllButton ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              if (disabled || value === max) return;
              // Straight to the ceiling, through the same clamp as every other
              // path so this can never emit an out-of-range value.
              onChange(clampQuantity(max, min, max));
            }}
            disabled={disabled || atMax}
            hitSlop={dims.hitSlop}
            accessibilityRole="button"
            // The count is in the label, not just "All" — a screen reader user
            // otherwise cannot tell what "All" commits them to.
            accessibilityLabel={`${t("common.all")} (${formatNumber(max)})`}
            testID={testID ? `${testID}-all` : undefined}
            style={{ minHeight: dims.button, paddingHorizontal: 10 }}
          >
            <Text
              style={{
                fontSize: dims.fontSize - 3,
                fontWeight: "600",
                color: disabled || atMax ? colors.mutedForeground : colors.primary,
              }}
            >
              {t("common.all")}
            </Text>
          </Button>
        ) : null}
      </View>
      {showAtMaxReason ? (
        <Text
          testID={testID ? `${testID}-at-max-reason` : undefined}
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            textAlign: isRtl ? "right" : "left",
            marginTop: 4,
          }}
        >
          {atMaxReason}
        </Text>
      ) : null}
    </>
  );
}

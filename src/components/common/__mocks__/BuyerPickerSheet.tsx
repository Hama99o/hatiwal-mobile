import React from "react";
import { Pressable, Text } from "react-native";

/**
 * Manual jest mock for BuyerPickerSheet (TASK-TX01 / T704).
 *
 * Lives in `__mocks__/` rather than an inline `jest.mock(..., factory)` on
 * purpose: a hoisted mock factory that BOTH requires a module AND returns a
 * JSX element crashes babel-plugin-jest-hoist in this toolchain
 * ("VariableDeclaration ... declarations[0] ... undefined"). A manual mock is a
 * normal module — no hoisting — so JSX + imports work.
 *
 * Superset stand-in exposing the test-only affordances both consumer suites
 * need: the visible marker, the two confirm paths (skip / buyer 42), and close.
 * Real sheet behavior is covered by BuyerPickerSheet's own unit tests. Enable
 * per-suite with a bare `jest.mock("@/components/common/BuyerPickerSheet")`.
 */
export function BuyerPickerSheet({
  visible,
  onConfirm,
  onClose,
  action,
  remainingQuantity,
  suggestedQuantity,
  preselectedBuyer,
}: {
  visible: boolean;
  onConfirm: (r: { buyerId?: number; finalPrice?: number; quantity?: number }) => void;
  onClose?: () => void;
  action: string;
  /** Surfaced so a consumer suite can assert what the real sheet would be told
   *  about the stock — the number that decides whether it asks "how many?". */
  remainingQuantity?: number;
  /**
   * SF-M11 — surfaced (additively) so a suite can assert the caller told the
   * sheet which quantity to OPEN on. This is the prop that carries a thread's
   * agreed units into mark-sold; the two previous controls added to this path
   * were built and never wired, so it is asserted rather than assumed.
   */
  suggestedQuantity?: number | null;
  /**
   * SF-M2 — surfaced (additively; existing consumers never query for it) so a
   * suite can assert a caller scoped this sheet to a SPECIFIC, already-known
   * buyer (confirm mode) instead of leaving it in full pick-a-buyer mode.
   */
  preselectedBuyer?: { id: number; name: string } | null;
}) {
  if (!visible) return null;
  return (
    <>
      <Text testID={`buyer-picker-visible-${action}`}>buyer-picker-open</Text>
      <Text testID="buyer-picker-remaining">{String(remainingQuantity ?? "")}</Text>
      <Text testID="buyer-picker-suggested">{String(suggestedQuantity ?? "")}</Text>
      {preselectedBuyer ? (
        <Text testID="buyer-picker-preselected-buyer-id">{String(preselectedBuyer.id)}</Text>
      ) : null}
      <Pressable onPress={() => onConfirm({})} testID="confirm-skip">
        <Text>confirm-skip</Text>
      </Pressable>
      <Pressable onPress={() => onConfirm({ buyerId: 42 })} testID="confirm-buyer-42">
        <Text>confirm-buyer-42</Text>
      </Pressable>
      <Pressable onPress={() => onClose?.()} testID="picker-close">
        <Text>close</Text>
      </Pressable>
    </>
  );
}

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
}: {
  visible: boolean;
  onConfirm: (r: { buyerId?: number; finalPrice?: number }) => void;
  onClose?: () => void;
  action: string;
}) {
  if (!visible) return null;
  return (
    <>
      <Text testID={`buyer-picker-visible-${action}`}>buyer-picker-open</Text>
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

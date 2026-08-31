import React from "react";
import { View } from "react-native";

/**
 * Manual jest mock for ReviewPromptSheet.
 *
 * Lives here rather than as an inline `jest.mock(..., factory)` for the same
 * reason `__mocks__/BuyerPickerSheet.tsx` does, and this file exists because
 * that warning was learned the hard way twice: a hoisted factory that BOTH
 * `require`s a module AND returns a JSX element crashes
 * babel-plugin-jest-hoist in this toolchain with
 *
 *   TypeError: Property declarations[0] of VariableDeclaration expected node
 *   to be of a type ["VariableDeclarator"] but instead got undefined
 *
 * and the crash takes down the WHOLE suite — 0 tests run, which reads as a
 * transform error rather than as lost coverage. `ListingHeader.test.tsx` had
 * been in exactly that state since QA-BUG5 added an inline ReviewPromptSheet
 * stub: 22 tests silently not running.
 *
 * Gated on `visible` with a real testID (not a null render) so the QA-BUG2
 * sequencing — the prompt must NOT appear before the mark-sold toast finishes
 * its lifecycle — stays assertable from a consumer suite.
 */
export function ReviewPromptSheet({ visible }: { visible?: boolean }) {
  return visible ? <View testID="review-prompt-sheet" /> : null;
}

export default ReviewPromptSheet;

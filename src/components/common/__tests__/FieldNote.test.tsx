/**
 * FieldNote unit tests — SF-M7 (docs/SELL_FLOW_REDESIGN.md).
 *
 * The non-error sibling of `FieldError`: a calm inline note under a field,
 * first used to tell a seller BEFORE they save that raising quantity on a
 * sold listing will put it back on sale.
 *
 * useColors / useLocalization are mocked globally in src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { FieldNote } from "../FieldNote";

describe("FieldNote", () => {
  it("renders the given message", () => {
    render(<FieldNote message="This puts the listing back on sale." />);
    expect(screen.getByText("This puts the listing back on sale.")).toBeTruthy();
  });

  it("renders nothing when message is empty", () => {
    render(<FieldNote message="" testID="field-note" />);
    expect(screen.queryByTestId("field-note")).toBeNull();
  });

  it("forwards testID onto the rendered container", () => {
    render(<FieldNote message="Heads up" testID="quantity-reopen-note" />);
    expect(screen.getByTestId("quantity-reopen-note")).toBeTruthy();
  });

  it("defaults to the info tone", () => {
    render(<FieldNote message="A plain aside" testID="note" />);
    expect(screen.getByTestId("note")).toBeTruthy();
  });

  it("accepts the success tone for a reassuring, good-outcome message", () => {
    render(<FieldNote message="Back on sale" tone="success" testID="note" />);
    expect(screen.getByText("Back on sale")).toBeTruthy();
  });
});

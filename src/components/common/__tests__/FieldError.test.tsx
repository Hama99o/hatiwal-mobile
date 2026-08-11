/**
 * FieldError unit tests — TASK-P736 (review fix)
 *
 * FieldError is the single shared inline-error treatment (AlertCircle +
 * text-sm message, RTL-aware) used by ListingForm's title/price/category/
 * location fields AND PhotosSection's photo-required error, replacing five
 * previously-independent renderings that had started to drift (three bare
 * text-xs texts + two copy-pasted AlertCircle blocks).
 *
 * useColors / useLocalization are mocked globally in src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { FieldError } from "../FieldError";

describe("FieldError", () => {
  it("renders the given message", () => {
    render(<FieldError message="Title is required" />);
    expect(screen.getByText("Title is required")).toBeTruthy();
  });

  it("renders nothing when message is empty", () => {
    render(<FieldError message="" testID="field-error" />);
    expect(screen.queryByTestId("field-error")).toBeNull();
  });

  it("forwards testID onto the rendered container", () => {
    render(<FieldError message="Category is required" testID="category-error" />);
    expect(screen.getByTestId("category-error")).toBeTruthy();
  });
});

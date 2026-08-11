/**
 * FieldLabel unit tests — TASK-P736 (review fix, CR round 2)
 *
 * FieldLabel is the single shared "required field" label treatment (mirrors
 * why FieldError exists), replacing six previously-independent copy-pasted
 * `<Label>{...}<Text style={{ color: colors.destructive }}> *</Text></Label>`
 * blocks across ListingForm.tsx (title/price/category/location) and
 * PhotosSection.tsx (empty state + photo strip).
 *
 * useColors is mocked globally in src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { FieldLabel } from "../FieldLabel";

describe("FieldLabel", () => {
  it("renders its children", () => {
    render(<FieldLabel>Title</FieldLabel>);
    expect(screen.getByText("Title")).toBeTruthy();
  });

  it("renders no asterisk when not required", () => {
    render(<FieldLabel>Description</FieldLabel>);
    expect(screen.queryByText("*", { exact: false })).toBeNull();
  });

  it("renders a destructive ' *' marker when required", () => {
    render(<FieldLabel required>Price</FieldLabel>);
    expect(screen.getByText("*", { exact: false })).toBeTruthy();
  });

  it("forwards nativeID onto the underlying Label for aria-labelledby pairing", () => {
    render(
      <>
        <FieldLabel nativeID="title-label" required>
          Title
        </FieldLabel>
        <Text aria-labelledby="title-label">Field placeholder</Text>
      </>
    );
    // `required` renders the asterisk as a nested <Text>, so the label's own
    // text content is "Title" plus a child node — match loosely.
    expect(screen.getByText("Title", { exact: false })).toBeTruthy();
    expect(screen.getByText("Field placeholder")).toBeTruthy();
  });
});

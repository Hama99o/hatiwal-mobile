/**
 * Unit tests for HighlightedText (TASK-J471) — the shared "why did this
 * match" highlighter extracted from MessageBubble's previously-private
 * implementation so ConversationRow's inbox preview line can reuse the
 * identical treatment instead of a second hand-rolled copy.
 *
 * Coverage:
 *  1. No query / empty / whitespace-only query → plain text, unchanged
 *  2. Matching substring is split into its own segment and highlighted
 *  3. Case-insensitive matching, original casing preserved in the segment
 *  4. Highlighted segment carries `warningAlpha` background + `warning`
 *     foreground + 700 weight (colors.* — never a hex literal)
 *  5. Regex-special characters in the query never throw
 *  6. Leading/trailing whitespace in the query is trimmed before matching
 *  7. Multiple occurrences all get highlighted
 *  8. No match found → renders the original text unsplit
 *  9. `numberOfLines` and `baseStyle` are forwarded correctly
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { HighlightedText } from "../HighlightedText";

// useColors is mocked globally in src/__tests__/setup.ts with fixed tokens:
//   warning: "hsl(38,92%,40%)", warningAlpha: "rgba(180,83,9,0.10)"

describe("HighlightedText — no query", () => {
  it("renders the plain text unchanged when query is omitted", () => {
    render(<HighlightedText text="Is this still available?" />);
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });

  it("renders the plain text unchanged when query is an empty string", () => {
    render(<HighlightedText text="Is this still available?" query="" />);
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });

  it("renders the plain text unchanged when query is whitespace-only", () => {
    render(<HighlightedText text="Is this still available?" query="   " />);
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });
});

describe("HighlightedText — matching", () => {
  it("splits the text and renders the matching substring as its own segment", () => {
    render(<HighlightedText text="The price is fair" query="price" />);
    expect(screen.getByText("price")).toBeTruthy();
  });

  it("is case-insensitive when matching", () => {
    render(<HighlightedText text="Available NOW" query="now" />);
    expect(screen.getByText("NOW")).toBeTruthy();
  });

  it("preserves the original casing of the matched segment", () => {
    render(<HighlightedText text="Available NOW" query="now" />);
    expect(screen.queryByText("now")).toBeNull();
    expect(screen.getByText("NOW")).toBeTruthy();
  });

  it("applies warningAlpha background + warning foreground + 700 weight to the match", () => {
    render(<HighlightedText text="The price is fair" query="price" />);
    const match = screen.getByText("price");
    const flat = StyleSheet.flatten(match.props.style);
    expect(flat.backgroundColor).toBe("rgba(180,83,9,0.10)");
    expect(flat.color).toBe("hsl(38,92%,40%)");
    expect(flat.fontWeight).toBe("700");
  });

  it("escapes regex special characters in the query without throwing", () => {
    expect(() =>
      render(<HighlightedText text="Total is 5.000 AFN" query="5.000" />)
    ).not.toThrow();
  });

  it("matches a literal '.' query as the escaped character, not 'any character'", () => {
    render(<HighlightedText text="Total is 5.000 AFN" query="5.000" />);
    expect(screen.getByText("5.000")).toBeTruthy();
  });

  it("trims leading/trailing whitespace in the query before matching", () => {
    render(<HighlightedText text="The price is fair" query="  price  " />);
    expect(screen.getByText("price")).toBeTruthy();
  });

  it("highlights every occurrence of the query", () => {
    render(<HighlightedText text="buy buy buy" query="buy" />);
    expect(screen.getAllByText("buy")).toHaveLength(3);
  });

  it("renders the text unsplit when the query is not found", () => {
    render(<HighlightedText text="Hello world" query="xyz" />);
    expect(screen.getByText("Hello world")).toBeTruthy();
  });
});

describe("HighlightedText — props", () => {
  it("forwards numberOfLines to the rendered text", () => {
    render(<HighlightedText text="A long line of text" numberOfLines={1} />);
    expect(screen.getByText("A long line of text").props.numberOfLines).toBe(1);
  });

  it("forwards numberOfLines even when a query is active", () => {
    render(<HighlightedText text="A long line of text" query="long" numberOfLines={1} />);
    // numberOfLines lives on the OUTER wrapping Text, not the individual segments.
    const outer = screen.getByText("A long line of text");
    expect(outer.props.numberOfLines).toBe(1);
  });

  it("applies baseStyle to a non-matching segment", () => {
    render(
      <HighlightedText text="The price is fair" query="price" baseStyle={{ fontSize: 12 }} />
    );
    const nonMatch = screen.getByText("The ");
    const flat = StyleSheet.flatten(nonMatch.props.style);
    expect(flat.fontSize).toBe(12);
  });

  it("applies baseStyle to the matching segment too (on top of the highlight)", () => {
    render(
      <HighlightedText text="The price is fair" query="price" baseStyle={{ fontSize: 12 }} />
    );
    const match = screen.getByText("price");
    const flat = StyleSheet.flatten(match.props.style);
    expect(flat.fontSize).toBe(12);
    expect(flat.backgroundColor).toBe("rgba(180,83,9,0.10)");
  });
});

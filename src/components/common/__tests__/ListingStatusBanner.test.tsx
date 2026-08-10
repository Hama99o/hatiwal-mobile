/**
 * ListingStatusBanner — Jest unit tests (TASK-K729 review fix).
 *
 * The ONE shared "this listing is reserved/sold" surface both
 * ListingDetail.tsx's own banner (`layout="strip"`) and the chat thread's
 * ListingUnavailableNotice (`layout="row"`) render — replacing two
 * hand-rolled, visually-drifted treatments with one. Covers:
 *  1. Renders the shared StatusBadge + title (+ optional subtitle) for both layouts.
 *  2. Renders `children` (the caller's own CTA row) inside the same surface.
 *  3. `reduceMotion` is accepted without throwing (entrance animation guard).
 */
import React from "react";
import { View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { Text } from "@/components/reusables/text";
import { ListingStatusBanner } from "../ListingStatusBanner";

describe("ListingStatusBanner", () => {
  it("renders the shared StatusBadge + title for a reserved listing (row layout)", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved for you" layout="row" />);
    expect(screen.getByText("listing.status.reserved")).toBeTruthy();
    expect(screen.getByText("Reserved for you")).toBeTruthy();
  });

  it("renders the shared StatusBadge + title for a sold listing (strip layout)", () => {
    render(<ListingStatusBanner status="sold" title="Item sold" layout="strip" />);
    expect(screen.getByText("listing.status.sold")).toBeTruthy();
    expect(screen.getByText("Item sold")).toBeTruthy();
  });

  it("renders the optional subtitle when provided", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" subtitle="Reason line" layout="row" />);
    expect(screen.getByText("Reason line")).toBeTruthy();
  });

  it("omits the subtitle line when not provided", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" />);
    expect(screen.queryByText("Reason line")).toBeNull();
  });

  it("renders children (the caller's own CTA row) inside the same accent surface", () => {
    render(
      <ListingStatusBanner status="sold" title="Item sold" layout="row">
        <View testID="cta-row">
          <Text>Browse similar</Text>
        </View>
      </ListingStatusBanner>
    );
    expect(screen.getByTestId("cta-row")).toBeTruthy();
    expect(screen.getByText("Browse similar")).toBeTruthy();
  });

  it("respects the testID prop on the outer container", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" testID="my-banner" />);
    expect(screen.getByTestId("my-banner")).toBeTruthy();
  });

  it("renders without throwing when reduceMotion=true (entrance animation guard)", () => {
    expect(() =>
      render(<ListingStatusBanner status="sold" title="Item sold" layout="strip" reduceMotion />)
    ).not.toThrow();
  });

  it("renders without throwing when reduceMotion=false (default — animated entrance)", () => {
    expect(() =>
      render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" />)
    ).not.toThrow();
  });
});

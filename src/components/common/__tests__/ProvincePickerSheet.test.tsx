import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ProvincePickerSheet } from "@/components/common/ProvincePickerSheet";
import { AFGHAN_PROVINCES } from "@/data/afghan_provinces";

describe("ProvincePickerSheet", () => {
  it("offers all 34 provinces", () => {
    // The sheet existed for months wired to nothing (UI-041). Pin the count so a
    // silently truncated list is caught.
    expect(AFGHAN_PROVINCES).toHaveLength(34);
  });

  it("returns the canonical value, not the localized label", () => {
    // EditProfile stores Province.value so listings from different locales group
    // together. Returning the display name would defeat the whole change.
    const onSelect = jest.fn();
    render(
      <ProvincePickerSheet
        visible
        selectedValue={null}
        onSelect={onSelect}
        onClose={jest.fn()}
      />
    );
    fireEvent.press(screen.getAllByTestId("province-option")[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(typeof arg.value).toBe("string");
    expect(arg.value).toBe(AFGHAN_PROVINCES[0].value);
  });

  it("filters by search text", () => {
    render(
      <ProvincePickerSheet
        visible
        selectedValue={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const before = screen.getAllByTestId("province-option").length;
    fireEvent.changeText(screen.getByTestId("province-search-input"), "Herat");
    const after = screen.getAllByTestId("province-option").length;
    expect(after).toBeLessThan(before);
  });

  it("renders nothing when not visible", () => {
    render(
      <ProvincePickerSheet
        visible={false}
        selectedValue={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryAllByTestId("province-option").length).toBe(0);
  });
});

/**
 * CategoryChipRow stories — covers emoji icons, none/selected/RTL/dark states.
 *
 * Explicit icon stories added for TASK-C529:
 *   WithIconsLight     — LTR, light surface, all emoji icons visible
 *   WithIconsDark      — LTR, dark surface, emoji + LayoutGrid All icon in dark mode
 *   WithIconsRTL       — ps/fa RTL, emoji icons on leading (right) side
 *
 * The mock data intentionally includes one category without an icon so the
 * conditional icon render guard is exercised visually.
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { CategoryChipRow } from "./CategoryChipRow";
import type { Category } from "@/api/categories";

const MOCK_CATEGORIES: Category[] = [
  {
    id: 1,
    slug: "electronics",
    nameEn: "Electronics",
    namePs: "برقي توکي",
    nameFa: "الکترونیک",
    icon: "💻",
    position: 1,
  },
  {
    id: 2,
    slug: "vehicles",
    nameEn: "Vehicles",
    namePs: "موټرونه",
    nameFa: "وسایل نقلیه",
    icon: "🚗",
    position: 2,
  },
  {
    id: 3,
    slug: "clothes",
    nameEn: "Clothes",
    namePs: "جامې",
    nameFa: "لباس",
    icon: "👗",
    position: 3,
  },
  {
    id: 4,
    slug: "home",
    nameEn: "Home & Garden",
    namePs: "کور او باغ",
    nameFa: "خانه و باغ",
    icon: "🏡",
    position: 4,
  },
  {
    id: 5,
    slug: "other",
    nameEn: "Other",
    namePs: "نور",
    nameFa: "دیگر",
    icon: "",
    position: 5,
  },
];

// Controlled wrapper so chips respond to press in Storybook
function ChipsWrapper({
  initial,
  isRtl,
  darkBg,
}: {
  initial: number | null;
  isRtl?: boolean;
  darkBg?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initial);
  return (
    <View style={{ backgroundColor: darkBg ? "#0f172a" : "#f8f8f8" }}>
      <CategoryChipRow
        categories={MOCK_CATEGORIES}
        selectedId={selectedId}
        onSelect={setSelectedId}
        isRtl={isRtl ?? false}
      />
    </View>
  );
}

const meta: Meta<typeof CategoryChipRow> = {
  title: "Components/CategoryChipRow",
  component: CategoryChipRow,
  decorators: [
    (Story) => (
      <View style={{ padding: 0 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CategoryChipRow>;

/** All chips — "All" selected (selectedId=null) */
export const AllSelected: Story = {
  render: () => <ChipsWrapper initial={null} />,
};

/** One category chip selected */
export const CategorySelected: Story = {
  render: () => <ChipsWrapper initial={2} />,
};

/** RTL layout — chips in reverse order for Pashto / Dari */
export const RTL: Story = {
  render: () => <ChipsWrapper initial={null} isRtl={true} />,
};

/** RTL with a category selected */
export const RTLWithSelection: Story = {
  render: () => <ChipsWrapper initial={3} isRtl={true} />,
};

/** Dark background to verify dark mode token correctness */
export const DarkSurface: Story = {
  render: () => <ChipsWrapper initial={1} darkBg={true} />,
};

/**
 * TASK-C529 — Emoji icons, light surface (LTR).
 * Verifies: emoji leading each chip, LayoutGrid on All chip,
 * marginEnd gap, and the "Other" chip renders name-only when icon is empty.
 */
export const WithIconsLight: Story = {
  render: () => <ChipsWrapper initial={null} />,
};

/**
 * TASK-C529 — Emoji icons, dark surface (LTR).
 * Verifies: LayoutGrid All icon color reads from useColors() at runtime,
 * emoji chips legible on dark background, selected chip uses primaryForeground.
 */
export const WithIconsDark: Story = {
  render: () => <ChipsWrapper initial={1} darkBg={true} />,
};

/**
 * TASK-C529 — Emoji icons, RTL (Pashto / Dari).
 * Verifies: emoji appears on the leading (right) side due to
 * flexDirection:"row-reverse" and marginEnd resolving to the correct side.
 */
export const WithIconsRTL: Story = {
  render: () => <ChipsWrapper initial={null} isRtl={true} />,
};

/** No categories — renders null (empty state) */
export const Empty: Story = {
  render: () => (
    <View style={{ padding: 16 }}>
      <CategoryChipRow
        categories={[]}
        selectedId={null}
        onSelect={() => {}}
        isRtl={false}
      />
    </View>
  ),
};

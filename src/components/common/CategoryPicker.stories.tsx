/**
 * CategoryPicker stories — covers none/selected/RTL/dark states.
 *
 * Since CategoryPicker is a Modal, each story renders a button to open it
 * so Storybook can show it interactively.
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import { CategoryPicker } from "./CategoryPicker";
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
    subcategories: [
      {
        id: 11,
        slug: "phones",
        nameEn: "Phones",
        namePs: "موبایلونه",
        nameFa: "گوشی‌ها",
        icon: "📱",
        position: 1,
        parentId: 1,
      },
      {
        id: 12,
        slug: "laptops",
        nameEn: "Laptops",
        namePs: "لپ‌ټاپونه",
        nameFa: "لپ‌تاپ",
        icon: "💻",
        position: 2,
        parentId: 1,
      },
    ],
  },
  {
    id: 2,
    slug: "vehicles",
    nameEn: "Vehicles",
    namePs: "موټرونه",
    nameFa: "وسایل نقلیه",
    icon: "🚗",
    position: 2,
    subcategories: [],
  },
  {
    id: 3,
    slug: "clothes",
    nameEn: "Clothes",
    namePs: "جامې",
    nameFa: "لباس",
    icon: "👗",
    position: 3,
    subcategories: [],
  },
];

// Wrap the picker so stories can open/close it interactively
function PickerWrapper({
  initialSelectedId,
}: {
  initialSelectedId?: number | null;
}) {
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialSelectedId ?? null
  );

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>
        Selected:{" "}
        {selectedId
          ? MOCK_CATEGORIES.find((c) => c.id === selectedId)?.nameEn ?? selectedId
          : "None"}
      </Text>
      <Button onPress={() => setVisible(true)}>
        <Text>Open Category Picker</Text>
      </Button>
      <CategoryPicker
        visible={visible}
        selectedId={selectedId}
        onSelect={(cat) => {
          setSelectedId(cat.id);
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}

const meta: Meta<typeof CategoryPicker> = {
  title: "Components/CategoryPicker",
  component: CategoryPicker,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f8f8f8" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CategoryPicker>;

/** No category selected — picker opens to "All" state */
export const NoneSelected: Story = {
  render: () => <PickerWrapper initialSelectedId={null} />,
};

/** Category pre-selected — "Electronics" chip will be highlighted */
export const WithSelection: Story = {
  render: () => <PickerWrapper initialSelectedId={1} />,
};

/** RTL layout — simulates Pashto / Dari locale (isRtl=true) */
export const RTL: Story = {
  render: () => (
    <View style={{ direction: "rtl" }}>
      <PickerWrapper initialSelectedId={null} />
    </View>
  ),
};

/** Dark background container to verify dark mode color tokens */
export const DarkSurface: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <PickerWrapper initialSelectedId={2} />
    </View>
  ),
};

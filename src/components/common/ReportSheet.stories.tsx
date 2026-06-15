import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ReportSheet } from "./ReportSheet";

const meta: Meta<typeof ReportSheet> = {
  title: "Components/ReportSheet",
  component: ReportSheet,
};

export default meta;
type Story = StoryObj<typeof ReportSheet>;

// Controlled wrapper that lets you open/close the sheet from Storybook
function ReportSheetDemo({
  reportableType,
}: {
  reportableType: "Listing" | "User";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Open Report Sheet ({reportableType})</Text>
      </Button>
      <ReportSheet
        visible={visible}
        onClose={() => setVisible(false)}
        reportableType={reportableType}
        reportableId={1}
      />
    </View>
  );
}

// Report a listing — opens the sheet with listing-specific title
export const ReportListing: Story = {
  render: () => <ReportSheetDemo reportableType="Listing" />,
};

// Report a user — same sheet, different target
export const ReportUser: Story = {
  render: () => <ReportSheetDemo reportableType="User" />,
};

// Pre-opened for visual inspection in Storybook (no button needed)
export const OpenListing: Story = {
  args: {
    visible: true,
    onClose: () => {},
    reportableType: "Listing",
    reportableId: 42,
  },
};

export const OpenUser: Story = {
  args: {
    visible: true,
    onClose: () => {},
    reportableType: "User",
    reportableId: 7,
  },
};

import React from "react";
import { View } from "react-native";
import { JumpToLatestButton } from "./JumpToLatestButton";

/**
 * Every state of the "come back to the newest message" pill.
 *
 * Rendered over a tall spacer so its absolute positioning reads the way it does
 * in a real thread — the pill is meant to float above the composer bar.
 */
export default {
  title: "common/JumpToLatestButton",
  component: JumpToLatestButton,
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ height: 320, justifyContent: "flex-end" }}>{children}</View>
);

export const NoUnread = () => (
  <Frame>
    <JumpToLatestButton onPress={() => {}} bottom={24} label="Jump to latest" />
  </Frame>
);

export const WithUnreadCount = () => (
  <Frame>
    <JumpToLatestButton onPress={() => {}} bottom={24} label="Jump to latest" unreadCount={12} />
  </Frame>
);

export const RtlPashto = () => (
  <Frame>
    <JumpToLatestButton
      onPress={() => {}}
      bottom={24}
      label="تر وروستي ته ورشه"
      unreadCount={3}
      isRtl
    />
  </Frame>
);

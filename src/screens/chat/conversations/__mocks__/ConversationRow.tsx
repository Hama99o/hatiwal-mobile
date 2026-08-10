import React from "react";
import { Text as RNText, Pressable } from "react-native";

export function ConversationRow(props: any) {
  return (
    <Pressable testID={`row-${props.item.id}`}>
      <RNText>{props.item.listing?.title}</RNText>
    </Pressable>
  );
}

import { View } from "react-native";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";

const SKELETON_COUNT = 5;

export function SkeletonList() {
  return (
    <View>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </View>
  );
}

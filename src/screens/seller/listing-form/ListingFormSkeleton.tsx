/**
 * ListingFormSkeleton — TASK-P736 (review fix, CR round 2).
 *
 * Shown while the edit-mode `useQuery` for the listing being edited is on
 * its FIRST load (`isLoading`), and while the duplicate/relist source
 * listing is loading. Before this existed, ListingForm rendered every field
 * with its EMPTY default value during that window — on a mid-range Android
 * device the seller saw a fully blank form for their complete listing, and
 * tapping Publish inside that window fired this card's own "Add Photos,
 * Title, Price, Category, Location to publish this listing" toast for a
 * listing that actually has all of them. This mirrors the real form's
 * section order (photos → title → price → category → condition →
 * description → location → address) so the loading state reads as "this
 * screen, not ready yet" rather than a generic spinner. `ListingForm`
 * disables the toolbar Save/Publish buttons for the same condition
 * (`isFormBlocking`).
 *
 * Pure presentational — no data, no logic.
 */
import React from "react";
import { View } from "react-native";
import { useLocalization } from "@/hooks/useLocalization";
import { Skeleton } from "@/components/reusables/skeleton";

export function ListingFormSkeleton() {
  const { isRtl } = useLocalization();
  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <View style={{ gap: 24 }} testID="listing-form-skeleton">
      {/* Photos */}
      <View style={{ gap: 10 }}>
        <Skeleton style={{ width: 90, height: 18, borderRadius: 4 }} />
        <View style={{ flexDirection: rowDir, gap: 10 }}>
          <Skeleton style={{ width: 104, height: 104, borderRadius: 10 }} />
          <Skeleton style={{ width: 104, height: 104, borderRadius: 10 }} />
        </View>
      </View>

      {/* Title */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 60, height: 14, borderRadius: 4 }} />
        <Skeleton style={{ width: "100%", height: 44, borderRadius: 8 }} />
      </View>

      {/* Price + currency */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 60, height: 14, borderRadius: 4 }} />
        <View style={{ flexDirection: rowDir, gap: 8 }}>
          <Skeleton style={{ flex: 1, height: 44, borderRadius: 8 }} />
          <Skeleton style={{ width: 84, height: 44, borderRadius: 8 }} />
        </View>
      </View>

      {/* Category */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 80, height: 14, borderRadius: 4 }} />
        <Skeleton style={{ width: "100%", height: 44, borderRadius: 8 }} />
      </View>

      {/* Condition — TASK-P736 (review fix, CR round 3): the real form's
          ConditionChips row was missing here, so the skeleton was ~2 rows
          shorter than the form it stands in for and content visibly grew
          when data landed. */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 64, height: 14, borderRadius: 4 }} />
        <View style={{ flexDirection: rowDir, gap: 8 }}>
          <Skeleton style={{ width: 76, height: 32, borderRadius: 16 }} />
          <Skeleton style={{ width: 92, height: 32, borderRadius: 16 }} />
          <Skeleton style={{ width: 64, height: 32, borderRadius: 16 }} />
        </View>
      </View>

      {/* Description */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 110, height: 14, borderRadius: 4 }} />
        <Skeleton style={{ width: "100%", height: 88, borderRadius: 8 }} />
      </View>

      {/* Location */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 70, height: 14, borderRadius: 4 }} />
        <Skeleton style={{ width: "100%", height: 44, borderRadius: 8 }} />
      </View>

      {/* Address — TASK-P736 (review fix, CR round 3): same gap as Condition. */}
      <View style={{ gap: 8 }}>
        <Skeleton style={{ width: 110, height: 14, borderRadius: 4 }} />
        <Skeleton style={{ width: "100%", height: 44, borderRadius: 8 }} />
      </View>
    </View>
  );
}

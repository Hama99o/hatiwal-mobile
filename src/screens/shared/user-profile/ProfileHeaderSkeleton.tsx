/**
 * ProfileHeaderSkeleton — mirrors the real ProfileHeader layout with
 * pulsing skeleton placeholders. Used while the public profile query loads.
 *
 * Design System §6: "Loading = a Skeleton composition mirroring the real layout,
 * not a bare spinner."
 */

import React from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/reusables/skeleton";
import { useColors } from "@/hooks/useColors";

export function ProfileHeaderSkeleton() {
  const colors = useColors();

  const skeletonStyle = { backgroundColor: colors.muted };

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Avatar circle + name bar + city bar — mirrors UserIdentity stacked */}
      <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 20, gap: 12 }}>
        <Skeleton
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            ...skeletonStyle,
          }}
        />
        <Skeleton
          style={{
            width: 140,
            height: 20,
            borderRadius: 6,
            ...skeletonStyle,
          }}
        />
        <Skeleton
          style={{
            width: 100,
            height: 14,
            borderRadius: 4,
            ...skeletonStyle,
          }}
        />
      </View>

      {/* Stats row — three cells */}
      <View
        style={{
          flexDirection: "row",
          marginBottom: 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={{ width: 1, backgroundColor: colors.border }} />
            )}
            <View
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 8,
                gap: 6,
              }}
            >
              <Skeleton
                style={{
                  width: 36,
                  height: 18,
                  borderRadius: 4,
                  ...skeletonStyle,
                }}
              />
              <Skeleton
                style={{
                  width: 50,
                  height: 11,
                  borderRadius: 3,
                  ...skeletonStyle,
                }}
              />
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Separator placeholder */}
      <View
        style={{
          height: 1,
          backgroundColor: colors.border,
          marginBottom: 16,
        }}
      />

      {/* "Active Listings" section label */}
      <Skeleton
        style={{
          width: 120,
          height: 15,
          borderRadius: 4,
          marginBottom: 12,
          ...skeletonStyle,
        }}
      />
    </View>
  );
}

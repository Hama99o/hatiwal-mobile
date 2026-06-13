import React, { useCallback, useState } from "react";
import { View, FlatList, Pressable, Platform, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { ShoppingBag, Plus } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ListingCardSkeleton } from "@/components/common/ListingCardSkeleton";
import { listingsAPI, type Listing } from "@/api/listings";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { SellerListingCard } from "./my-listings/SellerListingCard";

type StatusFilter = "all" | Listing["status"];
const STATUS_TABS: StatusFilter[] = ["all", "draft", "active", "reserved", "sold"];

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [refetchKey, setRefetchKey] = useState(0);

  useFocusEffect(useCallback(() => { setRefetchKey((k) => k + 1); }, []));

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", activeTab, refetchKey],
    queryFn: () => listingsAPI.getMyListings(activeTab !== "all" ? { status: activeTab } : undefined),
  });

  const listings = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
          {t("listing.myListings")}
        </Text>
        <Button variant="default" size="sm" onPress={() => router.push("/(main)/listing/new" as never)}>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
            <Plus size={15} color={colors.primaryForeground} />
            <Text style={{ fontSize: 13, fontWeight: "600" }}>
              {t("listing.postListing")}
            </Text>
          </View>
        </Button>
      </View>

      {/* Filter tabs — fixed height, horizontal scroll */}
      <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            gap: 8,
            alignItems: "center",
            flexDirection: isRtl ? "row-reverse" : "row",
            height: 52,
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderWidth: 1.5,
                  backgroundColor: isActive ? colors.primary : "transparent",
                  borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? colors.primaryForeground : colors.mutedForeground }}>
                  {t(`listing.filter.${tab}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <ListingCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList<Listing>
          data={listings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 48, flexGrow: 1 }}
          renderItem={({ item }) => <SellerListingCard listing={item} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: "center" }}>
              <EmptyState
                icon={ShoppingBag}
                title={activeTab === "all" ? t("listing.emptyAll.title") : t("listing.emptyFiltered.title", { status: t(`listing.filter.${activeTab}`) })}
                description={activeTab === "all" ? t("listing.emptyAll.description") : t("listing.emptyFiltered.description")}
                action={activeTab === "all" ? { label: t("listing.postListing"), onPress: () => router.push("/(main)/listing/new" as never) } : undefined}
              />
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

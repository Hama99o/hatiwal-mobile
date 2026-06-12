import React, { useCallback, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { listingsAPI, Listing } from "@/api/listings";
import { useLocalization } from "@/hooks/useLocalization";
import { confirmAlert } from "@/utils/alert";
import { useColors } from "@/hooks/useColors";
import { toast } from "sonner-native";

const STATUS_TOKEN: Record<string, string> = {
  draft:    "bg-muted",
  active:   "bg-success",
  reserved: "bg-warning",
  sold:     "bg-secondary",
};

function MyListingCard({ item }: { item: Listing }) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocalization();
  const router = useRouter();
  const colors = useColors();
  const qc = useQueryClient();

  const publish = useMutation({
    mutationFn: () => listingsAPI.publishListing(item.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success(t("listing.publish"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const markSold = useMutation({
    mutationFn: () => listingsAPI.markSold(item.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success(t("listing.markSold"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => listingsAPI.deleteListing(item.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success(t("common.delete"));
    },
    onError: () => toast.error(t("common.error")),
  });

  function handleDelete() {
    confirmAlert(
      t("listing.confirmDelete"),
      t("listing.confirmDeleteDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  }

  function handleMarkSold() {
    confirmAlert(
      t("listing.confirmMarkSold"),
      t("listing.markSoldConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.markSold"), onPress: () => markSold.mutate() },
      ]
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text className="text-base font-semibold text-foreground flex-1 mr-2" numberOfLines={2}>
          {item.title}
        </Text>
        <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: getStatusColor(item.status, colors) }}>
          <Text className="text-xs font-semibold text-primary-foreground">
            {t(`listing.status.${item.status}`)}
          </Text>
        </View>
      </View>

      <Text className="text-primary font-bold mt-2">
        {formatCurrency(item.price, item.currency)}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Button
          variant="outline"
          size="sm"
          style={{ flex: 1 }}
          onPress={() => router.push(`/(main)/listing/edit/${item.id}` as never)}
        >
          <Text>{t("common.edit")}</Text>
        </Button>

        {item.status === "draft" && (
          <Button
            variant="default"
            size="sm"
            style={{ flex: 1 }}
            onPress={() => publish.mutate()}
            disabled={publish.isPending}
          >
            <Text>{t("listing.publish")}</Text>
          </Button>
        )}

        {item.status === "reserved" && (
          <Button
            variant="default"
            size="sm"
            style={{ flex: 1 }}
            onPress={handleMarkSold}
            disabled={markSold.isPending}
          >
            <Text>{t("listing.markSold")}</Text>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Text className="text-destructive">{t("common.delete")}</Text>
        </Button>
      </View>
    </View>
  );
}

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const [refetchKey, setRefetchKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefetchKey((k) => k + 1);
    }, [])
  );

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", refetchKey],
    queryFn: () => listingsAPI.getMyListings(),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text className="text-xl font-bold text-foreground">
          {t("listing.myListings")}
        </Text>
        <Button
          variant="default"
          size="sm"
          onPress={() => router.push("/(main)/listing/new" as never)}
        >
          <Text>+ {t("listing.new")}</Text>
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => <MyListingCard item={item} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 64 }}>
              <Text className="text-muted-foreground mb-4">
                {t("listing.noListings")}
              </Text>
              <Button
                variant="default"
                onPress={() => router.push("/(main)/listing/new" as never)}
              >
                <Text>{t("listing.createFirst")}</Text>
              </Button>
            </View>
          }
        />
      )}
    </View>
  );
}

function getStatusColor(
  status: Listing["status"],
  colors: ReturnType<typeof useColors>
): string {
  switch (status) {
    case "active":   return colors.success;
    case "reserved": return colors.warning;
    case "sold":     return colors.secondary;
    default:         return colors.muted;
  }
}

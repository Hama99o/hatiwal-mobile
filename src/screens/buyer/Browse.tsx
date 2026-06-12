import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { listingsAPI, Listing } from "@/api/listings";
import { categoriesAPI, Category } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";

function ListingCard({ item }: { item: Listing }) {
  const router = useRouter();
  const { formatCurrency } = useLocalization();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/listing/${item.id}`)}
      style={{ backgroundColor: "white", borderRadius: 12, marginBottom: 12, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
    >
      <View style={{ height: 160, backgroundColor: "#f3f4f6" }} />
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: "600", fontSize: 15, marginBottom: 4 }} numberOfLines={2}>{item.title}</Text>
        <Text style={{ color: "#2563EB", fontWeight: "bold", fontSize: 16 }}>
          {formatCurrency(item.price, item.currency)}
        </Text>
        <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BrowseScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesAPI.getCategories,
    staleTime: 1000 * 60 * 60,
  });

  const { data: listings, isLoading, refetch } = useQuery({
    queryKey: ["listings", { search, categoryId }],
    queryFn: () => listingsAPI.browse({ search: search || undefined, categoryId: categoryId ?? undefined }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 16, backgroundColor: "white" }}>
        <TextInput
          placeholder={t("browse.searchPlaceholder")}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => refetch()}
          returnKeyType="search"
          style={{ backgroundColor: "#f3f4f6", borderRadius: 8, padding: 12, textAlign: isRtl ? "right" : "left" }}
        />
      </View>

      {categories && categories.length > 0 && (
        <FlatList
          horizontal
          data={[{ id: null, nameEn: t("browse.all") } as any, ...categories]}
          keyExtractor={(c) => String(c.id ?? "all")}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          renderItem={({ item }: { item: Category & { id: null; nameEn: string } }) => (
            <TouchableOpacity
              onPress={() => setCategoryId(item.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor: categoryId === item.id ? "#2563EB" : "white",
                borderWidth: 1,
                borderColor: categoryId === item.id ? "#2563EB" : "#e5e7eb",
              }}
            >
              <Text style={{ color: categoryId === item.id ? "white" : "#374151", fontSize: 13 }}>
                {item.nameEn}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={listings?.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <ListingCard item={item} />}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#888", marginTop: 48 }}>{t("browse.noResults")}</Text>
          }
        />
      )}
    </View>
  );
}

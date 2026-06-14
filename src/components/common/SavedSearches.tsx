import React from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { savedSearchesAPI, type SavedSearch } from "@/api/saved-searches";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { SavedSearchItem } from "./SavedSearchItem";

interface SavedSearchesProps {
  onSelectSearch: (search: SavedSearch) => void;
}

export function SavedSearches({ onSelectSearch }: SavedSearchesProps) {
  const colors = useColors();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const { data: searches, isLoading } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => savedSearchesAPI.list(),
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => savedSearchesAPI.delete(id),
    // Optimistic: remove the chip from the list immediately so it doesn't
    // linger after the user taps X. Roll back if the request fails.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["saved-searches"] });
      const previous = qc.getQueryData<SavedSearch[]>(["saved-searches"]);
      qc.setQueryData<SavedSearch[]>(["saved-searches"], (old) =>
        (old ?? []).filter((s) => s.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["saved-searches"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });

  if (isLoading) {
    return (
      <View style={{ padding: 12, alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (!searches || searches.length === 0) {
    return (
      <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" }}>
          {t("browse.applyFilters")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
        }}
      >
        {searches.map((search) => (
          <SavedSearchItem
            key={search.id}
            search={search}
            onPress={() => onSelectSearch(search)}
            onDelete={() => deleteMutation.mutate(search.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

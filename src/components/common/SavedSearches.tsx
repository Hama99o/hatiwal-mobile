import React from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { savedSearchesAPI, type SavedSearch } from "@/api/saved-searches";
import { useColors } from "@/hooks/useColors";
import { SavedSearchItem } from "./SavedSearchItem";

interface SavedSearchesProps {
  onSelectSearch: (search: SavedSearch) => void;
}

export function SavedSearches({ onSelectSearch }: SavedSearchesProps) {
  const colors = useColors();
  const qc = useQueryClient();

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

  // Optimistically zero out the badge as soon as the chip is tapped, then
  // fire mark_seen in the background and re-fetch to get the true server state.
  const markSeenMutation = useMutation({
    mutationFn: (id: number) => savedSearchesAPI.markSeen(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["saved-searches"] });
      const previous = qc.getQueryData<SavedSearch[]>(["saved-searches"]);
      qc.setQueryData<SavedSearch[]>(["saved-searches"], (old: SavedSearch[] | undefined) =>
        (old ?? []).map((s: SavedSearch) =>
          s.id === id ? { ...s, newMatchesCount: 0 } : s
        )
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["saved-searches"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });

  const handleSelectSearch = (search: SavedSearch) => {
    onSelectSearch(search);
    if (search.newMatchesCount > 0) {
      markSeenMutation.mutate(search.id);
    }
  };

  if (isLoading) {
    return (
      <View style={{ padding: 12, alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (!searches || searches.length === 0) {
    return null;
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
            onPress={() => handleSelectSearch(search)}
            onDelete={() => deleteMutation.mutate(search.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * ListingSales — the seller's ledger for ONE listing (SF-M5,
 * `docs/SELL_FLOW_REDESIGN.md` §9/§10.3).
 *
 * Standard marketplace furniture (eBay "Sold", Etsy "Orders", Mercari, FB
 * "Your sales") that Hatiwal had none of — "who bought how many, at what
 * price, when" was unanswerable for a batch listing until now. Reached from
 * `useListingLifecycle`'s "View sales" moreActions row (shown whenever
 * `hasSoldSome(listing)`) and, once wired, `SaleBuyerCard`'s own "+N more"
 * link.
 *
 * Data: `GET /my/transactions?listing_id={id}&as=seller&status=sold`
 * (`transactionsAPI.getMyTransactions`) via `UniversalList` — same paging
 * convention as `ListingConversations.tsx`, its closest sibling screen.
 * `UniversalList` has no react-query cache of its own, so mutations bump a
 * local `refreshKey` to make it refetch (mirrors `ListingConversations.tsx`
 * exactly) — the REACT-QUERY-backed queries other screens depend on
 * (`useListingLifecycle`'s My Listings / status counts / this listing's own
 * detail query) are invalidated separately, by reusing its exported query
 * key constants rather than duplicating the list (the same pattern
 * `Conversation.tsx`'s own `invalidateListingLifecycleQueries` already
 * established).
 *
 * The header tally ("5 of 15 sold") needs the listing's own TOTAL quantity,
 * which `TransactionSerializer`'s embedded `listing` sub-object does not
 * carry (only `available_units`) — so this screen also fetches the listing
 * itself (`listingsAPI.getMyListing`, the same query `MyListingDetail.tsx`
 * already caches under `[MY_LISTING_QK, id]`) purely for that header and the
 * screen title; the per-row quantity ceiling for the edit sheet comes from
 * each transaction's own embedded listing snapshot instead (no extra fetch).
 */
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react-native";

import { listingsAPI } from "@/api/listings";
import { transactionsAPI, type Transaction } from "@/api/transactions";
import { toast } from "@/lib/toast";
import { apiErrorCode, apiErrorMessage } from "@/utils/apiError";
import { totalUnitsOf, availableUnitsOf } from "@/utils/stock";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { BackButton } from "@/components/common/BackButton";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import {
  UniversalList,
  type UniversalListConfig,
  type ListQuery,
  type ListFetchResult,
} from "@/components/common/UniversalList";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { SaleRow } from "./listing-sales/SaleRow";
import {
  SaleRowEditSheet,
  type SaleRowEditResult,
  type SaleRowEditOutcome,
} from "./listing-sales/SaleRowEditSheet";
import {
  MY_LISTING_QK,
  MY_LISTINGS_QK,
  MY_LISTING_STATUS_COUNTS_QK,
  CONVERSATIONS_QK,
} from "@/hooks/useListingLifecycle";

const SALES_PAGE_SIZE = 20;

export default function ListingSales() {
  const { t } = useTranslation();
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);

  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Transaction | null>(null);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  // Header context only — title + the total quantity the tally needs.
  const { data: listing } = useQuery({
    queryKey: [MY_LISTING_QK, id],
    queryFn: () => listingsAPI.getMyListing(listingId),
    enabled: Number.isFinite(listingId),
  });

  // Reuses the SAME four query keys `useListingLifecycle.invalidateAll`
  // defines (docs/SELL_FLOW_REDESIGN.md §10.3.1) — never a duplicated list.
  const invalidateListingLifecycleQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
    qc.invalidateQueries({ queryKey: [MY_LISTING_STATUS_COUNTS_QK] });
    qc.invalidateQueries({ queryKey: [MY_LISTING_QK, id] });
    qc.invalidateQueries({ queryKey: [CONVERSATIONS_QK, listingId] });
  }, [qc, id, listingId]);

  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Transaction>> => {
      const response = await transactionsAPI.getMyTransactions({
        listingId,
        as: "seller",
        status: "sold",
        pageNumber: query.page,
        pageSize: query.perPage,
      });
      return {
        items: response.items,
        totalCount: response.pagination.totalCount,
        totalPages: response.pagination.totalPages,
        currentPage: response.pagination.currentPage,
      };
    },
    [listingId]
  );

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; result: SaleRowEditResult }) =>
      transactionsAPI.updateTransaction(vars.id, vars.result),
    onSuccess: () => {
      invalidateListingLifecycleQueries();
      setRefreshKey((k) => k + 1);
      setEditing(null);
      // Reuses the existing generic "Changes saved" — a quantity/price/buyer
      // correction has no copy of its own in `docs/SELL_FLOW_REDESIGN.md`
      // §12's table (only the VOID path does, `listing.sale.voidedSuccess`
      // below), and this is the same confirmation every other form save in
      // the app already gives.
      toast.success(t("listing.form.saved"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (transactionId: number) => transactionsAPI.deleteTransaction(transactionId),
    onSuccess: () => {
      invalidateListingLifecycleQueries();
      setRefreshKey((k) => k + 1);
      setEditing(null);
      toast.success(t("listing.sale.voidedSuccess"));
    },
  });

  // Never throws — returns a discriminated outcome instead, so the sheet
  // never has to catch across a callback boundary. The one deliberate
  // refusal (`sale_has_review`) is reported back as `blockedReviewed: true`
  // so the SHEET can render the inline explanation and stay open; every
  // other failure gets its toast HERE and is reported back as a plain
  // failure (the sheet stays open for a retry either way — Save/Delete
  // never close the sheet on failure, only on success).
  const handleSave = useCallback(
    async (result: SaleRowEditResult): Promise<SaleRowEditOutcome> => {
      if (!editing) return { ok: false, blockedReviewed: false };
      try {
        await updateMutation.mutateAsync({ id: editing.id, result });
        return { ok: true };
      } catch (err) {
        if (apiErrorCode(err) === "sale_has_review") return { ok: false, blockedReviewed: true };
        toast.error(apiErrorMessage(err, t));
        return { ok: false, blockedReviewed: false };
      }
    },
    [editing, updateMutation, t]
  );

  const handleDelete = useCallback(async (): Promise<SaleRowEditOutcome> => {
    if (!editing) return { ok: false, blockedReviewed: false };
    try {
      await deleteMutation.mutateAsync(editing.id);
      return { ok: true };
    } catch (err) {
      if (apiErrorCode(err) === "sale_has_review") return { ok: false, blockedReviewed: true };
      toast.error(apiErrorMessage(err, t));
      return { ok: false, blockedReviewed: false };
    }
  }, [editing, deleteMutation, t]);

  const multiUnit = listing?.multiUnit === true;
  const sold = listing ? totalUnitsOf(listing) - availableUnitsOf(listing) : 0;
  const total = listing ? totalUnitsOf(listing) : 0;

  const listConfig: UniversalListConfig<Transaction> = {
    id: `listing-sales-${listingId}`,
    refreshKey,
    fetcher,
    perPage: SALES_PAGE_SIZE,
    keyExtractor: (item) => String(item.id),
    renderItem: ({ item }) => (
      <SaleRow transaction={item} multiUnit={multiUnit} onPress={() => setEditing(item)} />
    ),
    skeletonCount: 5,
    SkeletonComponent: ConversationRowSkeleton,
    emptyIcon: Receipt,
    emptyTitle: t("listing.salesScreen.empty"),
    emptyDescription: t("listing.salesScreen.emptyHint"),
    contentPaddingBottom: Math.max(insets.bottom, 16) + 12,
    ListHeaderComponent:
      multiUnit && total > 0 ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.muted,
          }}
          testID="sales-tally"
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
            {/* Design review fix — every other count-in-a-sentence in this
                app goes through `formatNumber` (SellerListingCard's
                viewsCount/conversationsCount, StockBadge's leftOfTotal) so
                Pashto/Dari render Eastern Arabic-Indic digits; this tally was
                the one place still interpolating a bare JS number. */}
            {t("listing.sale.tally", { sold: formatNumber(sold), total: formatNumber(total) })}
          </Text>
        </View>
      ) : null,
  };

  // The edit sheet's per-row ceiling: availableUnits + this row's own
  // quantity (docs/SELL_FLOW_REDESIGN.md §10.3.1's `listing.quantity -
  // (sold_units - this_row's_current_quantity)`, simplified — the other
  // sold rows' units are `sold_units - this_row.quantity`, so `quantity -
  // that` reduces to `available_units + this_row.quantity`). Read from the
  // TRANSACTION's own embedded listing snapshot, not the separate header
  // fetch above, so this works even before that query resolves.
  const maxQuantityFor = (txn: Transaction) =>
    (txn.listing?.availableUnits ?? 0) + (txn.quantity ?? 1);

  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 14,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
          <BackButton />
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* QA (card #296/SF-QA1): these two were the only Text nodes in this
                file without an `isRtl` alignment — the tally below already had
                one. In Pashto/Dari the row reverses (BackButton moves to the
                right) but the title and subtitle stayed LEFT-aligned inside it,
                so the screen's own heading read away from the edge it belongs
                to while every row beneath it was mirrored correctly. */}
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.foreground,
                textAlign: isRtl ? "right" : "left",
              }}
              numberOfLines={1}
            >
              {listing?.title || t("listing.salesScreen.title")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("listing.salesScreen.title")}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <UniversalList config={listConfig} />
      </View>

      <SaleRowEditSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        transaction={editing}
        multiUnit={multiUnit}
        maxQuantity={editing ? maxQuantityFor(editing) : 1}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </ScreenContainer>
  );
}

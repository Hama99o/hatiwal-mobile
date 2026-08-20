/**
 * ListingUnavailableActions — TASK-N317.
 *
 * Replaces the old flat "This item has been sold" grey box in ListingDetail's
 * sticky action bar (a non-owner viewing a sold/reserved listing) — which had
 * a status sentence and NO next step. Buyers arriving from a share deep link
 * (TASK-L824) or the Saved tab hit this constantly and bounced; this gives
 * them somewhere to go:
 *
 *   1. PRIMARY   — "See similar in {category}" → Browse, pre-filtered to the
 *      same category, plus a ±30% price band (`@/utils/recoveryBand`) when
 *      that band provably contains live stock from the already-fetched
 *      `similar` rail (`GET /listings/:id/similar`).
 *   2. SECONDARY — "More from {seller}" → that seller's public profile.
 *
 * Mirrors the web `<UnavailableActions>`
 * (`hatiwal-web/src/components/listing/unavailable-actions.tsx`) so both
 * clients degrade the same way:
 *
 *   band (similar stock inside it) → category-only (stock exists, none of it
 *   inside the band) → no category CTA at all (the `similar` rail is empty)
 *   — in which case the seller CTA is promoted to primary weight so the card
 *   never reads like a stack of equally-quiet buttons.
 *
 * Never renders a link to nowhere: the category CTA is omitted when
 * `category` is null (or the similar rail is empty), the seller CTA when
 * `sellerId` is null — and when BOTH are omitted, only the status sentence
 * remains (never an empty button row).
 *
 * Composed ONLY from shared pieces — RNR `Button`/`Text`, the shared
 * `StatusBadge`, `useColors()` — plus plain `View` for layout. This is a
 * DIFFERENT component from the chat thread's `ListingUnavailableNotice`
 * (TASK-K729, already shipped) — that one is scoped to the conversation
 * screen (viewer-is-buyer copy, the REV2 "Rate seller" CTA) and lives beside
 * a `ListingHeader` that already shows a `StatusBadge` 8px above it, so it
 * deliberately omits one. This component has no such neighbour — its own
 * `StatusBadge` is the only status pill anywhere near the sticky action bar.
 */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryName } from "@/hooks/useCategoryName";
import { recoveryBand } from "@/utils/recoveryBand";
import type { EmbeddedCategory } from "@/api/categories";

export interface ListingUnavailableActionsProps {
  /** Only "sold" and "reserved" ever render this — gated by the caller. */
  status: "sold" | "reserved";
  /** Null → the "See similar" CTA is never rendered. */
  category?: EmbeddedCategory | null;
  price?: number | null;
  /** Needed to decide whether a price band means anything — see `BANDABLE_CURRENCY`. */
  currency?: string | null;
  /**
   * Prices of the listings in the already-fetched `similar` rail. EMPTY ⇒ the
   * "See similar" CTA would land on an empty Browse feed, so it is not
   * rendered at all (the seller CTA is promoted to primary in that case).
   */
  similarPrices: ReadonlyArray<number | null | undefined>;
  /** Null/undefined → the "More from seller" CTA is never rendered. */
  sellerId?: number | null;
  sellerName?: string | null;
  testID?: string;
}

export function ListingUnavailableActions({
  status,
  category,
  price,
  currency,
  similarPrices,
  sellerId,
  sellerName,
  testID = "listing-unavailable-actions",
}: ListingUnavailableActionsProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const getCategoryName = useCategoryName();

  const notice = status === "sold" ? t("listing.detail.soldNotice") : t("listing.detail.reservedNotice");
  // A reservation can fall through, so the item may come back — worth saying.
  // A sold item is final, and the same line there would be a false promise.
  const mayFreeUp = status === "reserved";
  const textAlign = isRtl ? "right" : "left";
  const rowDir = isRtl ? "row-reverse" : "row";

  // Only offer the category when it demonstrably has something to show.
  const hasSimilarStock = similarPrices.length > 0;
  const band = recoveryBand(price, currency, similarPrices);
  const showCategoryCta = !!category && hasSimilarStock;
  const showSellerCta = sellerId != null;
  // With no category CTA the seller's shelf IS the recovery path, so it
  // takes primary weight instead of reading like an afterthought.
  const sellerIsPrimary = !showCategoryCta;

  const handleSeeSimilar = () => {
    if (!category) return;
    router.push({
      pathname: "/(main)/(tabs)/browse",
      params: {
        categoryId: String(category.id),
        ...(band ? { priceMin: String(band.min), priceMax: String(band.max) } : {}),
      },
    } as never);
  };

  const handleMoreFromSeller = () => {
    if (sellerId == null) return;
    router.push(`/(main)/seller/${sellerId}` as never);
  };

  return (
    <View testID={testID} style={{ gap: 10 }}>
      <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
        <StatusBadge status={status} />
        <Text
          style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.mutedForeground, textAlign }}
        >
          {notice}
        </Text>
      </View>

      {mayFreeUp && (
        <Text
          style={{ fontSize: 12, color: colors.mutedForeground, textAlign }}
          testID="unavailable-reserved-may-free-up"
        >
          {t("listing.detail.reservedMayFreeUp")}
        </Text>
      )}

      {/* Never render an empty button row: a listing with neither in-stock
          category nor a seller keeps just the status sentence above. */}
      {(showCategoryCta || showSellerCta) && (
        <View style={{ gap: 8 }}>
          {showCategoryCta && category && (
            <Button variant="default" onPress={handleSeeSimilar} testID="unavailable-see-similar">
              <Text
                numberOfLines={2}
                style={{ fontSize: 14, fontWeight: "700", color: colors.primaryForeground, textAlign: "center" }}
              >
                {t("listing.detail.seeSimilarIn", { category: getCategoryName(category) })}
              </Text>
            </Button>
          )}
          {showSellerCta && (
            <Button
              variant={sellerIsPrimary ? "default" : "ghost"}
              onPress={handleMoreFromSeller}
              testID="unavailable-more-from-seller"
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: sellerIsPrimary ? colors.primaryForeground : colors.mutedForeground,
                  textAlign: "center",
                }}
              >
                {sellerName
                  ? t("listing.detail.moreFromSellerNamed", { name: sellerName })
                  : t("listing.detail.moreFromSeller")}
              </Text>
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

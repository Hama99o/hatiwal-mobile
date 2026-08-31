/**
 * SaleBuyerCard — TASK-R418.
 *
 * Surfaces the buyer identified via BuyerPickerSheet (TASK-TX01) on the
 * seller's own listing, everywhere the seller is looking at the listing's
 * lifecycle: "Reserved for {name}" / "Sold to {name}", with the agreed final
 * price (only when it differs from the asking price), the completed-sale
 * date, and a one-tap Message action straight into that buyer's existing
 * conversation.
 *
 * Renders NOTHING when `listing.sale` is null/undefined — a draft/active
 * listing, or a legacy reserve/sold made without identifying a buyer, never
 * shows an empty card or a placeholder avatar.
 *
 * Composed entirely of shared components — never hand-roll avatar/name/
 * verified UI (UserIdentity) or price UI (PriceTag).
 *
 * CYCLE-4 design-review fix: the identity block used to be THREE stacked
 * elements (a standalone UserIdentity row, a final-price row, then a
 * full-width outline "Message {name}" Button below it) — a lot of vertical
 * weight for what is, at heart, one fact ("here's the buyer") plus one
 * action ("talk to them"). Collapsed to ONE row: UserIdentity (tappable ->
 * the buyer's profile) beside a single compact Message control, sized to
 * its content instead of stretching full-width. The required "Reserved for
 * {name}" / "Sold to {name}" copy (Description + Acceptance #5/#6, asserted
 * by maestro/seller/reserved_buyer.yaml) stays as a short caption above that
 * row — dropping it would silently regress the very acceptance criterion
 * this component exists to satisfy.
 */
import React from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MessageCircle, UserCheck } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { UserIdentity } from "@/components/common/UserIdentity";
import { PriceTag } from "@/components/common/PriceTag";
import { getStatusAccent } from "@/components/common/statusAccent";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import type { Listing } from "@/api/listings";

interface SaleBuyerCardProps {
  listing: Listing;
}

export function SaleBuyerCard({ listing }: SaleBuyerCardProps) {
  const { t } = useTranslation();
  const { isRtl, formatDate, formatNumber } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const sale = listing.sale;
  if (!sale) return null;

  const rowDir = isRtl ? "row-reverse" : "row";
  const isSold = sale.status === "sold";
  // CR fix (CYCLE-4, LOW): guard `buyer` the same way as everywhere else this
  // shape is rendered (e.g. SellerListingCard's compact sale line) — the
  // backend guarantees a buyer whenever `sale` is non-null, but a defensive
  // fallback avoids ever rendering an empty/undefined name on stale cached
  // payloads.
  const buyerName = sale.buyer?.name || t("listing.sale.noBuyerRecorded");
  const buyerId = sale.buyer?.id;
  // TASK-K729 dedup fix — reuses the same status->colour map as StatusBadge
  // (was previously forked here with sold -> muted/mutedForeground, which
  // disagreed with StatusBadge's documented sold -> secondary/secondaryForeground).
  const accent = getStatusAccent(isSold ? "sold" : "reserved", colors);

  const headline = isSold
    ? t("listing.sale.soldTo", { name: buyerName })
    : t("listing.sale.reservedFor", { name: buyerName });

  const showFinalPrice = sale.finalPrice != null && Number(sale.finalPrice) !== Number(listing.price);
  // SF-M5 — this card shows only the LATEST sale; once a second exists, the
  // seller needs a way to learn that from here rather than stumbling onto
  // the full ledger by accident. `salesCount` counts SOLD entries only, so a
  // still-open hold (isSold === false) never shows this link — there is
  // nothing to view yet.
  const hasMoreSales = isSold && (listing.salesCount ?? 0) > 1;
  // Multi-unit sales only. A batch listing's sale of 1 unit still counts —
  // "1 of 15" is exactly what the seller needs to see — so this gates on the
  // LISTING being multi-unit, not on the quantity being > 1.
  const showUnitsSold = listing.multiUnit === true && sale.quantity != null;

  // CYCLE-4 design-review fix: completedAt was recorded on every sold
  // Transaction but never rendered anywhere on the owner surfaces. Shown as
  // the identity row's subtitle so it rides along in the same collapsed row
  // instead of adding a 4th stacked block.
  const soldOnLabel =
    isSold && sale.completedAt ? t("listing.sale.soldOn", { date: formatDate(sale.completedAt) }) : null;

  const hasDirectConversation = sale.conversationId != null;

  const handleMessage = () => {
    if (hasDirectConversation) {
      router.push(`/(main)/conversation/${sale.conversationId}` as never);
    } else {
      router.push({
        pathname: "/(main)/listing-conversations/[id]" as never,
        params: { id: String(listing.id), listingTitle: listing.title },
      } as never);
    }
  };

  // CYCLE-4 design-review fix: UserIdentity's own onPress now lands on the
  // buyer's profile — the Message action (below) is a separate, adjacent
  // control, not the identity row's tap target.
  const goToBuyerProfile = buyerId != null ? () => router.push(`/(main)/seller/${buyerId}` as never) : undefined;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        gap: 10,
      }}
      testID="sale-buyer-card"
    >
      <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
        <UserCheck size={14} color={accent.text} />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "700",
            color: accent.text,
            textAlign: isRtl ? "right" : "left",
          }}
          numberOfLines={2}
        >
          {headline}
        </Text>
      </View>

      {/* CYCLE-4: the ONE collapsed row — UserIdentity (-> buyer profile)
          beside a compact Message control, sized to its content. */}
      <View style={{ flexDirection: rowDir, alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <UserIdentity
            name={buyerName}
            avatarUrl={sale.buyer?.avatarUrl}
            verified={sale.buyer?.verified}
            subtitle={soldOnLabel}
            size={40}
            onPress={goToBuyerProfile}
            testID="sale-buyer-identity"
          />
        </View>

        <Button
          variant="outline"
          size="sm"
          onPress={handleMessage}
          accessibilityLabel={t("listing.sale.messageBuyer", { name: buyerName })}
          testID="sale-buyer-message-button"
        >
          <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
            <MessageCircle size={15} color={colors.foreground} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>
              {/* CYCLE-4: hide the direct-message copy when there is no
                  conversation to jump straight into — relabel to the
                  existing "View Conversations" action instead of implying a
                  one-tap DM that doesn't exist for this legacy row. */}
              {hasDirectConversation ? t("common.message") : t("listing.ownerDetail.viewConversations")}
            </Text>
          </View>
        </Button>
      </View>

      {/* How many units this buyer took — the seller's "who bought how much"
          answer at the single-listing level (spike §0b). Only for a real
          multi-unit sale: `quantity` is 1 on every single-item listing, so a
          "1 unit" line would be noise on the majority of sales. */}
      {showUnitsSold && (
        <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
            {t("listing.sale.unitsSold")}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
            {/* Design review fix — digits must render Arabic-Indic in ps/fa;
                every other count-in-a-sentence in this app formats first. */}
            {t("listing.stock.unitsCount", {
              count: sale.quantity ?? 1,
              display: formatNumber(sale.quantity ?? 1),
            })}
          </Text>
        </View>
      )}

      {showFinalPrice && (
        <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
            {t("listing.sale.finalPrice")}
          </Text>
          {/* Per unit for a multi-unit sale: the buyer picker's final-price
              field is placeholder-seeded with the listing's own per-unit price
              and captioned "the price for one item", so that is what this
              figure means. Without the suffix a 3-bag sale at 13,000 each reads
              as a 13,000 total. */}
          <PriceTag price={sale.finalPrice} currency={sale.currency} size="sm" perUnit={listing.multiUnit === true} />
        </View>
      )}

      {/* SF-M5 (docs/SELL_FLOW_REDESIGN.md §9) — this card only ever shows the
          LATEST sale (`sale` above); once there is more than one, a seller
          who only glances at this card would never learn a second buyer
          exists at all. `sales_count` is a cheap base serializer field for
          exactly this — the seller reaches the full ledger without it being
          the default path for every sale (most listings have exactly one). */}
      {hasMoreSales && (
        <Pressable
          onPress={() => router.push(`/(main)/listing/${listing.id}/sales` as never)}
          hitSlop={8}
          testID="sale-buyer-more-sales-link"
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary, textAlign: isRtl ? "right" : "left" }}>
            {t("listing.sale.moreBuyers", { count: formatNumber((listing.salesCount ?? 0) - 1) })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

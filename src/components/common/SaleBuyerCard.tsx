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
import { View } from "react-native";
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
  const { isRtl, formatDate } = useLocalization();
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

      {showFinalPrice && (
        <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
            {t("listing.sale.finalPrice")}
          </Text>
          <PriceTag price={sale.finalPrice} currency={sale.currency} size="sm" />
        </View>
      )}
    </View>
  );
}

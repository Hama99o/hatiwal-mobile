/**
 * SaleBuyerCard — TASK-R418.
 *
 * Surfaces the buyer identified via BuyerPickerSheet (TASK-TX01) on the
 * seller's own listing, everywhere the seller is looking at the listing's
 * lifecycle: "Reserved for {name}" / "Sold to {name}", with the agreed final
 * price (only when it differs from the asking price) and a one-tap
 * "Message {name}" action straight into that buyer's existing conversation.
 *
 * Renders NOTHING when `listing.sale` is null/undefined — a draft/active
 * listing, or a legacy reserve/sold made without identifying a buyer, never
 * shows an empty card or a placeholder avatar.
 *
 * Composed entirely of shared components — never hand-roll avatar/name/
 * verified UI (UserIdentity) or price UI (PriceTag).
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
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import type { Listing } from "@/api/listings";

interface SaleBuyerCardProps {
  listing: Listing;
}

export function SaleBuyerCard({ listing }: SaleBuyerCardProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const sale = listing.sale;
  if (!sale) return null;

  const rowDir = isRtl ? "row-reverse" : "row";
  const buyerName = sale.buyer?.name || t("listing.sale.noBuyerRecorded");
  const accentColor = sale.status === "sold" ? colors.mutedForeground : colors.warning;
  const accentBg = sale.status === "sold" ? colors.muted : colors.warningAlpha;

  const headline =
    sale.status === "sold"
      ? t("listing.sale.soldTo", { name: buyerName })
      : t("listing.sale.reservedFor", { name: buyerName });

  const showFinalPrice = sale.finalPrice != null && Number(sale.finalPrice) !== Number(listing.price);

  const handleMessage = () => {
    if (sale.conversationId != null) {
      router.push(`/(main)/conversation/${sale.conversationId}` as never);
    } else {
      router.push({
        pathname: "/(main)/listing-conversations/[id]" as never,
        params: { id: String(listing.id), listingTitle: listing.title },
      } as never);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        gap: 12,
      }}
      testID="sale-buyer-card"
    >
      <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accentBg,
          }}
        >
          <UserCheck size={14} color={accentColor} />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "700",
            color: colors.foreground,
            textAlign: isRtl ? "right" : "left",
          }}
          numberOfLines={2}
        >
          {headline}
        </Text>
      </View>

      <UserIdentity
        name={buyerName}
        avatarUrl={sale.buyer?.avatarUrl}
        verified={sale.buyer?.verified}
        size={40}
        testID="sale-buyer-identity"
      />

      {showFinalPrice && (
        <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
            {t("listing.sale.finalPrice")}
          </Text>
          <PriceTag price={sale.finalPrice} currency={sale.currency} size="sm" />
        </View>
      )}

      <Button variant="outline" onPress={handleMessage} testID="sale-buyer-message-button">
        <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
          <MessageCircle size={15} color={colors.foreground} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
            {t("listing.sale.messageBuyer", { name: buyerName })}
          </Text>
        </View>
      </Button>
    </View>
  );
}

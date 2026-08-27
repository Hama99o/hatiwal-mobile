/**
 * SaleRow — one line of the Sales screen's ledger (SF-M5,
 * `docs/SELL_FLOW_REDESIGN.md` §10.3).
 *
 * Buyer identity (or "Sold outside Hatiwal" for an SF-B3 outside-buyer row —
 * never the defensive "buyer info unavailable" fallback `SaleBuyerCard`/
 * `SellerListingCard` use, which means something else: a LEGACY row that
 * predates buyer attribution entirely, not a real, recorded outside sale),
 * quantity (multi-unit listings only), the per-unit price via the shared
 * `PriceTag`, and the sale date. Tapping anywhere opens the correction sheet.
 */
import React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { UserIdentity } from "@/components/common/UserIdentity";
import { PriceTag } from "@/components/common/PriceTag";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import type { Transaction } from "@/api/transactions";

export interface SaleRowProps {
  transaction: Transaction;
  /** Only shown when the listing is multi-unit — a single-item sale is always "1". */
  multiUnit: boolean;
  onPress: () => void;
}

export function SaleRow({ transaction, multiUnit, onPress }: SaleRowProps) {
  const { t } = useTranslation();
  const { isRtl, formatDate } = useLocalization();
  const colors = useColors();
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const buyer = transaction.buyer;
  const buyerName = buyer?.name ?? t("listing.sale.outsideBuyer");

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.muted }}
      testID={`sale-row-${transaction.id}`}
      accessibilityRole="button"
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <UserIdentity
          name={buyerName}
          avatarUrl={buyer?.avatarUrl ?? null}
          size={40}
          subtitle={formatDate(transaction.completedAt)}
          testID={`sale-row-identity-${transaction.id}`}
        />
      </View>

      <View style={{ alignItems: isRtl ? "flex-start" : "flex-end", gap: 2 }}>
        {multiUnit && (
          <Text
            style={{ fontSize: 12, color: colors.mutedForeground }}
            testID={`sale-row-quantity-${transaction.id}`}
          >
            {t("listing.stock.unitsCount", { count: transaction.quantity ?? 1 })}
          </Text>
        )}
        <PriceTag price={transaction.finalPrice} currency={transaction.currency} size="sm" perUnit={multiUnit} />
      </View>

      <Chevron size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

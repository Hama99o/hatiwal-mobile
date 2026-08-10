/**
 * ListingUnavailableNotice — TASK-K729.
 *
 * When the pinned listing in a chat thread turns `reserved` or `sold`,
 * Conversation.tsx's `canOfferInThread` guard goes false and the composer's
 * "Make an offer" row silently disappears from ComposerActionsSheet — with
 * nothing telling the buyer WHY, and no next step. This card replaces that
 * silent gap: an explicit, localized reason plus a real recovery action
 * ("Browse similar in {category}" / a generic fallback when the listing has
 * no category, and "More from {seller}" when the seller is known), mirroring
 * the buyer-facing recovery CTAs on the web listing detail (TASK-WEB-SOLDNEXT)
 * so the two clients agree.
 *
 * Buyer-facing ONLY — Conversation.tsx renders this behind `!isOwner`. The
 * seller already has the lifecycle controls in ListingHeader and the
 * "Reserved for / Sold to" info in SaleBuyerCard elsewhere; they never see
 * this buyer-recovery copy.
 *
 * The "Browse similar" action ALWAYS renders (falling back to a generic
 * "Browse similar listings" label + unfiltered Browse route when the
 * listing has no category) so there is always at least one working next
 * step — never an empty action row.
 */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { PackageX, Search, Store } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryName } from "@/hooks/useCategoryName";

export interface ListingUnavailableNoticeCategory {
  id: number;
  nameEn: string;
  namePs?: string | null;
  nameFa?: string | null;
  slug?: string;
}

export interface ListingUnavailableNoticeProps {
  /** Only "reserved" and "sold" ever render this notice — gated by the caller. */
  status: "reserved" | "sold";
  category?: ListingUnavailableNoticeCategory | null;
  sellerId?: number;
  sellerName?: string;
}

export function ListingUnavailableNotice({
  status,
  category,
  sellerId,
  sellerName,
}: ListingUnavailableNoticeProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const getCategoryName = useCategoryName();

  const isSold = status === "sold";
  const rowDir = isRtl ? "row-reverse" : "row";
  const accentColor = isSold ? colors.mutedForeground : colors.warning;
  const accentBg = isSold ? colors.muted : colors.warningAlpha;

  const title = isSold
    ? t("chat.thread.unavailable.soldTitle")
    : t("chat.thread.unavailable.reservedTitle");
  const body = isSold
    ? t("chat.thread.unavailable.soldBody")
    : t("chat.thread.unavailable.reservedBody");

  const handleBrowseSimilar = () => {
    if (category) {
      router.push({
        pathname: "/(main)/(tabs)/browse",
        params: { categoryId: String(category.id) },
      } as never);
    } else {
      router.push("/(main)/(tabs)/browse" as never);
    }
  };

  const handleMoreFromSeller = () => {
    if (sellerId == null) return;
    router.push(`/(main)/seller/${sellerId}` as never);
  };

  return (
    <View
      testID="listing-unavailable-notice"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ flexDirection: rowDir, alignItems: "flex-start", gap: 8 }}>
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
          <PackageX size={14} color={accentColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: colors.foreground,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {body}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: rowDir, gap: 8, flexWrap: "wrap" }}>
        {/* Always present — the one guaranteed recovery action, so no dead end remains */}
        <Button variant="outline" size="sm" onPress={handleBrowseSimilar} testID="unavailable-browse-similar">
          <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
            <Search size={14} color={colors.foreground} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
              {category
                ? t("chat.thread.unavailable.browseSimilar", { category: getCategoryName(category) })
                : t("chat.thread.unavailable.browseSimilarGeneric")}
            </Text>
          </View>
        </Button>

        {sellerId != null && sellerName ? (
          <Button
            variant="outline"
            size="sm"
            onPress={handleMoreFromSeller}
            testID="unavailable-more-from-seller"
          >
            <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
              <Store size={14} color={colors.foreground} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
                {t("chat.thread.unavailable.moreFromSeller", { name: sellerName })}
              </Text>
            </View>
          </Button>
        ) : null}
      </View>
    </View>
  );
}

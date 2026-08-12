/**
 * AgreedDealBanner — TASK-C763.
 *
 * Slim banner rendered directly under the pinned `ListingHeader`, shown to
 * the listing owner whenever `shouldShowAgreedDealBanner` (`./agreedOffer.ts`)
 * is true — i.e. there is a live agreed price in this thread (the newest
 * offer/counter that was actually accepted) and the listing is still
 * `active`. This is the "second chance" for the seller-counters/buyer-accepts
 * path TASK-O947 never covered (its one-tap prompt only fires when the
 * SELLER taps Accept), and for anyone who dismissed that one-shot prompt —
 * unlike the prompt, this banner is driven entirely by server message state,
 * so it persists across re-opening the thread until the listing is actually
 * reserved.
 *
 * Composed from shared components only — `UserIdentity` (the buyer,
 * avatar-only sized 28) + `PriceTag` (`size="sm"`) for the agreed amount + a
 * primary `Button`. Tapping the CTA does NOT reserve directly — it is the
 * caller's job (`Conversation.tsx`) to build the SAME
 * `buildReserveAfterAcceptPrompt` confirm state O947 already uses and open
 * the SAME shared `BuyerPickerSheet` — this component never forks a second
 * reserve flow.
 */
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { UserIdentity } from "@/components/common/UserIdentity";
import { PriceTag } from "@/components/common/PriceTag";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { wrapBidiIsolate } from "./reserveAfterAccept";

export interface AgreedDealBannerProps {
  buyerName: string;
  buyerAvatarUrl?: string | null;
  buyerVerified?: boolean;
  /** The agreed amount — the newest accepted offer/counter (`findAgreedOffer`). */
  amount: number;
  currency: string;
  /** Opens the shared reserve-confirm sheet — never reserves directly. */
  onReserve: () => void;
  testID?: string;
}

export function AgreedDealBanner({
  buyerName,
  buyerAvatarUrl,
  buyerVerified,
  amount,
  currency,
  onReserve,
  testID = "agreed-deal-banner",
}: AgreedDealBannerProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const rowDir = isRtl ? "row-reverse" : "row";

  // Same bidi-isolate treatment `reserveAfterAccept.ts` already applies to
  // this exact buyer name when it's interpolated into a translated sentence
  // — an un-isolated LTR name can visually reorder inside a ps/fa sentence.
  const bannerTitle = t("chat.offer.agreedBannerTitle", {
    buyerName: wrapBidiIsolate(buyerName),
  });
  const reserveCta = t("chat.offer.agreedReserveCta");

  return (
    <View
      testID={testID}
      style={{
        flexDirection: rowDir,
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.successAlpha,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <UserIdentity
          name={buyerName}
          avatarUrl={buyerAvatarUrl}
          verified={buyerVerified}
          showAvatar
          size={28}
          nameSize={13}
          testID={`${testID}-buyer`}
        />
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, color: colors.success, fontWeight: "600", textAlign: isRtl ? "right" : "left" }}
        >
          {bannerTitle}
        </Text>
        <PriceTag price={amount} currency={currency} size="sm" />
      </View>

      {/* Button's default size already guarantees a >= 44pt tap target
          (button.tsx `getSizeStyle` default: `minHeight: 44`). */}
      <Button
        variant="default"
        onPress={onReserve}
        accessibilityRole="button"
        accessibilityLabel={reserveCta}
        testID={`${testID}-cta`}
      >
        <Text numberOfLines={1}>{reserveCta}</Text>
      </Button>
    </View>
  );
}

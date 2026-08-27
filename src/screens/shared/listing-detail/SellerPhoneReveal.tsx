/**
 * SellerPhoneReveal — gated phone-number reveal inside the seller card.
 *
 * Tap 1: reveals the masked number (auth-gated for guests).
 * Tap 2: opens the dialer via tel: Linking.
 *
 * Hidden when:
 *  - seller.phone is null / empty
 *  - the viewer owns the listing
 *  - the listing isn't contactable (see `isContactable`)
 *
 * SF-M3 (docs/SELL_FLOW_REDESIGN.md §4.2.1): renamed from `isActive` to
 * `isContactable` and widened at the call site to `active || reserved` — a
 * reserved listing is "still for sale, someone is first in line", not
 * unavailable, so the buyer can still call the seller the same way they can
 * still message them (`canContact` in ListingDetail.tsx). Only a genuinely
 * dead listing (sold, draft, removed) hides this control now.
 */

import React, { useState } from "react";
import { View, Linking, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Phone } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface SellerPhoneRevealProps {
  phone: string;
  isOwnListing: boolean;
  isContactable: boolean;
  authReturnTo: string;
}

export function SellerPhoneReveal({
  phone,
  isOwnListing,
  isContactable,
  authReturnTo,
}: SellerPhoneRevealProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const { requireAuth } = useRequireAuth();

  const [revealed, setRevealed] = useState(false);

  // Do not render at all when gating conditions aren't met
  if (!phone || isOwnListing || !isContactable) return null;

  const handleReveal = () => {
    requireAuth(() => setRevealed(true), authReturnTo);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${phone}`);
  };

  if (!revealed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onPress={handleReveal}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
          borderColor: colors.border,
          marginTop: 8,
        }}
      >
        <Phone size={14} color={colors.foreground} strokeWidth={2} />
        <Text style={{ fontSize: 13, color: colors.foreground }}>
          {t("listing.detail.showPhone")}
        </Text>
      </Button>
    );
  }

  // Revealed state — tapping the row opens the dialer
  return (
    <Pressable
      onPress={handleCall}
      accessibilityRole="button"
      accessibilityLabel={t("listing.detail.callSeller")}
      style={[
        {
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.primaryAlpha,
        },
      ]}
    >
      <Phone size={16} color={colors.primary} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 1 }}>
          {t("listing.detail.callSeller")}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.primary }}>
          {phone}
        </Text>
      </View>
    </Pressable>
  );
}

import { View } from "react-native";
import { Clock } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import type { Listing } from "@/api/listings";

interface ExpiryBadgeProps {
  expiresAt?: string | null;
  expired?: boolean;
  status: Listing["status"];
  // Below this many days remaining, the pill escalates to a warning treatment.
  expiringSoonDays?: number;
}

const MS_PER_DAY = 86_400_000;

// The ONE place listing-expiry display logic lives. A small pill — same
// geometry as StatusBadge — that proactively shows "Expires in N days" for an
// active listing, escalates to a warning under `expiringSoonDays`, and turns
// destructive once expired. Renders nothing for drafts/reserved/sold or when
// there is no expiry to show, so it's safe to drop on any seller surface.
// Never re-implement this inline — import this component.
export function ExpiryBadge({
  expiresAt,
  expired,
  status,
  expiringSoonDays = 3,
}: ExpiryBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { formatNumber } = useLocalization();

  // Only active listings have a live expiry clock (matches backend `expired?`).
  if (status !== "active") return null;

  const pill = (bg: string, fg: string, label: string) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
      accessibilityRole="text"
    >
      <Clock size={11} color={fg} />
      <Text style={{ color: fg, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  // Already expired (server flag) — destructive, paired with the Renew action.
  if (expired) {
    return pill(colors.destructiveAlpha, colors.destructive, t("listing.expiredBadge"));
  }

  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / MS_PER_DAY);
  if (Number.isNaN(days)) return null;

  // Timestamp is past but the server flag hasn't caught up yet — show expired.
  if (days <= 0) {
    return pill(colors.destructiveAlpha, colors.destructive, t("listing.expiredBadge"));
  }
  if (days === 1) {
    return pill(colors.warningAlpha, colors.warning, t("listing.expiresTomorrow"));
  }
  if (days <= expiringSoonDays) {
    return pill(colors.warningAlpha, colors.warning, t("listing.expiresInDays", { count: formatNumber(days) }));
  }
  return pill(colors.muted, colors.mutedForeground, t("listing.expiresInDays", { count: formatNumber(days) }));
}

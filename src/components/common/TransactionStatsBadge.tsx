/**
 * TransactionStatsBadge — quiet trust-signal row showing completed sales/
 * purchases sourced from the transactions table (TASK-TX02).
 *
 * Renders: Handshake icon + "N sold · N bought" (either half omitted when
 * its count is 0 — never a dangling "0 sold"/"0 bought").
 *
 * Guard rule: renders null when BOTH soldCount and boughtCount are 0/absent —
 * a brand-new account with no history shows nothing rather than "0 · 0".
 *
 * Used on the public seller profile trust dossier (near member-since +
 * response-rate) — mirrors the ResponseRateBadge suppression pattern so the
 * two badges read consistently as a family of trust signals.
 *
 * RTL: row direction flips via isRtl.
 * Dark mode: colors via useColors().
 * Numbers: locale-aware via useLocalization().formatNumber.
 */

import { View } from "react-native";
import { Handshake } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface TransactionStatsBadgeProps {
  soldCount: number | null | undefined;
  boughtCount: number | null | undefined;
}

export function TransactionStatsBadge({ soldCount, boughtCount }: TransactionStatsBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatNumber } = useLocalization();

  const sold = soldCount ?? 0;
  const bought = boughtCount ?? 0;

  // Nothing to show yet — suppress entirely rather than a "0 sold · 0 bought" row.
  if (sold <= 0 && bought <= 0) return null;

  const parts: string[] = [];
  if (sold > 0) parts.push(t("profile.transactionStats.sold", { count: formatNumber(sold) }));
  if (bought > 0) parts.push(t("profile.transactionStats.bought", { count: formatNumber(bought) }));
  const label = parts.join(" · ");

  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
      }}
    >
      <Handshake size={12} color={colors.mutedForeground} />
      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

/**
 * TransactionStatsBadge — trust-signal row showing completed sales/purchases
 * sourced from the transactions table (TASK-TX02).
 *
 * Renders: Handshake icon + "N sold · N bought" (either half omitted when
 * its count is 0 — never a dangling "0 sold"/"0 bought").
 *
 * Variants (TASK-TX02 review fix, MED — visual hierarchy):
 *   - "meta" (default) — quiet inline row, muted icon+text. Used wherever the
 *     badge sits alongside other quiet meta rows (e.g. recency).
 *   - "pill" — elevated rounded chip (muted background, primary-colored
 *     icon, semibold foreground text). Used in the CENTERED identity cluster
 *     right under RatingDisplay on the public profile, where the other trust
 *     signals already live — completed-sales-with-a-confirmed-counterparty
 *     is the strongest trust datum a stranger has in a no-payment
 *     marketplace, so it must not read as quieter than "Active Listings".
 *
 * Guard rule: renders null when BOTH soldCount and boughtCount are 0/absent —
 * a brand-new account with no history shows nothing rather than "0 · 0".
 *
 * Used on the public seller profile trust dossier (near member-since +
 * response-rate) — mirrors the ResponseRateBadge suppression pattern so the
 * two badges read consistently as a family of trust signals.
 *
 * RTL: row direction flips via isRtl; label text can shrink instead of
 * clipping (ps/fa translations run noticeably longer than English).
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
  variant?: "meta" | "pill";
}

export function TransactionStatsBadge({ soldCount, boughtCount, variant = "meta" }: TransactionStatsBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatNumber } = useLocalization();

  const sold = soldCount ?? 0;
  const bought = boughtCount ?? 0;

  // Nothing to show yet — suppress entirely rather than a "0 sold · 0 bought" row.
  if (sold <= 0 && bought <= 0) return null;

  // `count` is i18next's RESERVED interpolation key for plural-form selection
  // (key_one / key_other / …) — it must stay the raw NUMBER or pluralization
  // silently breaks the moment a translator adds plural variants (i18next
  // resolves the plural rule via Number(count) internally). The
  // locale-formatted string for DISPLAY goes through the separate `value`
  // key instead; the translation strings interpolate {{value}}, not
  // {{count}}. See profile.transactionStats.{sold,bought} in en/ps/fa.
  const parts: string[] = [];
  if (sold > 0) {
    parts.push(t("profile.transactionStats.sold", { count: sold, value: formatNumber(sold) }));
  }
  if (bought > 0) {
    parts.push(t("profile.transactionStats.bought", { count: bought, value: formatNumber(bought) }));
  }
  // Visual label uses " · " as a separator; the accessibility label instead
  // joins the two localized parts with ", " so a screen reader never reads
  // the raw middle-dot character out loud (review fix, LOW — a11y).
  const label = parts.join(" · ");
  const a11yLabel = parts.join(", ");

  const isPill = variant === "pill";

  return (
    <View
      testID="transaction-stats-badge"
      accessible
      accessibilityLabel={a11yLabel}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 4,
        ...(isPill
          ? {
              alignSelf: "center",
              backgroundColor: colors.muted,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }
          : { marginTop: 4 }),
      }}
    >
      <Handshake size={12} color={isPill ? colors.primary : colors.mutedForeground} />
      <Text
        className={isPill ? "text-xs font-semibold" : "text-xs"}
        style={{ color: isPill ? colors.foreground : colors.mutedForeground, flexShrink: 1 }}
      >
        {label}
      </Text>
    </View>
  );
}

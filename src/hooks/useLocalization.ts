import { useTranslation } from "react-i18next";
import { isRtlLanguage } from "@/i18n";

export function useLocalization() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const isRtl = isRtlLanguage(lang);

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(getLocale(lang), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(getLocale(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString(getLocale(lang), {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    return `${formatDateShort(date)} ${formatTime(date)}`;
  };

  /**
   * Returns just the abbreviated weekday name (Mon, Tue … / شنبه …) for the
   * given date, localised via the centralised getLocale() mapping.
   */
  const formatWeekday = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(getLocale(lang), { weekday: "short" });
  };

  /**
   * Smart relative timestamp used in conversation-list rows:
   *   • same calendar day  → time only  (e.g. "2:30 PM")
   *   • within last 7 days → weekday    (e.g. "Mon")
   *   • older             → short date  (e.g. "Jun 12")
   * Uses the centralised locale mapping — never duplicates getLocale().
   */
  const formatSmartTime = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d         = typeof date === "string" ? new Date(date) : date;
    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (d >= todayStart) return formatTime(d);
    const weekAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    if (d >= weekAgo)    return formatWeekday(d);
    return formatDateShort(d);
  };

  const formatCurrency = (amount: number | null | undefined, currency = "AFN"): string => {
    if (amount == null) return "";
    return new Intl.NumberFormat(getLocale(lang), {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value == null) return "";
    return new Intl.NumberFormat(getLocale(lang)).format(value);
  };

  return {
    formatDate,
    formatDateShort,
    formatTime,
    formatDateTime,
    formatWeekday,
    formatSmartTime,
    formatCurrency,
    formatNumber,
    isRtl,
    lang,
  };
}

function getLocale(lang: string): string {
  switch (lang) {
    case "ps": return "fa-AF";
    case "fa": return "fa-IR";
    default:   return "en-US";
  }
}

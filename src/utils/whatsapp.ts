/**
 * WhatsApp deep links for a seller's phone number.
 *
 * Owner request, 2026-09-02: "we have call seller but we should have whatsapp
 * option also… and both android and phone should work".
 *
 * WHY https://wa.me AND NOT whatsapp://
 *
 * `whatsapp://send?phone=…` requires the scheme to be declared in iOS's
 * `LSApplicationQueriesSchemes` before `canOpenURL` will even admit it exists,
 * and a missing entry fails silently — the tap does nothing, on the platform
 * where it is hardest to notice. `https://wa.me/<number>` needs no declaration
 * on either platform: WhatsApp claims it as a universal/app link when installed,
 * and it opens the web fallback when it is not. One URL, both platforms, no
 * native config.
 *
 * THE NUMBER FORMAT IS THE PART THAT BREAKS
 *
 * wa.me accepts digits ONLY — no `+`, no spaces, no dashes, no parentheses — and
 * it must be the full international number. Afghan sellers write their numbers
 * every one of these ways:
 *
 *   +93 70 000 0001   →  93700000001
 *   0093700000001     →  93700000001   (00 international prefix)
 *   0700000001        →  93700000001   (national form, leading 0 dropped)
 *   700000001         →  93700000001   (bare subscriber number)
 *
 * A wrong number here opens a WhatsApp chat with a stranger, so this normalises
 * rather than trusting the stored string.
 */

/** Afghanistan. The only country this marketplace serves. */
export const DEFAULT_COUNTRY_CODE = "93";

/**
 * Digits-only international number, or null when there is nothing usable.
 *
 * Exported for tests and for anything else that needs the canonical form.
 */
export function normalizePhoneForWhatsApp(
  phone: string | null | undefined,
  countryCode: string = DEFAULT_COUNTRY_CODE
): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // "00" is the international access prefix — strip it before anything else, or
  // "0093…" would be read as a national number starting with 0.
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith(countryCode)) {
    // Already international.
  } else if (digits.startsWith("0")) {
    // National form: the trunk 0 is replaced by the country code.
    digits = countryCode + digits.replace(/^0+/, "");
  } else {
    // Bare subscriber number.
    digits = countryCode + digits;
  }

  // Afghan mobile numbers are 9 digits after the country code, so a plausible
  // full number is 11 digits. Anything much shorter cannot be dialled and
  // anything much longer is not a phone number — better to render no button than
  // one that opens a chat with the wrong person.
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** The URL to open, or null when the number is unusable. */
export function whatsappUrl(
  phone: string | null | undefined,
  countryCode: string = DEFAULT_COUNTRY_CODE
): string | null {
  const digits = normalizePhoneForWhatsApp(phone, countryCode);
  return digits ? `https://wa.me/${digits}` : null;
}

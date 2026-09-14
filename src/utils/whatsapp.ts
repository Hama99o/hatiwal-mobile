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

/**
 * Afghanistan — the fallback when a number gives no clue which country it is.
 *
 * It is NOT "the only country this marketplace serves" any more, which is what
 * this constant used to say and what the logic below used to assume.
 */
export const DEFAULT_COUNTRY_CODE = "93";

/**
 * Dial codes for the whole service area, longest-first so a prefix test is
 * unambiguous.
 *
 * WHY THIS EXISTS: the old logic asked only "does this start with 93?" and
 * prepended 93 to everything else. A seller who wrote their number in correct
 * international form outside Afghanistan therefore had their country code
 * treated as a subscriber number:
 *
 *   +92 300 1234567  ->  923001234567  ->  no leading 0, not 93 ->  93 + it
 *                    ->  93923001234567   (a wa.me link to a stranger)
 *
 * That is precisely the outcome the header comment says this file exists to
 * prevent, and it hit exactly the sellers the service area was widened for.
 *
 * These are internal routing values. No country name is derived from them and
 * none is ever rendered — same rule as the province list.
 */
const SERVICE_AREA_DIAL_CODES = ["93", "92", "98"] as const;

/** A number already carrying one of our dial codes, at a plausible length. */
function isAlreadyInternational(digits: string): boolean {
  return (
    digits.length >= 10 &&
    SERVICE_AREA_DIAL_CODES.some((code) => digits.startsWith(code))
  );
}

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

  if (isAlreadyInternational(digits)) {
    // Already international — for ANY country in the service area, not just the
    // one `countryCode` happens to name. Length-gated so a bare 9-digit
    // subscriber number that merely opens with those digits is not mistaken for
    // a country code.
  } else if (digits.startsWith("0")) {
    // National form: the trunk 0 is replaced by the country code.
    digits = countryCode + digits.replace(/^0+/, "");
  } else {
    // Bare subscriber number.
    digits = countryCode + digits;
  }

  // Afghan mobile numbers are 9 digits after the country code and Pakistani ones
  // are 10, so a plausible full number is 11-12 digits. Anything much shorter
  // cannot be dialled and anything much longer is not a phone number — better to
  // render no button than one that opens a chat with the wrong person.
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

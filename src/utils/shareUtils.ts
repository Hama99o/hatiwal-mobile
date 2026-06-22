/**
 * shareUtils — pure helpers for building shareable listing URLs and bodies.
 *
 * Keeping this logic outside the screen component makes it independently
 * testable without mounting a React component.
 */

/**
 * Returns the URL to include in the share sheet for a given listing.
 *
 * Priority:
 *  1. `shareUrl` from the server (an https canonical URL when
 *     PUBLIC_SHARE_BASE_URL is configured on the backend)
 *  2. A `hatiwal://listing/<id>` deep link built via the provided fallback
 *     function (Linking.createURL from expo-linking)
 *
 * The fallback is passed as a parameter so this function is pure and can
 * be unit-tested without importing expo-linking.
 */
export function resolveShareUrl(
  shareUrl: string | null | undefined,
  listingId: number,
  createUrl: (path: string) => string
): string {
  if (shareUrl) return shareUrl;
  // createURL("listing/123") with scheme "hatiwal" → "hatiwal://listing/123"
  return createUrl(`listing/${listingId}`);
}

/**
 * Builds the text body for the native share sheet.
 *
 * The shape mirrors the `listing.share.body` i18n template used in the screen:
 *   "{{title}} — {{price}}\n{{url}}"
 *
 * The function is kept pure so it can be unit-tested without i18n or React.
 * The screen passes this body as `message` to Share.share().
 */
export function buildShareBody(title: string, price: string, url: string): string {
  return `${title} — ${price}\n${url}`;
}

/**
 * Returns the URL to include in the share sheet for a given seller profile.
 *
 * Priority:
 *  1. `shareUrl` from the server (an https canonical URL when
 *     PUBLIC_SHARE_BASE_URL is configured on the backend)
 *  2. A `hatiwal://seller/<id>` deep link built via the provided fallback
 *     function (Linking.createURL from expo-linking)
 *
 * The fallback is passed as a parameter so this function is pure and can
 * be unit-tested without importing expo-linking.
 */
export function resolveProfileShareUrl(
  shareUrl: string | null | undefined,
  userId: number,
  createUrl: (path: string) => string
): string {
  if (shareUrl) return shareUrl;
  // createURL("seller/42") with scheme "hatiwal" → "hatiwal://seller/42"
  return createUrl(`seller/${userId}`);
}

/**
 * Builds the text body for the native share sheet for a seller profile.
 *
 * The shape mirrors the `sellerProfile.share.body` i18n template:
 *   "{{name}}\n{{url}}"
 *
 * The function is kept pure so it can be unit-tested without i18n or React.
 * The screen passes this body as `message` to Share.share().
 */
export function buildProfileShareBody(name: string, url: string): string {
  return `${name}\n${url}`;
}

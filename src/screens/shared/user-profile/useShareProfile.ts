import { useCallback } from "react";
import { Platform, Share } from "react-native";
import { useTranslation } from "react-i18next";
import * as Linking from "expo-linking";
import { toast } from "@/lib/toast";
import { apiErrorMessage } from "@/utils/apiError";
import { resolveProfileShareUrl } from "@/utils/shareUtils";

/** What a profile share needs: the server's https share URL and the name. */
export interface ShareableProfile {
  name: string;
  shareUrl?: string | null;
}

/**
 * The ONE implementation of "share a profile", used by someone else's profile
 * (UserProfile ⋯ menu) AND by your own Profile tab ("Share my profile").
 *
 * The text is `profile.sellerProfile.share.body` — "<invite line>\n<url>" — and
 * the url is the server's https `shareUrl` (https://hatiwal.com/u/<id>), so a
 * chat app shows a tappable link; `hatiwal://seller/<id>` is only the fallback
 * for a backend without PUBLIC_SHARE_BASE_URL.
 *
 * Returns `share(profile)`: the profile is passed at call time so a caller can
 * load it first (the Profile tab fetches the user's PUBLIC profile on tap).
 * A dismissal RESOLVES Share.share and never reaches the catch, so anything
 * caught is a real failure and is shown — never swallowed.
 */
export function useShareProfile(userId: number) {
  const { t } = useTranslation();

  return useCallback(
    async (profile: ShareableProfile) => {
      try {
        const url = resolveProfileShareUrl(profile.shareUrl, userId, (path) =>
          Linking.createURL(path)
        );
        const message = t("profile.sellerProfile.share.body", { name: profile.name, url });
        // iOS: `message` already embeds the url; passing `url` too makes some
        // targets show the link twice or drop the body. Android gets both.
        await Share.share(
          Platform.OS === "ios"
            ? { title: t("profile.sellerProfile.share.title"), message }
            : { title: t("profile.sellerProfile.share.title"), message, url }
        );
      } catch (err) {
        toast.error(apiErrorMessage(err, t));
      }
    },
    [userId, t]
  );
}

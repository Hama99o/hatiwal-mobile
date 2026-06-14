/**
 * RemoteImage — thin wrapper over expo-image's <Image> for remote photos.
 *
 * Centralizes the defaults that were copy-pasted across every listing photo:
 * the blurhash placeholder, `contentFit="cover"`, and a fade transition. Call
 * sites pass just a `uri`; everything stays overridable and all other
 * expo-image props (style, onLoad, cachePolicy, accessibilityLabel, …) pass
 * straight through.
 *
 *   <RemoteImage uri={listing.thumbnailUrl} style={styles.image} />
 *   <RemoteImage uri={photo} contentFit="contain" transition={300} />
 *
 * - `uri` null/undefined → renders the blurhash as an empty placeholder tile.
 * - `blurhash={false}` → no placeholder (e.g. avatars that draw initials).
 */
import { Image, type ImageProps } from "expo-image";
import { LISTING_BLURHASH } from "@/constants/images";

export interface RemoteImageProps extends Omit<ImageProps, "source" | "placeholder"> {
  uri?: string | null;
  /** Placeholder blurhash. Defaults to the shared listing blurhash; pass `false` to disable. */
  blurhash?: string | false;
}

export function RemoteImage({
  uri,
  blurhash = LISTING_BLURHASH,
  contentFit = "cover",
  transition = 250,
  ...rest
}: RemoteImageProps) {
  return (
    <Image
      source={uri ? { uri } : undefined}
      placeholder={blurhash ? { blurhash } : undefined}
      contentFit={contentFit}
      transition={transition}
      {...rest}
    />
  );
}

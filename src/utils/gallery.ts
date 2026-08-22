/**
 * galleryHeight — the ONE rule for how tall a listing's photo hero is.
 *
 * WHY THIS IS SHARED AND NOT INLINED
 *
 * Three places size the hero, and they MUST agree: ListingGallery (the photos
 * themselves), ListingDetail (an animated wrapper that collapses the hero as you
 * scroll), and DetailSkeleton (the loading placeholder, whose whole job is to
 * not shift the layout). They each carried their own copy of `width * 3/4`, and
 * fixing one of them moved the bug instead of removing it: capping the gallery
 * left ListingDetail's wrapper at its old height, so the photo shrank while the
 * space it occupied did not, and the entire screen below it — title, price,
 * stock pill, description, seller — was pushed off-screen and never rendered.
 * On a landscape tablet the detail screen was a blank rectangle with an action
 * bar (run-060). One exported function so that cannot happen again.
 *
 * WHY IT IS CAPPED BY HEIGHT
 *
 * Width alone is the wrong input. `width / (4/3)` is 960dp on a 1280dp-wide
 * landscape tablet, taller than the 800dp viewport, so the hero alone overflows
 * the screen and nothing else is reachable.
 *
 * The cap NEVER binds on a phone: 411dp / (4/3) = 308dp, far under 60% of an
 * 890dp-tall viewport. Phones and portrait tablets keep exactly the look they
 * have today; only the case that would eat the screen is clamped.
 */

export const GALLERY_ASPECT_RATIO = 4 / 3;

/** Most of the viewport the hero may ever occupy, leaving room for the title. */
export const GALLERY_MAX_VIEWPORT_FRACTION = 0.6;

export function galleryHeight(
  windowWidth: number,
  windowHeight: number,
  aspectRatio: number = GALLERY_ASPECT_RATIO
): number {
  return Math.min(windowWidth / aspectRatio, windowHeight * GALLERY_MAX_VIEWPORT_FRACTION);
}

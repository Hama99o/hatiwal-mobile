# Listing cards: grid and list (2026-10-02)

**Problem (owner, with screenshots):** too much empty space in the cards. Grid
cards had a 26dp badge row reserved under the price that was empty on almost
every listing, plus a title box fixed at two lines, so "AFN 850 / (blank) / Bb"
read as a mostly empty dark panel. List rows put a 108×81 photo in a row at
least 96 tall, leaving a strip under every photo.

## What real marketplaces do (Mobbin, checked 2026-10-02)

Grid: Depop https://mobbin.com/screens/e9f88afb-4fae-4358-b397-2761e15ed39a ·
Nextdoor https://mobbin.com/screens/bb8d5025-1a40-4a15-9e18-03e0ea60cdd9 ·
Vestiaire https://mobbin.com/screens/aec7ccd2-6796-43c4-b09b-baa8243a83d4

- No box around the card; the rounded photo is the card.
- The photo is square or close to it.
- Tight text directly under it: price, a 1-line title, one small meta line.

List: eBay https://mobbin.com/screens/769bae72-6710-48f9-857f-92bf66c2d6b8 ·
Whatnot https://mobbin.com/screens/05897ad2-3a6b-4629-a10e-cbda8730e48a ·
Deliveroo https://mobbin.com/screens/f80ff1d6-36d5-4a08-8024-55ed0adbccd7

- A rounded square thumbnail that fills the row's full height.
- The text beside it, vertically centred.
- No box around the row.

## What changed (ListingCard + ListingCardSkeleton)

| | Before | After |
|---|---|---|
| Grid box | 1dp border + card background | none, rounded 12dp photo |
| Grid photo | 4:3 | 1:1 |
| Grid body | price · empty 26dp badge row · 2-line title (36dp) · meta | price row 24dp (firm chip inline) · 1-line title 18dp · meta 16dp |
| Saved price-drop badge | body badge row | photo corner (same corner as the percent badge; they were already exclusive) |
| List photo | 108×81 in a ≥96dp row | 96×96, rounded 10dp, fills the row |
| List box | bordered card | none |

Every grid row keeps a fixed height, because FlashList's numColumns has no
`columnWrapperStyle`, so neighbours must be equally tall. None of those rows is
reserved empty any more.

## Follow-up the same day: soft surface

On the phone (dark mode) the borderless card did not group well: the owner
could not tell whether a title belonged to the photo above it or the one
below, even with a 24dp row gap. He chose a **soft surface**: photo and text
on one slightly lighter rounded panel (`colors.card`), still **no border**,
text 8dp under the photo with 10dp side and bottom padding. The row gap is
back to 12dp, because the panel now does the grouping. List rows got the same
panel, with 8dp padding around the 96dp photo.

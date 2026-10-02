# Next mobile release (after 1.1.4)

**Cadence:** one store release a week (owner, 2026-10-02). Fixes land on
`main` (tested, pushed) during the week. No version bump and no store build
until the weekly release is called. Then rename this file to `RELEASE_<version>.md`.

## Changes so far

| Change | Why | Commit |
|---|---|---|
| **Map opens where the user is.** Order: saved pin → GPS (only if location is already permitted; never prompts) → the user's **profile address** (their map point, else their province capital, else the province named as their city) → Kabul last. Applies to every `LocationRangePicker`: new/edit listing, the Bazaar area filter, the profile location, the meetup place. | A seller in Herat without GPS permission got a Kabul pin; the profile address was never used. | see `git log -- src/lib/mapDefaults.ts` |

## Server-side, not part of the app build

- Map v2 (new design, hillshade, more labels): `map.hatiwal.com`, swapped when QA passes. No app update needed.
- Welcome message: switch `WELCOME_SUPPORT_MESSAGE` on once 1.1.4 is live on both stores (`RELEASE_1.1.4.md` §4).

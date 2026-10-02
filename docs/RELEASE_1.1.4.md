# Release 1.1.4: what changed, and the deploy order

**Written 2026-10-02.** Covers everything on `main` since the last store build
(iOS 1.1.0, build 18). **1.1.4 is feature-frozen**: nothing new goes in. After
QA passes, the release builds are made for both stores.

> `app.json` still says `1.1.2` (from `9dc099d`). Set it to **1.1.4** for both
> platforms when making the release builds.

---

## 1. Deploy order: read this first

| Part | Status | Rule |
|---|---|---|
| **Web** (hatiwal.com) | ✅ **Deployed** 2026-10-02 (`1680375`, verified-badge redesign) | Can be deployed any time. |
| **API** (api.hatiwal.com) | ✅ **Safe to deploy** | The held commits are admin-only, plus the welcome, which is **off** in production (see §4). Nothing the apps call changed. |
| **Mobile** | ⏳ Waiting for QA, then build | iOS → App Store upload. Android → a Play bundle built **locally**, which the owner uploads. |
| Welcome message (in the API) | ⛔ **Off** in production | Sent only when `WELCOME_SUPPORT_MESSAGE=true`. Turn on only after 1.1.4 is live on both stores (§4). |

Pushed to GitHub ≠ deployed. All three repos are pushed; the web is live. The API
can be deployed now: with `WELCOME_SUPPORT_MESSAGE` unset, sign-up behaves exactly
as before, and nothing is even queued.

---

## 2. What users will notice (mobile)

**Listing cards (Bazaar, My Shop, Saved, profiles), redesigned.** The owner
reported "too much empty space" in the cards. The pattern was checked on Mobbin
(Depop, Nextdoor, Vestiaire, eBay, Whatnot, Deliveroo); details are in
[design/LISTING_CARDS.md](design/LISTING_CARDS.md).
- Grid: a square photo on one soft rounded panel, with no border and no empty
  rows.
  - Price, with "Firm price" inline.
  - A one-line title.
  - A meta line such as **"2d · 10th District, Kabul"**: the listing's age
    first, with the repeated city removed.
- List: a 96dp rounded photo that fills the row (the strip under the photo is
  gone), on the same panel.
- Rows were sometimes **invisible** mid-list (entering animation clashing with
  press feedback on Reanimated 4.5). Fixed.

**Grid ↔ list switch.**
- Before, a tap seemed dead, then it switched, or flipped back on a second tap.
  Every tap re-downloaded the whole list.
- Now it never re-downloads. The button changes at once, the list dims with a
  spinner while it re-lays out, and the cards don't replay their fade-in.

**Language and dark/light mode.** One shared "applying change" system:
- A full-screen overlay with a spinner appears the moment you tap ("Changing
  language…", written in the language being switched to; "Applying theme…").
- Repeat taps are ignored.
- Tapping the option that's already active does nothing.

**Chips** (Bazaar categories; Messages All/Unread/Read/Buying/Selling). Selected
chips looked blurry on iPhone. Chips no longer animate their size: selection is
shown by colour, and a tap gives a slight fade.
> ⚠️ Not yet confirmed on an iPhone. The owner is checking on his phone.

**From the 1.1.2 work, also in this release:**
- Contact Support: a permanent row in Messages and an entry in Profile.
- Push notifications on Android (Firebase).
- Embedded brand fonts: Pashto labels no longer lose words.
- RTL fixes: send icon, Support label.
- Inbox fixes: no stuck band, no duplicate rows.
- The app sends `X-App-Version` / `X-App-Platform`.
- A seller signed out by an expired session no longer becomes a guest with the
  seller tab bar.
- Android haptics no longer crash.

---

## 3. What changed underneath (for the next developer)

| Area | Change | Commit |
|---|---|---|
| `UniversalList` | New `layoutKey`: remounts the FlashList layout without dropping data. `id` keys the **data** only. | `f140bad` |
| `ListingFeed` | View mode → `layoutKey`, never `id`. `useDeferredValue(viewMode)` so the tap is never blocked. Switching indicator while `viewMode !== layoutMode`. No entrance replay on re-arrange. | `f140bad` `c3c8e85` `ccc0d9c` |
| Browse / MyListings / UserProfile | Removed `viewMode` from their feed ids (it caused the refetch). | `f140bad` |
| `ListingCard` | New layout (above). Entering animation on a wrapper, press scale on an inner view. | `bb477ac` `e4b7163` `9c2b4e6` `30627f0` |
| `src/lib/listingMeta.ts` | `shortLocation()`, `agoParts()`, with tests. New `listing.card.ago.*` strings in en/ps/fa/ur. | `30627f0` |
| `src/stores/appTransition.store.ts` + `AppTransitionOverlay` | `runAppTransition(message, work)`: overlay, one paint, work, single-flight, always hides. Mounted in `app/_layout.tsx`. `setTheme` is now awaitable. `common.appChange.*` strings. | `e57f35a` `8538046` |
| `AnimatedPressable` | `pressFeedback: "scale" \| "opacity"`. Chips use `"opacity"`, so they get no transform at all. | `ccc0d9c` |
| Tests | One old test **required** a refetch on toggle; it now requires the opposite. | `f140bad` |

**Expo SDK 57** sits on a separate branch, `sdk-57` (worktree
`../hatiwal-mobile-sdk57`).
- React Native 0.86, React 19.2, expo-router 57.
- Typecheck is clean, and all Jest tests passed when it was made; today's
  commits were cherry-picked onto it.
- **Not merged and not in 1.1.4.** The owner's Expo Go (SDK 57) runs from it.
- Merging it is a decision for after 1.1.4.

**Typecheck on `main` is broken locally.** `node_modules` has TypeScript 5.3,
which can't read Expo's tsconfig. Run the typecheck in the `sdk-57` worktree
until `main`'s `node_modules` is refreshed. It caught one real crash today
(`8538046`).

---

## 4. API changes (hatiwal-api, pushed, safe to deploy)

| Commit | What |
|---|---|
| `5cd5b74` | Admin: `ad-` CSS prefix renamed to `hw-` (ad blockers hid `.ad-card`). |
| `f5e1fed` | Admin Messages: read every sent message in full. |
| `ba6cd39` | Admin: no empty email table on an in-app bulk; the Edit button wraps on phones. |
| `26816da` | **Welcome message**: a new account gets one message from Hatiwal Support, in its language. |
| `6763ac1` | The welcome is **off by default** (`WELCOME_SUPPORT_MESSAGE`). |

**Turning the welcome on (only after 1.1.4 is live on both stores):**
1. Add `WELCOME_SUPPORT_MESSAGE=true` to `hatiwal-api/.env.production`.
2. Add the matching line to `.kamal/secrets`.
3. Add it to `config/deploy.yml` under `env.secret`.
4. Deploy the API.

The variable is deliberately absent from all three today, so no deploy can turn
it on by accident. Local `hatiwal-api/.env` has it on for QA.

Only change outside the welcome: an admin route, `admin/messages#show` (read one
sent message). The apps call nothing new.

Full RSpec: 2058/0. RuboCop clean.

---

## 5. Still open (decisions for the owner)

- **Android vibration.** `android.permission.VIBRATE` is blocked in `app.json`,
  so Android haptics do nothing. Unblocking it is the owner's call.
- **UI-053.** The Messages chip-row "more" chevron is on the wrong side in RTL.
  Cosmetic; to be checked on an iPhone.
- **Blurry chips on iPhone.** The fix is in, but not yet confirmed on a device.
- **QA.** hatiwal-36 is running device QA on all of the above. Results go to
  `qa/evidence/qa-cards-2026-10-02/SUMMARY.md`.

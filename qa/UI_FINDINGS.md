# Hatiwal Mobile — UI / UX Findings

Every visual and interaction defect found while running the QA rig. Maestro can
only tell us whether an element **exists**; it cannot tell us whether a screen is
**good**. So every flow leaves a screenshot at
`qa/reports/run-00N/<feature>/screens/<flow>.png`, and those screenshots get
**looked at**, not just collected.

**The standard:** a flow that passes its assertions can still be a bad screen. A
clipped control, a truncated label, a message that names the wrong problem — all
of those are defects and all of them belong here. Finding them is the reviewer's
job, not the owner's.

Status: `OPEN` · `FIXED` · `VERIFYING` (fix in, awaiting a re-run) · `WONTFIX` (with reason)

---

## FIXED

### UI-001 · Review nudge: the chevron was clipped in half
**Where:** Profile → "Rate your recent deals" row
**Severity:** medium — the only affordance telling the user the row is tappable

The row used `justifyContent: "space-between"` with an unconstrained
`UserIdentity`, so a long listing title ("Xiaomi Redmi Note 11 128GB") grew the
row and pushed `ChevronRight` past the card's `overflow: "hidden"` edge. The
control was sliced vertically at the card border.

**Fix:** wrapped `UserIdentity` in `flex: 1` so the text block shrinks instead of
the row growing, and gave the chevron `flexShrink: 0` so the affordance is never
the thing squeezed out. `src/screens/shared/profile/PendingReviewsNudge.tsx`

### UI-002 · A too-high price told the user the opposite of the problem
**Where:** Create/edit listing → Price
**Severity:** high — sent the user to fix the wrong field

The form rendered one message for every price error, so an over-large price read
*"Enter a valid price greater than 0"*. Now shows a distinct `priceTooHigh` in
en/ps/fa. See also the API side: `Listing::MAX_PRICE`.

### UI-003 · Every failed action said only the word "Error"
**Where:** 14 sites, incl. the whole listing lifecycle (publish/reserve/sold/renew/delete)
**Severity:** high — this is the "it failed but I don't know from where" class

The API already answers with a usable sentence
(`{"errors":["Price must be less than or equal to 9999999999.99"]}`) and the app
discarded it, showing `t("common.error")` — literally `Error` / `تیروتنه` / `خطا`.
Two handlers used `catch { }` with no binding, throwing the error object away.

**Fix:** `src/utils/apiError.ts` prefers the server's own words, and separates
bad input / no connection / our fault. Wired into all 14 sites.

### UI-004 · Sign-in and sign-up were needlessly hard to complete
**Where:** Login, Register
**Severity:** medium — friction on the two screens every single user must pass

Three separate gaps, all on the app's first-impression screens:

- **No way to reveal a typed password.** One mistyped character meant retyping
  blind. Fixed with a shared `PasswordInput` (reveal toggle, 44×44 target,
  RTL-aware, screen-reader labelled).
- **No autofill.** No `autoComplete` / `textContentType`, so Android autofill and
  the iOS keychain never offered a saved credential — every sign-in typed by hand.
- **No keyboard navigation.** No `returnKeyType` / `onSubmitEditing`, so the
  keyboard could neither advance to the next field nor submit. On Register that
  is six fields the user had to dismiss the keyboard and tap between.

Email fields also lacked `autoCorrect={false}` — autocorrect silently rewriting
an address produces a login failure with no visible cause.

### UI-008 · "1 Items Bought" — the stat labels never pluralized
**Where:** Profile → stats card (buyer)
**Severity:** medium — every buyer with exactly one purchase sees broken grammar
**Evidence:** profile tour, mid-scroll

`Profile.tsx` rendered the labels as static strings — `t("profile.itemsBought")`
— with no count, so a buyer with one item read **"1 Items Bought"**. The app
already uses i18next plurals elsewhere (`categories.itemCount_one/_other`), so
the mechanism existed and simply was not applied here.

**Fix:** `itemsBought_one/_other` and `itemsSaved_one/_other` in **en/ps/fa**, and
the count is now passed at the call site. The seller labels ("Sold", "Active")
are adjectives and correctly need no plural form.

### UI-009 · One row in the Privacy card looked like a web link
**Where:** Profile → PRIVACY → Privacy Policy
**Severity:** low — visual inconsistency on a legally-required row

Blocked Users and My Reports use `colors.foreground` with no underline. Privacy
Policy — same card, same row layout, same chevron — was `mutedForeground` **and**
underlined, so one row of three read as de-emphasised and web-like. The chevron
already communicates that it navigates.

**Fix:** matched its siblings; underline removed.

### UI-010 · "Delete account" was likely below the contrast floor
**Where:** Profile → bottom
**Severity:** medium — accessibility, on an action users have a right to find

The label combined `colors.mutedForeground` with `opacity: 0.6` at 12px. Muted
text at 60% opacity is very unlikely to clear 4.5:1 on the light background.
Account deletion has to remain discoverable (Play policy, GDPR), so it must be
legible even while being deliberately quiet.

**Fix:** dropped the extra opacity. Still small, muted and underlined — quiet,
but readable.

### UI-012 · A long message could only fail at send time
**Where:** Chat composer (both the new-conversation and in-thread composers)
**Severity:** medium — same class as the price bug, found by looking for it
**Found by:** writing edge-case flows rather than by a failing happy path

`hatiwal-api` enforces `validates :body, length: { maximum: 1000 }`. The composer
enforced nothing — no `maxLength`. So a user could type 2000 characters, tap
Send, and lose it to a 422 that nothing on screen had warned about. Before the
`apiErrorMessage` work they would have seen only the word "Error".

**Fix:** `maxLength={MESSAGE_MAX_LENGTH}` on both composers, with the constant in
its own module (`src/screens/chat/messageLimits.ts`) so the two composers cannot
drift from each other.

The real long-term risk is the two limits drifting, so
`src/screens/chat/__tests__/messageLength.contract.test.ts` **reads the Rails
model** and fails if client and server disagree — rather than restating 1000 and
hoping. (It skips, loudly, if the API repo is not checked out, so it can never be
a false red.)

---

## OPEN

### UI-011 · Content collides with the status bar while scrolling
**Where:** Profile (and likely every long scroll view)
**Severity:** low — cosmetic, but visible on every scroll of the page
**Evidence:** profile tour, screenshots 2 and 3

Scrolling the profile draws card content directly under the status bar, so
"PERSONAL INFO" / "Edit" and the stats row overlap the clock and signal icons.
Text-on-text is never intended, though this is also ordinary edge-to-edge Android
behaviour rather than a broken layout — which is why it is logged rather than
fixed blind. The usual remedy is a scrim or fade behind the status-bar inset, and
it is a design call about how the app wants edge-to-edge to look.

### UI-005 · Bottom tab label truncated to "Categor…"
**Where:** Bottom tab bar, English
**Severity:** low-medium — visible on every screen of the app
**Evidence:** `qa/reports/run-011/auth/screens/login.png`

With five tabs (Bazaar · Categories · Saved · Chats · Me) the Categories label
does not fit and renders as `Categor…`. It is the most-seen surface in the app,
so a visible ellipsis reads as unfinished. Needs a decision rather than a blind
fix — shorter copy, smaller label type, or letting the label wrap/scale:

- shortest copy fix: use a shorter word for this tab in all 3 locales
- layout fix: reduce `tabBarLabel` font size or allow `adjustsFontSizeToFit`

RTL locales must be re-checked after: Pashto/Dari labels differ in length.

### UI-007 · Changing language raises a console error, and the default language contradicts the spec
**Where:** any language switch (onboarding language chips, Profile → language)
**Severity:** medium — reproducible on every switch
**Evidence:** `qa/reports/run-011/*`, and reproduced directly via `maestro/_helpers/open_bundle.yaml`

Two separate things, found together:

**a) The red box.** Switching language calls `reloadApp()`
(`src/lib/reloadApp.ts` → react-native-restart) so the tree re-lays-out for RTL.
In a debug build that remount reliably produces:

> Console Error — Looks like you have configured linking in multiple places…
> You don't have multiple NavigationContainers in the app each with 'linking' enabled

The app's own code is clean: no `NavigationContainer` anywhere, no `linking=`
prop, a single root `Stack` in `app/_layout.tsx`. So this looks like two
`ContextNavigator`s briefly co-existing across the restart rather than a
misconfiguration. LogBox does not exist in a release build, so a user very likely
never sees it — but it is worth confirming the restart is clean rather than
assuming, because it fires on a path every multilingual user takes.

**b) The default language is `ps`, not English.** `CLAUDE.md` states English is
the default, and every Maestro flow asserts English copy. But after
`clearState` the app comes up in **Pashto**: `.env` carries
`EXPO_PUBLIC_DEFAULT_LANG=ps`, which overrides the `en` set in
`docker-compose.yml`. Either the spec or the env is wrong — an owner decision,
not something to silently "fix".

Consequence for QA: the rig has to switch to English on nearly every flow, which
is what triggers (a). Setting the default to `en` would remove both costs.

### UI-006 · Avatar initial in the review nudge — CLOSED, not a defect
**Where:** Profile → "Rate your recent deals" → the circular avatar
**Severity:** none
**Evidence:** `qa/reports/run-011/auth/screens/login.png`

**Resolved — not a defect.** `UserAvatar.tsx:21` derives it as
`name?.charAt(0)?.toUpperCase() ?? "?"`, so "Omar Noori" yields the letter **O**.
It only reads like a zero in this typeface at that size.

### UI-008 · A mistyped quantity silently sold the seller's ENTIRE batch — FIXED
**Where:** Seller → any multi-unit listing → More → Mark as Sold → "How many did you sell?"
**Severity:** HIGH — destroys the seller's remaining stock, unrecoverable
**Evidence:** `qa/reports/run-018/` · confirmed in the DB, not inferred

The field is pre-filled with the whole remainder (15) so that "I sold the lot"
costs no typing. But a tap only places a caret: typing `3` produced **`153`**,
which the client clamp turned into **15**, and the listing sold out and retired.

Measured, not theorised — after typing `3`:

```
LISTING: qty=15 sold_units=15 available=0 status=sold
txn #13 quantity=15
```

For an app with no payment step and no undo, one mistyped digit destroyed a
seller's remaining inventory and de-listed it. The clamp made it worse by being
silent: nothing on screen said the number sent was not the number typed.

**Fixed** in `BuyerPickerSheet.tsx`:
- `selectTextOnFocus` — tapping selects the pre-filled value, so typing REPLACES
  it. This is the only sane behaviour for a pre-filled numeric field.
- the "N available" hint turns **destructive** when the typed count exceeds the
  stock. Confirm is still allowed (it clamps, and so does the API — refusing
  would strand a seller whose stock moved mid-sheet), but the mismatch is now
  visible instead of silent.

The identical shape existed in the web dialog (`sell-buyer-dialog.tsx`,
pre-filled `<input type="number">`); fixed there in the same pass with
`onFocus={e => e.currentTarget.select()}` rather than waiting for it to be
reported.

Re-run: `run-020` PASS — typed 3, recorded 3, listing stayed **active with 12
left and still browsable**.

### UI-009 · "15 of 15 left" before the first sale — FIXED
**Where:** Seller → multi-unit listing detail → stock pill
**Severity:** low (wording)
**Evidence:** `qa/reports/run-017/seller/screens/multi_quantity_partial_sale.png`

The owner phrasing is "N of M left" so a seller can see progress through a
batch. On a listing nobody has bought from that renders **"15 of 15 left"** —
literally true, but the second number just repeats the first and there is no
progress to show.

**Fixed:** `hasSoldSome()` in `src/utils/stock.ts` — the owner sees the plain
"15 in stock" until the first sale, and "12 of 15 left" once the count means
something. Lives in the shared module so the web client inherits the same rule.

### UI-010 · The warning strip at the bottom on every launch — one of three FIXED
**Where:** every app launch, dev build — the collapsed yellow LogBox bar
**Severity:** medium. The bar itself is dev-only (LogBox does not exist in a
release build), but one of the three causes is a genuine animation defect that
ships.
**Evidence:** logcat on a clean launch, before/after

Three Reanimated warnings fire on launch. They are what the strip reports, and
they are three separate things — worth separating rather than dismissing as one
piece of noise:

**a) `Property "opacity" of AnimatedComponent(View) may be overwritten by a
layout animation` — REAL, FIXED.**
`ListingCard` put an animated `opacity` (press feedback) and an `entering`
layout animation on the SAME shadow node. Reanimated's layout animation owns
opacity to fade the card in, so the two fought: the fade can fail to play, or
settle at the pressed opacity. That ships — it is not just a warning.
`AnimatedPressable` had already hit and solved the identical clash; ListingCard
now uses the same pattern (when `entering` is active the layout animation owns
opacity and press feedback is expressed as SCALE, which does not conflict — so
touch feedback survives on iOS too, where there is no android_ripple).
**Verified gone from logcat after the fix.**

**b) `Reading from \`value\` during component render` (×6) — REAL, NOT FIXED.**
Still fires. Reanimated's strict-mode message carries no component stack beyond
expo-router's `Stack`, and it is not in our code: every `.value` in `src/` is
inside a `useAnimatedStyle`, a `useEffect` or a press handler (checked
exhaustively — the `field.value` hits in ListingForm are react-hook-form, not
shared values). Six occurrences on a list screen points at a repeated component,
most likely a THIRD-PARTY one in the feed path (FlashList, an RNR primitive,
sonner-native).

Next step, cheapest first: bisect by commenting out feed children on device, or
temporarily raise Reanimated's logger to capture a stack. If it turns out to be a
library, the honest options are to pin/patch it or to silence strict mode
deliberately via `configureReanimatedLogger({ strict: false })` — that is a
product decision (it would hide FUTURE real instances of this class too), so it
should be made by the owner, not adopted quietly to clean up a log.

**c) `Reduced motion setting is enabled on this device` — not a defect.**
The QA rig disables emulator animations (`qa.sh up`), which is exactly what this
reports. Reanimated says it is dev-only. It would not fire on a normal phone
unless the user has Reduce Motion on — in which case it is correct, and
`useReduceMotion()` already honours it throughout the app.

### UI-011 · The quantity never reached the API on create/edit — FIXED
**Where:** Create/Edit listing → "I have more than one" → any number
**Severity:** HIGH — the feature did not work at all on the path that starts it
**Evidence:** `qa/reports/run-041`, confirmed in the DB

The seller typed 15, the field held 15 (asserted), and the listing was stored
with **`quantity: 1`**. So the toggle, the input, the validation and the API all
worked — and the number was thrown away in between.

`createListingWithImages` / `updateListingWithImages` build their multipart body
field by field, i.e. an explicit ALLOW-LIST. `quantity` was never appended, so it
was collected, validated, and silently dropped on the way out. Nothing upstream
could detect it: the form was right, the backend was right, the value was simply
gone. The web client had it right (`me.ts` appends `listing[quantity]`), which is
what made the gap invisible — parity checks compared features, not payloads.

Worth noting how it hid: 11 Jest tests covered the form and asserted the value
reached `createListingWithImages`'s ARGUMENTS. None asserted what the function
put on the WIRE. A unit test one layer too high is exactly as blind as no test.

**Fixed:** both builders now always append `listing[quantity]` (unconditionally,
so a seller can also turn a batch back into a single item), plus 6 new tests in
`src/api/__tests__/listingsMultipart.test.ts` that assert the FormData itself.

A note on that test file, because the obvious approach does not work here: the
first attempt used MSW like the rest of `listings.test.ts`, and **MSW does not
intercept the `multipart/form-data` request these builders issue** — axios fell
through to the REAL dev API on `localhost:3007` and each test hung on the 120s
upload timeout (a 900s run died at exit 143). Worth knowing before writing
another upload test: mock the `http` module instead, which keeps the assertion on
the payload — the thing under test — and runs in 14ms rather than never.

Verified: `run-042` PASS, and the created draft reads `qty=15 multi=true`.

### UI-012 · A toggle row's label was inert, and no Switch had a testID — FIXED
**Where:** Create listing → the "I have more than one" / "Price is negotiable" rows
**Severity:** medium (UX + a11y + testability)
**Evidence:** `qa/reports/run-038`

The row is 44pt tall, but only the ~44x24 switch responded to touch — tapping the
label, the obvious target and the platform convention for a settings row, did
nothing. Found because a flow tapping the label never turned it on.

Also: the shared `Switch` (`components/reusables/switch.tsx`) had **no testID
prop at all**, so no flow could target a specific switch. Matching by
accessibilityLabel does not work either, because on a label+switch row the
label is the SAME string as the Text beside it — and Maestro matches the Text.
Every switch in the app was effectively untappable from a flow.

**Fixed:** the quantity row is now a `Pressable` that owns the switch semantics
(`accessibilityRole="switch"` + `accessibilityState.checked` + the label) with
the inner Switch deliberately carrying no label, so a screen reader announces it
once rather than twice; and `Switch` gained a `testID`.

**Still open:** the adjacent **Negotiable** row has the identical inert-label
problem. Left alone deliberately — it is not part of this feature and the file is
being edited concurrently — but it is the same two-line fix.

### UI-013 · With Reduce Motion on, onboarding cannot be advanced — FIXED
**Where:** first-run onboarding → "Next"
**Severity:** HIGH (accessibility) — the user cannot get through onboarding
**Evidence:** `qa/reports/run-045/onboarding/`, and the carousel library's own source

Tapping **Next** did nothing: the slide never changed and the dot indicator
stayed on the first slide. Reproducible, and it only happens when the OS
"Reduce Motion" / "Remove animations" setting is on — which the QA emulator has,
and which a real user turns on for motion sensitivity or battery.

Cause, from `react-native-reanimated-carousel@4.0.3`'s `useCarouselController`:

- `next()` starts with
  `if (!overscrollEnabled && !(visibleContentWidth > containerWidth)) return;`
  — a guard unrelated to this screen that silently no-ops before it does
  anything, e.g. while the container has not measured.
- and in the **non-animated** branch both `next()` and `to()` set the offset
  directly and never call `onScrollEnd` — which is what drives `onSnapToItem`.
  `Onboarding.tsx` uses `onSnapToItem={setActiveIndex}`, so with
  `animated: false` the JS-side `activeIndex` never advanced: the button stayed
  "Next" forever, the dots stayed put, and `isLastSlide` was never reached. The
  only way out of onboarding was Skip.

**Fixed:** advance with `scrollTo({ index })` (which delegates to `to()` — no
overscroll guard, and the call this file already uses for the dots) and set
`activeIndex` locally on the reduce-motion path rather than waiting for a
callback the library does not fire there.

### UI-014 · Bold text is Android fake-bold, and clips its last character — FIXED
**Where:** everywhere bold; visible on the first-run onboarding button
**Severity:** medium — cosmetic, but on the first screen every new user sees
**Evidence:** `qa/reports/run-045/onboarding/screens/first_run.png`

The onboarding primary button rendered **"Nex"** and its skip link **"Ski"** —
the last character cut off both.

`src/lib/fonts.ts` said, in a comment, that "Bold is synthesized by RN from
fontWeight ... on top of this family". RN cannot do that for a CUSTOM font
family on Android: given `Rubik_400Regular` + `fontWeight: 700` it fake-bolds by
smearing the glyphs, which widens their advances **without the text measurement
accounting for it**, so the tail falls outside the measured box. Long headings
looked fine only because they had slack.

The `*_700Bold` faces were bundled and registered in `FONT_ASSETS` the whole
time — and referenced **nowhere**. Every bold label in the app was fake-bold.

**Fixed:** `fontFamilyForLang(lang, weight)` returns the real bold face for
600/700/800/900/"bold", and the shared `Text` (plus `Label`) resolve the weight
from the flattened style — which also covers NativeWind's
`font-bold`/`font-semibold`, since those are merged into `style` before the
component sees them. 23 unit tests pin the mapping and that every family the
resolver can return is actually registered.

NOTE: this fix is correct on its own merits — the real bold faces were bundled
and unused — but it did NOT fix the clipping. run-046 confirmed it: "Ski"
rendered genuinely bold afterwards and was STILL cut to "Ski". The actual cause
is UI-015 below. Recorded rather than quietly folded into it, because "I changed
something adjacent and the symptom persisted" is the useful part.

### UI-015 · Text measured before the fonts load, so labels clip — FIXED
**Where:** the first screen after launch; visible on onboarding
**Severity:** medium — cosmetic, first impression, every cold start
**Evidence:** `qa/reports/run-045` and `run-046` screenshots; `app/_layout.tsx`

THE CAUSE, after two wrong guesses (fake-bold, then flex compression):

```jsx
<View style={{ flex: 1, opacity: ready ? 1 : 0 }}>   // ready = fonts+theme+auth
```

`opacity: 0` **still mounts and lays out** the entire tree. So every `Text` was
measured with SYSTEM-font metrics before Rubik/Zain/Noto finished loading. When
the fonts landed the paint switched to the brand face — whose glyph advances are
wider — but nothing in the layout inputs changed, so Yoga never re-measured. A
single-line label in a tightly-measured box therefore paints one glyph past its
box and Android clips it. Hence "Nex" and "Ski".

It explains every observation the earlier guesses could not:
- only the FIRST screen is affected — later screens mount after fonts are loaded
- wrapped headings are fine — they re-measure
- the language chips are fine — generous padding absorbs the overflow
- and it is independent of weight, which is why the bold fix changed nothing

The file's own comment said "Load brand fonts before showing UI so text never
flashes in the system font" — the intent was right, the mechanism was not.

**Fixed:** the `Stack` is not rendered until `ready`, which is the pattern
Expo's own font example uses (`if (!loaded) return null`). Returning null from
the whole component is not an option — `ThemeManager` must stay mounted to
report `themeReady` — so the gate sits on the Stack. Screens now mount ONCE,
after fonts, instead of mounting invisibly and being repainted.

### AUDITS THAT CAME BACK CLEAN (recorded so nobody re-runs them)

Static audits over the whole `src/` tree, all clean as of this pass. Each one
targets a defect class that ships silently — worth knowing they are closed:

| Audit | Result |
|---|---|
| `t("ns.key")` present in **all three** locales | 603 keys, **0** missing from en/ps/fa, 0 drift. Now guarded by `src/i18n/__tests__/translationCoverage.test.ts` |
| `useMutation` without `onError` | **0** — the rig's "SILENT" class has no foothold in the mutation layer |
| Screens with `useQuery` but no `useFocusEffect` (CLAUDE.md rule) | **0** |
| Raw `Alert.alert` instead of `confirmAlert` (CLAUDE.md rule) | **0** — the only three hits are comments saying not to use it |
| Hardcoded hex colours in screens/components | **1**, and it is correct: `#4285F4` is Google's brand blue on the sign-in button. Brand colours must not be themed. |
| Listing payload allow-list vs the form schema | complete on both create and update; guarded by `listingPayloadContract.test.ts` |

Two traps these audits fell into first, both worth remembering:
- **i18next plurals.** `t("browse.filtersActive", {count})` resolves to
  `filtersActive_one`/`_other`. A naive audit reported four perfectly good keys
  as missing. Strip `_(zero|one|two|few|many|other)$` before comparing.
- **`rails runner` has no request context.** `thumbnail_url` returns nil there
  even for a listing with three images, because URL generation needs a host. Over
  real HTTP it returns a proper representations URL. Do not report that as a bug
  — check over HTTP first.

### UI-016 · "0 chats" shouted in accent blue on every un-messaged listing — FIXED
**Where:** My Shop → each seller card's meta row
**Severity:** low, but on the seller's main screen and on most of their cards
**Evidence:** `qa/reports/run-020/seller/screens/multi_quantity_partial_sale.png`

The gate was `listing.conversationsCount != null`, which lets **0** through. So a
listing nobody had messaged about rendered "0 chats" in `colors.primary` at
weight 600 — the loudest element on the card — as a tap target leading to an
empty conversations screen. The views count beside it stays muted grey, so a
zero was shouting louder than a real number.

Found by LOOKING at a screenshot, not by an assertion: nothing was broken, it
just drew the eye to nothing. Now hidden below 1, with the views count
deliberately still shown at zero — that contrast is the point.

### UI-017 · "List" view is not a list — one card per screen (OPEN)
**Where:** My Shop → the grid/list toggle
**Severity:** medium — a seller with 11 listings scrolls 11 screens
**Evidence:** same screenshot; `MyListings.tsx:400`

`DESIGN_SYSTEM.md` §5 says "list = compact horizontal row", and the buyer's
`ListingCard` implements exactly that with `variant="list"`. The SELLER's card
has no variant at all:

```jsx
<SellerListingCard listing={item} onMutated={handleMutated} />   // no viewMode
```

`viewMode` reaches the list container but never the card, so switching to "list"
appears to change only the column count: you get one ~1100px-tall card per row
instead of a compact row. In the screenshot a single listing fills the screen
between the filter chips and the tab bar.

NOT fixed here, deliberately. Giving the seller card a compact variant is a real
design change to the seller's primary screen, and the device was mid-run so I
could not verify it visually — and a layout change I cannot see is exactly the
kind that ships a worse screen than it replaced. The pattern to copy already
exists in `ListingCard`'s `variant="list"`.

### UI-018 · The map opened in Kabul even when we knew where you were — FIXED
**Where:** listing form → "Tap to set exact location"; buyer radius filter
**Severity:** HIGH — publishes listings pinned to the wrong city
**Evidence:** owner report, confirmed in code

`handleUseMyLocation` is referenced exactly twice — its definition and one
`onPress`. So the map was ONLY ever moved by a button tap, and always opened at
`DEFAULT_CENTER` = **34.5553, 69.2075 = Kabul city centre**.

A seller in Herat or Kandahar who had ALREADY granted location permission still
got a Kabul pin. If they did not notice, they published a listing pinned to the
wrong city — and buyers filter by area and meet in person, so this is a data
bug, not a cosmetic one.

**Fixed** with two guards that matter more than the feature itself:
- `initialCoords` wins, and the fix only replaces coordinates that are still
  *exactly* DEFAULT_CENTER — so editing keeps its saved pin and a late GPS
  result cannot yank a pin the user already moved.
- new `getCurrentLocationIfPermitted()` NEVER prompts (checks
  `getForegroundPermissionsAsync` first). Firing the OS dialog because a sheet
  opened would be worse than the bug, and a dialog at the wrong moment gets
  denied — poisoning the setting for the button that legitimately asks.

### UI-019 · TABLET: the grid is hardcoded to 2 columns — FIXED
**Where:** every listing feed (Bazaar, saved, hidden, seller shop, category)
**Severity:** medium-high on tablet — a store-listed form factor
**Evidence:** `qa_tablet` AVD measures **2560x1600 @320dpi = 1280dp wide**

`ListingFeed` set `numColumns: viewMode === "grid" ? 2 : 1`, and a sweep found
that **nothing else in the app reads the window width either** (only Onboarding
and ListingMapSection use `useWindowDimensions`, for other reasons). So on the
tablet the feed showed TWO ~600dp-wide cards per row — roughly three times the
intended card size — on a form factor whose iPad screenshots have already gone
to App Store review.

**Fixed** by deriving columns from a target card width rather than a device
check, so rotation and foldables are handled without a device table:
`min(4, max(2, floor(width / 260)))`. 320–519dp → 2 (**every phone unchanged,
asserted for 11 real widths**), 780 → 3, 1040+ → 4. Capped at 4 so cards keep
phone-like proportions instead of stretching. The column count is now part of
the FlashList `id`, because a numColumns change needs a clean remount — which
now includes a tablet rotation.

### UI-020 · TABLET/LANDSCAPE: the listing detail screen rendered NOTHING but the photo — FIXED

**Severity: HIGH.** On a landscape tablet (1280×800dp) the buyer's listing detail
screen showed the photo carousel and the sticky action bar, and nothing else.
Title, price, the per-unit "each" marker, the stock pill, description, category,
location and the seller block were **not below the fold — they were absent from
the view hierarchy entirely**. A dump of the live screen returned exactly three
strings: `1 / 3`, `Make an Offer`, `Contact Seller`.

A buyer on a tablet could not see what an item was, or what it cost.

**Why.** The hero's height was derived from *width alone*, in **three
independent copies** of the same expression:

| Site | Had |
|---|---|
| `listing-detail/ListingGallery.tsx` | `aspectRatio: 4/3` on the container and each page |
| `shared/ListingDetail.tsx` | `GALLERY_H = SW * (3 / 4)`, driving the animated collapse wrapper |
| `listing-detail/DetailSkeleton.tsx` | `width: SW, aspectRatio: 4/3` |

`width / (4/3)` is **960dp on a 1280dp-wide viewport that is only 800dp tall**, so
the hero alone was taller than the screen and pushed everything after it out.

This is also a lesson in fixing one copy of a duplicated rule: capping only
`ListingGallery` made it *worse-looking but equally broken* — the photo shrank
to 480dp while `ListingDetail`'s wrapper stayed 960dp, so the screen gained a
large blank gap and the content was still off-screen (run-060).

**Fix.** One exported rule, `src/utils/gallery.ts`:

```ts
galleryHeight(w, h, aspect) = Math.min(w / aspect, h * 0.6)
```

used by all three sites. The cap never binds on a phone (411dp / 1.333 = 308dp,
far under 60% of an 890dp viewport), so phones and portrait tablets look exactly
as they did; only the case that would eat the screen is clamped.

**Verified both ways, same APK, same flow:** `browse/listing_detail_multi_quantity`
— tablet 1 passed / 0 failed (run-061), phone 1 passed / 0 failed (s2/run-062).

**Found the second bug in the same file:** `const { width: SW } =
Dimensions.get("window")` at **module scope** froze the page width at first
import. Every page of the `pagingEnabled` carousel is that wide, so after a
rotation or a split-screen resize paging landed between photos. Now
`useWindowDimensions()`, which re-measures.

> **Still open (design, not a defect):** 60% of a *landscape* tablet is still a
> lot of photo for very little text — the content area holds about four lines
> before the action bar. A landscape tablet wants a two-column layout (photo
> left, details right), which is a `marketplace-designer` task, not a clamp.

---

### RIG-002 · `when: visible` decided before the screen existed — three separate flow-killers, FIXED

All three are the same mistake in different places: **`when: visible` is a
short-poll check that commits to a verdict**, so anything asked about a screen
that has not drawn yet is answered "no" and silently skipped.

**(a) The launcher check, which cost every tablet flow.** `open_bundle.yaml`
wrapped the whole enter-the-bundle block in `when: visible: "Development Build"`.
After `launchApp: clearState: true` the expo-dev-launcher needs longer than that
to render, so the condition was evaluated **7s after launch**, concluded "not the
launcher", and skipped the entire block — leaving the app parked on the launcher
for the rest of the flow. Every later step then ran against the launcher's UI and
the flow died on `Element not found: Email`, which reads as a login-screen bug.
Measured from Maestro's own debug log (run-058):

```
13:12:20.969  Run flow when "Development Build" is visible RUNNING
13:12:28.265  Assert that "Bundling.*" is not visible RUNNING     ← body never ran
```

Fixed with a gate that matches **either** the launcher or an already-running app,
so it costs ~nothing in both cases and the conditional below it is evaluated
against a screen that exists.

**(b) No positive "JS is running" gate.** Leaving the launcher is not the app
being up: the screen is **blank white for 30s+** while Metro transforms the
bundle. The only check was `notVisible: "Bundling.*"` — but that banner is itself
rendered by JS, so before the first render there is nothing to see and the check
passes *instantly on a blank screen*. Now waits for the first thing that proves
JS is rendering (the dev-menu sheet, or the app's own root).

**(c) The dev-menu panel dismissal was a percentage point tap.** `point: "90%,10%"`.
The close control sits a fixed ~68px from the right edge — 93.7% of a 1080-wide
phone but **96.1% of a 2560-wide tablet** — so on the tablet the tap landed on
empty header and the panel covered the app for the whole flow (run-054: identical
flow, phone passed, tablet failed). Now targets the panel's `Close` accessibility
label, verified on both emulators. The point tap survives only as a fallback.

> **The general rule for this rig:** never ask `when: visible` about a screen you
> have not first *waited* for. Every one of these failures presented as an app
> bug on a healthy app.

---

### RIG-003 · `FLOW_TIMEOUT=240` produced rig failures with EMPTY logs — FIXED

A cold flow pays the launcher URL entry plus a full Metro bundle transform
(capped at 180s) before its first step runs; with a second session competing for
the same Metro and the same cores, a tablet lands past 240s. `timeout` then killed
Maestro **before it had written anything**, so the report said `rig_fail` with
`(no message captured)` — the least diagnosable output the rig can produce.
Now 480s, sized to the worst legal case rather than the typical one.

---

### RIG-004 · The rig could not recover from its own crashes — FIXED

Three separate ways an unattended run died and stayed dead:

| Problem | Symptom | Fix |
|---|---|---|
| Emulator killed uncleanly (host reboot, OOM, session teardown) left `hardware-qemu.ini.lock` + `multiinstance.lock` behind | next boot fails with **"Another emulator instance is running"** — naming the wrong cause; nothing was running | clear the locks on boot, but **only when no live qemu holds that AVD** — that guard is what makes it safe |
| `qa.sh up` defaulted to the **phone** for every session | `QA_SESSION=1` booted `qa_phone` even with `QA_AVD_1=qa_tablet` set, so session 2 collided on the same AVD | `up` with no argument now boots **this session's** device (`QA_AVD_n`); explicit `up phone` / `up tablet` still wins |
| Two sessions on one AVD | same misleading lock message | explicit collision check that names the conflict and tells you which variable to set |

Pin the mapping in `qa.config.sh` — this is how form factors get covered in
parallel, and it is how the UI-020 tablet bug was found:

```bash
export QA_AVD_1="qa_tablet"
export QA_AVD_2="qa_phone"
```

---

### RIG-005 · The shared board was being erased by whichever session finished last — FIXED

Two bugs in `FLOW_REGISTER.md` generation, both of which quietly destroyed the
campaign's memory:

1. **Per-session blindness.** Sessions 2+ write to `reports/sN/`, and the
   generator globbed only the caller's own directory — so each session
   regenerated the *shared* register from its own handful of runs and overwrote
   the other. Session 1 wrote "14/223 passing"; session 2 immediately replaced it
   with "3/223", discarding every flow session 1 had triaged. Now merges the root
   **and** every `sN/` directory, ordered by mtime (run numbers restart per
   session, so `s2/run-055` must not outrank `run-060`), and run labels are
   qualified `s2/run-055` so an evidence pointer is unambiguous.

2. **Stale reasons frozen as human notes.** A failure reason was auto-filled into
   `Notes`, then read back on the next regeneration as if a person had typed it —
   and preserved forever. So a flow that had since been **fixed** still showed
   `Element not found: Email` next to a green `PASS`. Auto-generated reasons are
   now recognised and recomputed; genuine triage notes are untouched (verified:
   19 human rows survived).

---

### UI-021 · 132 of 862 translation keys are dead — and they mislead whoever writes a test (OPEN)

Not a user-visible bug, which is why it is filed here rather than fixed: it is the
**root cause of a whole class of fake test failures**, and it cost three flows
today before I recognised the pattern.

A flow author looks for the string a screen shows, greps the locale files, finds a
plausible key, and asserts its value. If that key is dead, the assertion can never
pass — and the failure reads as a missing feature. Three real examples from today:

| Flow asserted | From key | What the screen actually renders |
|---|---|---|
| `"No conversations"` | `chat.empty.title` (dead) | `chat.noConversations` -> **"No conversations yet"** |
| `"Browse categories"` | `browse.browseCategories` (dead) | `categories.hubTitle` -> **"Categories"** |
| `"All Categories"` | `browse.allCategories` (dead) | `common.all` -> **"All"** |

One word ("yet") is the whole difference, because Maestro's text matching is an
anchored regex.

**Method.** Flatten every key in `src/i18n/locales/en/*.json`, strip i18next plural
suffixes (`_one`/`_other`/…, which are generated and never written in code), then
look for each key anywhere in `src/` + `app/`. Six template-literal prefixes are
excluded as legitimately dynamic (`listing.condition.`, `listing.status.`,
`listing.filter.`, `onboarding.slides.`, `profile.edit.language.`). Verified there
are **no** concatenated `t("prefix." + x)` call sites at all, so the scan has no
blind spot of that kind, and spot-checks of seven keys confirmed 0 references each.

**Result: 132 of 862 (15%) are referenced nowhere.** A sample of the misleading
ones: `browse.title` ("Browse"), `browse.startChat` ("Contact Seller"),
`browse.viewDetails`, `browse.postedBy`, `categories.browseAll`,
`categories.viewAll`, `categories.subcategories`, `common.chat` ("Chat" — the
near-miss for the "Chats" tab that broke five flows), `common.active`,
`auth.logout`, `auth.register`, `chat.thread.you`, `chat.thread.read`,
`chat.startConversation.title`.

**Deliberately NOT deleted.** These are translation content in three locales, some
are plausibly staged for planned screens, and a sweep would be a large diff across
files other agents are editing. The valuable half is knowing they exist.

**What to do instead:** when writing a flow, never take a string from a locale file
— take it from the **component that renders it**, or from a `hierarchy` dump of the
real screen. `maestro --device <serial> hierarchy` is the ground truth and takes
seconds. Better still, assert a `testID`, which no translator can move.

---

### RIG-006 · Why 200+ flows were red: a taxonomy, with counts (mostly FIXED)

Almost none of it was the app. These flows were written across many build cycles
and never executed, so they encode what the app looked like when each was written.
Fourteen distinct causes, ranked by how many flows each one killed.

| # | Cause | Flows | Status |
|---:|---|---:|---|
| 1 | **`tapOn: index:` with no selector.** An empty selector matches EVERY element, so index 0 is whatever comes first in hierarchy order — a heading, a search bar. It never touched the intended row. | 69 sites | 58 fixed; 11 left (Android photo picker — not our app, nothing to target) |
| 2 | **Anchored-regex label misses.** Maestro's text matching is a full-string regex, not a substring. Every one of these is off by a word. | 40+ | fixed |
| 3 | **Non-existent testIDs.** `browse.filters` (an i18n KEY prefix), `block-user-button`, `save-toggle-button`, `seller-name`, `seller-identity`, `similar-listing`, `chat-tab`, `messages-list-top`. | ~25 | fixed by ADDING the testID (see below) |
| 4 | **No scroll before tapping something off-screen.** `tapOn` does not scroll. `seller-profile-link` was tapped by ten flows and none of them scrolled. | 10 | 7 fixed, 3 already had one |
| 5 | **Off-screen in a HORIZONTAL scroller.** The sort chips row: "Most viewed" is 5th, "Nearest first" 6th. A centre-screen `direction: RIGHT` scroll reached one and not the other; a swipe anchored ON the row works. | 2 | fixed |
| 6 | **The composer does not exist on a sold/reserved thread.** ~15 flows opened "the first conversation" and then used the composer. See RIG-007 — this one is subtle and was the cause of the "random" passes. | ~15 | 7 rewired to a new helper |
| 7 | **Interpolated strings asserted as literals.** `"Saved by"` is really "Saved by 3 people"; `"Usually responds"` is "Usually responds within 1 hour". | 2 | fixed |
| 8 | **Impossible assertions.** composer_draft sent a message and then asserted its text was NOT visible — it is in the thread as a bubble. It could never pass, however correct the app. | 1 | fixed |
| 9 | **Test interdependence.** conversation_read_status asserted an unread badge was already there. True on a fresh seed, false once any earlier flow opened a thread. | 2 | 1 fixed (creates its own precondition) |
| 10 | **Fixture premises that cannot hold.** conversations_empty_state wanted an account with no chats (no seeded account has one — verified in the DB); categories_hub_empty wants zero categories against a DB with 16. | 2 | 1 fixed by registering a fresh account; 1 open |
| 11 | **Tapping a parent category EXPANDS, it does not navigate.** All 16 top-level categories have children. Same bug the create-listing picker had. | 3 | fixed |
| 12 | **`${random}` is not a Maestro variable.** `${...}` is evaluated as JavaScript, so it was an undefined identifier; and a constant email means the flow can only pass once. | 1 | fixed (`${maestroRandomEmail}`) |
| 13 | **`pressKey: Escape` does not dismiss an Android share sheet.** The sheet stayed on top and the next assertion failed on a button behind it. | 1 | fixed (Back) |
| 14 | **The APK predates the manifest** — see RIG-008. | 4 | needs a rebuild |

**Labels that had moved** (each one word off, each fatal):

| Asserted | Reality | Where it comes from |
|---|---|---|
| `"Chat"` | **"Chats"** | `sidebar.chat`; `common.chat` ("Chat") is a dead key |
| `"Browse"` | **"Bazaar"** | `sidebar.browse` |
| `"Message Seller"` | **"Contact Seller"** | `listing.detail.contactSeller` — renamed, and 27 assertions plus three code comments still said the old name |
| `"Clothes"` | **"Clothes & Fashion"** | category data, checked against the API |
| `"No conversations"` | **"No conversations yet"** | `chat.noConversations`; `chat.empty.title` is dead |
| `"Browse categories"` | *no such affordance* | `browse.browseCategories` is dead; the hub is the Categories tab |
| `"All Categories"` | **"All"** | `browse.allCategories` is dead; the chip is `common.all` |

**testIDs added** (all behaviour-neutral; in every case the control beside it
already had one, so this was an oversight rather than a design choice):
`block-user-button`, `save-toggle-button`, `browse-filters-toggle`,
`messages-list`, `similar-listing`, `province-option`, and `<route>-tab` for all
six bottom tabs.

> **The one-line lesson:** a red flow is a claim about the app that has to be
> checked against the app. Nine times out of ten today it was a claim about a
> version of the app that no longer exists.

---

### RIG-007 · "The first conversation" is not a stable target — and it hid a real constraint

~15 flows opened `conversation-row-\d+` index 0 and then used the composer:
propose a meetup, make an offer, attach a photo, type a draft. They passed and
failed apparently at random across runs, which is the signature worth chasing.

The list is ordered by most recent activity, **and the flows themselves reorder
it**. Queried mid-run, the buyer's conversations were:

```
reserved  | Traditional Kandahari Carpet 3x4        <- index 0 at that moment
active    | Men Winter Jacket XL Black
sold      | Xiaomi Redmi Note 11 128GB
active    | Lenovo ThinkPad Laptop Core i5 8GB
active    | Phone Case Silicone Clear - Wholesale
```

And the constraint they were blundering into is real product behaviour: when the
pinned listing is sold or reserved, `Conversation.tsx` replaces the composer with
`ListingUnavailableNotice` — **no "+" button, so no actions sheet, and offers
disabled**. So the flow failed on "Element not found: Propose Meetup" with nothing
whatsoever wrong with the app. Earlier in the same session index 0 was the SOLD
thread; later it was the RESERVED one.

**Fixed with `_helpers/open_active_conversation.yaml`**, which opens the multi-unit
fixture's thread — the most durable active listing available, because a partial
sale leaves it ACTIVE by design and only two flows touch it at all. Every other
seeded active listing gets reserved or sold by some flow. The helper asserts the
composer is present, so a sold-out fixture reports itself instead of looking like
a broken app.

> **Rule:** if a flow needs a composer, an offer or a meetup, it needs a thread on
> an ACTIVE listing. Never "the first one".

---

### RIG-008 · The installed APK predates its own manifest, so deep links cannot work (OPEN — needs a rebuild)

Four flows use `hatiwal://` links (`share/open_listing_deep_link`,
`share/open_seller_deep_link`, `browse/listing_detail_sold_state`,
`browse/listing_detail_sold_recovery`). All fail, and two of them fail with **no
message at all** — the least diagnosable output the rig produces.

The cause is not in the flows. `am start` reports "Activity not started, unable to
resolve Intent", and the device agrees:

```
$ adb shell dumpsys package com.hatiwal.app     # Activity Resolver Table
Schemes:
    expo-dev-launcher:  ... AuthActivity
Non-Data Actions:
    android.intent.action.MAIN: ... MainActivity
```

`MainActivity` has **only** MAIN/LAUNCHER. The repo's
`android/app/src/main/AndroidManifest.xml` does declare the scheme:

```xml
<data android:scheme="hatiwal"/>
<data android:scheme="com.hatiwal.app"/>
```

but the timestamps settle it — APK built `2026-08-21 18:14`, manifest modified
`2026-08-21 18:51`, **37 minutes later**. The manifest is right; the binary is
stale. `pm query-activities` finds zero handlers.

**Fix: rebuild the APK** (`qa.sh build`), with no emulator running. Until then
these four flows are blocked, and it is worth knowing that **deep links are
untested on this build** — including anything that relies on them in the share
feature.

---

### RIG-009 · Fixtures DEGRADE as the suite runs, and two sessions cannot re-seed safely (OPEN)

The single biggest remaining obstacle to a suite that stays green overnight, and
it is not a selector problem.

**What happened.** I pointed the new `open_active_conversation.yaml` helper at the
multi-unit fixture ("Phone Case Silicone Clear - Wholesale") on the grounds that it
was the most durable active listing available: a partial sale leaves a multi-unit
listing ACTIVE by design, and only two flows touch it. Several suite runs later:

```
multi-unit listing: qty=15 status=sold
```

`seller/multi_quantity_partial_sale` sells 3 units per run. Run it five times and
the batch is gone — the listing retires, exactly as the feature intends. Five
flows then failed on `No visible element found: "Phone Case.*"` and the helper's
own comment had predicted it: *"If this fails, the fixture was sold out by another
flow — fix the fixture, do not fix the app."*

The same drift affects everything else. Mid-run the buyer's conversations were:

```
active    | Toyota Corolla 2016 Automatic      <- created BY a flow
reserved  | Traditional Kandahari Carpet 3x4   <- reserved BY a flow
active    | Men Winter Jacket XL Black
sold      | Xiaomi Redmi Note 11 128GB
active    | Lenovo ThinkPad Laptop Core i5 8GB
sold      | Phone Case Silicone Clear - Wholesale
```

Every one of those states was reached by some earlier flow. A suite is not a set
of independent tests against fixed data; it is a sequence that mutates shared
data, and later flows inherit whatever earlier ones left.

**Why the obvious fix is unsafe here.** Re-seeding between features (`qa.sh seed`)
is the standard answer, and it would work for ONE session. But the two sessions
share ONE backend, so a re-seed from the tablet resets the data under the phone's
feet mid-flow — trading a slow drift for an abrupt, harder-to-read failure. This
is the real cost of the multi-session design, and it is worth stating plainly
rather than discovering it at 3am.

**Options, none free:**

1. **Seed between features, single-session only.** Correct and simple; gives up
   concurrency. Best if the goal is one trustworthy overnight run.
2. **Seed between CYCLES, not features** — both sessions idle, then seed, then
   both start. Keeps concurrency; fixtures still drift within a cycle.
3. **Per-session backend** (separate database or API instance per session). The
   real fix, and the most work.
4. **Make destructive flows restore what they consume** — a partial-sale flow that
   tops the quantity back up, a delete flow that deletes something it created.
   Most robust per flow, but it has to be done flow by flow.

For now: **seed between cycles** (option 2), and treat a fixture-shaped failure as
a fixture problem. The tell is a whole group of flows failing on the same missing
fixture text while unrelated areas stay green.

> Also note `conversation_delete` deletes whatever conversation sits at index 0.
> It passes, and it destroys a fixture some other flow may be relying on. A
> destructive flow should target something it can afford to lose — ideally
> something it created itself.

---

### PROCESS-001 · I bulk-added another session's files by mistake (commit 7c05c8d)
**Severity:** process, not product — but worth recording, not hiding

I staged with `git add -- maestro/`, which is exactly the bulk add the root
`CLAUDE.md` forbids in this shared checkout. Commit `7c05c8d` therefore contains
~33 files that are not mine and that I never reviewed: the other session's
`_helpers/{login,goto_login,open_bundle,skip_onboarding}.yaml`, all of
`maestro/auth/*`, several `chat/send_message_*`, `onboarding/first_run`,
`profile/recently_*`, `reviews/*`, `saved/saved_empty_state`, `share/*` and
`browse/listing_detail_sold_*`.

**Nothing was lost or altered** — the content is exactly as they left it; it is
committed rather than unstaged. I did NOT revert it: a revert would destroy work
I cannot reconstruct, which is the precise failure the bulk-add ban exists to
prevent. The commit message could not be amended (history rewriting is blocked),
so the disclosure lives here.

The lesson is the boring one: stage explicit paths, every time, even when the
list is long and the directory looks like it is all yours.

### RIG-001 · Two sessions on one emulator — SOLVED (multi-session support)

**Was:** one emulator can only be driven by one Maestro at a time, so a second
QA session was blocked — and worse, its launcher-stage failures looked like app
bugs. Diagnosing that cost real time twice.

**Now:** every command takes `QA_SESSION=n` and each session drives its own
emulator instance, from the same APK and the same AVD:

| | Session 1 | Session 2 | Session n |
|---|---|---|---|
| serial | `emulator-5554` | `emulator-5556` | `emulator-$((5554+2(n-1)))` |
| reports | `qa/reports/` | `qa/reports/s2/` | `qa/reports/sn/` |
| device lock | `reports/.device.lock` | `reports/s2/.device.lock` | `reports/sn/.device.lock` |

Verified live: sessions 1 (tablet, 2560x1600) and 2 (phone, 1080x2400) up
together, both locks held simultaneously, each resolving its own serial.

Implementation notes worth keeping:
- **`-read-only` for instances 2+.** An AVD directory carries a lock, so a second
  `emulator -avd qa_phone` fails outright without it. Read-only lets one AVD back
  several instances — at the cost of no boot snapshot, so they always cold boot
  (~2 min). Session 1 keeps snapshotting and stays fast.
- **Ports step by TWO** (5554, 5556, …) — the odd port in each pair is the adb
  channel, so stepping by one collides with the previous instance.
- **`resolve_device` is PINNED to the session's port**, not "the first device adb
  lists". First-match would hand two sessions the same device — the exact
  collision this exists to prevent, and invisible: both would appear to work
  while corrupting each other's runs.
- One trap already hit: the device lock lives in the reports directory, and it is
  opened before anything else — so a missing `reports/s2/` produced
  `flock: Bad file descriptor` → "another QA run is driving the emulator", a
  maximally misleading way to say `mkdir`. The directory is now created up front.

**Form factors.** `QA_SESSION=n ./qa/qa.sh profile small|phone|large|tablet|reset`
overrides screen size/density, giving extra form factors without extra AVDs.
Always `reset` when done — an override survives reboots and would silently skew
every later run on that device. This is the class of bug that found UI-019 (grid
hardcoded to 2 columns) and the chat-bubble cap: both shipped, both invisible at
one width.

**Portability.** The machinery is now generic: everything app-specific lives in
`qa/qa.config.sh` (copy `qa.config.example.sh`). App id, AVDs, ports, backend
directory, seed command and accounts are all `${VAR:-default}`, so another React
Native project needs no edits to `qa.sh` or `qa/lib/*.sh` — only that config and
`features.yaml`. A project with no local backend leaves `QA_SEED_CMD` empty and
`seed` just verifies login instead of failing.

Full docs: `qa/README.md` → "Several QA sessions at once" and "Using this rig on
another app".

### RIG-001b · The rig itself is UNCOMMITTED (worth knowing)

`qa/qa.sh`, `qa/lib/`, `qa/README.md`, `qa/QA_HANDBOOK.md` and `qa/features.yaml`
are all untracked — only `FLOW_REGISTER.md` and `UI_FINDINGS.md` are in git. The
rig is another session's unlanded work, and the multi-session and portability
changes above live inside those untracked files.

Nothing is lost — it is all in the working tree — but until someone commits `qa/`,
it exists only on this machine. Not committed here on purpose: doing so would put
~1,400 lines of another session's scripts and docs under this session's authorship
(the mistake recorded as PROCESS-001 below).

### RIG-001c · Storage ownership — FIXED

`storage/` subdirectories were root-owned (a Docker container writing into the
bind mount), so a host-run Rails could not create blob directories and most
attachments failed with EACCES. Fixed with `sudo chown -R "$USER" storage` and the
e2e seed now attaches photos: 6 listings x 3 photos. Gallery flows are unblocked
and screenshots finally show the photo-first design instead of "No photo".


**Severity:** blocks device QA while it lasts
**Evidence:** my `run-025` failed at `open_bundle.yaml`'s "Connect" at 22:33; a
`chat` run (`run-026`, not mine) started the same minute.

The emulator is a single shared device. Nearly every flow does
`launchApp: clearState: true`, which wipes the dev-client's remembered Metro
server, so two concurrent sessions each keep dropping the other into the
expo-dev-client launcher mid-flow. The symptom is `Element not found: Connect`
or a screenshot of the Android home screen, with **no crash in logcat and the
app running fine afterwards** — i.e. it looks like a flow bug and is not one.

Before triaging any launcher-stage failure, check for a report directory you did
not create:

```bash
ls -la --time-style=+%H:%M qa/reports/ | tail -5
```

There is no locking today. Either serialise device runs between sessions, or give
each its own AVD.

---

## Flow defects (test bugs, not app bugs)

Recorded here too, because a wrong flow costs exactly as much time as a wrong screen.

| Flow | Problem | Fix |
|---|---|---|
| `_helpers/login.yaml` | bash-style `${EMAIL:-default}` — Maestro evaluates `${}` as **JavaScript**, so both fields typed the literal `NaN`. Broke all 190 login-dependent flows since they were written. | Maestro `env:` block |
| 8 other flows | same bash-default bug | same |
| `auth/guest_*` | asserted `"Welcome to Hatiwal"` + `"Continue browsing"` (login screen) but entered via `skip_onboarding`, which lands on guest browse | route via `goto_login` |
| `auth/login` | asserted `"Sign Out"` without scrolling; it sits below the fold on Profile | `scrollUntilVisible` |
| all 213 | `clearState: true` wiped the dev-client server, the dev-menu dismissal and app state, forcing a ~60s launcher + onboarding dance per flow | warm launch in the login helper |
| `_helpers/login_seller.yaml` | still on the pre-rig shape — `clearState: true` with no `open_bundle.yaml`, so it lands in the expo-dev-client launcher and every seller flow dies before its first assertion (run-014). **61 flows include it.** | give it the same warm-launch + `open_bundle` + `goto_login` treatment `login.yaml` got |
| `login.yaml` env override | it warm-launches and signs in only *if the login form is on screen*, so passing `EMAIL`/`PASSWORD` is a **no-op whenever a session already exists** — the flow silently runs as whoever was signed in last. run-015 ran as the buyer and My Shop read "0 listings", which looks exactly like a missing fixture. | a flow that asserts a specific account's data must clear state and sign in itself (see `seller/multi_quantity_partial_sale.yaml`) |
| `seller/mark_sold_with_buyer.yaml` and any flow asserting a post-sale toast | REV2's review sheet opens the instant a sale records a buyer and covers the toast, so `assertVisible: "Listing marked as sold"` is a race the sheet usually wins — red while the sale went through perfectly (run-019) | assert the review prompt instead: it only appears when the sale recorded a real buyer |
| `create_listing*.yaml` (all 14) | tap `"Electronics"` and treat the category as chosen — but Electronics is a PARENT, so tapping it drills into subcategories and the picker sheet stays OPEN over the form. Every step after that acts on a form the sheet is covering. | tap a leaf (`Accessories`, `Phones & Tablets`, …) after the parent |
| ~~`create_listing*.yaml` taps "Post a listing"~~ | **WRONG, retracted.** Both affordances exist: `create_listing.yaml` taps "Post a listing" and reaches the form fine (run-047+). The original note claimed only "New" worked. | nothing to fix |
| `create_listing*.yaml` + `seller/*` (13 flows) | selected a category by tapping a TOP-LEVEL name. All 10 top-level categories have children, so the tap DRILLS IN and never selects — the picker sheet stays open over the form and every later step acts on a covered screen | tap a leaf after the parent |
| any flow entering a form field then tapping lower down | the numeric keypad covers the bottom half of the form, so the next `tapOn` fails on an element that is merely hidden | `hideKeyboard` + `scrollUntilVisible` |
| `tapOn: "More"` on the owner detail | the action row sits below the description and the views chart, and `tapOn` does not scroll to its target | `scrollUntilVisible` on `id: lifecycle-more-action` — a testID, not a localized word |
| `chat/block_from_conversation`, `chat/report_participant`, `chat/chat_older_messages_pagination`, `chat/view_other_profile_from_conversation`, `browse/full_marketplace_cycle` | tapped `"Chat"`, but the tab is labelled **"Chats"** (`sidebar.chat`). Maestro text matching is an **anchored regex, not a substring**, so this never matched and all 5 died at step 1 with `Element not found: Text matching regex: Chat`. Other chat flows already used `"Chats"` — these 5 were simply never run. | `tapOn: "Chats"` |
| `browse/listing_detail_multi_quantity` | `waitForAnimationToEnd` returns while the feed is still skeletons, so `scrollUntilVisible` began scrolling an **empty list**, ran past where the card would later render, and gave up — reported as `No visible element found`, which reads as a missing fixture. The fixture was there the whole time (idx 3 of page 1, qty 15, confirmed over HTTP). The tablet lost this race; the phone won it. | wait for a real row (`text: "AFN.*"`) before scrolling a feed — never scroll a list you have not confirmed has data |

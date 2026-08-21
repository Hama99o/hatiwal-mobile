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
| `tapOn: "More"` on the owner detail | the action row sits below the description and the views chart, and `tapOn` does not scroll to its target | `scrollUntilVisible` on `id: lifecycle-more-action` — a testID, not a localized word |

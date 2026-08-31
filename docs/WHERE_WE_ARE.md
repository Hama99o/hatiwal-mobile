# Where we are — sell flow redesign, and what comes next

**Written 2026-08-31.** Handover log so the next session can pick this up cold.
Read this, then the board (FlowApp project 5), then whichever spec applies.

---

## 1. The headline

**The sell flow redesign is DONE on mobile and the API, and device-verified.** Web has not started.

The owner's original ask, and where each part landed:

| Ask (owner's words) | State |
|---|---|
| *"we don't need to reserve each time before sell"* | ✅ Mark sold is the one-tap primary from any live listing |
| *"reserve should be use for one item list… we should unreserve"* | ✅ Reserved now **stays in search**, shows as a badge, holds placed/released from chat |
| *"if we mistenly put wrong item number sell we should update this"* | ✅ Undo on the toast + editable/voidable Sales-ledger rows, stock restored |
| *"we propose who buy it before sold… one or outside"* | ✅ Buyer picker from the conversation, "someone not on Hatiwal", or skip |
| *"one buyer par item… or par items if someone buy many"* | ✅ Many buyers per batch, each its own ledger row |
| *"i sold all 15 then edit it to 20… it should be soldable"* | ✅ Raising quantity reopens the listing; lowering below sold is a readable 422 |
| *"user did not see this error it say server error"* | ✅ Machine-readable codes → localized inline messages in en/ps/fa |
| *"translation is not added"* | ✅ 11 keys fixed; the `AWAITING_TRANSLATION` allowlist emptied and now enforced |

**Verified numbers** (run by the orchestrator, not taken from agent reports):

```
RSpec    1459 -> 1742 examples, 0 failures      (+283 specs)
Jest      143 -> 154 suites, 2271 -> 2500 tests  (baseline had 4 failing; now 0)
RuboCop   clean, 305 files
```

---

## 2. Commits (all on `vicatio-branch`)

```
hatiwal-api
  c5e155c  backend: sold-first lifecycle, holds, sales ledger, corrections (SF-B1..B5)
  48c1cc2  seeds: 5 sell-flow QA fixtures + an invariant self-check
  162a2a5  docs: the backend prompt's policy example taught the exact bug we fixed
  f06b29e  perf: feed N+1 (109 queries -> 10) + stamp a hold's date when placed

hatiwal-mobile
  16cd19f  mobile: sell in one tap, holds in chat, sales ledger, undo (SF-M1..M6)
  09cb4d0  design pass: cart-shape fix, consolidate StockBadge, RTL digits
  849f6a2 / ce1b580 / ff5dd0f / ce8741c  docs + qa docs corrections
  05d01af  qa: point the rig at the flow that actually exists now
  3de2954  the held-units refusal had no client half
  c7bbf3f  the Undo was unreachable whenever a buyer was named
  5fc9e02  shared Maestro helpers manufactured failures in non-English locales
  3201271  BuyerPickerSheet uses the shared stepper — capped, and says why
  3e083ab  selling from chat had no Undo — one mark-sold path now, not two
  fc58dae  second device sweep + fixes + the map stopgap

hatiwal-web
  a3c3c1e  mark-sold defaults to ONE unit, not the whole stock
  36cb6e8  docs: web still runs the pre-redesign model

hatiwal-map   (new component)
  db5b66e  the plan for self-hosted tiles
```

---

## 3. What is left, in the order I would do it

### Next up: SAFETY-1 (card 304) — exact seller coordinates are public

Verified live, **unauthenticated**:
```
curl http://localhost:3007/api/v1/listings/897     (no token)
  latitude: 34.52695   longitude: 69.185058
```
Six decimals is house-level. The listing map draws it as an exact pin (`radiusKm={0}`). A private
seller's listing location is usually their home; sellers are private individuals in Afghanistan
meeting strangers, and it is acutely worse for women sellers. leboncoin, Vinted and Facebook
Marketplace all show an approximate area instead — for safety, not cost.

**Fuzzing must be stable per listing.** A fresh random offset per request lets an attacker sample
repeatedly and average back to the true point. Distance sorting keeps the TRUE coordinates
server-side; only what is *sent* is coarsened. Owner keeps exact coordinates on their own views.

**Do this before the map work** — it shrinks it (no street-level zoom needed, and deep zooms are
most of the tile data).

### Then: the map — `hatiwal-map/README.md`

Full plan, all figures measured. Short version: CARTO started keying the "free, keyless" endpoint
and enforces it with a watermark inside an HTTP 200 PNG, so Android maps are defaced in production.
Web separately uses OSM's public tiles, which their policy forbids for app traffic. iOS uses Apple
Maps and needs nothing.

Decision: **self-host** vector tiles for Afghanistan on the VPS we already pay for.
`map.hatiwal.com` already resolves to it. 107 MB source extract, 52 GB free on the box.

**A stopgap is currently live on Android** (`tile.openstreetmap.org`, commit `fc58dae`) so maps
work rather than showing a watermark. It is a courtesy service that discourages app traffic —
**remove it when the self-hosted tiles land.** Do not treat it as the answer.

### Then: web parity — SF-W1 (card 285)

Web still runs reserve-then-sold. Everything in section 1 is absent there.

**Web is not a blank port.** It has been fixing the same problems independently (`9853405` an
off-platform sale wiped the seller's stock; `f3bacdd` over-stock input) and had a forgotten staged
fix sitting uncommitted for days (`a3c3c1e`). All three clients share ONE Rails API, so a
disagreement between them is a real user-visible bug. **Reconcile, do not copy mobile over the top.**

Also belongs to SF-W1: bring web's mark-sold dialog to **cap + reason** (it still uses the
free-text over-stock warning), and move web off OSM's tiles.

### Sitting in Review, needing a look not work
- **298** — the at-cap message is a new visual state no designer has seen. Should read as an
  explanation, not an error; needs an RTL check.
- **303** — chat Undo, logic-only, wants a confirm.

### Low value
- **287** — dead `"reserved"` branches in `ListingUnavailable*` prop types. Provably unreachable,
  zero user impact. Fold into whatever next touches those files; do not spend a run on it.

---

## 4. Decisions already made — do not re-litigate these

| Decision | Why |
|---|---|
| **Keep the 4-value `status` enum**; do not retire `reserved` | It is referenced in 117 mobile and 26 web files. Widening the `browsable` scope buys the whole UX for one line; retiring the enum is a three-client breaking change for nothing |
| **"Three states" is presentation, not schema** | Seller sees Draft / Live / Sold; a held listing is Live + a badge. DB keeps four values |
| **A reserved listing stays in search and stays messageable** | Vinted/Carousell behaviour. Hiding it kills discovery and strands the seller when a deal falls through — which happens constantly with no payment holding it |
| **Reserve is initiated from the CHAT thread** | A hold is for a person, and the seller is already talking to them |
| **Undo, not a correction form** | Toast undo + an editable ledger row. Nobody builds a "correct a sale" screen |
| **Sold-out is automatic** | Stock hits 0, listing ends itself. The seller never marks "sold out" |
| **Quantity stepper: CAP + REASON** | Not silent clamping (fails "never a failure the user can't see") and not the free-text warning (keeps the raw-`Input` fork alive, fails no-duplication). Amazon/eBay cap and state the cap. Shipped `3201271` |
| **Directions stay handed off to Google/Apple Maps** | `ListingMapSection.tsx:75-82`. Routing is heavy; they do it better, free |
| **iOS keeps Apple Maps** unless the owner accepts the trade | Apple does not use OSM, so switching may show LESS detail in Afghanistan. Compare on a device first |
| **Map basemap must be QUIET** | It is a search surface; listings are the content. A detailed map competes with the price bubbles |

---

## 5. Traps that cost real time — read this before debugging anything

### `status == "reserved"` does NOT mean "has a hold"
A multi-unit batch deliberately keeps `status: active` while holding units. **This one wrong
assumption caused three separate bugs**: a hidden 403 (`activate?` refused on exactly the batches
its own error copy told sellers to use), a phantom hold surviving its own sale ("5 available · 10
held" on already-sold stock), and a hold with no "held since" date. Check `held_units` / `listing.sale`.
A sweep for a fourth instance found none behavioural — the verdict table is on card 295.

### Green tests do not prove a feature is reachable
**Twice** in this effort a control was fully built, fully unit-tested, and impossible to reach:
`Conversation.tsx` passed neither the hold rows to `ComposerActionsSheet` nor `buyer` to
`ListingHeader` (whose Mark-sold pill was therefore permanently hidden). Every test passed because
each piece was tested in isolation. **When you fix something like this, verify the new test FAILS
without the fix** — that discipline is what caught both.

### Deleting an assertion hides a bug for months
At QA run-019 the Undo-toast assertion was deleted because a modal covered the toast. SF-M5 later
built its entire Undo on that toast. The assertion is restored in
`maestro/seller/multi_quantity_partial_sale.yaml` **with the history written above it** — leave both.

### Running Jest in the container
```bash
docker compose exec -T -e EXPO_PUBLIC_API_URL=http://localhost:3007/api/v1 \
  mobile sh -c 'cd /app && npx jest --watchAll=false --ci'
```
Without the override, **12 suites / ~190 tests fail for pure environment reasons** — the container
points the client at a LAN IP while MSW mocks `localhost`. Do not chase those.

### The device rig
- **`.env`'s `EXPO_PUBLIC_API_URL` is inlined at BUNDLE time.** A WiFi/hotspot switch silently
  breaks every device flow until `.env` is updated **and Metro is restarted**. This bit us twice.
- **Host `:8081` is another project's Metro** (`openaleph-mobile` — verified, it 404s on Hatiwal
  paths). Ours is `10.0.2.2:3008`. A dev build defaults to 8081, so QA can drive *another app's
  bundle* while reporting on Hatiwal. `qa/lib/doctor.sh` now has a hard gate that tails
  `hatiwal-api`'s log for a request during the launch window — "the app opened" is not proof.
- **Host contention manufactures fake failures.** Five orphaned `pollinations-mcp` processes have
  been pinned at ~99% CPU for hours (~5 of 16 cores). Load hit 21.3. A Jest suite that runs in 5s
  timed out at 45s. **Always re-run before calling something a failure**, and classify honestly:
  app bug / flow wrong / inconclusive.
- **`FLOW_REGISTER.md` is machine-generated** — `qa/lib/register.py` rewrites it whole. Fixture docs
  live in `qa/QA_HANDBOOK.md`.
- **RTL flows persist `preferred_language` on the user.** Restore test-account state or later flows
  fail for unrelated reasons.

### Seeded fixtures (in `qa/QA_HANDBOOK.md`)
Five sell-flow fixtures exist, and the seed **raises** if any violates an invariant
(`sold_units <= quantity`, `available_units >= held_units`, ≤1 open hold per listing). The
"School Backpack Bulk Restock - 20 Bags" fixture is the owner's own bug as a testable state:
15 of 15 sold, quantity raised to 20, live again with 5 available.

---

## 5b. Map — done, with one deferred item

`map.hatiwal.com` serves our own vector tiles from the VPS (`hatiwal-map/README.md` has the whole
story). No API key, no cap, no provider able to change the terms — which is exactly what CARTO did.
Android and web are wired and verified; **iOS is written but has never been run** and needs an EAS
build before it ships. `hatiwal-map/deploy/deploy.sh` recreates the whole thing from nothing and has
been run end to end to prove it.

**DEFERRED — board card 305: place search still uses Nominatim.** Not the map, just the location
search box. Recorded so it is not rediscovered:

- It is **fine today**, and fine for a long time. Both clients call Nominatim **directly from the
  user's own device**, so its ~1 req/sec cap — which is enforced **per IP** — is never approached by
  one person. The search is also debounced (450ms, min 2 chars), so it fires on a typing pause, not
  a keystroke.
- **Do NOT proxy geocoding through the server.** That would funnel every user through one IP and turn
  a non-problem into an outage. This is the single most important line in this section.
- Estimated thresholds: comfortable to tens of thousands of daily actives; worth acting somewhere
  around 50k–100k DAU. Hatiwal is on Play internal testing today.
- When it matters: **cache query→results first** (Afghan city names are a small, repetitive set; no
  new infrastructure). Self-hosting Nominatim is a *different weight class* from the tiles — PostGIS,
  an hours-long import, 10–20 GB, plus replication — on a 4-core box already running the API, web and
  three other apps. The tiles were 132 MB of static files.

---

## 6. Known-open bugs NOT in the sell flow

- **Android maps are defaced in production** — stopgapped, see §3.
- **Web uses OSM's forbidden tiles** — no watermark, but on borrowed time.
- **The `/admin` "Reserved" tile counts status only**, so it under-reports holds on batches.
  Cosmetic, sits beside an explicit enum breakdown — a product call, not a silent edit.

---

## 7. Tonight's session (2026-08-31, later) — what changed and what it cost

### 7a. SF-M11 shipped — an offer now carries how many units it is for

Board card 307. This was the **last hole in the buy flow**, and the one the owner asked about
directly ("how the people have buy, like, how they choose, how many item they can buy"). SF-B11
shipped the API half; without this mobile half it **ships inert**, which is exactly how QA-BUG3 came
back this morning.

What it looked like before: a buyer on a 15-unit batch could only type a *price*. The quantity lived
in prose the composer generated ("3 × AFN 14,000 = AFN 42,000"), the seller had to re-read the
thread, and **mark-sold opened at 1 regardless** — so a 3-unit agreement sold one unit and left two
on the batch that were already gone. `OfferSheet`'s own `perUnit` docstring named the hole
("an offer carries no quantity of its own, so nothing downstream disambiguates it").

Now: `Message.offerQuantity` on the wire, a quantity field in `OfferSheet` for **both** offer and
counter (the API permits `offer_quantity` on `offer_counter` for a reason — a counter that could only
restate the price would lose the units the moment either side moved), the units on the offer bubble,
and `findAgreedOffer().quantity` feeding `BuyerPickerSheet`'s stepper through
`ListingHeader.agreedQuantity` → `suggestedQuantity`.

Load-bearing rules, all in ONE place (`screens/shared/listing-detail/offerQuantity.ts`):

- **`null` means UNSPECIFIED, not one.** It is null for every non-offer kind, every offer on a
  single-item listing, every offer whose sender named no quantity, and every offer written before
  SF-B11. `offerUnits()` answers 1 for all of them; nothing else may re-derive that.
- **Single-unit stays invisible.** `shouldShowOfferUnits()` hides a "1 ×" prefix, so single-item
  threads render byte-identically to before.
- **Prefilling the agreed number is NOT prefilling the remainder.** The note on
  `BuyerPickerSheet.quantity` explains why defaulting to the whole stock was harmful (a seller
  confirmed "sold" on a batch of 50 and retired the listing). The difference: a remainder is *our*
  guess; the agreed quantity is a number the buyer typed and the seller accepted. Still editable,
  still capped by `remainingQuantity`.

Also fixed on the way, because SF-M11 adds a new 422 to these paths: the in-thread offer and
counter handlers both had `catch { toast.error("couldn't send") }`, which would have hidden
`offer_quantity_above_available_units` behind a generic failure — the same class the owner reported
as *"user did not see this error it say servcer error"*. Both now use `apiErrorMessage`.

### 7b. `ListingHeader.test.tsx` had not run a single test since QA-BUG5

Found while adding the SF-M11 wiring test. The suite **crashed in transform** —
`TypeError: Property declarations[0] of VariableDeclaration ... got undefined` — so **0 of 22 tests
ran**, and it reads as a toolchain error rather than as lost coverage. Cause: QA-BUG5 added an inline
`jest.mock("@/components/common/ReviewPromptSheet", () => { const { View } = require(...); ... JSX })`
— the precise trap that `__mocks__/BuyerPickerSheet.tsx`'s own header comment documents. Fixed by
moving it to a manual mock at `src/components/common/__mocks__/ReviewPromptSheet.tsx`.

A scan found 5 other suites with the same require+JSX shape — `HiddenListings`,
`ListingConversations`, `ListingSales`, `MyListingDetail`, `BlockedUsers`. **All 5 pass** (61 tests),
so the pattern alone is not the trigger and they need no change. Recorded so nobody "fixes" them.

### 7c. The map QA matrix — and two rig lessons that cost hours

Six cells (en/ps/fa × light/dark), each driving all four map surfaces: listing detail, browse filter,
edit profile, create-listing.

**Lesson 1 — `scrollUntilVisible` swipes from the screen CENTRE.** Both Pashto cells failed at
`listing-form-field-location` for three separate attempts. It was never an app bug: the form renders
correctly in Pashto (RTL, dark palette, Arabic-Indic digits), but Pashto labels wrap, so the taller
layout puts the screen centre on the title `TextInput`, which **consumes the vertical drag**. The
form never moved a pixel, and the field was absent from the view hierarchy because it was never
scrolled into it. en and fa put a different element under the centre, which is why they passed the
identical step. Fix: an explicit `swipe` at **x=88%**, in the margin, clear of the centred inputs.
Two earlier attempts (dropping `centerElement`, then `visibilityPercentage: 30`) could not have
worked — both tuned the *search* while the scroll itself was doing nothing.

**Lesson 2 — one Maestro per device, always.** `qa/qa.sh` documents this (`hold_device_lock`:
*"two Maestro instances driving the same emulator tear down each other's on-device driver. The
signature is a flow that 'fails' in ~0s having run nothing"*). I ran a background batch and a
foreground cell at once and got exactly that signature four times, plus a half-installed driver
(`dev.mobile.maestro.MaestroDriverService: Process crashed.` / `NameNotFoundException:
dev.mobile.maestro.test`) that had to be uninstalled so Maestro would reinstall it. **Run cells
serially under `flock qa/reports/.device.lock`** — the rig's own lock, so a concurrent `qa.sh` waits
instead of colliding.

**Host note:** two stray `pollinations-mcp` processes (from an unrelated project) were pinned at 100%
CPU each, starving the emulator. `renice -n 19` on them is enough and is non-destructive; killing
them needs the owner (`kill` is blocked for the agent).

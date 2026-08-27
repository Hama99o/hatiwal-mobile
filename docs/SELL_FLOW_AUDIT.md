# Audit — the sell flow as it actually is today (2026-08-27)

Input for the redesign the owner asked for: *"creation of a listing with 1 item up to
multiple items, how a buyer buys it, how a seller marks it sold — redesign it on mobile,
make it as simple as possible."* **Mobile only. No web in this pass.**

Verified by reading the code, not assumed. Every claim below has a file:line behind it.

---

## 1. What already exists (do NOT rebuild it)

### Backend — further along than the owner thinks

| Capability | Where | State |
|---|---|---|
| `listings.quantity` (default 1) + `sold_units` | `db/schema.rb:175,180`, check constraints `listings_quantity_positive`, `listings_sold_units_within_quantity` | **Done** |
| `available_units`, `multi_unit?`, `record_units_sold!` | `app/models/listing.rb:273,281,291` | **Done** — `record_units_sold!` clamps so a seller can never oversell |
| Partial sale keeps the listing live | `my/listings_controller.rb#sold` — `@listing.sold! if sold_out` only | **Done** — 13 of 15 left stays `active` + browsable |
| Reserve does NOT hide a batch | `#reserve`: `@listing.reserved! unless @listing.multi_unit?` | **Done** — see §3.1, this contradicts the owner's premise |
| Sell straight from `active`, no reserve first | `ListingPolicy#sold? = owner? && (active? || reserved?)` | **Done at the API** — the mobile UI hides it, §2.1 |
| Per-buyer sales ledger (who bought how many) | `transactions` table: `buyer_id · seller_id · listing_id · quantity · final_price · currency · status · completed_at` | **Done** |
| Many SOLD transactions per listing | `status=1` sits outside the `index_transactions_on_listing_id_while_open` partial unique index | **Allowed by the DB today** |
| Only ONE reserved transaction per listing | that same partial unique index | **Hard DB constraint** — per-unit holds for several buyers at once is blocked |
| "Sold to someone not on Hatiwal" | `clear_buyer` param → `sold_with_buyer!(clear_buyer: true)` returns nil, no transaction | **Done** |
| `GET /my/transactions` | `api/v1/my/transactions` + `hatiwal-mobile/src/api/transactions.ts` | **Endpoint + API client exist, NO SCREEN RENDERS IT** |

### Mobile

| Piece | Where | State |
|---|---|---|
| `quantity` field behind an "I have more than one" toggle | `src/screens/seller/ListingForm.tsx` | Done |
| Stock rules in one place (`availableUnitsOf`/`isLowStock`/`hasStockToShow`) | `src/utils/stock.ts` | Done, good |
| Per-unit price ("14,000 each") on detail / first message / offer | `FirstMessageSheet.tsx:41`, `OfferSheet.tsx:89,207` | Done |
| One hook owns every lifecycle action | `src/hooks/useListingLifecycle.ts` | Done — **this is the file the redesign turns on** |
| Buyer picker from the listing's conversations + "Someone else" + "how many sold?" | `src/components/common/BuyerPickerSheet.tsx` (684 lines) | Done |
| Stock badge on owner detail ("12 of 15 left") | `MyListingDetail.tsx:352` | Done |

---

## 2. Gap A — the UI teaches reserve-then-sell, which the owner does not want

### 2.1 `active` → primary action is **Mark reserved**

`useListingLifecycle.ts` primary-action map:

```
draft            → Publish
active           → Mark reserved     ← the problem
active + expired → Renew
reserved         → Mark sold
sold             → none
```

"Mark sold" on an `active` listing exists only inside the More sheet (`moreActions`). So the
one obvious path the UI offers is active → reserved → sold, on **every** listing, even a
batch of 50. The API has never required it (`ListingPolicy#sold?` accepts `active?`).

**Owner's requirement:** *"we don't need to reserve each time before sell"* → sold must be the
primary action from `active`; reserve becomes an optional, clearly-explained side step.

---

## 3. Gap B — reserve semantics are unexplained (and the owner's premise is half wrong)

### 3.1 The contradiction, stated plainly

The owner asked: *"reserve should be for a one-item listing; if used on a multi-item listing it
should tell the user it will not be in the search list, and we should be able to unreserve."*

What the code actually does — `my/listings_controller.rb#reserve`:

- **Single-item listing + reserve** → status becomes `reserved` → `browsable` is
  `active.not_expired.not_removed`, so it **leaves search**. Nothing warns the seller.
- **Multi-item listing + reserve** → status is deliberately **left `active`**, so it **stays in
  search**. A comment there records why: a batch does not leave the market because one unit is
  held; this was reported from a device.

So the search-disappearance the owner is worried about is real — but it happens on the
**single-item** listing, which is the case they thought was fine, and *not* on the multi-item
one they thought was broken.

**Resolution taken into the redesign:** keep the (correct) behaviour, and make the consequence
*visible in both directions* — that is what the owner is actually asking for.
- Single item: reserving says "this hides your listing from search while it's held".
- Multi item: reserving says "your listing stays in search; N units stay on sale".
- Both: unreserve must be a first-class, obviously-named action.

### 3.2 Unreserve is hidden behind the word "Activate"

Undoing a reservation is `PUT /my/listings/:id/activate`, surfaced in the More sheet as
**"Activate"** (`useListingLifecycle.ts` moreActions, `status === "reserved"`). A seller looking
to release a hold does not scan for "Activate". It also correctly cancels the open transaction
(`cancel_open_transaction!`) — the behaviour is right, only the name and placement are wrong.

---

## 4. Gap C — a wrong number cannot be corrected. This is the real hole.

The owner: *"if we mistakenly put the wrong item number sold we should be able to update this."*

There is **no path down**, anywhere in the stack:

- `Listing#record_units_sold!` only ever **adds** (`sold_units + taken`).
- `transactions.status` is `{reserved, sold}` — no cancelled/void state.
- `users.sold_count` / `bought_count` are **increment-only**. `transaction.rb` says so in its own
  comment: *"There is currently no 'unsell' flow, so counters are only ever incremented."*
- Repair today is a rake task run by a human: `bin/rails transactions:recompute_counters`.
- `ListingPolicy#sold?` requires `active? || reserved?`, so a sold-out listing is **terminal** —
  the seller cannot even re-open it to fix the count.

A seller who taps "sold 5" instead of "sold 1" on a batch of 15 has permanently lost 4 units of
stock, with no in-app recourse. **This needs new backend work** (a correct/void path with a
counter decrement), not just a screen.

---

## 5. Gap D — multi-buyer sales are recorded but never shown

The DB happily holds *sold to Ahmad ×2, sold to Zahra ×3, sold outside ×1* on one listing.
`SaleBuyerCard.tsx:55` renders `listing.sale` — **singular**, the latest sale only. So:

- The seller cannot see who bought how many.
- There is no way to reach an earlier sale to correct it (compounds §4).
- `GET /my/transactions` is fetchable and rendered nowhere (confirmed in the spike doc's own
  "The actual gap" section).

The owner's *"one buyer per item, or one buyer taking several items"* is therefore **already in
the data model and invisible in the product**.

---

## 6. Scope boundary for this pass

In: mobile (`hatiwal-mobile`) + whatever `hatiwal-api` must gain for correction/ledger.
Out: `hatiwal-web` (the owner said explicitly: mobile now, web after).

Non-negotiables carried over from `docs/SPIKE_LISTING_QUANTITY.md`:
1. **Invisible unless used** — a seller with one item must never see a quantity control, a
   count, or an extra tap. If a design cannot hold this, the design is wrong.
2. **Price is never a bare figure when `quantity > 1`** — always "AFN 14,000 each", and the
   thread shows the implied total. Buyer and seller agreeing "40,000" and meaning different
   things is discovered at the meetup, with no payment system to arbitrate.
3. **A stale count lies to buyers** — auto-decrement on sold, and correction must be trivial.

---

## 7. Migration surface — decided approach (2026-08-27, after the owner's "do what big tech does")

**Decision: do NOT retire the `reserved` enum value.** It is referenced in 117 `hatiwal-mobile`
files and 26 `hatiwal-web` files. Retiring it is a three-client breaking change that buys no UX;
widening one scope buys all of it. Web is out of scope this pass (mobile first, web same
treatment straight after) and must keep working untouched.

**The change: a reserved listing stays discoverable.** `Listing.browsable` currently excludes it,
which is the entire "my listing vanished" problem. Widen the scope; the badge does the rest.

### Every place gated on `active?` / `active` that this touches

| File:line | Today | Must become | Why |
|---|---|---|---|
| `listing.rb:137` | `scope :browsable, -> { active.not_expired.not_removed.ordered }` | include `reserved` | **The load-bearing line.** Reserved listings back in the feed, search, category counts, similar-listings rail, recently-viewed — all of which route through `browsable` |
| `listing_policy.rb:31` | `start_conversation? → record.active?` | `active? \|\| reserved?` | A reserved listing the feed now offers MUST be messageable, or the buyer hits a dead end on a listing we just showed them. Deals fall through constantly with no payment holding them — that second buyer is the recovery path |
| `listing_policy.rb:21` | `unpublish? → owner? && record.active?` | `+ reserved?` | A seller must be able to pull a held listing off the market |
| `listing_policy.rb:24` | `renew? → owner? && record.active?` | `+ reserved?` | Otherwise a held listing silently expires with no way to renew it |
| `listing.rb:241` | `expired? → active? && expires_at.past?` | `+ reserved?` | A reserved listing currently never expires — it sits live forever |
| `user_serializer.rb:13` | `listings_count → listings.active.not_expired.count` | match `browsable` | Public-profile count vs the grid it labels. Already fixed once for this exact class of bug (TASK-B903); widening `browsable` reopens it |
| `user_serializer.rb:70` | `items_active_count → listings.active.count` | same | Same drift |
| `listing_policy.rb:22` | `reserve? → owner? && record.active?` | unchanged | Correct as-is |
| `listing_policy.rb:26` | `sold? → owner? && (active? \|\| reserved?)` | unchanged | Already allows selling without reserving first |

### Clients: stop treating reserved as unavailable

Reserved now means "still for sale, someone is first in line". The unavailable treatment is for
`sold` and admin-removed only.

- Mobile: `screens/chat/conversation/threadAvailability.ts`, `ListingUnavailableNotice.tsx`,
  `utils/recoveryBand.ts`
- Web (deferred ticket, not this pass): `components/listing/unavailable-actions.tsx`,
  `components/listing/recovery-band.ts`

### Old data

No backfill needed. Existing `reserved` rows become browsable the moment the scope widens —
which is the desired outcome, not a side effect. `reserved_at` keeps its meaning. Existing open
`reserved` transactions keep theirs. Nothing to migrate, nothing to un-migrate on rollback: the
change is one scope and six one-line predicates.

### Batch vs single item

Unchanged from today, and now consistent because both are browsable:
- **Single item held** → status `reserved`, badge "Reserved for Ahmad".
- **Batch with units held** → status stays `active`, badge "2 held for Ahmad · 13 available".

The status difference is invisible to users; the badge is what they read.

---

## 8. Test baseline, measured before any redesign code (2026-08-27)

This is the bar. Any regression against it is the redesign's fault, and these numbers are how we
prove it either way.

| Suite | How to run it | Baseline |
|---|---|---|
| API RSpec | `docker compose exec -T web bundle exec rspec` (in `hatiwal-api/`) | **1459 examples, 0 failures** — clean |
| Mobile Jest | see the env note below | **143 suites, 142 pass / 1 fail · 2271 tests, 2267 pass / 4 fail** |

### Running mobile Jest in the container — neutralize the env first

```bash
docker compose exec -T -e EXPO_PUBLIC_API_URL=http://localhost:3007/api/v1 \
  mobile sh -c 'cd /app && npx jest --watchAll=false --ci'
```

Without that override the container's real `EXPO_PUBLIC_API_URL` (`http://192.168.1.24:3007/api/v1`)
is picked up by `src/api/http.ts`, while `src/__tests__/mocks/handlers.ts` registers MSW handlers
against `http://localhost:3007/api/v1`. Every request then misses its mock and **12 suites / 190
tests fail for reasons that have nothing to do with the code**. Do not chase those; fix the env.

### The 4 genuine pre-existing failures — all in the redesign's path

`src/components/common/__tests__/BuyerPickerSheet.test.tsx`:

- pre-fills the whole remaining stock, so "I sold them all" is one tap
- re-syncs the pre-filled count when the remaining stock changes under it
- still sells the lot when the seller leaves the count alone
- warns visibly when the typed count exceeds the stock instead of silently clamping

These assert the OLD default: mark-sold pre-fills the **entire** remaining stock. That was
deliberately reversed in `my/listings_controller.rb#sold` — *"The default for a BATCH is ONE unit,
not the whole shelf"* — after a device report (50 in stock, one sale, listing retired with "0 of 50
left"). **The tests are stale, the behaviour is right.** The redesign rewrites this sheet, so these
get rewritten with it rather than patched.

### Acceptance bar for every ticket in this redesign

1. API RSpec stays at **0 failures** (count grows as specs are added).
2. Mobile Jest reaches **0 failures** — including the 4 above, which this work owns.
3. `bundle exec rubocop` clean, per the root `CLAUDE.md`.
4. New/changed shared components get a `.stories.tsx`; new flows get a Maestro flow
   (happy path + error + empty), per `hatiwal-mobile/docs/TESTING.md`.

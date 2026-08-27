# Spike — multi-quantity listings ("I have 5 of these")

**Status:** spike / product brief. Nothing built. Written 2026-08-21 at the owner's request.
**Question asked:** *"What if I want to sell multiple identical items at once? Before creating, the seller
says how many they have; buyers can see it and can try to buy more than one. Is this big and
complicated?"*

---

## 0. UPDATE 2026-08-21 — the owner answered §11, and two things below are now wrong

The owner supplied the use case this brief said to go and find:

> *"A seller bought 15 bags and wants to sell them. He can't show the buyer that he has 15 — maybe
> the buyer thinks there's only 1 when they want 15. That's a bad outcome. Giving the info helps the
> buyer know how many there are."*

Three consequences, and they all make the feature **cheaper and safer** than §1–§10 concluded:

**a) The trader case is real, so §11's "go ask a seller first" is answered.** This is a reseller with
bulk stock. §7.1 is decided.

**b) The primary value is DISCOVERY, not inventory management.** The loss being described is a buyer
who wanted 15, assumed there was 1, and never asked. That is fixed by *displaying a number* — not by
building stock control. This is a much smaller feature than §8 assumed, and it splits in two:

| | What it is | Value | Cost |
|---|---|---|---|
| **Tier 1 — quantity as information** | Seller states "15 available", buyer sees it before messaging, seller can edit it, it decrements when a sale is marked | Captures ~all of the stated value | **~1 cycle** |
| **Tier 2 — quantity as inventory** | Per-unit reserve holds, expiry, partial-sold states, low-stock signals | Marginal on top of Tier 1 | +2 cycles |

**Recommendation: build Tier 1 only.** Ship the number, see whether sellers keep it accurate. Tier 2
is speculative until they demonstrably do not.

**c) §5.1 was wrong, and it was the risk I ranked highest.** I claimed concurrent buyers could each be
told they got the last unit. **They cannot.** `reserve` and `sold` are `PUT /my/listings/:id/...` —
seller-owned and Pundit-authorized. No buyer-facing endpoint changes stock. Only the seller decrements,
and the seller is a single actor, so there is no buyer race to lose. Two buyers can both *ask* for 15
and the seller settles it in chat — exactly as today. `with_lock` is still worth having against a
double-tap, but it is hygiene, not the load-bearing risk I made it out to be. **This removes the main
technical objection to the feature.**

One risk §1–§10 understated, though, and it is now the top one: **a stale number lies to buyers.**
"15 available" that is actually 2 is worse than showing nothing, in an app whose whole value is trust.
So Tier 1 must include auto-decrement on sold and a trivially easy way for the seller to correct it —
those are not optional polish.

**Revised verdict: ~1 cycle, low risk, clear value. Do it.**

---

## 0b. UPDATE — "how do I know they're all sold, and who bought how many?"

The owner called this "a big feature". It is the opposite: **it is the part that already exists.**
Checked in the schema rather than assumed.

`transactions` today:

```
buyer_id · seller_id · listing_id · final_price · currency · status(reserved|sold) · completed_at
index_transactions_on_listing_id_while_open  UNIQUE where (status = 0)
```

So a **per-buyer sales ledger is already recorded on every sale** — who, from whom, which listing,
what price, in what currency, when. `Listing has_many :sale_transactions`. Reviews already hang off
each transaction, and the profile trust counters already increment per transaction.

**"Who bought how many" therefore needs exactly one column: `transactions.quantity` (default 1).**
The row it belongs on is already being written on every sale.

**"How do I know they're all sold" is then a comparison, not a feature:**
`SUM(sold transactions.quantity) >= listings.quantity` → flip the listing to `sold`, which is the
existing terminal state that already archives it and pulls it from `browsable`. No new lifecycle.

### The one real constraint, and it is worth knowing about

That partial unique index — `UNIQUE (listing_id) WHERE status = 0` — means **only one *reserved*
transaction may exist per listing at a time.** Consequences:

- **Many SOLD transactions per listing: already allowed.** `status = 1` is outside the index. The
  multi-buyer sales ledger works today, untouched.
- **Many RESERVED transactions per listing: blocked by the database.** So holding units for several
  buyers at once (Tier 2) requires dropping or rewriting that index — a real migration on live data.

This is a good constraint, not an obstacle: it is precisely the line between Tier 1 (cheap, ship it)
and Tier 2 (per-unit holds, defer). It also means Tier 1 cannot accidentally corrupt anything — the DB
physically prevents the ambiguous case.

### The actual gap

`GET /my/transactions` exists (TASK-TX01) and `hatiwal-mobile/src/api/transactions.ts` calls it — but
**no screen renders it on either client.** The ledger is written and fetchable and never shown. So the
honest scope of "save info who bought how much" is:

1. `transactions.quantity` — one column, one migration.
2. **A seller-facing sales list** — the screen that does not exist yet. This is the real work, and it
   is worth doing on its own merits even without quantity: a seller today cannot see their own sales
   history anywhere.
3. `SaleBuyerCard` becomes a list instead of one buyer (it already renders one, from TASK-R418).

That is still inside the ~1 cycle estimate, with the sales-list screen the largest single piece.

---

## 0c. UX — "will this be hard or confusing for users?"

The owner's fear, stated directly: *"I am afraid it will be hard for the user."* Taking it seriously,
because it is the right fear — and the answer splits sharply by who is looking.

### The governing rule: invisible unless used

**Anyone selling ONE item must never see this feature exist.** Not a field they skip, not a "1" they
confirm, not an extra tap. `quantity` defaults to 1, the input hides behind a single
*"I have more than one"* toggle, and every "N available" string renders only when `quantity > 1`.

If that rule holds, the blast radius on comprehension is zero for the majority of listings, and the
owner's fear is answered structurally rather than by good copy. **If a design cannot hold that rule,
the design is wrong.**

### Buyers: this REDUCES confusion

That is the entire point of the feature — the loss it fixes is a buyer who assumed there was one.
A number needs no explanation in any language, and Pashto/Dari numerals already render correctly
(the `ps` digit/hydration work landed earlier). Nothing to learn.

### Sellers: one new decision, at one moment

Marking sold previously meant tapping a button. Now it asks *how many*. That is the only genuinely
new cognitive step in the feature, and it lands at a moment when the seller wants to be finished.
Mitigation: pre-fill the remaining count, so the common case ("sold the lot", "sold one") is a single
tap with no arithmetic.

### The real confusion risk is PRICE, not quantity

This deserves more design attention than the quantity field itself.

The listing says `AFN 14,000`. The buyer wants 3. Is that 14,000 each, or 42,000 for the lot? Offers
today carry a bare `offerAmount` with no unit attached — so buyer and seller can both agree to
"40,000", mean different things, and **only discover it at the meetup**, face to face, with no payment
system to arbitrate and no delivery to reverse. In a product whose entire value is trust between
strangers meeting in person, that is the failure that matters.

Non-negotiable if quantity ships:
- Price renders as **"AFN 14,000 each"** whenever `quantity > 1`. Never a bare figure.
- The offer field is explicitly labelled per-unit, and the thread shows both the unit price and the
  implied total for the quantity under discussion.
- The same in all three locales, RTL included, with the numerals already handled.

### "Available" over-promises

There is no cart and no hold, so "15 available" implies something the app cannot honour — a buyer who
reads it and messages may find them gone. Prefer **"15 in stock"**: it describes the seller's claim,
not a reservation the system will keep.

### A stale count is worse than no count

"15 in stock" when there are 2 damages trust more than showing nothing at all. So the count is only
honest if it maintains itself: auto-decrement on every sale, one-tap correction for sales made
outside the app, and — if it has not been touched in a long time — say when it was last updated
rather than asserting it as current.

### Summary

| Who | Verdict |
|---|---|
| Buyer of a single item | Sees nothing new |
| Buyer of a multi-unit listing | **Less** confused than today — that is the feature |
| Seller of a single item | Sees nothing new, if the invisible-unless-used rule holds |
| Seller of multiple | One new question ("how many?"), pre-filled |
| **Everyone, if price-per-unit is unclear** | **Genuinely confusing, and it fails at the meetup** |

So: not hard for buyers, mildly for sellers, and the thing to design carefully is per-unit pricing.

---

## 1. Verdict first *(superseded in part by §0 — kept for the reasoning)*

**It is not a rewrite, and it is smaller than it looks — but it is not small, and it changes what
Hatiwal is.** The engineering is tractable because the data model already goes most of the way
(see §3). The genuinely hard part is not code, it is **product positioning and concurrency**.

- **Technical size:** medium. ~2–3 focused cycles, backend-led, mobile and web following. No
  destructive migration.
- **Technical risk:** concentrated in exactly two places (§5.1 concurrency, §5.2 the `status` enum).
  Everything else is mechanical.
- **Product risk:** higher than the technical risk, and the real decision (§6).

**Recommendation: do it, but as "stock count", not as a shopping cart — and only after deciding §7.**
A one-line answer to the owner's actual question: *"complicated in two specific spots, mechanical
everywhere else, and it quietly turns you into a shop — which may be exactly what you want."*

---

## 2. What was asked vs what this brief assumes

The request said *"seller can see and seller can try to buy multiple"*. Read as: **the buyer** sees
the quantity and can ask for more than one. Say so if that is wrong, because the whole brief pivots
on it.

Assumed scope: **N identical units on one listing.** Not variants (sizes/colours), not a cart across
listings, not delivery. Variants are a much larger feature and are explicitly out of scope here.

---

## 3. The good news — the model is already 80% ready

This is the finding that changes the estimate, and it was worth checking before guessing.

| What we feared | What the code actually does |
|---|---|
| One sale per listing, hard-coded | `Listing has_many :sale_transactions` — **already many**, no uniqueness constraint |
| Reviews would break with multiple buyers | `Review belongs_to :sale` (a Transaction), unique per `(reviewer_id, transaction_id)` — **already per-sale** |
| Trust counters would double-count | `bump_trust_counters!` fires **per transaction** — already correct for N sales |
| One conversation per listing | Unique per `(listing_id, buyer_id)` — **already many buyers per listing** |
| Chat/offers assume one buyer | Offers live on messages inside a per-buyer conversation — already isolated |

So multi-buyer, multi-sale, multi-review, multi-conversation and per-sale reputation **already work**.
That is the expensive half of this feature and it is done.

## 4. What actually breaks

Two real problems, then a long tail of display work.

### The core breakage: `status` conflates two different things

```ruby
enum :status, { draft: 0, active: 1, reserved: 2, sold: 3 }
scope :browsable, -> { active.not_expired.not_removed.ordered }
```

Today `status` means both *"where is this listing in its life"* and *"is the item still available"*.
With quantity those separate:

- 5 units, 2 sold → the listing must stay **`active`** and browsable, but is no longer "untouched".
- 5 units, 5 sold → **`sold`**, archived, out of the feed.
- "Reserved" stops being a property of the **listing** and becomes a property of **units**.

`Listing#reserve_with_buyer!` and `#sold_with_buyer!` both flip `status` on the listing, and
`reserve_with_buyer!` **updates an existing transaction** rather than creating another — so as written,
reserving for a second buyer overwrites the first. That is the single most important line to change.

### Blast radius in the clients

| Where | Count |
|---|---|
| `"draft" / "active" / "reserved" / "sold"` string refs in `hatiwal-mobile/src` | **686** |
| Same in `hatiwal-web/src` | **60** |
| Components keyed on status (`StatusBadge`, `status ===`) | **60 files** |

686 is alarming at first glance and mostly is not: the great majority are tests and enum plumbing that
keep working if `status` keeps its current meaning for single-unit listings. **The design goal is
therefore: quantity must be additive, and `status` must keep meaning exactly what it means today when
`quantity == 1`.** Any design that redefines `status` will genuinely cost weeks.

---

## 5. The two hard problems

### 5.1 Concurrency — ~~the one that can actually lose money or trust~~ **OVERSTATED, see §0(c)**

> **Correction.** This section claimed two buyers could each be told they got the last unit. They
> cannot: `reserve` and `sold` are seller-owned `PUT /my/listings/:id/...` endpoints behind Pundit, so
> **no buyer-facing code path changes stock**. Only the seller decrements, and the seller is one
> actor. Two buyers asking for the same units is a chat conversation, not a data race — same as today.
>
> `with_lock` + `CHECK (sold_count <= quantity)` are still worth adding as cheap hygiene against a
> seller double-tapping, and the CHECK costs one migration line. But this is not the load-bearing
> risk, and it should not be used as an argument against the feature.
>
> **The real top risk is a stale count** — "15 available" when there are 2. See §0.

`reserve_with_buyer!` has no row lock today. Original (overstated) reasoning kept below for the trail:
with quantity, an unlocked decrement was assumed to allow overselling. It does not, because buyers
cannot reach the decrement.

### 5.2 What "reserved" means with 5 units

Genuine product question, no obviously right answer:

- **A** — Reserved holds specific units. 5 units, 2 reserved → 3 buyable. Needs expiry, or stock
  leaks to buyers who never show up.
- **B** — Reserved is advisory. Everything stays buyable; the seller sorts it out in chat. Matches how
  the app works now and how informal trade actually works.
- **C** — No reserve for multi-unit listings at all. Simplest and most honest.

**Recommendation: B for v1**, because it needs no new expiry machinery and Hatiwal's whole flow is
already "agree in chat, meet in person". Revisit if sellers complain.

---

## 6. The part that is not engineering

**Quantity moves Hatiwal from second-hand C2C toward small-business retail.** Today's model is one
person, one thing, meet and sell. "I have 12 phone cases" is a shop.

That may be exactly the right growth move — small traders in Kabul with repeat stock are a real
market, and the app is already multilingual and free. But it changes:

- **Trust signals.** "Sold 40 items" means something different for a trader than a neighbour. The
  double-blind review system was designed around one-off exchanges.
- **The feed.** One trader with 30 units can dominate a category. Needs per-seller diversity in
  browse, which does not exist today.
- **Expectations.** Buyers of "stock" expect availability to be accurate, replies to be fast, and
  something like a refund conversation when it is not. None of that exists.
- **MVP constraints.** `CLAUDE.md` says no payment, no delivery. Quantity pushes hard against both:
  the natural next question after "I'll take 3" is "can you deliver them?".

**This is the actual decision.** The code is the easy part.

---

## 7. Product decisions needed before any code

1. **Who is this for** — the neighbour with 3 spare chairs, or the trader with 30 cases? Different
   features follow.
2. **Buy multiple in one go, or one unit at a time?** Does one buyer taking 3 units create **one**
   transaction with `quantity: 3`, or **three** transactions? This decides the trust counters, the
   reviews, and the whole schema. *(Recommendation: one transaction with a quantity — a buyer who
   takes 3 units is one deal and should leave one review, not three.)*
3. **Is the price per unit?** Assume yes. Then what does an offer of "40,000" mean — per unit or the
   lot? Offers currently carry a bare `offerAmount`; ambiguity here creates real disputes at a meetup.
4. **Reserved semantics** — §5.2 A, B or C.
5. **Does a sold-out listing archive or relist?** A trader restocking wants "add 10 more", which is a
   different lifecycle from today's terminal `sold`.
6. **Does quantity show in browse**, or only on the detail page? Showing it invites "still have 5?"
   messages; hiding it wastes the signal.

---

## 8. If it goes ahead — shape of the work

Additive only. Nothing below rewrites existing behaviour for single-unit listings.

**Phase 1 — API (the whole risk lives here)**
- `listings.quantity` (default 1, `>= 1`) and `listings.sold_count` (default 0).
- `CHECK (sold_count <= quantity)` in the DB.
- `available_count` = `quantity - sold_count`, exposed on every serializer view.
- `transactions.quantity` (default 1) if decision §7.2 is "one transaction".
- `with_lock` on reserve/sold; `sold_with_buyer!` increments `sold_count` and only sets
  `status: :sold` when `available_count` hits 0. **`reserve_with_buyer!` must create a new
  transaction, not update the existing one.**
- `browsable` unchanged — a partially-sold listing is still `active`, so the feed needs no change.
- Specs: the concurrency case (two simultaneous buyers for the last unit) is the one that matters.

**Phase 2 — mobile**
- Quantity field in the listing form, defaulting to 1 and hidden behind "I have more than one" so the
  common case is untouched.
- `"3 of 5 available"` on detail; a quantity chip on the card only when `quantity > 1`.
- Buyer picker and the reserve/sold sheets take a quantity.
- `StatusBadge` gains a "partially sold" treatment, and **`SaleBuyerCard` becomes a list** — a seller
  with 3 sales on one listing must see all three buyers.

**Phase 3 — web parity**
- Same fields, same display, `MOBILE_TO_WEB_MIGRATION.md` row. Small, because the web client already
  mirrors the mobile contract.

**Deliberately out of scope:** variants, cart across listings, delivery, payment, partial refunds,
low-stock alerts.

---

## 9. Cost, honestly

**Tier 1 only (recommended — see §0):**

| | Estimate | Confidence |
|---|---|---|
| API — `quantity`, `sold_count`, CHECK, decrement on sold, serializer field | 0.5 cycle | high |
| Mobile — form field behind "I have more than one", "N available" on detail + card, quantity in the sold sheet | 0.5 cycle | medium-high |
| Web — same fields, mirrors the mobile contract | 0.25 cycle | high |
| **Total** | **~1 cycle** | medium-high |

**Tier 2 (per-unit reserve holds, expiry, partial-sold states): +2 cycles.** Not recommended until
sellers demonstrably fail to keep Tier 1 accurate.

Both assume reserve stays advisory (§5.2 B), quantity is hidden unless used, and no variants.
The earlier ~2.5–3 cycle figure bundled Tier 2 in by default and treated concurrency as load-bearing;
§0 corrects both.

## 10. How this goes wrong

- **Redefining `status`.** Touching 686 references turns 3 cycles into 3 weeks. Keep `status` meaning
  what it means today.
- **Skipping the lock.** Two buyers, one unit, both at the meetup. This is the failure that costs
  actual trust, and it is one `with_lock` away.
- **Letting variants in.** "5 units" and "5 units in 3 sizes" are different products. Say no.
- **Not deciding §7.2 first.** One-transaction-with-quantity vs N-transactions changes the schema,
  the reviews and the trust counters. Changing it later is a data migration on live sales.
- **Assuming the trader use case without asking one.** The most useful next step is not code (§11).

---

## 11. Suggested next step

Before any of this: **ask two or three actual sellers whether they have repeat stock.** If they are
neighbours clearing a cupboard, this feature is a distraction and the effort belongs in trust,
search, or the human-only device testing still open on the board. If they are traders, quantity is
probably the highest-leverage feature not yet built — and it is 3 cycles, not a rewrite.

The engineering answer is *"yes, and it is cheaper than you would guess."* The product answer needs
a user, not a developer.

---

## 12. UI design spec — marketplace-designer review (2026-08-21)

Design-only pass over the three surfaces named in the brief, against the governing rule already
agreed in §0c: **a seller listing ONE item must never see this feature exist.** Files read:
`ListingForm.tsx`, `ListingDetail.tsx`, `ListingCard.tsx`, `useListingLifecycle.ts`,
`BuyerPickerSheet.tsx`, `SaleBuyerCard.tsx`, `PriceTag.tsx`, `StatusBadge.tsx`/`statusAccent.ts`,
`PriceDropBadge.tsx` (the closest existing precedent for a small, quiet detail-page pill), and
`DESIGN_SYSTEM.md`. No application code was changed for this review.

### 12.1 Surface 1 — `ListingForm.tsx`: where the seller states quantity

The form already has the exact right precedent one section above where quantity belongs: the
**Negotiable** switch (price section, `styles.field`, a row with an icon + label + RNR `Switch`,
`flexDirection: isRtl ? "row-reverse" : "row"`, `justifyContent: "space-between"`). Quantity should
be a second row in that *same* price block, immediately below Negotiable — no new section header, no
new `Separator`. Reasoning: quantity is semantically an annex to price ("does this number mean one
item or a lot?"), so grouping it there keeps "everything about how the price should be read" in one
place, and a header ("Quantity") would be visible chrome even collapsed — a bare toggle row costs
nothing extra when off.

- **Off (default, 100% of single-item sellers):** icon (`Boxes`, lucide) + `t("listing.form.multipleUnitsLabel")`
  ("I have more than one") + `Switch`. One 44pt row, byte-identical in weight/placement to the
  Negotiable row already there. Nothing else renders. `quantity` is never shown, never asked, never a
  "1" to confirm — the rule holds structurally, not by copy.
- **On:** reveal one field directly below, same rhythm as the Title/Price fields — `FieldLabel` +
  `Input` with `keyboardType="numeric"`, **not a stepper**. A ± stepper was considered and rejected:
  the owner's own example is 15 units, and 14 taps to reach 15 is worse than typing two digits — the
  existing Price field already proves the numeric-`Input` + `normalizeDigits` pattern handles ps/fa
  numeral keypads correctly, so this is a straight reuse, not a new interaction. Toggling on pre-fills
  the field with **"2"** (not blank, not "1") — flipping the toggle already means "more than one," so
  the seller's very next keystroke should be able to just fix the number up or down, never type past an
  empty/invalid state first. Toggling off clears the field and silently reverts to `quantity: 1`.
  Helper caption (`text-xs`, `colors.mutedForeground`): *"Buyers will see this before they message
  you."* — ties the field to its payoff so it doesn't read as arbitrary inventory bookkeeping.
- **Schema shape:** `quantity: z.coerce.number().int().min(1).max(999).optional().default(1)` — additive,
  mirrors how `price`/`categoryId` are already coerced. Never a publish blocker (a seller can publish a
  single item with the toggle off exactly as today); if the toggle is on, the field follows the same
  inline-error pattern `FieldError` already renders for Title/Price/Category.
- **Duplicate/relist:** needs no new decision. `handleDuplicate`'s existing text-field prefill (price,
  condition, category, description) already copies quantity for free once it's a plain form field —
  consistent with treating it as one more text field, not a special case.

### 12.2 Surface 2 — buyer-facing display (`ListingCard`, `ListingDetail`, `PriceTag`)

**Per-unit price — the one place this deserves real design weight, per §0c.** Extend `PriceTag`
itself, don't fork it and don't leave the "each" suffix to each call site to remember (that is
precisely the class of bug the spike is warning about: a caller that forgets it recreates the
ambiguity at the meetup). Add one optional prop:

```
perUnit?: boolean   // pass listing.quantity > 1, never a literal `true`
```

Rendering: wrap the existing price `Text` in a `flexDirection: isRtl ? "row-reverse" : "row"` row with
`alignItems: "baseline"`, and — only when `perUnit` — add a second, smaller `Text` right after it:
`t("listing.stock.each")` ("each"), at roughly 55–60% of the price's own font size, `colors.mutedForeground`,
never `font-bold`. **The number itself keeps its exact existing size/weight/color at every size
(`lg`/`md`/`sm`)** — only a small trailing qualifier word is added. This is the same visual grammar the
codebase already uses for a qualifier riding along a hero number (compare `PriceDropBadge`'s muted
strikethrough beside the emphasized new price) — it doesn't compete with price primacy, it disambiguates
it. Every call site that shows this listing's price (`ListingCard`, `ListingDetail`'s hero `PriceTag`,
`BuyerPickerSheet`'s "Agreed price" `PriceTag`, `SaleBuyerCard`'s final-price `PriceTag`) passes the same
`perUnit={listing.quantity > 1}` — one flag, one prop, no surface can drift out of sync with another.

**Stock pill — detail only, not the browse card.** `ListingCard.tsx` was read in full: the grid card
already has zero spare real estate. Its own comments document that every row is a **fixed-height slot,
always rendered**, because `@shopify/flash-list`'s `numColumns` grid has no `columnWrapperStyle` to
keep row-siblings level — the 26px "badge slot" already arbitrates between the price-drop badge and
the firm-price badge (mutually exclusive, one slot, by design, to avoid clutter). A quantity chip would
either (a) fight for that already-contested slot, or (b) add a new slot whose reserved height then
grows **every** card in the feed — including the single-item majority — which directly breaks the
"invisible unless used" rule at the pixel level even if the chip itself renders nothing for `quantity
=== 1`. Recommendation: **no browse-card chip.** The value this feature exists to deliver (a buyer who
assumed "1" learns otherwise) is fully captured on the detail screen, before the buyer ever taps
"Message seller" — which is the exact moment §0c identifies as where the harm currently happens. Paying
a layout cost on 100% of cards to save zero additional harm is not a good trade. If a future need
(competitive differentiation for traders, §6) wants this on the card, treat it as its own decision, not
a rider on Tier 1 — and if so, the only free real-estate is inside the existing 26px badge slot, lowest
priority behind the two badges already sharing it, not a new row.

**Detail placement, weight, copy:** right below the (now `perUnit`-aware) hero `PriceTag`, above the
title — same position `PriceDropBadge`/the firm-price `Badge` already occupy on `ListingDetail.tsx`
(`listing.negotiable === false` block, lines ~458–469). Reuse the RNR `Badge` component exactly the way
the firm-price pill already does (`<Badge label={...} variant="muted" icon={Boxes} />`) — this is not a
new component, it's the same composition pattern already in the file, extended with an icon:

- Untouched stock (`sold_count === 0`, `quantity > 1`): `variant="muted"`, `t("listing.stock.inStock", { count })`
  → **"15 in stock."** "In stock" was chosen over "available" deliberately (§0c already argues this):
  there is no cart and no hold in this app, so "available" promises something the system can't back —
  "in stock" is the seller's own claim, not a reservation guarantee.
- Partially sold (`0 < sold_count < quantity`): `variant="warning"` (the *same* amber token
  `StatusBadge`/`getStatusAccent` already use for `reserved` — no new color), `t("listing.stock.leftOfTotal",
  { available, total })` → **"2 of 15 left."** Escalation threshold reuses `ExpiryBadge`'s own pattern
  of a day-count-or-status dual rule rather than inventing a new one-off: fire the warning tone when
  `available <= 2 OR available / total <= 0.2`, whichever comes first; otherwise stay `muted` (e.g. "8
  of 15 left" is not urgent and shouldn't look alarming).
- Sold out (`available_count === 0`): **not a state this UI needs to handle.** Per §0b's own math, the
  listing flips to `sold` and leaves `browsable` the moment the last unit is recorded sold — a buyer can
  never see "0 of 15 left" on a live listing. Worth stating explicitly so nobody spends time designing
  a state that the backend already makes unreachable.
- Owner surfaces (My Listings, owner detail) use the identical pill/tones — no separate "seller view" is
  needed; the seller benefits from the same at-a-glance tally the buyer does.

**`StatusBadge` — no new variant. This is the one place to explicitly push back on scope creep.** §4 of
this document is unambiguous that `status` must keep meaning exactly what it means today when
`quantity === 1`, and §8 confirms `browsable` is unchanged — a partially-sold listing stays `active`.
So a partially-sold listing's `StatusBadge` must keep reading **"Active" (green)**, identical to a
fully-unsold active listing. Adding a "partially sold" badge variant would be introducing a fifth
lifecycle state through the side door of a visual component — precisely the "redefining `status`" trap
§10 names as the way this turns 1 cycle into weeks. The partial/exhausted signal belongs entirely to
the new stock pill above, which is additive and lives beside `StatusBadge`, never inside it.
`SaleBuyerCard`'s own color (via `getStatusAccent`, sold vs. reserved) is likewise untouched by
quantity — it already only cares about the transaction's own status, not the listing's stock level.

### 12.3 Surface 3 — mark-sold flow (`BuyerPickerSheet.tsx` + `useListingLifecycle.ts`)

**Reserve never learns about quantity.** §5.2 of this document recommends "B — reserved is advisory"
for v1 specifically to avoid per-unit hold machinery. So the new quantity control described below is
gated on `action === "sold"` only — a single-item seller's Reserve flow, and a multi-unit seller's
Reserve flow, both stay exactly as they render today. Zero new UI on that path.

**Mark sold — one new field, pre-filled, appearing only when it can matter.** `BuyerPickerSheet`
already threads `price`/`currency` through as props; add one more: `remainingQuantity?: number` (the
listing's `available_count`, i.e. `quantity - sold_count`), supplied by `useListingLifecycle` from the
listing it already has in scope. In the sheet:

- If `remainingQuantity` is undefined or `<= 1`, render **nothing new** — the sheet is pixel-identical
  to today for every single-item listing (satisfies the governing rule on this surface too, not just
  the form).
- If `remainingQuantity > 1` and `action === "sold"`, insert one row **after** the existing "someone
  else / skip" row and **before** the existing optional final-price `Input` (same vertical position the
  final-price field already occupies relative to buyer selection) — same `Label` + numeric `Input`
  pattern as the listing-form quantity field (reuse, don't reinvent): `t("buyerPicker.quantityLabel")`
  ("How many did they take?") with a small subtitle showing the count context, e.g. *"{{remaining}}
  left"* so the seller never has to do arithmetic in their head. **Pre-filled to the full
  `remainingQuantity`** — i.e. the default assumption is "sold the lot," which is both the single most
  common real case (the owner's own "bought 15 bags, sold them" story) and the case explicitly called
  out in §0c as needing to be a single tap with no math. A partial sale ("sold 3 of 15") means the
  seller edits that one number down before confirming — the *only* new cognitive step this feature adds
  anywhere, and it lands exactly once, at the moment the seller already wants to finish the deal.
- Validation clamps `1 <= quantity <= remainingQuantity`, surfaced with the same inline destructive-text
  pattern the sheet already uses for `priceError` (a `quantityError` sibling, not a new error UI).
- **Tap count, unchanged case:** pick buyer (1 tap) → confirm (1 tap) — identical to today, because the
  field defaults to "all remaining" and never needs to be touched. **Tap count, partial case:** pick
  buyer (1 tap) → edit one number → confirm (1 tap) — one small addition, matching §0c's own framing.
  Confirm-mode (`preselectedBuyer`, the post-offer-accept path) is unaffected — that path is reached from
  a single accepted offer for a specific price, which today has no notion of "how many," and extending
  it is out of scope here (an offer is implicitly for the listing as posted; a multi-unit offer
  negotiation is a chat-level concern, not this sheet's).
- **Wire shape:** extend `BuyerPickerResult` with one optional field, `quantity?: number` (`undefined`
  for every single-unit case — the API already defaults `transactions.quantity` to 1 per §0b) —
  additive, matches how `finalPrice` is already optional on that same type.

### 12.4 Surface 3b — `SaleBuyerCard` as a list of buyers, not a table

Per §0b, many SOLD transactions per listing already work today (only concurrent *reserved* rows are
blocked) — so `listing.sale` (singular) becomes `listing.sales` (an array), and the card renders **the
existing row, once per sale, stacked** — never a grid/table layout:

- Keep every existing element of today's single-buyer card completely unchanged as the per-row unit:
  the short headline, the collapsed `UserIdentity` + compact Message-button row, the optional final
  price via `PriceTag`. Stack N of these rows inside **one** outer `Card` (unchanged border/radius/
  padding), separated by a plain hairline `Separator` between rows — not N separate bordered cards
  competing for attention, and not a new dense/columnar component.
- The **only** new piece of information per row is the quantity that specific buyer took, folded into
  the existing headline copy: `t("listing.sale.soldTo", { name })` stays exactly as-is (byte-identical,
  zero regression) when that sale's `quantity === 1`; a sibling key `t("listing.sale.soldToQuantity",
  { count, name })` → **"Sold 3 to {{name}}"** is used only when `quantity > 1`. No table, no columns —
  the count simply becomes a word inside the sentence the seller already reads.
- One roll-up header sits above the stacked rows **only when there is more than one sale**:
  `t("listing.sale.tally", { sold, total })` → **"5 of 15 sold."** This is the single glanceable fact a
  seller with several buyers actually wants without reading every row — it directly answers §0b's "how
  do I know they're all sold" with the same tally already proposed for the buyer-facing stock pill
  (§12.2), reused rather than invented twice.
- Sort rows newest-first by `completedAt` (already recorded on every transaction) — no new sort logic.
- Every row still renders through `UserIdentity` unchanged — no new avatar/name/verified assembly.

This satisfies "without it becoming a table" literally: visually it reads like a short stack of
notification-style rows (closer to a mini conversation list), not a spreadsheet.

**The real risk on this surface, flagged explicitly:** §0b also names a **seller sales-list screen
that does not exist yet at all** (`GET /my/transactions` is wired but nothing renders it). That screen
— not this card — is where "quantity as a ledger UI" could quietly balloon past the ~1 cycle estimate
if someone tries to make it fancy (filters, export, per-buyer analytics, etc.). Recommendation: build
that screen, if built now, as plain as this stacked-row pattern and nothing more; treat any richer
version as a separate, explicitly-scoped follow-up ticket, not something absorbed silently into
"quantity is simple."

### 12.5 Copy — en / ps / fa

All new keys are additive, in the existing `listing.json` (`stock.*`, `form.*`, `sale.*` namespaces)
and `buyerPicker.json` files, matching the existing nesting convention (`priceDrop.*` is the direct
precedent for `stock.*`).

| Key | en | ps (Pashto, RTL) | fa (Dari, RTL) |
|---|---|---|---|
| `listing.form.multipleUnitsLabel` | I have more than one | زه له یوه څخه ډیر لرم | بیشتر از یک عدد دارم |
| `listing.form.quantityLabel` | How many do you have? | څو دانې لرئ؟ | چند عدد دارید؟ |
| `listing.form.quantityHelper` | Buyers will see this before they message you. | پیرودونکي به دا مخکې له پیغام ورکولو وویني. | خریداران این را پیش از پیام دادن می‌بینند. |
| `listing.stock.each` | each | هره دانه | هرکدام |
| `listing.stock.inStock` (`{{count}}`) | {{count}} in stock | {{count}} دانې موجودې دي | {{count}} عدد موجود است |
| `listing.stock.leftOfTotal` (`{{available}}`,`{{total}}`) | {{available}} of {{total}} left | {{available}} د {{total}} نه پاتې دي | {{available}} از {{total}} باقی مانده |
| `listing.sale.soldToQuantity` (`{{count}}`,`{{name}}`) | Sold {{count}} to {{name}} | {{count}} دانې {{name}} ته وپلورل شوې | {{count}} عدد به {{name}} فروخته شد |
| `listing.sale.tally` (`{{sold}}`,`{{total}}`) | {{sold}} of {{total}} sold | {{sold}} د {{total}} نه وپلورل شوې | {{sold}} از {{total}} فروخته شد |
| `buyerPicker.quantityLabel` | How many did they take? | دې پیرودونکي څو دانې واخیستې؟ | این خریدار چند عدد گرفت؟ |
| `buyerPicker.quantityRemainingHint` (`{{remaining}}`) | {{remaining}} left | {{remaining}} پاتې دي | {{remaining}} باقی مانده |
| `buyerPicker.errors.invalidQuantity` (`{{max}}`) | Enter a number between 1 and {{max}} | له ۱ او {{max}} پورې یو شمېر ولیکئ | یک عدد بین ۱ و {{max}} وارد کنید |

"In stock" was preferred over "available" in every locale for the same reason (§0c): none of the three
should imply a reservation the app can't honour. `موجود`/`دانه` were chosen over more formal
retail/warehouse vocabulary (e.g. `انبار`) because they match how the biggest Persian-language
classifieds product (Divar) already phrases stock, and read as bazaar-natural rather than
translated-English in both Dari and Pashto. All strings are pure `{{count}}`/`{{name}}` interpolation
with no left/right literals, so they mirror correctly under `isRtl` by construction.

### 12.6 Verdict

**Buildable, and simple enough — with the scope held exactly to Tier 1 as this document already
recommends.** Every one of the three surfaces has a clean, additive treatment that costs the
single-item seller and buyer **nothing**: the form hides a single toggle behind existing row styling,
the browse card is untouched, the mark-sold sheet adds one field that only appears when it can
matter and defaults to zero extra taps for the common case, and the two shared components that must
change (`PriceTag`, `SaleBuyerCard`) are extended with one optional prop / one array each, not forked.
No surface needs a new status, a new library, or a new interaction pattern (the numeric `Input` reuse
over a stepper is the one place a "friendlier-looking" alternative was deliberately rejected because it
would cost more taps for the headline use case).

Two things would make this **not** simple, and are the actual risk, not the quantity field itself:

1. **Per-unit pricing being treated as an afterthought.** If `perUnit` is bolted onto only the detail
   screen's hero price and not threaded through `ListingCard`, `BuyerPickerSheet`, and chat's offer
   bubble consistently, the exact ambiguity the owner is trying to prevent (buyer and seller agreeing on
   "40,000" meaning different things) survives the feature. This is a discipline risk, not a design
   risk — the fix is one shared prop, but every call site has to actually pass it.
2. **The seller sales-list screen (§0b) getting scope-crept.** It is real, necessary, unbuilt work, and
   is the one piece of this that could plausibly grow past the estimate if it's treated as a chance to
   build a full sales-analytics view instead of the plain stacked-row list this spec describes.

Recommend proceeding on the three named surfaces as specified above.

---

## 13. SHIPPED — Tier 1, 2026-08-21

Tier 1 as scoped in §0(b) is built across all three repos. This section records what is on disk, what
was decided differently from the spec above, and what is deliberately still open.

### 13.1 API (`hatiwal-api`)

Migration `20260821000000_add_quantity_to_listings_and_transactions`:
`listings.quantity` (default 1), `listings.sold_units` (default 0), `transactions.quantity` (default 1),
plus three CHECK constraints — `quantity >= 1`, `transactions.quantity >= 1`, and
`sold_units BETWEEN 0 AND quantity`. The last one is the one that matters: the app clamps, but the app
is the thing that gets edited, so the database refuses to oversell whatever a future bug does.

`Listing#available_units` / `#multi_unit?` / `#record_units_sold!(units)`. `record_units_sold!` takes a
row lock, clamps to what is left, and **returns whether that sale emptied the listing** — which is what
made the one-line controller change safe:

```ruby
sold_out = @listing.record_units_sold!(txn&.quantity || @listing.available_units)
@listing.sold! if sold_out          # was: @listing.sold! unconditionally
```

That single line is the whole §4 "`status` conflates lifecycle with availability" problem, resolved
without touching the enum: selling 3 of 15 leaves the listing `active` and in `Listing.browsable`, and
only the sale that empties it retires the listing. `sold_with_buyer!` gained an optional `quantity:`
that defaults to the whole remainder, so "I sold them" still needs no number.

`quantity` / `available_units` / `multi_unit` are **base** fields on `ListingSerializer` — deliberately
not view-scoped, because every client gates its per-unit price rendering on `multi_unit` and a view
that omitted it would recreate the §0c ambiguity on that surface alone.

`ConversationSerializer` hand-rolls its own small listing hash rather than reusing `ListingSerializer`,
so it needed the fields added explicitly (both `:list` and `:detailed`). This was easy to miss and is
exactly the class of gap §12.2 warns about — the chat thread is where "how much for 5?" is asked.

Tests: 53 new examples (`spec/models/listing_quantity_spec.rb`,
`spec/serializers/listing_serializer_quantity_spec.rb`,
`spec/serializers/conversation_serializer_quantity_spec.rb`,
`spec/requests/api/v1/my/listings_quantity_spec.rb`) covering the feed invariant, two buyers on one
listing, the DB refusing to oversell, and the untouched single-unit path. Full suite 1384 / 0 failures,
RuboCop 276 files / 0 offenses.

### 13.2 Mobile (`hatiwal-mobile`)

- `src/utils/stock.ts` — `availableUnitsOf` / `totalUnitsOf` / `hasStockToShow` / `isLowStock`. The
  thresholds live in ONE place because the same three questions get asked on four screens.
- `PriceTag` gained `perUnit` exactly as §12.2 specifies, and it is passed at **every** listing-price
  call site: browse card (both layouts), listing detail, seller detail, seller card, chat header, chat
  inbox row, first-message sheet, publish-success sheet, and `SaleBuyerCard`'s final price. §12.2
  called this "a discipline risk, not a design risk"; treating it as a checklist is how it was paid.
- Stock pill on the buyer's detail screen (muted, amber when running out) and on the seller's own
  detail screen — the latter with the "N of M left" phrasing, because the seller's question is "how do
  I know when they're all gone?", not "how many can I buy?".
- `ListingForm`: one collapsed switch below Negotiable, numeric `Input` revealed on, pre-filled "2",
  and the switch is **seeded from the listing being edited or duplicated** — without that a 15-unit
  listing reopened with the switch off over a hidden value of 15 the seller could neither see nor fix.
- `BuyerPickerSheet`: "How many did you sell?" above the final-price field, pre-filled with the whole
  remainder (so "I sold the lot" stays one tap), shown only for `sold` on a multi-unit listing.
- The chat thread's own reserve/sold flow gets the stock too — the seller often closes the deal there,
  and without it that surface could only ever sell the whole batch at once.
- Tests: 48 new Jest tests + 6 new Storybook states, plus
  `maestro/seller/multi_quantity_partial_sale.yaml` — the one check no unit test can make: after
  selling 3 of 15 the listing is still **Active** and still in the seller's Active tab. A new
  `quantity:` on the `e2e_listing` seed helper (default 1, so every existing fixture is unchanged)
  plus one multi-unit fixture and a conversation on it, because the buyer picker only offers
  conversation participants and the quantity field only renders once a real buyer is selected.

**Decided differently from §12.2:** the *final price* on a multi-unit sale is **per unit**, not the deal
total. The field's placeholder was already the listing's own per-unit price, so that is what a seller
will naturally type — but "final price" on a 3-unit deal reads just as easily as the total, and the
number ends up in the sale record and the review. So the field now carries an explicit
`buyerPicker.finalPricePerUnitHint` caption ("The price for one item") whenever it asks for a quantity.

### 13.3 Web (`hatiwal-web`)

`src/lib/stock.ts` is a direct port of the mobile module, thresholds included — the two clients read
the same listing from the same API, so a divergence would show the same seller two different answers
about their own stock. `PriceTag` gained the same `perUnit`; a new `StockBadge` (with an `owner` prop
for the "N of M left" phrasing) reuses `FirmPriceBadge`'s quiet treatment rather than inventing one.
The listing form gained the same collapsed toggle, including the same seeding fix for edit **and** for
a restored autosave draft.

The e2e mock's `baseFields()` and the `serializer-view-keys.ts` snapshot were updated in the order that
file's header mandates (serializer → snapshot → mock), plus a multi-unit fixture and specs asserting
the "each" suffix, the localized stock line in ps/fa, and that a single-item listing shows no quantity
UI at all.

### 13.4 Still open (deliberately)

- **§0b's seller sales-history screen.** `GET /my/transactions` exists and now returns per-sale
  quantities; no screen renders it. This is the "who bought how many" ledger as a *list*, and it stays
  its own ticket precisely because §12.4 flags it as the piece most likely to scope-creep.
- **Reserve on a multi-unit listing** remains advisory and whole-listing (§5.2 B). The sheet does not
  ask "how many" when reserving, because the backend does not model a per-unit hold.
- **An offer carries no quantity.** `messages` stores an offer as an amount, so nothing downstream can
  tell whether "I offer 12,000" meant one of the 15 bags or the whole lot — and the seller accepting it
  is agreeing to a number whose meaning was never stated. This was NOT closed, because closing it means
  a quantity on the offer itself (schema + accept/counter flow + the offer bubble on both clients),
  which is Tier 2 work, not a rider on Tier 1. What DID ship is the cheap half: the "Listed price"
  anchor above the offer input now says *(each)* on a multi-unit listing, on both clients, so the buyer
  is at least reasoning from an unambiguous reference. If offers on batch listings turn out to matter,
  the honest fix is a quantity on the offer — not more copy.
- **Tier 2** (a `sales` array on the API + `SaleBuyerCard` rendering a list) is untouched.
- **On-device verification** on a real iPhone and Android — no agent can clear this (cf. TASK-Q501).

# Sell Flow Redesign — spec (2026-08-27)

> Mobile only. No `hatiwal-web` work in this pass (tracked as **SF-W1**, deliberately deferred).
> Source of truth for "what exists today": `docs/SELL_FLOW_AUDIT.md` (file:line verified). This
> document treats that audit as **the thing being replaced**, not a constraint. Where today's
> behaviour conflicts with the model below, the model wins.

## 0. Mandate, and two corrections that shaped it

The owner's instruction, verbatim-ish: *"I don't care what we coded and the docs we have added in
history — we will do what big tech does and what is good for UI/UX."* The model below is how
OLX / Facebook Marketplace / Vinted / Carousell / Mercari actually run a sell flow. Two things in
this document were revised **during** grooming, in response to real facts checked in the code —
recorded here because both change what got built and both are worth knowing about:

1. **First pass** proposed retiring `reserved` as a listing status entirely (three DB states, not
   four). **Reversed** after a blast-radius check: `reserved` is referenced in **117 mobile files
   and 26 hatiwal-web files** (both grepped, not estimated). Retiring the enum is a three-client
   breaking change for zero additional UX — the exact "redefining status turns 3 cycles into 3
   weeks" trap `docs/SPIKE_LISTING_QUANTITY.md` §10 already named once. **The DB keeps four
   values.** "Three states" is a presentation decision the seller UI makes, not a schema one — see
   §1.
2. **First pass of the reserve/search question** (inherited from the original brief) said a
   single-item reserve should keep leaving search, matching what shipped, and a batch should keep
   staying in search. **Reversed.** Big-tech reference apps (Vinted/Carousell/Gumtree) never hide a
   reserved item from search — they show a "Reserved" ribbon and keep it live, so the listing
   doesn't vanish and strand the seller if the deal falls through. **Both single-item and
   multi-item reserved listings now stay in search, in the feed, and message-able.** This is a real
   behaviour change from what's live today (§2 spells out the exact widen).

Everything else from the original brief stands: sell is the one-tap primary action from a live
listing; reserve is initiated from the chat thread, not the listing; buyer attribution is a
skippable follow-up, never a gate; mistakes are fixed with an undo toast plus an editable ledger
row, not a "correction form"; sold-out is automatic; a real Sales screen; a buyer-side quantity
stepper feeding a written total; invisible-unless-used for a single-item seller; price is never a
bare figure when `quantity > 1`; RNR + approved libraries only; en/ps/fa with RTL.

---

## 1. The model

### 1.1 Three states, presented — four states, stored

| | Draft | **Live** | Sold |
|---|---|---|---|
| DB `status` values folded in | `draft` | `active`, `reserved` | `sold` |
| Seller sees | "Draft" | "Live" (+ a **hold badge** when someone has a hold) | "Sold" |
| Buyer sees | never | in feed, in search, message-able (+ a **Reserved** ribbon when held) | never (terminal, out of `browsable`) |

The database is untouched: `enum :status, { draft: 0, active: 1, reserved: 2, sold: 3 }` stays
exactly as it is (`hatiwal-api/app/models/listing.rb:17`). What changes is **which DB states count
as "live" for search/messaging**, and **what the seller-facing chrome shows** for each. A held
single-item listing is still, technically, `status: reserved` in Postgres — the seller UI simply
never presents "Reserved" as a fourth top-level tab or state; it presents "Live" with a hold badge,
identically to how a held multi-unit listing (which stays `status: active` today, unchanged) is
already presented.

### 1.2 Reserve is a badge on a live listing, not a disappearance

**The behaviour change.** Today `Listing.browsable` is `active.not_expired.not_removed.ordered`
(`listing.rb:100`) — a single-item reserve (`my/listings_controller.rb#reserve`) flips `status` to
`reserved`, which drops it out of `browsable` and out of `ListingPolicy#start_conversation?`
(`active?` only, `listing_policy.rb:31`), and `ListingDetail.tsx`'s own `canContact` gate
(`listing.status === "active"`, `ListingDetail.tsx:419`) hides the "Message seller" button. A
buyer who finds a reserved listing today hits a dead end. **That is the thing big tech never
does**, and it's the thing this redesign fixes.

Going forward: **a reserved listing stays in search, in the feed, and message-able** — for both
single-item and multi-item. See §5 for the exact scope/policy/UI changes this requires.

### 1.3 Reserve is initiated from the chat thread

A hold is for a *person* — and by the time a seller wants to hold an item, they're already talking
to that person. `hatiwal-mobile/src/screens/chat/conversation/reserveAfterAccept.ts` already proves
this pattern end to end for one trigger (accepting an offer auto-prompts a reserve, scoped to that
conversation's buyer, via `BuyerPickerSheet`'s existing `preselectedBuyer` confirm mode — no picker,
no list, one confirm). This redesign **generalizes that exact, already-shipped mechanism** into a
manual "Place a hold" action, and **removes Reserve from the listing's own action list** (My
Listings, `MyListingDetail`, `SellerListingCard`) entirely — see §6.

### 1.4 Mark sold is the one-tap primary, always

From any live listing (`active` or `reserved` status alike — both are "Live"), "Mark sold" is the
single, loudest, always-present primary action — on the listing surfaces and inline in the chat
header. Reserve is never on the path to sold; a seller can sell straight from Live with zero prior
steps, exactly as `ListingPolicy#sold? = owner? && (active? || reserved?)` (`listing_policy.rb:26`)
already allows at the API today — the gap has only ever been the UI teaching reserve-first
(`docs/SELL_FLOW_AUDIT.md` §2).

### 1.5 State diagram

```
                    ┌─────────────────────────────────────────────┐
                    │                    LIVE                      │
   draft ──publish──▶  status: active  ⇄  status: reserved         │──mark sold──▶ SOLD
                    │  (no hold)          (single-item hold;        │  (terminal,
                    │                      multi-item hold keeps    │   auto, out of
                    │                      status: active + an      │   browsable)
                    │                      open Transaction)        │
                    └─────────────────────────────────────────────┘
                         ▲                        │
                         └──── release hold ───────┘
```

- **Both branches of Live are browsable, searchable, and message-able.** The only visible
  difference is a hold badge/ribbon.
- **Sold is automatic.** Stock reaching 0 ends the listing itself — no "mark sold out" action
  exists or is being added (`record_units_sold!` + `sold_out = ...; @listing.sold! if sold_out`,
  `my/listings_controller.rb:200-206`, unchanged).
- **Undo, not a state.** A seller who marks sold by mistake doesn't transition through a special
  state — they either tap "Undo" on the confirmation toast (within its window) or edit/delete the
  sale row later from the Sales screen (§9). Both paths route through the same backend correction
  (§8), which naturally re-opens a sold-out listing back to Live when the correction leaves stock
  available again — there is no separate "reopen" action to build.

### 1.6 Primary vs. secondary, by state and by item count

| State | Primary (one tap, always visible) | Secondary (More menu / chat) |
|---|---|---|
| Draft | Publish | Edit · Duplicate · Delete |
| Live, single-item, no hold | **Mark sold** | Edit · Duplicate · Delete · (from chat: Place a hold) |
| Live, single-item, held | **Mark sold** | Release hold · Edit · Duplicate · Delete |
| Live, multi-item, no hold | **Mark sold** | Edit · Duplicate · Delete · View sales (once ≥1 sold) · (from chat: Place a hold) |
| Live, multi-item, held | **Mark sold** | Release hold · Edit · Duplicate · Delete · View sales |
| Sold | *(none — terminal)* | Edit · Duplicate · Delete · View sales |

**Single-item listing invariant, unchanged from the original spike's governing rule:** a seller
with one item never sees a quantity control, a stepper, or a count anywhere in this flow. Every
control introduced below is gated on `listing.multiUnit === true` at the component level, never on
a client-side `quantity > 1` guess (`src/utils/stock.ts`'s own documented reasoning, reused as-is).

---

## 2. What requirement #2 from the original brief resolves to

The original ask was "reserve should explain its search consequence." Under this model **there is
no consequence to explain** — reserving never removes a listing from search, for either item count.
The fix is structural, not copy: nothing needs to warn the seller about a disappearance that no
longer happens. `BuyerPickerSheet`'s reserve mode gets **no new banner** — this simplifies the
original plan for this requirement, not complicates it.

What *does* need explaining, and is new to this redesign: a **buyer** browsing a reserved listing
should understand it might still fall through — see §5.3's "may still reply" line.

---

## 3. Judgment calls and flags (read before building)

Called out explicitly, per instruction, rather than silently built in:

1. **Kept the `/my/listings/:id/activate` route name unchanged.** Renaming it (e.g. to
   `release_hold`) would be pure churn — the route already does exactly the right thing
   (`cancel_open_transaction!` + `active!`, `my/listings_controller.rb:151-159`) and 117 mobile
   references to "reserved"-adjacent code is enough surface to touch without also renaming a
   working endpoint. **Only the mobile-facing label changes** ("Activate" → "Release hold"); the
   API client method (`listingsAPI.activateListing`) and the URL stay as-is.
2. **Offers stay paused on a reserved listing; messaging does not.** A reserved listing is no
   longer a dead end for browsing or chatting — but I kept `canOfferInThread`
   (`threadAvailability.ts:27-42`) excluding `reserved` from starting a **new** price negotiation
   from a *different* buyer, unchanged. Once a seller has a specific buyer's hold in progress,
   pausing new offers from other buyers (while still letting anyone message "is this still up for
   grabs?") matches how Vinted itself behaves and avoids two buyers bidding against a hold that's
   already agreed in principle. This needed a deliberate choice because the two signals (browsable
   vs. offerable) used to be the same boolean and are being split apart — flagging it so it isn't
   silently assumed away.
3. **Flag: the buyer-side quantity stepper risks looking like a cart.** Requirement #9 asks for
   "eBay/Amazon placement" — a stepper next to the primary CTA. On eBay/Amazon that stepper feeds an
   actual checkout total; on Hatiwal there is no cart and no payment (`CLAUDE.md` MVP boundaries) —
   the stepper only changes what the **first message** says. If it's styled like a checkout widget
   next to a "Buy" button, a buyer could reasonably believe tapping it commits to a purchase. §10.4
   specifies the mitigation: the button stays labelled "Message seller" (never "Buy"/"Add to
   cart"), and the stepper sits under a caption that names what it does ("How many are you asking
   about?"), not a bare number picker. This is the one place in the whole redesign where copying
   the big-tech pattern literally would create a false expectation the app cannot honour — said
   explicitly rather than ported over silently.
4. **No time limit on "Undo."** The confirmation toast's Undo action and the Sales screen's
   permanent edit/delete call the *same* backend endpoint (§8) — there's no separate short-lived
   "undo window" enforced server-side, only the toast's own display duration client-side (§9.1).
   The real safety rail is that a sale **with a review already attached can't be voided or
   reassigned** (§8.2) — that's the guard that matters, not a clock.
5. **Multi-unit reserve gains a quantity ("2 held for Ahmad"), which it doesn't have today.**
   `reserve_with_buyer!` currently takes no quantity (`listing.rb:365`); a reservation transaction
   defaults to `quantity: 1` regardless of batch size. Making "N held" a true number (not always
   "1") needs `reserve` to accept an optional quantity, mirroring the already-shipped sold-quantity
   mechanism field-for-field (§7.1). This is new scope versus the original spike, but it's small
   and mechanical — flagged so it's visible as a deliberate addition, not something that crept in.
6. **Held units stay advisory, not a real hold — unchanged from `docs/SPIKE_LISTING_QUANTITY.md`
   §5.2's decision B.** "2 held for Ahmad" does not subtract from what other buyers can ask for;
   `available_units` keeps its exact current formula (`quantity - sold_units`). This avoids the
   expiry/leak machinery a real per-unit hold would need (§5.2 already reasoned through this and
   nothing here changes that reasoning) — restated because a casual reading of "N held" could imply
   inventory is actually set aside, and it isn't.

---

## 4. Screen-by-screen specs

### 4.1 Create / Edit listing (quantity declaration) — unchanged

No change. The "I have more than one" toggle + numeric `Input` in `ListingForm.tsx` (shipped,
`docs/SPIKE_LISTING_QUANTITY.md` §13.2) is the seller's one-time *declaration* of how many they
have — a different control from every stepper in this document, which are all about a single
*transaction's* quantity (buying/selling some of that stock). Kept as a typed numeric `Input`, not a
stepper: the spike's own §12.1 already rejected a stepper here specifically because the reference
case is 15 units, and 14 taps to reach 15 is worse than typing two digits. That reasoning is about
*declaring a large number once*, which is different from the transactional steppers below
(bounded, small numbers, one tap the common case) — no contradiction, two different jobs.

### 4.2 Buyer-facing listing detail (`ListingDetail.tsx`)

**4.2.1 Reserved stops being a dead end.**

- `canContact` (`ListingDetail.tsx:419`): `listing.status === "active" && !isOwnListing` →
  **`(listing.status === "active" || listing.status === "reserved") && !isOwnListing`**.
- The dead-end ternary at `ListingDetail.tsx:1006` (`listing.status === "sold" || listing.status
  === "reserved" ? <ListingUnavailableActions ...>`) → **drop `"reserved"`**. A reserved,
  not-owned listing now falls into the *first* branch (the normal Message/Offer button row), not
  the "see similar" dead end. `ListingUnavailableActions` and `ListingUnavailableNotice` (chat's
  equivalent, §4.4) become **sold-only** — narrow their `status` prop from `"reserved" | "sold"` to
  `"sold"` and delete the now-unreachable `"reserved"` copy branches inside each (dead code once the
  guards above no longer feed them `"reserved"`).
- The offer button (`ListingDetail.tsx:959-968`) needs an **explicit new gate** — today it only
  checks `isNegotiable`, and relied on `canContact` hiding the whole block for anything non-active.
  Widening `canContact` would otherwise silently un-hide "Make an Offer" on a reserved listing,
  which contradicts the judgment call in §3.2. Fix: `{isNegotiable && listing.status !== "reserved"
  && (<Button ... makeOffer />)}`.
- The status banner block (`ListingDetail.tsx:429-439`, `ListingStatusBanner layout="strip"`) is
  **kept for both `sold` and `reserved`** — this is exactly the "ribbon" the model calls for. Only
  its copy differs: reserved gets a new line acknowledging the deal might still fall through (see
  copy table, `listing.detail.reservedStillAvailableNote`).
- Verify (feature-builder to confirm, not assumed): `ListingDetail.tsx:756`'s
  `isActive={listing.status === "active"}` — check what this prop drives before deciding whether it
  also needs `|| listing.status === "reserved"`; not resolved here because its call site wasn't
  read in this pass.

**4.2.2 Multi-unit hold transparency.** When `listing.multiUnit` and `listing.heldUnits > 0` (new
field, §7.1), the existing stock pill (`StockBadge`) gains a held clause: **"13 available · 2
held"** (no buyer name — that's owner-only, see §7.1's privacy note). Single-item listings render
nothing new here — `hasStockToShow` already gates the whole pill on `multiUnit`
(`src/utils/stock.ts`), untouched.

**4.2.3 Buyer-side quantity stepper (requirement #9).** New: when `listing.multiUnit`, render the
new shared `QuantityStepper` (§10.4) near the sticky action bar, **default 1, max =
`availableUnits`**. Its value feeds `FirstMessageSheet`'s template (§4.3) — nothing else. It does
**not** call any API, does **not** reserve anything, and is reset to 1 whenever the sheet closes
without sending. See §3.3's flag for why the copy/labelling here matters more than the control
itself.

### 4.3 First message (`FirstMessageSheet.tsx`)

Today's default message (`t("listing.detail.defaultMessage")`) is unchanged for a single-item
listing or a multi-unit listing where the buyer left the stepper at 1. **New:** when `multiUnit &&
quantity > 1`, the prefilled (still editable) message becomes a structured sentence stating unit
price × qty = total **in writing**, e.g.:

> "Hi! I'd like to buy 3 × AFN 14,000 = AFN 42,000. Is this still available?"

This is the trust fix requirement #9 names: with no payment system, the total has to be agreed in
text before the meetup, not discovered there. Built via `formatCurrency`/`useLocalization`
(never a raw number in JSX, per `DESIGN_SYSTEM.md` §8), and bidi-isolated exactly like
`reserveAfterAccept.ts`'s own `wrapBidiIsolate` already does for names/prices inside RTL sentences
— reuse that helper rather than re-solving the same bidi problem a second time.

No backend change: this is a plain text message like every other, sent through the existing `POST
/listings/:listing_id/conversations`. The quantity is **not** persisted as structured data anywhere
— it is a stated intent in prose, exactly how every referenced marketplace's initial inquiry works.
Formalizing "how many" is still the seller's job at mark-sold time (§6), same as today.

### 4.4 Chat thread (`Conversation.tsx`, `ListingHeader.tsx`, `ComposerActionsSheet.tsx`)

**4.4.1 `ListingHeader`'s inline action becomes "Mark sold", full stop.** Drop the
`showReserve`/`showMarkSold` dual condition (`ListingHeader.tsx:104-105`) — the header's one
compact pill is now **always** "Mark sold" whenever `isOwner && (status === "active" || status ===
"reserved")`, matching requirement #4 literally ("the primary button on every live listing, always,
one tap") even inside chat. Tapping it opens `BuyerPickerSheet` in **confirm mode**
(`preselectedBuyer` = this conversation's other participant — no picker, the buyer is who you're
already talking to), with the quantity stepper (§10.4) shown when `multiUnit && availableUnits >
1`, defaulting to 1.

**4.4.2 "Place a hold" / "Release hold" move into the composer's "+" menu
(`ComposerActionsSheet.tsx`).** New conditional row, seller-only:
- **"Place a hold for {name}"** — shown when `isOwner`, listing is Live, and there's no open hold
  yet (`listing.sale == null`). Opens `BuyerPickerSheet` in confirm mode, same buyer, `action:
  "reserve"`, with the quantity stepper when `multiUnit` (§7.1's new reserve quantity).
- **"Release hold"** — shown when `isOwner` and the open hold (`listing.sale?.status ===
  "reserved"`) belongs to **this** conversation's buyer specifically. If the listing is held for a
  *different* buyer than the one in this thread, show neither row (releasing from the wrong thread
  is confusing) — that seller still has the "Release hold" entry in the listing's own More menu
  (§4.5) to fall back on.
- Both reuse the pure-builder/side-effect split already proven by
  `reserveAfterAccept.ts` (`buildReserveAfterAcceptPrompt` / `reserveAfterAccept`) — generalize it
  (or add a small sibling module) so the manual trigger doesn't duplicate the toast copy, the bidi
  isolation, or the stay-open-on-error contract that module already got right. `finalPrice`
  defaults to the listing's asking price (there's no accepted offer to inherit from on the manual
  path).

**4.4.3 Stop treating "reserved" as a chat dead end.**
- `threadAvailability.ts`'s `showUnavailableNotice` (line 67): drop the `listing.status ===
  "reserved"` branch — **sold-only** from now on. `ListingUnavailableNotice`'s prop type narrows to
  `status: "sold"` (§4.2.1).
- `canOfferInThread` / `offerUnavailableStatus`: **unchanged** — see the explicit flag in §3.2 for
  why offers stay paused on a reserved listing even though the thread itself doesn't.
- `ConversationRow.tsx:118` (`item.listing?.status === "sold" || item.listing?.status ===
  "reserved"` driving the dimmed inbox-row treatment): drop `"reserved"` — a held conversation
  stays full-weight in the inbox; only sold dims.

### 4.5 Seller's own listing surfaces (`MyListingDetail.tsx`, `SellerListingCard.tsx`, `MyListings.tsx`)

All driven by the single `useListingLifecycle` hook (`hatiwal-mobile/src/hooks/useListingLifecycle.ts`)
— both screens render whatever it returns, so this is the one file that carries almost this entire
section.

- **`primaryAction`:** `draft → Publish`; `active` (not expired) **or** `reserved` → **Mark sold**;
  `active + expired → Renew` (unchanged — expiry only ever applies to `active`, and a reserved
  listing can't currently reach `expired?`, so no interaction here to resolve); `sold → none`.
- **Reserve is deleted from this hook entirely** — no mutation, no handler, no moreActions entry.
  It only exists in chat now (§4.4). (`useListingLifecycle`'s exported `buyerPicker.action` type
  narrows from `"reserve" | "sold"` to just `"sold"`.)
- **"Activate" is renamed "Release hold"** in the moreActions row (icon: swap `RotateCcw` for
  something read as "undo a hold", e.g. `Unlock`/`LockOpen` from lucide) and its **condition
  widens** from `status === "reserved"` to **`listing.sale?.status === "reserved"`** — the latter
  is already true for a single-item hold (`status: reserved`) *and*, once §7.1 ships, for a
  multi-item hold that stays `status: active`. This is the one condition in the whole redesign that
  correctly covers both item counts with a single check, because it reads the derived transaction
  state rather than the listing's own status.
- **New moreActions entry, "View sales"** (icon `Receipt` or `ListChecks`), shown whenever
  `hasSoldSome(listing)` is true (existing helper, `src/utils/stock.ts` — already true the moment
  any unit has sold, single or multi) — opens the new Sales screen (§9).
- **`MyListings.tsx`'s status tabs drop "Reserved" as its own tab** (`STATUS_TABS`, currently
  `["all","draft","active","expired","reserved","sold"]` → drop `"reserved"`) — a held listing now
  simply appears under **Active**, with its hold badge, matching "three presented states." **Hard
  dependency:** this can only ship together with SF-B1 (§5.1) widening the backend's "active" tab
  query to include `reserved` rows — shipping the tab removal *before* the backend widen would make
  held listings vanish from every tab in My Listings, a regression, not a simplification. Sequence
  them atomically (§11).
- The seller's own detail/card view of the stock pill gains the same "N held" clause as §4.2.2, but
  **with the buyer's name** (owner-only `sale.buyer.name`, existing field) — "13 available · 2 held
  for Ahmad" — versus the public, name-less "13 available · 2 held".

### 4.6 Mark-sold buyer attribution (`BuyerPickerSheet.tsx`) — judged, mostly kept as-is

**Verdict on requirement #4 ("propose the buyer before sold, one/outside"): the existing sheet is
good enough structurally and needs no rework of its core flow.** It already does exactly what's
asked — a list of the listing's own conversation participants, a "Someone not on Hatiwal" skip, one
confirm — and its `preselectedBuyer` confirm mode is precisely the mechanism §4.4 reuses for the
chat-initiated flow. Two changes land here, both small:
1. **Quantity field becomes a `QuantityStepper`** (§10.4) instead of the current raw numeric
   `Input` (`BuyerPickerSheet.tsx:533-549`) — same default-to-1 behaviour, same clamp-to-remainder
   logic, just the new shared control instead of a bespoke text field. This is the "stepper" the
   coordinator asked for on the seller side, landing exactly where the existing "how many did they
   sell" question already lives.
2. **Reserve mode also gets the quantity field** (currently `asksQuantity` gates on `action ===
   "sold"` only, line 173) — widen to `(action === "sold" || action === "reserve") && multiUnit &&
   availableUnits > 1`, feeding §7.1's new `reserve` quantity param.

No new banner, no new copy about search visibility (§2) — this sheet's job stays exactly what it
already is.

---

## 5. Backend: keep reserved listings live (SF-B1)

### 5.1 Scope changes

```ruby
# listing.rb
scope :live, -> { where(status: [ :active, :reserved ]) }
scope :browsable, -> { live.not_expired.not_removed.ordered }   # was: active.not_expired...

def live?
  active? || reserved?
end

# for_status_filter — the seller's "Active" tab now includes held listings too
scope :for_status_filter, lambda { |status|
  case status.to_s
  when STATUS_FILTER_EXPIRED then expired_active
  when "active"              then live.not_expired      # was: active.not_expired
  else where(status: status)
  end
}
```

`saved_search.rb:57` and every other caller of `.browsable` (public listings#index, viewed
listings, similar-listings) inherit the widen automatically — no separate edits needed, verified by
reading each call site (`docs/SELL_FLOW_AUDIT.md`-style: `grep -rn "\.browsable\b" hatiwal-api/app`
returns 4 call sites, all composing on top of the one scope).

`saved_listing.rb:18`'s price-drop-since-save check (`listing.active? && listing.price <
price_at_save`) → widen to `listing.live? && ...` for consistency (a price drop on a held listing
is just as real a signal to the buyer who saved it).

### 5.2 Policy & service widen

```ruby
# listing_policy.rb
def start_conversation? = record.live?     # was: record.active?
```

```ruby
# services/conversations/start_service.rb:16
raise Error, "listing is not active" unless @listing.live?   # was: @listing.active?
```

Audited and **left unchanged** (still correctly `active?`-only, don't widen): `unpublish?`,
`reserve?`, `renew?` — none of these make sense from a held listing (release the hold first). `sold?`
already includes `reserved?` (`listing_policy.rb:26`, unchanged).

### 5.3 Copy — buyer-facing reserved banner keeps the ribbon, adds a note

`ListingStatusBanner` (`layout="strip"`) keeps rendering for `reserved`, with a new second line so
a buyer understands why they can still message a listing that says "Reserved" — see the copy table
(`listing.detail.reservedStillAvailableNote`).

### 5.4 Data migration

None needed for this scope widen — no `status` values change, no rows move. (Contrast with the
retired first-pass plan, which would have needed one.)

### 5.5 `listing_status_counts_controller.rb`

`live = (raw["active"] || 0) - exp` → **`live = (raw["active"] || 0) + (raw["reserved"] || 0) -
exp`** so the "Active" tab's count badge matches what the widened tab actually returns. Leave the
`reserved:` key in the JSON response as-is (harmless, some future consumer might still want the raw
split) — mobile simply stops rendering a tab for it (§4.5).

---

## 6. Backend: reserve gains an optional quantity, plus "N held" (SF-B2)

```ruby
# listing.rb
def reserve_with_buyer!(buyer_id:, final_price: nil, quantity: nil)
  return nil if buyer_id.blank?

  units = multi_unit? ? (quantity.presence || 1).to_i.clamp(1, available_units) : 1
  existing = open_transaction
  if existing
    existing.update!(buyer_id: buyer_id, final_price: final_price.presence || price, quantity: units)
    existing
  else
    sale_transactions.create!(seller_id: user_id, buyer_id: buyer_id,
      final_price: final_price.presence || price, currency: currency,
      status: :reserved, quantity: units)
  end
end

# Owner-only, unchanged shape — but now correctly surfaces an open hold on an
# ACTIVE multi-unit listing too, not only on a `reserved`-status single item.
def current_sale
  return sale_transactions.select { |t| t.status == "sold" }.max_by(&:created_at) if sold?

  open_transaction   # nil if none — covers single-item `reserved?` AND multi-item `active?`+hold
end

# Public-safe (no buyer identity) — powers the buyer-facing "N held" clause.
def held_units
  (open_transaction&.quantity).to_i
end
```

`my/listings_controller.rb#reserve` passes `lifecycle_params[:quantity]` through, mirroring how
`#sold` already does it. `lifecycle_params` gains `:quantity` (already permitted for `sold`, extend
the same permit list to cover `reserve` too since both actions share the method).

**Serializer:** add `held_units` to `ListingSerializer`'s **base** fields (alongside the existing
`quantity`/`available_units`/`multi_unit`, `listing_serializer.rb`) — public-safe, no PII, present
on `:list`/`:detailed`/`:seller_list`/`:owner_detailed` alike. The owner-only buyer **name** for a
held listing continues to come from the existing `sale`/`current_sale` field, unchanged — `held_units`
never carries identity.

**No change to `available_units`'s formula** — held units are informational, not subtracted (§3.6).

---

## 7. Backend: outside-buyer sales get a ledger row (SF-B3)

Today, "sold to someone not on Hatiwal" (`clear_buyer: true`) **records nothing** —
`sold_with_buyer!` cancels the open reservation and returns `nil` (`listing.rb:391-393`), so
`sold_units` increments but **no `Transaction` row exists to show it later**. This is invisible mass
in the ledger and, more importantly, leaves nothing for §8's correction endpoint to point at. Fix:

```ruby
# migration
change_column_null :transactions, :buyer_id, true

# transaction.rb
belongs_to :buyer, class_name: User.name, optional: true   # was: implicitly required

# bump_trust_counters! — guard the buyer half
def bump_trust_counters!
  User.increment_counter(:sold_count, seller_id)
  User.increment_counter(:bought_count, buyer_id) if buyer_id.present?
end
```

`buyer_is_not_seller` / `buyer_is_conversation_participant` **already** guard `return if
buyer_id.blank?` (`transaction.rb`, both validations) — no change needed there, the nil-safety was
already written, just blocked by the DB `NOT NULL` + the missing `optional: true`.

```ruby
# listing.rb — sold_with_buyer!, restructured so `units` is computed once, up
# front, and clear_buyer creates a row instead of a silent no-op:
def sold_with_buyer!(buyer_id:, final_price: nil, clear_buyer: false, quantity: nil)
  units = (quantity.presence || available_units).to_i.clamp(1, [ available_units, 1 ].max)

  if clear_buyer
    cancel_open_transaction!   # a specific reserved buyer falling through is a separate fact
    return sale_transactions.create!(
      seller_id: user_id, buyer_id: nil, final_price: final_price.presence || price,
      currency: currency, status: :sold, quantity: units, completed_at: Time.current
    )
  end
  # ...unchanged existing/create branches below, using `units` computed above...
end
```

`bump_seller_sold_count_for_legacy_sale!` and its explicit-nil-txn call site in the controller
(`my/listings_controller.rb:225-227`) can be **deleted** once this ships — that path existed
specifically because a buyer-less sale used to create no transaction; now it always does, and
`bump_trust_counters!`'s own `after_save` callback covers the seller counter like every other sale.

**Serializer:** `TransactionSerializer`'s `field(:buyer)` (`transaction_serializer.rb`) guards nil:
`next nil if b.nil?`. Mobile's `SaleBuyerCard.tsx` **already** optional-chains `sale.buyer?.name ||
t("listing.sale.noBuyerRecorded")` — it will render correctly with zero mobile changes the moment
this ships, though §9 gives the "sold outside the app" case its own, clearer copy
(`listing.sale.outsideBuyer`) instead of reusing the generic defensive fallback string.

---

## 8. Backend: undo & edit a recorded sale (SF-B4)

One pair of endpoints does both the toast's "Undo" and the Sales screen's editable row — there is
no separate "correction form" concept (requirement #6: *undo, not correction forms*).

```
PATCH /api/v1/my/transactions/:id
  body: { quantity?: number, buyer_id?: number, clear_buyer?: boolean, final_price?: number }
  → 200 { transaction: {...}, listing: {...owner_detailed...} }
  → 422 { errors: [...] }  — capacity exceeded, or reassigning a reviewed sale's buyer

DELETE /api/v1/my/transactions/:id
  → 200 { listing: {...owner_detailed...} }        # "Undo" / the ledger row's Delete
  → 422 { errors: [...] }  — voiding a reviewed sale
```

`clear_buyer` reuses the exact same wire convention `#sold` already established (`clear_buyer:
true` → reassign to "not on Hatiwal", i.e. `buyer_id: nil`) rather than inventing a second way to
say the same thing.

### 8.1 Model

```ruby
class Listing < ApplicationRecord
  class CorrectionBlocked < StandardError; end
end

# transaction.rb
def correct!(quantity: nil, buyer_id: nil, clear_buyer: false, final_price: nil)
  new_buyer_id = clear_buyer ? nil : (buyer_id.presence || self.buyer_id)
  buyer_changed = new_buyer_id != self.buyer_id
  raise Listing::CorrectionBlocked, "sale has a review" if buyer_changed && reviews.exists?

  old_buyer_id = self.buyer_id
  update!(quantity: quantity.presence || self.quantity, buyer_id: new_buyer_id,
          final_price: final_price.presence || self.final_price)

  return unless buyer_changed
  User.where(id: old_buyer_id).update_all("bought_count = GREATEST(bought_count - 1, 0)") if old_buyer_id
  User.where(id: new_buyer_id).update_all("bought_count = bought_count + 1") if new_buyer_id
end

def void!
  raise Listing::CorrectionBlocked, "sale has a review" if reviews.exists?

  User.where(id: seller_id).update_all("sold_count = GREATEST(sold_count - 1, 0)")
  User.where(id: buyer_id).update_all("bought_count = GREATEST(bought_count - 1, 0)") if buyer_id
  destroy!
end
```

```ruby
# listing.rb
def correct_sold_transaction!(transaction:, quantity: nil, buyer_id: nil, clear_buyer: false, final_price: nil)
  raise ArgumentError unless transaction.listing_id == id && transaction.sold?

  old_units = transaction.quantity
  void = quantity.present? && quantity.to_i <= 0

  with_lock do
    if void
      transaction.void!
      new_sold_units = [ sold_units - old_units, 0 ].max
    else
      new_units = quantity.presence&.to_i || old_units
      capacity  = self.quantity - (sold_units - old_units)
      raise ActiveRecord::RecordInvalid, self if new_units < 1 || new_units > capacity

      transaction.correct!(quantity: new_units, buyer_id: buyer_id, clear_buyer: clear_buyer, final_price: final_price)
      new_sold_units = sold_units - old_units + new_units
    end

    update!(sold_units: new_sold_units)
    update!(status: :active) if sold? && new_sold_units < quantity
    update!(status: :sold)   if active? && new_sold_units >= quantity && new_sold_units.positive?
  end
end
```

That last pair of conditionals **is** "re-opening a listing that went sold-out by mistake" — it's a
side effect of fixing the ledger row, not a separate action a seller ever has to find or name. A
single-item listing's only possible correction is voiding its one transaction (quantity can't go
below 1 without voiding) — same mechanism, same code path, no special case.

### 8.2 The one deliberate refusal: don't touch a reviewed sale

If `transaction.reviews.exists?`, **both** voiding and reassigning the buyer are blocked (quantity
and price edits are still allowed) — raises `Listing::CorrectionBlocked`, controller renders 422
with `listing.sale.voidBlockedReviewed`. This protects a real, already-written review from
vanishing or being reattributed because of an unrelated quantity typo. It's the one place this
redesign is intentionally *less* permissive than "always allow undo" — flagged so it isn't mistaken
for an oversight.

### 8.3 Policy & route

```ruby
# transaction_policy.rb
def update?  = user.present? && record.seller_id == user.id && record.sold?
def destroy? = update?
```

```ruby
# routes.rb
resources :transactions, only: [ :index, :update, :destroy ]   # was: only: [ :index ]
```

---

## 9. Backend: per-listing sales read (SF-B5)

No new endpoint — extend the existing, already-shipped `GET /my/transactions`
(`api/v1/my/transactions_controller.rb`):

```ruby
transactions = transactions.where(listing_id: params[:listing_id]) if params[:listing_id].present?
```

Called as `GET /my/transactions?listing_id=42&as=seller&status=sold` from the new Sales screen
(§10.3). `TransactionSerializer` already returns everything the ledger needs — `quantity`,
`final_price`, `buyer` (nil-safe post-SF-B3), `completed_at` — no serializer change.

One new cheap field on `ListingSerializer`: `sales_count` (integer, `COUNT` of sold
`sale_transactions`) — powers `SaleBuyerCard`'s "+2 more · View all sales" link so the seller isn't
required to open the full ledger screen just to learn there's more than one buyer.

---

## 10. New mobile screens & shared components

### 10.1 `useListingLifecycle.ts` — the remap (SF-M1)

Concrete diff to the file described in §4.5:

```ts
// primaryAction
switch (status) {
  case "draft": return { label: t("listing.publish"), onPress: handlePublish };
  case "active":
  case "reserved":
    return isExpired
      ? { label: t("listing.renew"), onPress: handleRenew }
      : { label: t("listing.markSold"), onPress: handleMarkSold };
  default: return null;
}
```

- Delete: `reserve` mutation, `handleReserve`, the `"reserve"` branch of `buyerPicker.action`, the
  `moreActions.push({ key: "reserve", ... })` lines.
- Rename: `handleActivate`'s label from `t("listing.activate")` → `t("listing.releaseHold")`;
  condition from `status === "reserved"` → `listing.sale?.status === "reserved"`.
- Add: `moreActions.push({ key: "sales", label: t("listing.viewSales"), icon: Receipt, onPress:
  () => router.push(...) })` when `hasSoldSome(listing)`.
- `MyListings.tsx`: drop `"reserved"` from `STATUS_TABS`; drop the `reserved` key from
  `StatusCounts`'s rendered tab list (backend keeps returning it, mobile just stops drawing a tab
  for it).

**Ships together with SF-B1 + SF-B2** (§11) — the release-hold condition needs SF-B2's
`current_sale` fix, and the tab drop needs SF-B1's widened "Active" tab query.

### 10.2 Chat lifecycle changes (SF-M2) — see §4.4 for full behaviour spec.

### 10.3 New screen: Sales (per listing) (SF-M5, depends on SF-B3/B4/B5)

- **Route:** `/(main)/listing/[id]/sales` (new file, `src/screens/seller/ListingSales.tsx`).
- **Data:** `GET /my/transactions?listing_id={id}&as=seller&status=sold`, paginated
  (`useInfiniteQuery` or the existing `UniversalList` pagination pattern — match whatever
  `useListingLifecycle`'s sibling list screens already use, don't invent a new pagination
  convention).
- **Header:** tally, `t("listing.sale.tally", { sold, total })` → "5 of 15 sold" — only rendered
  when `multiUnit` (a single-item listing's one sale needs no tally).
- **Rows:** one per sold `Transaction`, newest first (`completed_at desc`, matches the API's
  default `Transaction.ordered`) — `UserIdentity` (or `t("listing.sale.outsideBuyer")` +
  a generic avatar when `buyer` is null), quantity (only shown when `multiUnit`), `PriceTag
  perUnit={multiUnit}` for `final_price`, relative date via `useLocalization().formatDate`.
- **Row tap → opens the edit sheet** (§10.3.1). No swipe-to-delete gesture needed in v1 — the edit
  sheet's own Delete button covers it, and a swipe gesture is one more thing to internationalize
  correctly for RTL that isn't necessary for the acceptance bar here.
- **States:** skeleton (mirror `ConversationRowSkeleton`'s pattern — a row skeleton already exists
  and looks right for this shape), empty (`listing.salesScreen.empty` + hint, no sales yet — reuse
  `EmptyState`), error + retry (standard pattern per `DESIGN_SYSTEM.md` §6).
- **Entry point:** `useListingLifecycle`'s new "View sales" moreActions row (§10.1); also reachable
  from `SaleBuyerCard`'s new "+N more · View all sales" link when `sales_count > 1`.

**10.3.1 Edit sheet** (new component, e.g. `SaleRowEditSheet.tsx` — new component because editing
an *existing* row is a different interaction from `BuyerPickerSheet`'s *picking a new* buyer;
composed from the same shared pieces, not a fork of that sheet):
- Current buyer identity (`UserIdentity` or the outside-buyer fallback) with a "Change buyer" link
  that expands the listing's conversation list (same row-rendering approach `BuyerPickerSheet`
  already has for its picker list — reuse that presentation, don't reinvent it) plus "Not on
  Hatiwal".
- Quantity: `QuantityStepper` (§10.4), min 1, max = capacity (`listing.quantity - (sold_units -
  this_row's_current_quantity)` — computed client-side for the live clamp, re-validated server-side
  regardless).
- Final price: `Input`, same per-unit caption pattern `BuyerPickerSheet` already uses
  (`buyerPicker.finalPricePerUnitHint`) when `multiUnit`.
- **Save** → `PATCH /my/transactions/:id`. **Delete** (destructive, `confirmAlert`,
  `listing.sale.voidConfirm` / `...Description`) → `DELETE /my/transactions/:id`. Both invalidate
  the same query set `useListingLifecycle.invalidateAll` already defines (listing, my-listings,
  status counts, this listing's transactions) — reuse that invalidation list rather than
  duplicating it.
- On the 422 "reviewed, can't void/reassign" response, show `listing.sale.voidBlockedReviewed`
  inline (same pattern `BuyerPickerSheet.errorMessage` already uses for a sheet-internal failure —
  a raw `<Modal>` occludes toasts on Android, same reasoning documented there) and keep quantity/
  price editable, hide the Delete button and disable the "Change buyer" link for that row.

### 10.4 New shared component: `QuantityStepper`

`src/components/common/QuantityStepper.tsx` — composed entirely from RNR primitives (no new
third-party dependency; mirrors how the seller-side quantity field was already built from a plain
RNR `Input`, just adding the +/− affordance around it):

```
[ − ]   3   [ + ]
```

- `Button variant="outline" size="icon"` for `−`/`+` (lucide `Minus`/`Plus`), disabled at `min`/
  `max`.
- The number in the middle is **tap-to-edit**: a plain `Text` by default; tapping it swaps to an
  `Input keyboardType="numeric" selectTextOnFocus autoFocus"`, committing on blur/submit (clamped
  to `[min, max]`). This directly resolves the tension between "big tech uses a stepper" and the
  original spike's own rejection of a stepper for a 15-unit case (§10.1 of this doc's own §4.1) —
  small numbers stay a one-tap `+`, a big jump is two taps (tap the number, type) instead of
  fourteen taps on `+`.
- Props: `value`, `onChange`, `min` (default 1), `max`, `size?: "sm" | "md"`, `disabled?`.
- RTL: the row direction mirrors via `isRtl` exactly like every other control in this codebase
  (`flexDirection: isRtl ? "row-reverse" : "row"`) — `+` and `−` swap visual sides, not meaning.
- **Consumers, in order of this document's tickets:** `BuyerPickerSheet`'s existing quantity `Input`
  (§4.6, replace in place), the chat "Place a hold"/"Mark sold" quantity (§4.4, same sheet), the
  Sales edit sheet's quantity (§10.3.1), the buyer-side `ListingDetail` stepper (§4.2.3). One
  component, four call sites, matching the "extend the shared component, never fork" rule.

**Ship this first among the mobile tickets** (SF-M6, §11) — it has zero backend dependency and
every other mobile ticket that touches a quantity field consumes it.

---

## 11. Tickets, build order, dependencies

See `docs/BACKLOG.md` §"Sell Flow Redesign" for the full per-ticket detail (owner, route, files,
acceptance criteria) in the house ticket format. Summary and sequencing:

```
Backend (hatiwal-api)                          Mobile (hatiwal-mobile)
──────────────────────                          ───────────────────────
SF-B1  widen live/browsable/messaging   ─┐
SF-B2  reserve quantity + held_units    ─┤──▶  SF-M1  primary-action remap + tab drop
SF-B3  outside-buyer sales get a row    ─┤      (needs BOTH B1 + B2 — ship atomically)
       │                                 │
       │                                 └──▶  SF-M2  chat: mark-sold one-tap +
       │                                        place/release hold        (needs B2)
       │                                 
       │                                 ──▶   SF-M3  stop treating reserved as a
       │                                        dead end (ListingDetail/chat/inbox)
       │                                        (ship atomically WITH B1 — see below)
       │
SF-B4  undo/edit a sale (needs B3)      ─┐
SF-B5  per-listing sales read           ─┤──▶  SF-M5  Sales screen + edit sheet
                                          │      (needs B4 + B5 + M6's QuantityStepper)
                                          
                                                SF-M4  multi-unit "held" stock-pill copy
                                                (needs B2)

                                                SF-M6  QuantityStepper + buyer-side
                                                stepper + structured first message
                                                (NO dependency — ship first, mobile-only)

SF-W1  bring hatiwal-web to this model — NOT THIS PASS, blocked on all of the above.
```

**Atomic pairs (must ship together, not staggered):**
- **SF-B1 + SF-M3.** Shipping SF-B1 alone puts reserved listings back in search with mobile's own
  detail screen still showing them as a dead end when tapped — worse than today (found via search,
  then hit a wall). Shipping SF-M3 alone against the old backend does nothing (the listing was
  never in search to find). One PR pair, not two independent tickets.
- **SF-B1 + SF-B2 + the tab-drop half of SF-M1.** Spelled out in §10.1 — dropping the "Reserved" tab
  before the backend widen makes held listings vanish from every tab.

**Everything else is independently shippable** in the order that suits available `feature-builder`
capacity — the dependency arrows above are the only hard constraints.

---

## 12. Copy — new strings (English; ps + fa required per house rule, not written here)

All additive, existing namespaces (`listing.json`, `buyerPicker.json`, `chat.json`) unless noted.
`common.undo` already exists (`"Undo"`) — reused as-is, no new key.

| Key | English |
|---|---|
| `listing.releaseHold` | Release hold |
| `listing.confirmReleaseHold` | Release this hold? |
| `listing.confirmReleaseHoldDescription` | This cancels the reservation and lets any buyer take it. |
| `listing.releaseHoldSuccess` | Hold released — listing is fully back on the market. |
| `listing.viewSales` | View sales |
| `listing.sale.tally` (`{{sold}}`,`{{total}}`) | {{sold}} of {{total}} sold |
| `listing.sale.outsideBuyer` | Buyer not on Hatiwal |
| `listing.sale.editSale` | Edit this sale |
| `listing.sale.changeBuyer` | Change buyer |
| `listing.sale.voidConfirm` | Remove this sale? |
| `listing.sale.voidConfirmDescription` | This puts the units back in stock and removes it from your sales history. |
| `listing.sale.voidedSuccess` | Sale removed — stock restored. |
| `listing.sale.voidBlockedReviewed` | This sale already has a review and can't be removed or reassigned. You can still fix the quantity. |
| `listing.sale.moreBuyers` (`{{count}}`) | +{{count}} more · View all sales |
| `listing.stock.heldForBuyer` (`{{count}}`,`{{name}}`) | {{count}} held for {{name}} |
| `listing.stock.held` (`{{count}}`) | {{count}} held |
| `listing.detail.reservedStillAvailableNote` | The seller may still reply if the reservation falls through. |
| `listing.detail.firstMessageQuantityTemplate` (`{{qty}}`,`{{unitPrice}}`,`{{total}}`) | Hi! I'd like to buy {{qty}} × {{unitPrice}} = {{total}}. Is this still available? |
| `listing.detail.quantityAskingLabel` | How many are you asking about? |
| `buyerPicker.holdQuantityLabel` | How many are you holding? |
| `chat.listingActions.placeHold` (`{{name}}`) | Place a hold for {{name}} |
| `chat.listingActions.releaseHold` | Release hold |
| `chat.listingActions.holdSuccess` (`{{name}}`) | Reserved for {{name}} |
| `chat.listingActions.holdFailed` | Couldn't place the hold — try again. |
| `listing.salesScreen.title` | Sales |
| `listing.salesScreen.empty` | No sales yet |
| `listing.salesScreen.emptyHint` | Sales you record will show up here. |

`listing.detail.quantityAskingLabel` is the mitigation for the flag in §3.3 — it deliberately does
**not** say "How many do you want to buy?" (implies a cart/checkout this app doesn't have); it
frames the stepper as shaping the message, not a purchase.

---

## 13. States checklist (every new/changed screen)

- **Loading:** skeleton mirroring the real layout (`ConversationRowSkeleton`-style row skeleton for
  the Sales screen; existing detail/list skeletons untouched elsewhere).
- **Empty:** Sales screen empty state via `EmptyState` (§10.3). Every other touched screen already
  has an empty state — untouched.
- **Error:** Sales screen — friendly message + retry, standard pattern; the edit sheet's own
  inline `errorMessage` slot for the reviewed-sale 422 (§10.3.1); chat's hold actions reuse the
  existing toast-error pattern already proven in `reserveAfterAccept.ts`.
- **RTL:** every new row/control mirrors via `isRtl` (`QuantityStepper`, the Sales screen's rows,
  the composer's new menu rows) — no hard-coded `left`/`right`, matches the rest of the codebase.
- **Dark:** all new UI via `useColors()` — no className color tokens, no hex, per
  `DESIGN_SYSTEM.md` §2.
- **3 locales:** every key in §12 added to `en`/`ps`/`fa` before a ticket is called done (house
  rule, `CLAUDE.md`).

---

## 14. Acceptance criteria (per ticket, summarized — full detail in `BACKLOG.md`)

- **SF-B1:** a newly-reserved single-item listing still appears in `GET /listings` and
  `GET /listings?search=`; `POST /listings/:id/conversations` succeeds against a reserved listing
  from a non-owner; My Listings' "Active" tab count includes reserved rows. RSpec covers all three.
- **SF-B2:** `PUT /my/listings/:id/reserve` with `quantity: 2` on a multi-unit listing stores it;
  `held_units` reflects it on `:list`/`:detailed`; a single-item listing's `reserve` call ignores
  any quantity param and behaves exactly as today (`held_units` always 0 or 1, never asked for).
- **SF-B3:** marking sold with `clear_buyer: true` creates a sold `Transaction` with `buyer_id:
  nil`; `GET /my/transactions` returns it; `TransactionSerializer`'s `buyer` field is `null`, not a
  500.
- **SF-B4:** `PATCH .../:id` with a smaller quantity leaves the listing `active` if it was `sold`;
  `DELETE .../:id` on the listing's only sale returns it to `active` with `sold_units: 0`; either
  call against a transaction with an existing review returns 422 and changes nothing.
- **SF-B5:** `GET /my/transactions?listing_id=X&as=seller` returns only that listing's rows,
  correctly paginated; `sales_count` on the listing matches the count.
- **SF-M1:** a fresh active listing's primary button reads "Mark sold", never "Mark reserved"; a
  reserved listing (single or multi) also shows "Mark sold" as primary; "Release hold" appears
  exactly when `sale?.status === "reserved"`, for both item counts; My Listings has no "Reserved"
  tab; "View sales" appears the moment any unit has sold.
- **SF-M2:** tapping "Mark sold" in a chat thread never shows a buyer list — it goes straight to
  the confirm sheet for that thread's participant; "Place a hold"/"Release hold" appear/disappear
  correctly per §4.4.2's exact conditions.
- **SF-M3:** a non-owner opening a reserved listing's detail page sees the Message/Offer row (Offer
  hidden, Message visible) — not the "see similar" dead end; the same listing's conversation is not
  dimmed in the inbox and does not show the full-thread unavailable notice.
- **SF-M4:** a multi-unit listing with an open hold shows "N available · M held" on both the buyer
  and seller detail screens, the seller's version additionally naming the buyer; a single-item
  listing shows neither clause.
- **SF-M5:** the Sales screen lists every sold transaction for the listing, tallies correctly when
  multi-unit, and a row's Delete restores stock and (if it was the last unit) flips the listing back
  to Live; a row on a reviewed sale cannot be deleted or reassigned but can still have its quantity
  corrected.
- **SF-M6:** `QuantityStepper` renders identically (byte-for-byte layout) at `value=1` regardless of
  where it's mounted; a single-item listing's buyer detail page renders no stepper at all; selecting
  qty=3 on a multi-unit listing changes `FirstMessageSheet`'s prefilled text to the unit×qty=total
  sentence, in the buyer's own locale's number formatting.
- **SF-W1 (not this pass):** tracked only — no acceptance criteria until scheduled.

# QA state of play — 2026-09-15

Written for someone picking this up cold. The detail lives in `FLOW_REGISTER.md`
(per-flow verdicts) and `QA_HANDBOOK.md` (how to read evidence). This is the map.

## Start here

```bash
python3 qa/lib/live_tally.py            # live failures, not the raw count
./qa/verify_fixes.sh --list             # the 23 flows awaiting a device
python3 qa/lib/audit_helpers.py         # broken helpers, by caller clustering
./qa/qa.sh audit                        # includes the two scroll sweeps
```

**Do not read a raw fail count.** A row can be stale (the flow was fixed after
the driver ran it) or a rig crash (the Expo dev-menu FAB). On the last pass,
12 raw fail rows were **3 live**. `live_tally.py` separates them.

## The one thing that matters most

**`login.yaml`'s missing session guard accounts for TWELVE flows.** They are:

    dead_end_notice_sold, lifecycle_reserve, listing_conversations,
    meetup_respond, offer_counter_flow, offer_quantity_round_trip,
    offer_send_and_accept, offer_send_and_decline, reserve_after_accept,
    reserve_after_buyer_accepts_counter, reserved_buyer, start_conversation

All twelve fail on an owner-gated affordance ("Make an Offer", "Contact
Seller") with the same 12-node signature: a listing detail whose sticky action
row is EMPTY — the Ban pill, which `ListingDetail.tsx:1199` renders only for
`isOwnListing`. The listings are owned by user 594 and the flows log in as the
buyer. **The app is correct; the test is signed in as the wrong person.**

`login.yaml` reaches its sign-out via a `scrollUntilVisible … optional: true`,
so when the button is not reached the switch silently does not happen. The
helper's own comment names three of these twelve as victims — all three now
confirmed.

**It was deliberately NOT fixed blind, and should not be.** The natural guard
("signed in, wrong name, sign-out unreachable → fail loudly") needs a
multi-key `when:` (visible AND notVisible). That construct has **zero
precedent in all 312 flows**, and `login.yaml` is included by ~190 of them.
Introducing an unproven construct into the suite's most-included helper with no
device to watch it is how the whole suite goes red at once. **Apply it with a
device in hand, first, ahead of the 23 queued verifications.**

## The 23 queued flows, and how to judge them

`./qa/verify_fixes.sh` runs them. Judging splits three ways:

| | How to judge |
|---|---|
| **16 with a pinned sha** | run-sha vs disk-sha, as normal. The batch skips any whose file has changed since. |
| **7 marked `-`** | **The sha cannot judge these.** The fix was in a HELPER, which leaves every caller's flow_sha unchanged. Judge by run date against the helper's commit, or read `commands.json` in the debug dir — it inlines helpers and is the only authoritative record of what executed. |
| **0 verified** | Nothing has been confirmed on a device. |

Two helper fixes ARE confirmed working, both via `commands.json` rather than
signature: `search_my_shop` (keyboard over the seller-card actions) on
`held_quantity_refusal` and `sales_screen_reviewed_sale_refusal` — both now get
past the card actions and fail later for unrelated reasons.

## The headline ratio

**Three genuine app defects. Everything else was test debt.**

1. **`ReportSheet` — a silent failure on the report path.** A duplicate report
   returns 422, the app maps it correctly, but `<Toaster>` is at the root of the
   tree and an Android `<Modal>` is a separate native window — so the error
   rendered *behind* the open sheet. The user saw nothing. Fixed inline
   (c479dcd, gated aaae2b4).
2. **`listing.savesCount` printed a raw translation key** to users on the
   listing page. `count` was passed a *formatted string*, so plural selection
   failed, and the key had no base form to fall back to. Fixed 254b259. The
   dangerous pair is "formatted count AND no base key" — the other three
   plural-only keys were given base forms so the pair cannot recur.
3. **Three more toast-behind-modal paths** on offer send, meetup propose and the
   geo lookup (9705335, ba14494, 07427df). All Android-only: `sonner-native`
   wraps its Toaster in `FullWindowOverlay` on iOS, so iOS was never affected.

Everything else — 11+ flows — was the suite testing itself badly. The app was
in better condition than the failure count suggested.

## Recorded, not chased

- **Two "scroll to X then assert Y" leads** from the suite sweep. Most hits are
  correct (scrolling to a testID and asserting that element's own label is one
  element, not two), which is why they were recorded rather than patched.
- **`listing_actions_sheet` types "5000" and the form shows "50003."**
  `eraseText`/`inputText` interleaving, the shape `search_my_shop.yaml` already
  documents. It does not cause that flow's current failure, but it is real.
- **`create_listing_draft_restore`** is blocked on the MapLibre `ReactTagResolver`
  LogBox overlay — an owner decision, not a flow bug.
- **20 untriaged stable failures** remain. The pattern so far: nearly all are
  flow bugs.

## Five named failure patterns

They are in `QA_HANDBOOK.md` with worked examples. In short:

1. **Scroll/occlusion** — a successful `scrollUntilVisible` leaves the list where
   it stopped; every later command inherits that offset, and `assertVisible`
   never scrolls. Eight instances.
2. **A tap that lands on the keyboard is reported COMPLETED.** The failure then
   names something several steps away. *"The failure named a category; the cause
   was a keyboard."*
3. **Session bleed** — the twelve above.
4. **Whole-node regex** — Maestro matches `text` against the entire node, so a
   substring pattern is unsatisfiable.
5. **Tapping a field's existing content moves the caret there**, so the next
   `inputText` inserts mid-string.

And two ways of reading evidence that repeatedly beat guessing: **read the
BOUNDS, not just node names** (a five-pixel-tall input is clipped, not
rendered), and **the correct implementation is usually already nearby** — nine
times the answer was in the file, and once the note was right while its fix was
wrong.

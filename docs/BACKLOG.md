# Hatiwal Mobile — Product Backlog & Page Board

> The **living work board**, owned by the **product-owner** agent. Every page/feature, its **status**,
> whether it's **taken by an agent** (and which), its priority, and the **full detail of each page** —
> options, controls, states, actions, edge cases, and acceptance criteria.
>
> Companion docs: [FEATURES.md](FEATURES.md) (capability catalog) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
> (libraries + visual language) · [prompts/mobile.prompt.md](prompts/mobile.prompt.md) (engineering rules).
>
> **Status:** `⬜ Not started` · `🟡 In progress` · `✅ Done` · `⏸ Blocked` · `💡 Idea`
> **Owner / taken by:** `_unassigned_` · `feature-builder` · `marketplace-designer` · `feature-builder → marketplace-designer`
> **Normal pipeline:** `feature-builder` builds → `marketplace-designer` polishes → product-owner marks `✅`.
>
> _Last reconciled: 2026-06-17 by product-owner (see that entry's own detail below it in this file's history for the Q/R/N-series pass). **Documentation-truth pass, 2026-08-27:** the Sell Flow Redesign (SF-B1–B9, SF-M1–M8, SF-M4b) reconciled from ⬜/🟡 to ✅ Done against the FlowApp board (cards 274–284, 288–294, 297) and the shipping commits (`hatiwal-api` `c5e155c`/`48c1cc2`, `hatiwal-mobile` `16cd19f`/`09cb4d0`) — RSpec 1704/0 failures, Jest 154 suites/2472 tests/0 failures. C2's per-card detail rewritten to match (Reserve is no longer a listing action; no more "Reserved" tab). Open follow-ups added: `TASK-API-FEEDN1` (286), `SF-M3b` (287), `SF-B10` (295), `SF-QA1` (296, in progress — no Maestro flow for this redesign has run on a device yet), `SF-M9` (298, product-owner decided to keep BuyerPickerSheet's over-stock warning rather than switch to a silent clamp). 3 new ideas added. Root `CLAUDE.md`, `docs/FEATURES.md`, `docs/SPIKE_LISTING_QUANTITY.md` and several other docs corrected in the same pass — see that session's report for the full list._

---

## Status Overview

| ID     | Page / Feature                                                                                                         | Status                                   | Owner (taken by) | Priority | Route                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------- | -------- | ----------------------------------- |
| A1     | Login                                                                                                                  | ✅ Done                                  | —                | P0       | `/(auth)/login`                     |
| A2     | Register                                                                                                               | ✅ Done                                  | —                | P0       | `/(auth)/register`                  |
| A3     | App bootstrap / splash redirect                                                                                        | ✅ Done (validates token in Splash)      | —                | P1       | `app/index.tsx`                     |
| **A4** | **Guest browsing** (logged-out users browse feed + listing detail; save/contact/offer + Saved/Chat/Profile tabs gate to login with `returnTo`) | ✅ Done                | claude           | P1       | `useRequireAuth`, Splash, Login     |
| **S0** | **Shared components** (`ListingCard`, `PriceTag`, `StatusBadge`, `EmptyState`, skeletons)                              | ✅ Done                                  | —                | P0       | `src/components/common/`            |
| B1     | Browse feed                                                                                                            | ✅ Done (design system + filters)        | —                | P0       | `/(main)/(tabs)/browse`             |
| B2     | Listing detail                                                                                                         | ✅ Done                                  | —                | P0       | `/(main)/listing/[id]`              |
| B3     | Search & category filter                                                                                               | ✅ Done                                  | —                | P1       | within B1                           |
| **B4** | **Saved searches / filter history** (auto-save, dedupe, last-4 chips)                                                  | ✅ Done                                  | —                | P1       | within B1                           |
| **B5** | **Map location & distance search** (province coords + Nominatim geocoding + Haversine radius)                          | ✅ Done                                  | —                | P1       | `LocationRangePicker`               |
| **B6** | **"Seen / already viewed" indicator** (per-user `ListingView`; dim + badge on card) — _was the "Recently viewed" idea_ | ✅ Done                                  | —                | P2       | within B1/B2                        |
| **B7** | **Item condition** (enum brand_new/like_new/good/fair; form picker, detail badge, Browse filter chips, 3 locales)       | ✅ Done                                  | claude           | P2       | `ConditionChips`, `ConditionBadge`  |
| C1     | Create / Edit listing                                                                                                  | ✅ Done (map location, photos, category) | —                | P0       | `/(main)/listing/new`, `/edit/[id]` |
| C2     | My Listings + lifecycle (publish · one-tap Mark sold from any live listing · hold placed/released from chat, not the listing · Sales ledger) | ✅ Done | — | P0 | `/(main)/(tabs)/my-listings` |
| **C3** | **Expiry visibility** (`ExpiryBadge` countdown on seller card + owner detail; **Expired tab** in My Listings; clock starts at publish) | ✅ Done | claude | P2 | `ExpiryBadge`, My Listings |
| D1     | Conversations list (+ friendly previews, sold dimming)                                                                 | ✅ Done                                  | —                | P1       | `/(main)/(tabs)/chat`               |
| D2     | Conversation thread                                                                                                    | ✅ Done (library waivers in §D2)         | feature-builder  | P1       | `/(main)/conversation/[id]`         |
| **D3** | **Chat deal actions** — meetup propose + accept/decline, **offer accept/decline** (`responds_to` link, outcome on card) | ✅ Done | — | P1 | within D2 |
| E1     | Saved / Favorites                                                                                                      | ✅ Done                                  | —                | P1       | `/(main)/(tabs)/saved`              |
| F1     | Profile (mine) — stats, mode toggle, avatar edit, dedicated Edit screen (`/(main)/profile/edit`), theme + language | ✅ Done | claude | P1 | `/(main)/(tabs)/profile` |
| F2     | Edit profile (inline + **map location**)                                                                               | ✅ Done                                  | claude           | P2       | within F1                           |
| F3     | Public seller profile                                                                                                  | ✅ Done                                  | —                | P2       | `/(main)/seller/[userId]`           |
| G1     | Report listing / user                                                                                                  | ✅ Done                                  | —                | P2       | `ReportSheet`                       |
| **P1** | **Animation System** — screen transitions, button feedback, list entrances, haptics                                    | ✅ Done (files exist: AnimatedPressable, haptics, usePulse, listItemAnimation) | —     | P1 (polish) | `src/lib/animation/`, layouts   |
| **P2** | **Design System Refinements** — logo, color consistency, typography scale, dark-mode edge cases, RTL perfection        | ⬜ Not started                           | _unassigned_     | P1 (polish) | cross-cutting                   |
| **P3** | **Screen-by-Screen Polish** — Browse cards, Listing detail gallery, Chat bubbles, Profile toggle, Seller grid         | ⬜ Not started                           | _unassigned_     | P1 (polish) | all screens                     |
| **P4** | **Micro-interactions** — button press states, input focus, success/error toasts, empty-state illustrations             | ⬜ Not started                           | _unassigned_     | P1 (polish) | cross-cutting                   |
| **P5** | **Performance & Accessibility** — GPU-accelerated animations, bundle size, reduce-motion support                       | ⬜ Not started (useReduceMotion hook missing) | _unassigned_ | P2 (polish) | cross-cutting                   |
| **Q0** | **Pre-Deployment Mobile Audit** — parent ticket; systematically identify web-specific code that breaks on iOS/Android  | ✅ Done (2026-06-17)                     | `feature-builder` | CRITICAL     | cross-cutting                   |
| **Q1** | **Web APIs & Browser Compatibility** — localStorage, window.*, document.*, web-only patterns                          | ✅ Done (2026-06-17)                     | `feature-builder` | CRITICAL     | `src/utils/`, `src/i18n/`       |
| **Q2** | **Web-Only Dependencies** — react-dom, react-native-web, expo-web-browser removed from package.json                   | ✅ Done (2026-06-17)                     | `feature-builder` | CRITICAL     | `package.json`                  |
| **Q3** | **Platform-Specific Code (iOS vs Android)** — Platform.select guards, permissions, native module fallbacks            | ✅ Done (2026-07-03)                     | `feature-builder` | CRITICAL     | `src/` cross-cutting            |
| **Q4** | **Build & Configuration** — web output in app.json, .web.tsx files, entry point isolation, Expo config for mobile     | ✅ Done (2026-06-17)                     | `feature-builder` | CRITICAL     | `app.json`, `*.web.tsx`         |
| **Q5** | **Testing on Real Devices** — full flow on iOS and Android, camera/location/storage/permissions, performance          | ⬜ Not started                           | _unassigned_     | CRITICAL     | all screens                     |
| **R0** | **Agent Coordination & Concurrency Management** — parent ticket; safe multi-agent parallel work with zero conflicts   | ⬜ Not started                           | _unassigned_     | CRITICAL     | process/docs                    |
| **R1** | **Work Isolation & Locking System** — WORK_LOCKS.md; per-agent file locks; start/complete protocol                   | ⬜ Not started                           | _unassigned_     | CRITICAL     | `docs/WORK_LOCKS.md`            |
| **R2** | **Task Dependency Tracking** — TASK_DEPENDENCIES.md; dependency graph; safe parallel paths; blockers                 | ⬜ Not started                           | _unassigned_     | CRITICAL     | `docs/TASK_DEPENDENCIES.md`     |
| **R3** | **Merge Conflict Prevention** — branch naming convention; per-feature commits; conflict resolution playbook           | ⬜ Not started                           | _unassigned_     | CRITICAL     | git workflow                    |
| **R4** | **Real-Time Status Tracking** — STATUS_BOARD.md; updated per session; shows active agents, locked files, ETAs        | ⬜ Not started                           | _unassigned_     | CRITICAL     | `docs/STATUS_BOARD.md`          |
| **R5** | **Session Isolation (Worktree Strategy)** — git worktrees per agent; filesystem-level isolation; cleanup/recovery    | ⬜ Not started                           | _unassigned_     | CRITICAL     | git worktrees                   |
| **R6** | **Communication & Handoff Protocol** — before/during/completion rules; blocker escalation; agent-to-agent handoffs   | ⬜ Not started                           | _unassigned_     | CRITICAL     | process/docs                    |
| **T701** | **Android CI: Maestro E2E GitHub Actions pipeline** — wire existing 151 flows into a PR-blocking workflow             | ⬜ Not started                           | _unassigned_     | P2           | `.github/workflows/`            |
| **T703** | **Fix pre-existing auth Maestro flows** — clearState no longer lands on Login (guest-browsing + onboarding both route elsewhere) | ⬜ Not started                           | _unassigned_     | P2           | `maestro/auth/`, `maestro/_helpers/` |
| **T706** | **API CI scan_ruby red (websocket-driver CVE)** — bundler-audit flagged websocket-driver 0.8.1 (GHSA-2x63-gw47-w4mm). Pre-existing, dependency-only. Fixed: `bundle update websocket-driver --conservative` → 0.8.2; rspec 1201 green, brakeman clean | ✅ Done (claude, 2026-07-09) | claude | P1 CI | `Gemfile.lock` |
| **T705** | **Web E2E: `redirects.spec` strict-mode violation** — `getByText("Ahmad Karimi")` matched the name span AND the page `<title>` ("Ahmad Karimi — Hatiwal"). Pre-existing latent test bug (not from reviews). Fixed: `{ exact: true }`. (The `Unexpected number in JSON` errors are a LOCAL-only next-dev-under-load artifact — CI showed 97/98, did NOT hit it; not a CI blocker.) | ✅ Done (claude, 2026-07-09) | claude | P1 CI | card #233 · `e2e/redirects.spec.ts` |
| **T704** | **Fix babel-plugin-jest-hoist crash in 2 test suites** — `SellerListingCard.test.tsx` + `ListingHeader.test.tsx` failed to run (a `jest.mock` factory that BOTH `require`s a module AND returns JSX crashes babel-plugin-jest-hoist). Fixed: moved BuyerPickerSheet mock to a manual `__mocks__/` file + stubbed ReviewPromptSheet (needs react-query). `npm test` now exits 0: 77 suites / 1258 tests | ✅ Done (claude, 2026-07-09) | claude | P2 CI | card #232 · `src/components/common/__mocks__/BuyerPickerSheet.tsx` |
| **N801** | **Push notification groundwork** — expo-notifications token registration + backend push_token column                  | ⬜ Not started                           | _unassigned_     | P2 post-MVP prep | `src/utils/push-token.ts`   |
| **N802** | **Seller listing analytics sparkline** — 7-day view counts chart on MyListingDetail                                   | ⬜ Not started                           | _unassigned_     | P2           | `src/screens/seller/MyListingDetail.tsx` |
| **N803** | **Conversation message search** — client-side keyword filter + highlight within a chat thread                          | ⬜ Not started                           | _unassigned_     | P2           | `src/screens/chat/Conversation.tsx` |
| **N804** | **Price history badge** — track price drops, show badge on listing detail and Browse card                              | ⬜ Not started                           | _unassigned_     | P2           | `ListingDetail`, `ListingCard`  |
| **N805** | **Seller response rate badge** — computed from conversations, shown on public seller profile and listing detail        | ⬜ Not started                           | _unassigned_     | P2 trust     | `SellerProfile`, `ListingDetail` |
| **N806** | **FirstMessageSheet title/price hierarchy** — listing-reference row shows title above price with no visual hierarchy (same gap PublishSuccessSheet had before its CYCLE-3 fix); price should outrank the title | ⬜ Not started                           | _unassigned_     | P3           | `src/screens/shared/listing-detail/FirstMessageSheet.tsx` |
| **REV1** | **Reviews — backend** — double-blind `Review` on sold `Transaction`; `avg_rating`/`review_count` on User; create/index/update/pending endpoints; reveal-on-second-submit + `RevealOverdueReviewsJob` (14d); policy + factory + specs | ✅ Done (claude, 2026-07-09) | claude | P2 trust | `hatiwal-api/` · spec: `docs/REVIEWS_SYSTEM.md` |
| **REV2** | **Reviews — mobile** — `reviews.ts` + RQ hooks, `RatingDisplay`/`StarRatingInput`/`ReviewCard`/`ReviewsList`/`ReviewPromptSheet`, profile section + all-reviews screen, pending-reviews nudge, double-blind pending state, buyer-picker nudge live, 3 locales+RTL, Jest+Storybook+Maestro. Designer polish: star pop+haptics, list stagger, compact empty state, pre-submit blind notice | ✅ Done (built claude → polished marketplace-designer, 2026-07-09) | feature-builder → marketplace-designer | P2 trust | card #231 · `src/api/reviews.ts`, `app/(main)/user/[id]/reviews.tsx` |
| **REV3** | **Reviews — web** — `reviews.ts` + TanStack Query, `RatingDisplay`/`StarRating`/`ReviewCard`/`ReviewsSection`, seller-profile rating summary + reviews tabs (as-seller/as-buyer), guest-readable `reviews#index` (backend), 3 locales+RTL, e2e. Mirrors mobile contract | ✅ Done (claude, 2026-07-09) — tsc 0 errors + e2e green (`npm run build` blocked by pre-existing root-owned `.next/` Docker artifacts) | claude | P2 trust | `hatiwal-web/` · `e2e/reviews.spec.ts` |
| **SF-B1** | **Sell Flow Redesign — widen live/browsable/messaging** so a reserved listing stays in search/chat (shipped atomically with SF-M3) | ✅ Done (board card 274) | claude (backend feature-builder) | P0 | `hatiwal-api/app/models/listing.rb` |
| **SF-B2** | **Sell Flow Redesign — reserve gains quantity; expose "N held"** | ✅ Done (board card 275) | claude (backend feature-builder) | P0 | `hatiwal-api/app/models/listing.rb` |
| **SF-B3** | **Sell Flow Redesign — outside-buyer sales get a ledger row** (nullable `transactions.buyer_id`) | ✅ Done (board card 276) | claude (backend feature-builder) | P1 | `hatiwal-api/app/models/transaction.rb` |
| **SF-B4** | **Sell Flow Redesign — undo & edit a recorded sale** (`PATCH`/`DELETE /my/transactions/:id`) | ✅ Done (board card 277) | claude (backend feature-builder) | P1 | `hatiwal-api/app/controllers/api/v1/my/transactions_controller.rb` |
| **SF-B5** | **Sell Flow Redesign — per-listing sales ledger read** (`listing_id` filter + `sales_count`) | ✅ Done (board card 278) | claude (backend feature-builder) | P2 | `hatiwal-api/app/controllers/api/v1/my/transactions_controller.rb` |
| **SF-M1** | **Sell Flow Redesign — "Mark sold" is the one-tap primary from Live; drop Reserve tab** | ✅ Done (board card 279) | claude (mobile feature-builder) | P0 | `src/hooks/useListingLifecycle.ts` |
| **SF-M2** | **Sell Flow Redesign — reserve moves into the chat thread** | ✅ Done (board card 280) | claude (mobile feature-builder) | P1 | `src/screens/chat/conversation/ListingHeader.tsx` |
| **SF-M3** | **Sell Flow Redesign — stop treating reserved as a dead end on mobile** (shipped atomically with SF-B1) | ✅ Done (board card 281) | claude (mobile feature-builder) | P0 | `src/screens/shared/ListingDetail.tsx` |
| **SF-M4** | **Sell Flow Redesign — multi-unit "held" transparency on the stock pill** | ✅ Done (board card 282) | claude (mobile feature-builder) | P2 | `src/utils/stock.ts` |
| **SF-M5** | **Sell Flow Redesign — Undo toast + Sales screen with editable/deletable rows** | ✅ Done (board card 283) | claude (feature-builder) | P1 | `/(main)/listing/[id]/sales` |
| **SF-M6** | **Sell Flow Redesign — `QuantityStepper` + buyer-side quantity intent + structured first message** | ✅ Done (board card 284) — design pass 09cb4d0 fixed the "cart shape" layout issue | claude (feature-builder → marketplace-designer) | P1 | `src/components/common/QuantityStepper.tsx` |
| **SF-W1** | **Sell Flow Redesign — bring hatiwal-web to the same model** — NOT this pass | ⏸ Blocked (board card 285) | _unassigned_ | P2 | `hatiwal-web/` |
| **SF-B6** | **Sell Flow Redesign — editing a listing's quantity must reconcile its sold status, both directions** (upward re-opens a sold-out listing to Live; downward below what's already sold is a 422, not a 500) | ✅ Done (board cards 289/290) | claude (backend feature-builder) | P1 | `hatiwal-api/app/models/listing.rb`, `my/listings_controller.rb` |
| **SF-B7** | **Sell Flow Redesign — `renew`/`unpublish`/`activate` rescue `RecordInvalid`** like `sold`/`reserve` already did, instead of a 500 with an empty body | ✅ Done (board card 292) | claude (backend feature-builder) | P2 | `hatiwal-api/app/controllers/api/v1/my/listings_controller.rb` |
| **SF-B8** | **Sell Flow Redesign — lowering quantity below an OPEN HOLD is refused, not silently accepted** (was rendering "2 available · 10 held" to buyers) | ✅ Done (board card 293) | claude (backend feature-builder) | P1 | `hatiwal-api/app/models/listing.rb` |
| **SF-B9** | **Sell Flow Redesign — selling a BATCH now closes out its own open hold** (a hold used to survive its own sale, leaving a phantom "5 available · 10 held" on already-sold stock) | ✅ Done (board card 294) | claude (backend feature-builder) | P1 | `hatiwal-api/app/models/listing.rb` |
| **SF-M4b** | **Sell Flow Redesign — seed a multi-unit listing WITH an open hold**, so Maestro can assert the "N held" text end-to-end (SF-M3/SF-M4 shipped with no fixture to prove the positive case) | ✅ Done (board card 288) | claude | P2 | `hatiwal-api/db/seeds/e2e.rb` |
| **SF-M7** | **Sell Flow Redesign — mobile side of the quantity/sold-status reconciliation**: inline 422 pinned to the field (localized from the server's `quantity_below_sold_units` code, not raw English) + a note that raising quantity will relist the item | ✅ Done (board card 291) | claude (mobile feature-builder) | P2 | `src/screens/seller/ListingForm.tsx` |
| **SF-M8** | **Sell Flow Redesign — `BuyerPickerSheet`'s confirm mode was dropping the typed hold quantity** on a multi-unit listing (a seller could never place a hold for >1 unit from chat) | ✅ Done (board card 297, design-pass commit 09cb4d0) | claude (marketplace-designer) | P1 | `src/screens/chat/Conversation.tsx` |
| **TASK-API-FEEDN1** | `GET /listings` N+1 — serializer reads `user`/`category`/`thumbnail_url` (and now `sale_transactions` for `held_units`) but the feed doesn't always eager-load every association it touches | ✅ Done (board card 286, commit `f06b29e`) — a 15-card feed page went from **109 queries to 10**; the spec asserts SLOPE (same count for 3 rows as for 15) and all seven `:list`/`:seller_list` endpoints now carry a flat-slope regression lock | _unassigned_ → backend feature-builder | P2 | `hatiwal-api/app/controllers/api/v1/listings_controller.rb` |
| **SF-M3b** | Narrow `reserved` out of the `ListingUnavailable*` prop types (`"reserved" \| "sold"` → `"sold"`) + `ConversationRow.tsx`'s dimming condition — behaviour is already correct at runtime (SF-M3), this is the type-level cleanup flagged as a fast-follow when it was built | ⬜ Not started (board card 287) | _unassigned_ → feature-builder | P3 | `src/screens/chat/conversation/ListingUnavailableNotice.tsx`, `ConversationRow.tsx` |
| **SF-B10** | `reserved_at` stays `nil` while a BATCH holds units — the 3rd instance of the "status-as-proxy-for-hold" root cause SF-B9's commit named but didn't fix (a batch's hold never touches `reserved_at` because it never becomes `status: reserved`) | ✅ Done (board card 295, commit `f06b29e`) | claude (backend) | P3 | `hatiwal-api/app/models/listing.rb` |
| **SF-QA1** | QA readiness: rewrite `qa/features.yaml` to the new flow (it still describes reserve-then-sell), fix 3 stale Maestro flows, seed fixtures — see `docs/SELL_FLOW_QA_PLAN.md`. **No Maestro flow has ever been executed on a device for this redesign** — this ticket owns that gap | 🟡 In progress (board card 296) | _in progress_ | P0 | `qa/`, `maestro/` |
| **SF-M9** | `BuyerPickerSheet` should use the shared `QuantityStepper` instead of its raw numeric `Input` — deliberately deferred by SF-M6 because it touches 4 Maestro flows and needed a **product decision**: the `Input` warns visibly on an over-stock count before confirming; `QuantityStepper` today clamps silently. **SUPERSEDED — Decision (owner, 2026-08-28): CAP + REASON, shipped in commit `3201271`.** Neither silent clamping nor the free-text warning: the stepper caps at available stock and states the cap ("Only 15 left. Edit the listing if you have more."), which is what Amazon/eBay actually do. Silent clamping fails the rule that a user must never hit a failure they cannot see; the free-text warning kept the raw-`Input` fork alive, failing the no-duplication rule. The superseded reasoning is left below only to explain why it changed — `hatiwal-web`'s equivalent dialog (`sell-buyer-dialog`) already warns instead of silently clamping, and a seller typing "20" when only 15 are left is very plausibly a fat-finger they should catch before confirming a sale/hold they can't take back cheaply — a silent clamp to 15 hides that mistake. **Scope for the swap:** add an optional `onOverMax?: (typed: number, max: number) => void` (or a `warnOnOverMax` prop) to `QuantityStepper` so it can surface the same visible warning instead of clamping, then swap `BuyerPickerSheet`'s `Input` for it once SF-QA1's Maestro rewrite is in and can absorb the ~25 assertion changes in one pass rather than two | ⬜ Not started (board card 298) | _unassigned_ → feature-builder | P2 | `src/components/common/BuyerPickerSheet.tsx`, `QuantityStepper.tsx` |
| —      | 💡 Ideas backlog                                                                                                       | 💡 Idea                                  | _unassigned_     | post-MVP | see §Ideas                          |

> "In progress (raw RN)" = the screen exists and works, but is built with raw `Text`/`FlatList`/`Alert`
> and must be migrated to the design system (RNR + the shared components + the approved libraries) before it's `✅`.

---

## A — Authentication

### A1 — Login ✅

- **Owner:** — · **Route:** `/(auth)/login` · **Endpoint:** `POST /auth/sign_in` · **File:** `src/screens/shared/Login.tsx`
- **Options & detail:** email + password fields; submit; link to Register; **language switcher (en default, ps/fa)**; inline error; loading state on submit. Tokens persisted via `secureStorage` (web-safe).
- **Acceptance:** ✅ logs in, persists token, lands in browse; works on web. _To polish later: migrate to RNR `Input`/`Button` + `react-hook-form`+`zod`._

### A2 — Register ✅

- **Endpoint:** `POST /auth` · **File:** `src/screens/shared/Register.tsx`
- **Detail:** firstname, lastname, email, password, password confirmation; persists auth headers on success → browse.

### A3 — App bootstrap / splash redirect ✅

- **File:** `src/stores/auth.bootstrap.ts` + `src/screens/shared/Splash.tsx`
- **Endpoint:** `GET /auth/validate_token` — called in background after optimistic hydration.
- **Detail:** `bootstrapAuth()` reads stored token, sets `isAuthenticated` optimistically (no flash), then validates in background. Only a 401 clears the session; network errors preserve it. Called from root `_layout.tsx` (deep routes) and Splash (then routes to Browse). Guest users land on Browse, account tabs gate to login via `useRequireAuth`.

---

### A4 — Guest browsing ✅ (taken by claude, 2026-06-14)

- **Files:** `src/hooks/useRequireAuth.ts` (new), `src/screens/shared/Splash.tsx`, `src/screens/shared/Login.tsx`, `src/screens/shared/Register.tsx`, `app/(main)/(tabs)/_layout.tsx`, `src/screens/buyer/Browse.tsx`, `src/screens/buyer/ListingDetail.tsx`
- **Backend:** `GET /listings` (index) + `GET /listings/{id}` (show) + `GET /categories` are public — `skip_before_action :authenticate_user!` + `authenticate_optional!` resolves `current_user` only when a token is present. Per-user flags (`is_saved`, `is_viewed`) default to false for guests. Save/contact/offer endpoints still require auth (401).
- **Detail / options:**
  - Splash with **no/expired token → lands on Browse as a guest** (no login wall); only a real validated token hydrates the user.
  - **`useRequireAuth().requireAuth(action, returnTo)`** is the single gate: runs the action when signed in, else pushes `/(auth)/login?returnTo=…`.
  - Gated **actions**: save (Browse + detail), contact seller, make offer → all return the guest to the same listing/feed after login.
  - Gated **tabs**: Saved, Chat, Profile, My-Listings intercept `tabPress` for guests → login with `returnTo` set to that tab.
  - Login **and** Register read `returnTo` and `router.replace` there post-auth; the cross-links between them forward `returnTo` so it survives the round-trip.
- **Acceptance:** a logged-out user can open the app, scroll the feed, open any listing, and only hits the login screen when they try to save/contact/offer or open an account tab — and after logging in they land back exactly where they were. Verified: backend 347 specs green (incl. guest-can-browse / guest-cannot-save); web bundle compiles with the gate wired into all call sites.

---

## S0 — Shared Components (build FIRST — blocks the feed pages) ⬜

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Files:** `src/components/common/`
- **Why first:** B1, B2, C2, E1, F3 all render listings; build the card once.
- **Components & detail:**
  - **`ListingCard`** — `expo-image` photo (4:3, blurhash placeholder) · `PriceTag` · title (1–2 lines) · seller city + "posted X ago" (`formatDate`) · `StatusBadge` · save-heart toggle (animated). Press → detail. `android_ripple` + opacity press feedback. RTL-safe.
  - **`PriceTag`** — `formatCurrency(price, currency)`, sizes lg/md/sm, bold, `text-foreground`.
  - **`StatusBadge`** — maps `draft→muted · active→success · reserved→warning · sold→grey/dim` (RNR `Badge`).
  - **`EmptyState`** — Lucide icon + title + one-line guidance + optional primary `Button`.
  - **`ListingCardSkeleton`** — RNR `Skeleton` mirroring the card.
- **Libraries:** `expo-image`, `lucide-react-native` (via RNR `Icon`).
- **Acceptance:** card renders in light/dark + RTL; skeleton matches; used by ≥2 screens.

---

## B — Buyer: Browse & Discover

### B1 — Browse feed 🟡 (migrate)

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Route:** `/(main)/(tabs)/browse`
- **Endpoint:** `GET /listings?search&category_id&page` → `listings[]` + `meta.pagination` (`:list`) · **File:** `src/screens/buyer/Browse.tsx` (exists, raw RN — replace)
- **Options & detail:**
  - Feed of `ListingCard` via `UniversalList` → `@shopify/flash-list` (perf).
  - **Search bar** (debounced, RNR `Input`); clears; submit re-queries.
  - **Category filter** — horizontal chip row (RNR `Badge`) + "All"; tap filters by `category_id`; optional `CategoryPicker` sheet for full list.
  - **Pull-to-refresh** + **infinite scroll** (pagination).
  - **Save-heart** on each card (optimistic; see E1 endpoints).
  - Grid (2-col) vs list toggle — _optional, P2_.
  - **States:** skeleton grid (loading) · `EmptyState` "Nothing here yet" · no-results "Nothing matches '<q>'" + Reset · error + retry toast.
  - `useFocusEffect` refetch.
- **Acceptance:** photo-first, price prominent, scrolls smoothly on mid-range Android; search + category work; RTL + dark correct.

### B2 — Listing detail ⬜

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Route:** `/(main)/listing/[id]`
- **Endpoint:** `GET /listings/:id` (`:detailed`: images[], description, location, lat/long, seller{name,city,phone}, category) — **increments `views_count`** · **File:** `src/screens/shared/ListingDetail.tsx` (+ `listing-detail/` subfolder if > 300 lines)
- **Options & detail:**
  - **`ListingGallery`** hero — `react-native-reanimated-carousel` + `expo-image` + page dots; tap → fullscreen viewer (_P2_).
  - `PriceTag` (lg) → title → category + condition `Badge`s → description → **location** (city always; map snippet via `expo-location`/`react-native-maps` if lat/long — _P2_).
  - **`SellerCard`** — avatar, name, city; tap → public profile (F3). Phone reveal (call/tap) — _gated, P2_.
  - **Sticky primary "Message seller"** button → opens first-message sheet (D2 start flow). Hidden/disabled if viewing own listing or listing not `active`.
  - **Save-heart** in header; **Report** affordance (quiet) → `ReportSheet` (G1).
  - Status badge; "posted X ago" + views count.
  - **States:** skeleton (gallery + lines) · error "Listing not found" · sold/reserved banner.
- **Acceptance:** earns the message tap; gallery swipes; sticky CTA reachable; RTL + dark.

### B3 — Search & category filter 🟡

- Folded into B1. Standalone search-results route optional. `CategoryPicker` (`@gorhom/bottom-sheet`) is the shared category selector (also used by C1).

---

## C — Seller: Listings & Lifecycle

### C1 — Create / Edit listing ⬜

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Routes:** `/(main)/listing/new`, `/(main)/listing/edit/[id]`
- **Endpoints:** `POST /my/listings` (multipart `listing:{title,description,price,currency,category_id,location,lat,long,images[]}` → starts **draft**); `PUT /my/listings/:id` (edit while draft) · **File:** `src/screens/seller/ListingForm.tsx`
- **Options & detail (form sections, `react-hook-form` + `zod`):**
  1. **Photos first** — `expo-image-picker` multi-select + camera; thumbnail strip with **reorder** + **cover** indicator + remove; upload via `FormData`. (≥1 photo recommended.)
  2. **Title** — required, ≤150 chars, counter.
  3. **Price + currency** — numeric price (>0) + currency segmented (AFN default / USD).
  4. **Category** — `CategoryPicker` bottom sheet (searchable, trilingual names).
  5. **Description** — RNR `Textarea`, optional.
  6. **Location** — city text + optional pin (`expo-location`).
  - **Submit options:** **Save draft** vs **Publish now** (publish = create then `PUT publish`). Sticky submit bar. Inline validation; disabled/loading on submit; `sonner-native` success toast.
  - Edit mode prefills; only editable while `draft`.
  - **States:** validation errors inline; upload progress; network error toast.
- **Acceptance:** can post a listing with photos end-to-end; draft and publish both work; RTL + dark.

### C2 — My Listings + lifecycle ✅

> **2026-08-27 — superseded by the Sell Flow Redesign, SHIPPED.** The "Active→Reserve·
> Reserved→Mark sold" lifecycle this section originally described no longer exists. As of `SF-M1`/
> `SF-M2` (board cards 279/280, both ✅ Done): Mark sold is the one-tap primary from any live listing
> (`active` or `reserved`, never requires reserving first); Reserve/Release-hold moved into the chat
> thread (`ComposerActionsSheet`'s "+" menu), off the listing surface entirely; "Reserved" is no
> longer its own status tab — a held listing appears under **Active** with a hold badge. Full spec:
> `docs/SELL_FLOW_REDESIGN.md`. The per-card detail immediately below is corrected to match; it is
> **not** left as stale historical context, because it would otherwise directly contradict `SF-M1`.

- **Owner:** claude (feature-builder), Sell Flow Redesign portion · **Route:** `/(main)/(tabs)/my-listings`
- **Endpoints:** `GET /my/listings?status` (`:seller_list`: views_count, conversations_count, timestamps); `DELETE /my/listings/:id`; `PUT .../publish|sold` (mark sold, always available on a live listing) · `PUT .../reserve|activate` (place/release a hold — called from the **chat thread** now, not this screen) · **File:** `src/screens/seller/MyListings.tsx`, `src/hooks/useListingLifecycle.ts`
- **Options & detail:**
  - `UniversalList` of `ListingCard` (seller variant, `SellerListingCard`) with **views** + **conversation count** + a "N held [for {name}]" clause when a multi-unit listing has an open hold.
  - **Status tabs/filter:** All · Draft · Active · Expired · Sold. No separate **Reserved** tab — a held listing (single- or multi-item) shows under **Active** with its hold badge.
  - **Per-card next-action button** (the one obvious action by state): Draft→**Publish** · Active or Active-with-a-hold→**Mark sold** (always, one tap, never gated on reserving first) · Sold→*(none, terminal)* · overflow menu→Edit / Duplicate / Delete / **Release hold** (when this listing has an open hold) / **View sales** (once ≥1 unit has sold).
  - **Delete** via `confirmAlert` (destructive) + toast.
  - FAB / header **"+ Post"** → C1.
  - **States:** skeleton · empty "You haven't posted anything yet" + **Post a listing**.
  - `useFocusEffect` refetch (so a new/published listing shows immediately).
- **Acceptance:** every lifecycle transition works with confirmation + toast; status filter works (no Reserved tab, held listings count under Active); no raw `Alert`.

---

## D — Chat

### D1 — Conversations list 🟡 (migrate)

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Route:** `/(main)/(tabs)/chat`
- **Endpoint:** `GET /conversations` (`:list`: listing{title,thumbnail,status}, other_participant{name,city}, last_message_body, unread_count) · **File:** `src/screens/chat/Conversations.tsx` (exists, raw RN — replace)
- **Options & detail:** rows = participant avatar + listing thumbnail (`expo-image`) + last message (truncated) + time (`formatDate`) + **unread badge**; ordered by `last_message_at`; tap → thread (D2). Unread total drives the chat **tab badge**.
- **States:** skeleton rows · empty "No conversations yet" + Browse.
- **Acceptance:** unread counts correct; RTL bubbleless rows mirror; dark mode.

### D2 — Conversation thread ✅ (taken by feature-builder, 2026-06-24)

- **Owner:** feature-builder · **Route:** `/(main)/conversation/[id]`
- **Endpoints:** `GET /conversations/:id` (`:detailed`); `GET /conversations/:id/messages` (paginated, asc); `POST /conversations/:id/messages` (`body`,`kind`; only if `open`); **start:** `POST /listings/:listing_id/conversations` (`message`) · **File:** `src/screens/chat/Conversation.tsx`
- **Options & detail:**
  - Pinned listing header card (thumbnail + `PriceTag` + `StatusBadge`) so both sides remember the item.
  - RTL-safe message bubbles (mine/theirs, row-reverse, scaleX:-1 Send icon, text align flips).
  - Read receipts (`read_at` double-tick), optimistic send with rollback on failure.
  - Meetup proposal (`kind: meetup_proposal`) with place + time fields → special bubble with Accept/Decline.
  - Offer bubbles (`kind: offer`) with Accept/Decline for seller, outcome badge visible to both sides.
  - Block/unblock toggle in nav bar (seeded from `blockedWithParticipant` on load).
  - Conversation search: animated slide-in bar, match-count badge, highlight in bubbles via `warningAlpha`.
  - ActionCable live updates (`useConversationCable`).
  - Start flow: from listing detail; 422 (inactive/self/duplicate) → friendly toast.
  - Closed conversation → input disabled with notice.
  - States: `ChatSkeleton` (reduce-motion safe), empty thread, send failure toast.
  - `useFocusEffect` refetch + `markMessagesRead` on focus.
- **Library waivers (dated 2026-06-24, approved by feature-builder):**
  - **`react-native-gifted-chat` NOT used** — the spec named gifted-chat, but the offer-card and meetup-card message kinds require fully custom bubble components (rendered inside the list item) that gifted-chat's `renderMessage` API cannot host without re-building the entire layout wrapper. The bespoke `FlatList` + `MessageBubble` component achieves RTL, read receipts, special bubbles, and reduce-motion animations that gifted-chat cannot provide without matching complexity. Revisit if a future gifted-chat major version ships a composable card slot API.
  - **`@gorhom/bottom-sheet` NOT used for `MeetupSheet`** — the Meetup form is a simple 2-field sheet (place + time) that needs `KeyboardAvoidingView` to lift the input above the keyboard. `@gorhom/bottom-sheet` does not natively compose with `KeyboardAvoidingView` on Android; using a raw `Modal` with `animationType="slide"` and RNR content inside is the documented fallback pattern per `mobile.prompt.md §5`. Future migration: if `@gorhom/bottom-sheet` v5 ships native keyboard handling, migrate then.
- **Acceptance:** ✅ can start from a listing and exchange messages; RTL bubbles correct; pinned listing visible; meetup proposal works; block toggle renders with correct initial state.

---

## E — Saved / Favorites

### E1 — Saved list ⬜

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Route:** `/(main)/(tabs)/saved`
- **Endpoints:** `GET /my/saved_listings` (`:list`, no pagination); save `POST /listings/:id/save`; unsave `DELETE /listings/:id/unsave` · **File:** `src/screens/buyer/Saved.tsx`
- **Options & detail:** `UniversalList` of `ListingCard`; the **save-heart** (shared on every card across B1/B2) toggles membership optimistically + toast; tap → detail.
- **States:** skeleton · empty "No saved items yet" + Browse.
- **Acceptance:** heart state is consistent everywhere; unsave updates the list; `useFocusEffect` refetch.

---

## F — Profile & Account

### F1 — Profile (mine) 🟡

- **Owner:** feature-builder · **Route:** `/(main)/(tabs)/profile`
- **Endpoint:** `GET /users/me` (`:me`) · **File:** `src/screens/shared/Profile.tsx`
- **Options & detail:** avatar header; info (name, city, member-since); **buyer/seller mode toggle** (`useModeStore`); **language switcher**; link to Edit profile (F2); **Sign out** (`confirmAlert` — ✅ already fixed). _Current screen uses raw RN; migrate to RNR and polish hierarchy before handing to marketplace-designer._
- **Acceptance:** sign-out works (✅); RNR + dark + RTL.

### F2 — Edit profile ✅ (taken by claude, 2026-06-14)

- **Endpoint:** `PUT /users/me` (`user:{firstname,lastname,phone,bio,city,latitude,longitude,...}`) · **File:** implemented **inline in `src/screens/shared/Profile.tsx`** (edit mode), not a separate screen.
- **What's built:** edit firstname, lastname, phone, bio, city, **avatar**, and **location on the map** — a "Set your location on map" row opens the shared `LocationRangePicker` (point mode: search any place via geocoding or drop a pin); confirming stores `latitude`/`longitude` and fills `city` with the readable place name. Save → `authAPI.updateMe` → invalidates `["me"]`. RTL + dark via `useColors`; strings in en/ps/fa.
- **Still optional (P2):** dedicated `province` field + `preferred_language` inside the edit form (language is already switchable elsewhere in F1); migrate the raw `TextInput`s to RNR `Input` + `react-hook-form`/`zod` when marketplace-designer polishes F1.

### F3 — Public seller profile ⬜

- **Endpoint:** `GET /users/:id` (`:public`: full_name, bio, province, listings_count) · **File:** `src/screens/shared/UserProfile.tsx`
- **Options & detail:** trust dossier — avatar, name, city, member-since, **active-listings count** + grid of their active listings (`ListingCard`); Report affordance (G1). Reached from `SellerCard`.

---

## G — Safety

### G1 — Report listing / user ⬜

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Surface:** `ReportSheet` (no route)
- **Endpoint:** `POST /reports` (`report:{reportable_type:"Listing"|"User", reportable_id, reason, description}`)
- **Options & detail:** `@gorhom/bottom-sheet` + RNR `RadioGroup` with the 6 reasons (**spam · inappropriate · fraud · wrong_category · prohibited_item · other**) + optional `Textarea` note; submit + toast. Blocks self-report & duplicates (422 → toast). Triggered from B2 + F3.

---

## P — Animation & UI/UX Polish

> This section is a **post-MVP polish phase**, to be executed after all MVP screens are shipped and marked Done.
> Priority within the phase is P1 first, then P2. All items are `⬜ Not started` and `_unassigned_`.
> The normal pipeline applies: `feature-builder` implements → `marketplace-designer` reviews.
>
> **Library constraint (do not add new deps without approval):**
> - `react-native-reanimated` v4 is already installed — use it for all animation work.
> - `expo-haptics` is NOT yet installed — add it with `npx expo install expo-haptics` when P1 begins.
> - Do NOT introduce Lottie or any additional animation lib without a product-owner decision.
> - All animation must respect `AccessibilityInfo.isReduceMotionEnabled` (see P5).

---

### P1 — Animation System ⬜

- **Owner:** _unassigned_ -> `feature-builder -> marketplace-designer`
- **Scope:** Establish a shared animation foundation that every screen pulls from. Build once, use everywhere. No ad-hoc `Animated` or `reanimated` calls scattered in screens — they must reference the shared system.
- **Files:** `src/lib/animation/` (new folder), `app/(main)/_layout.tsx`, `app/(auth)/_layout.tsx`
- **Library:** `react-native-reanimated` (already installed) + `expo-haptics` (install first)

**Sub-features and detail:**

1. **Screen transitions**
   - Expo Router's Stack `screenOptions` currently has no animation config — screens pop in without a transition.
   - Configure `(main)/_layout.tsx` and `(auth)/_layout.tsx` with `animation: 'slide_from_right'` for push/pop and `animation: 'fade'` for modal presentations (sheets already animate via `@gorhom/bottom-sheet`).
   - Tab switches: use `fade` — avoid slide, which clashes with the meaning of swipe navigation.
   - Keep durations short (200–250 ms). Never block the user.

2. **Button press feedback**
   - Every `Pressable` / RNR `Button` / card press must give tactile feedback: scale down to `0.97` + opacity to `0.85` on press-in, spring back on press-out (`withSpring`).
   - Create a reusable `AnimatedPressable` wrapper in `src/lib/animation/AnimatedPressable.tsx` that wraps any child and applies the above. All cards and action buttons should use it.
   - Pair with `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on press-in for satisfying tactile response. Gate behind reduce-motion check (see P5).

3. **Skeleton / loading states**
   - All existing `ListingCardSkeleton` and any future skeletons must pulse (shimmer) using a `reanimated` loop: `withRepeat(withSequence(withTiming(0.4), withTiming(1)), -1, true)` on opacity.
   - Create `src/lib/animation/usePulse.ts` — a hook returning an animated `opacity` style. All skeletons import it.
   - Current skeleton in `src/components/reusables/skeleton.tsx` may already have animation; audit it and consolidate.

4. **List item entrance animations**
   - When a `FlashList` or `FlatList` renders items for the first time (not on scroll continuation), stagger entrance: `FadeInDown` with `delay(index * 40)` (cap stagger at item 8 — beyond that, no delay).
   - Create `src/lib/animation/listItemAnimation.ts` exporting the standard entering prop. Import in `ListingCard`.
   - On item deletion (My Listings delete): animate the card out with `FadeOutLeft` before the list re-renders.

5. **Modal / bottom-sheet slide-up**
   - `@gorhom/bottom-sheet` handles its own spring. No override needed.
   - For any custom `Modal` (not a bottom sheet), use `reanimated` slide-up from bottom: `SlideInDown` entering, `SlideOutDown` exiting.
   - Ensure `ReportSheet`, `MeetupSheet`, and `CategoryPickerSheet` all use `@gorhom/bottom-sheet` consistently (audit: some may use raw Modal — fix those).
   - **Audit extended (TASK-K729 review, 2026-08):** also covers `ComposerActionsSheet.tsx`, `ReviewPromptSheet.tsx`, `BuyerPickerSheet.tsx`, and `PhotosSection.tsx`'s inline `SourcePickerSheet` — all four use a raw RN `<Modal>`, same as `MeetupSheet`. Each already carries an inline waiver comment (native-only platform splits crash the web dev runner / no native `KeyboardAvoidingView` composition on Android), matching the justification already accepted for `MeetupSheet` above and documented in full at **D2**'s ReviewNotes. Tracked as its own ticket — **N808** below — so the waiver has one place to live instead of a comment per file.

6. **Gesture feedback — haptics**
   - Install: `npx expo install expo-haptics`
   - Trigger `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on: button press, save-heart toggle, lifecycle action confirmation.
   - Trigger `Haptics.notificationAsync(NotificationFeedbackType.Success)` on: successful listing publish, message sent, offer accepted.
   - Trigger `Haptics.notificationAsync(NotificationFeedbackType.Error)` on: form validation failure, network error toast.
   - All haptics wrapped in a `triggerHaptic(type)` helper in `src/lib/animation/haptics.ts` that checks reduce-motion/accessibility before firing.

**Acceptance criteria:**
- [ ] Screen pushes and tab switches have consistent, short transitions — no abrupt flashes.
- [ ] Every interactive card and button gives scale + opacity press feedback.
- [ ] All skeletons pulse (shimmer).
- [ ] List items animate in on first load; deletions animate out.
- [ ] Haptics fire on key interactions; reduce-motion disables them.
- [ ] No new animation library was introduced — only `reanimated` + `expo-haptics`.

---

### P2 — Design System Refinements ⬜

- **Owner:** _unassigned_ -> `marketplace-designer` (design-only, no new API calls)
- **Scope:** Visual consistency and brand identity pass. This is a design/polish task — no backend dependency.
- **Files:** `src/lib/theme/`, `src/components/common/`, `assets/`, app layouts

**Sub-features and detail:**

1. **Application logo system**
   - Create and finalize the Hatiwal wordmark / logomark in `assets/images/` (SVG source + PNG exports at 1x/2x/3x).
   - Animated logo reveal on splash / app bootstrap: fade in + subtle scale-up (`withSpring`) over 500 ms. Only on cold start.
   - Logo appears in: Auth screens (centered, above form card), Splash screen.
   - Logo must work in both light and dark mode (use a version with `foreground`-appropriate color, or two variants).
   - _Note: logo creation may require designer input outside Claude tooling. Placeholder can be the wordmark "Hatiwal" in bold with the primary color until a proper logomark is ready._

2. **Color palette refinement**
   - Audit every screen for hardcoded hex values or className color tokens (violates `useColors()` rule from DESIGN_SYSTEM.md). Fix all violations.
   - Ensure `primary` accent color reads correctly in both light and dark on every screen — particularly buttons, active tab indicators, and badges.
   - Verify `StatusBadge` colors (`draft` grey, `active` green, `reserved` amber, `sold` dimmed) are consistent across Browse, My Listings, Listing Detail, and Chat header.
   - All `mutedForeground` meta text (timestamps, city, view counts) must be the same visual weight everywhere.

3. **Typography hierarchy**
   - Screen titles: `text-2xl font-bold` — confirm every screen header uses this.
   - Section headings: `text-lg font-semibold` — audit My Listings tabs, Profile section labels.
   - Card titles: `text-base font-semibold` — audit `ListingCard` and ensure consistency.
   - `PriceTag` large variant must be the most visually prominent non-photo element on listing detail. If it is not, increase size or weight.
   - Meta text (city, time, views): `text-xs` + `mutedForeground` — ensure nothing breaks this rule.

4. **Spacing and padding consistency**
   - Section gaps: `gap-4`. Field gaps: `gap-3`. Card padding: `p-4`. Screen inset: `paddingHorizontal: 16`.
   - Audit all screens against the spacing rhythm from DESIGN_SYSTEM.md §3. Fix inconsistent screen insets, double-inset list screens (no `marginHorizontal` on cards), and card border-radius uniformity.

5. **Dark mode edge cases**
   - Known issue area: any `className` color token that was not migrated to `useColors()` appears as a light-mode value in dark. Audit all screens systematically — run on dark mode, screenshot each screen, fix any white-on-white or black-on-black.
   - Check: input backgrounds, sheet backgrounds, skeleton base color, tab bar active color, badge backgrounds.
   - Verify `UserIdentity` and `UserAvatar` initial-circle color is readable in both modes.

6. **RTL layout perfection**
   - Switch app locale to Pashto (`ps`) and walk every screen. Fix any `left`/`right` hardcodes, flex direction assumptions, or icon placements that break.
   - Specific known risk areas: chat bubbles (sender right, receiver left — must mirror in RTL), listing card (heart icon placement), form labels, screen back button.
   - All `TextInput` `textAlign` must respect RTL (`textAlign: isRtl ? 'right' : 'left'`).
   - Run same audit for Dari (`fa`).

**Acceptance criteria:**
- [ ] No hardcoded hex colors anywhere in `src/`.
- [ ] No className color tokens — only `useColors()`.
- [ ] Logo appears correctly on splash and auth screens in both light and dark.
- [ ] Typography hierarchy is consistent and intentional on every screen.
- [ ] Spacing rhythm is uniform; no double-inset list screens.
- [ ] Dark mode screenshots show no contrast failures.
- [ ] RTL screenshots (Pashto) show correct mirroring on all screens.

---

### P3 — Screen-by-Screen Polish ⬜

- **Owner:** _unassigned_ -> `marketplace-designer`
- **Scope:** Deep per-screen polish pass, executed after P1 (animation system) and P2 (design system) are complete. Each screen gets a focused review against the DESIGN_SYSTEM.md "definition of looks good" checklist.
- **Dependency:** P1 and P2 should be done first — screen polish builds on those foundations.

**Screens and specific polish tasks:**

1. **Browse / listing feed**
   - Cards must animate in on first load (P1 entrance animation via `ListingCard`).
   - Category chip row: active chip should animate highlight (scale + color) on press.
   - Pull-to-refresh: use a styled `RefreshControl` with `primary` color tint.
   - Verify photo aspect ratio never stretches on unusual image dimensions.
   - Search bar: animate placeholder text fade when typing begins; clear (X) button animates in.

2. **Listing detail**
   - Gallery page dots animate smoothly between pages (already handled by `reanimated-carousel` — verify it is configured).
   - `PriceTag` must be the visually dominant text element below the gallery.
   - "Message seller" sticky button: ensure it does not overlap content on screens with system gesture areas (use `useSafeAreaInsets`).
   - Seller card (`UserIdentity`) must show verified badge without layout shift.
   - Sold / reserved banner: animate slide-in from top on mount if status is not `active`.

3. **Chat (conversations list + thread)**
   - Conversation rows: unread badge must pulse (subtle) if `unread_count > 0` — draws the eye to what needs attention.
   - Thread message bubbles: new incoming messages animate in from left; sent messages from right (`FadeInRight` / `FadeInLeft`). Gifted-chat supports `renderMessage` — use a reanimated wrapper.
   - Input bar: animate up when keyboard appears (handled by KeyboardAvoidingView — verify it works on Android).
   - Meetup bubble: distinct visual styling (background color differs from plain text; location pin icon; time icon).

4. **Profile screen**
   - Buyer/seller mode toggle: the toggle switch itself should animate smoothly. Verify the `ModeSwitcherBanner` has no janky layout reflow.
   - Stats row (listings count, member since): animate numbers counting up from 0 on first mount (optional — only if it feels natural, not gimmicky).
   - Sign-out row: should be the most visually subdued action — small, `mutedForeground` text, not a full-width red button.

5. **Seller profile (public)**
   - Listings grid: stagger entrance animation (P1 list animation).
   - Verified badge must be consistently sized and positioned relative to the name.
   - Empty listings state ("No active listings") must use the standard `EmptyState` component.

**Acceptance criteria:**
- [ ] Every screen passes the DESIGN_SYSTEM.md §9 "definition of looks good" checklist.
- [ ] Animations from P1 are visible and correct on each screen.
- [ ] No screen shows a layout regression from P2's spacing/color changes.
- [ ] Verified on both light and dark, LTR and RTL.

---

### P4 — Micro-interactions ⬜

- **Owner:** _unassigned_ -> `feature-builder -> marketplace-designer`
- **Scope:** Small, targeted interactions that make the app feel polished and alive. Each is self-contained and low-risk.
- **Dependency:** P1 animation system (specifically `AnimatedPressable` and `haptics.ts`) should exist before implementing these.

**Sub-features and detail:**

1. **Button hover / press states**
   - All RNR `Button` components and tappable rows must use `AnimatedPressable` from P1.
   - Active state (while pressed): scale `0.97`, opacity `0.85`.
   - Disabled state: opacity `0.4`, no press feedback.
   - Destructive buttons (delete, report): use `destructive` color but same press animation.

2. **Form input focus animations**
   - When an `Input` or `Textarea` gains focus, its border color transitions from `border` to `primary` over 150 ms (`withTiming`).
   - Label text (if above the input) transitions from `mutedForeground` to `foreground` on focus.
   - Implement via a `FocusAnimatedInput` wrapper or by extending the RNR `Input` with a reanimated border style. Do not hand-roll a full input — wrap RNR.

3. **Success / error toast animations**
   - `sonner-native` handles its own enter/exit — verify the current config uses a slide-in from top (the library default). If using a custom variant, ensure consistency.
   - On destructive action completion (delete listing): toast slides in with a brief red flash of the background before settling to neutral.
   - On successful publish: toast uses `primary` accent + a checkmark icon (`lucide CheckCircle`).

4. **Empty state illustrations**
   - Current `EmptyState` uses a Lucide icon. Add per-context illustration variants where the empty state is a high-frequency user moment:
     - Browse no-results: magnifying glass with a subtle "nothing found" message.
     - Saved empty: outlined heart.
     - Chat empty: speech bubble outline.
     - My Listings empty: shop window / tag outline.
   - These are SVG illustrations (simple, line-art, single-color using `primary` or `mutedForeground`). Store in `assets/illustrations/`. Render via `expo-image` (SVG support in Expo Image SDK 54+) or inline SVG via `react-native-svg`.
   - Animate on mount: `FadeIn` + scale from `0.8` to `1.0`.
   - _Note: `react-native-svg` may need installing if not already present._

5. **Loading skeleton animations**
   - Covered by P1 (`usePulse` shimmer) — P4 only adds: ensure every screen that fetches data has a skeleton that matches the real layout exactly (same number of cards, same proportions). Audit for any screens using a bare `ActivityIndicator` spinner — replace with skeletons.

**Acceptance criteria:**
- [ ] All buttons give press feedback via `AnimatedPressable`.
- [ ] Input focus transitions border color smoothly.
- [ ] Toasts are visually consistent and correctly styled per outcome type.
- [ ] Empty states have contextual illustrations on the four high-frequency surfaces.
- [ ] No bare `ActivityIndicator` spinners visible to the user on any list or feed screen.

---

### P5 — Performance & Accessibility ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Scope:** Ensure animations do not degrade performance on mid-range Android and respect user accessibility preferences. This is a hardening pass, not a feature pass — run it last before declaring the polish phase complete.

**Sub-features and detail:**

1. **GPU-accelerated animations**
   - All `reanimated` animations must run on the UI thread (use `useAnimatedStyle`, not `Animated.Value` from the old API). Audit for any remaining `React.Animated` usage and migrate.
   - Cards and list items: ensure `ListingCard` does not trigger layout recalculations on scroll. The card should be a pure render — no `useState` inside that changes on scroll.
   - Gallery (`reanimated-carousel`): confirm `mode="parallax"` or equivalent runs at 60 fps on a mid-range device. If not, fall back to simple page mode.
   - Use `react-native-reanimated`'s `runOnUI` for any animation that could interact with JS thread work (e.g., gesture-driven animations).

2. **Bundle size**
   - Run `npx expo export --dump-sourcemap` and check the bundle breakdown. Flag any dependency over 200 KB that is not in the approved library list.
   - Ensure `lucide-react-native` icons are imported individually (`import { Heart } from 'lucide-react-native'`), never `import * from`. Tree-shaking depends on this.
   - `date-fns` must be imported per-function (`import { formatDistanceToNow } from 'date-fns'`), never the full package.

3. **Reduce motion (accessibility)**
   - Create `src/lib/animation/useReduceMotion.ts` — a hook wrapping `AccessibilityInfo.isReduceMotionEnabled()` with a change listener.
   - All animation hooks (`usePulse`, `AnimatedPressable`, list entrance, screen transitions) must check `useReduceMotion()` and skip or snap-to-final when `true`.
   - The `triggerHaptic` helper (P1) must also gate on this — users who prefer reduce-motion typically prefer quieter haptics too, so only fire `Selection` feedback (the lightest) when reduce-motion is on.
   - This is an **accessibility requirement**, not optional.

**Acceptance criteria:**
- [ ] No `React.Animated` (old API) usage in `src/` — only `reanimated`.
- [ ] `ListingCard` is a pure render with no scroll-triggered state changes.
- [ ] Bundle has no unapproved large dependencies.
- [ ] `lucide-react-native` and `date-fns` are tree-shaken (individual imports).
- [ ] `useReduceMotion` exists and is respected by all animation code.
- [ ] App is usable and clear with all animations disabled.

---

## Q — Mobile Compatibility Audit & Fixes

> This section is a **CRITICAL pre-deployment phase**. The app is mobile-only (iOS + Android). Despite being
> built with Expo, several web-compatibility shims and browser APIs have accumulated in the codebase.
> These must be audited and cleaned before the app is submitted to the App Store or Play Store.
> None of these are polish items — they are blocking deployment issues.
>
> **Priority:** All Q items are CRITICAL. Complete before any production build.
> **Pipeline:** All items are `feature-builder` only (no design pass needed — this is correctness work).
> **Do not start P-section polish until Q items are resolved.**

---

### Q0 — Pre-Deployment Mobile Audit (Parent Ticket) ✅

- **Owner:** `feature-builder`
- **Status:** Q1, Q2, Q3, Q4 all Done. Q5 (device testing) remains — Q0 stays open until Q5 closes.
- **Scope:** This is the umbrella ticket. It tracks overall audit completion. It is marked Done only when Q1 through Q5 are all Done.
- **Why this exists:** The project was developed with Expo's web runner active (`expo start --web`) for faster iteration. As a result, several web-specific code paths accumulated:
  - `Platform.OS === "web"` branches with `localStorage`, `window.confirm`, `document.*` calls
  - `react-dom`, `react-native-web`, and `tailwindcss` in `package.json`
  - A `"web"` block in `app.json`
  - `.web.tsx` platform-split files
  - `window.confirm` in `src/utils/alert.ts`
  - `document.documentElement.dir` in `src/i18n/index.ts`
  - `localStorage` fallback in `src/utils/secure-storage.ts`
  - `MapCanvas.web.tsx` injecting `<script>` / `<link>` tags via `document.*`
- **Goal:** Strip all web-only paths, verify no mobile code path depends on browser globals, and confirm the app builds cleanly with `npx expo run:ios` and `npx expo run:android`.

**Acceptance criteria:**
- [x] Q1 — web browser APIs removed ✅
- [x] Q2 — web-only packages removed ✅
- [x] Q4 — build config web blocks removed ✅
- [x] Q3 — iOS vs Android Platform guards reviewed ✅ (2026-07-03)
- [ ] Q5 — full flow tested on real devices
- [x] No `Platform.OS === "web"` branch remains that touches `localStorage`, `window`, or `document` ✅

---

### Q1 — Web APIs & Browser Compatibility ✅

- **Owner:** `feature-builder`
- **Status:** Done — 2026-06-17
- **Files to audit (known violations identified during reconciliation):**

  | File | Issue | Fix |
  |---|---|---|
  | `src/utils/secure-storage.ts` | Falls back to `localStorage` when `Platform.OS === "web"` (lines 13–29) | Remove the web branch entirely. On native, `expo-secure-store` is always available. If a fallback is ever needed for a non-production path, use `@react-native-async-storage/async-storage`, never `localStorage`. |
  | `src/utils/alert.ts` | `window.confirm(...)` called when `Platform.OS === "web"` (line 17) | Remove the web branch. On iOS/Android, `Alert.alert` from `react-native` works correctly. The `confirmAlert` wrapper can be simplified to just call `Alert.alert` unconditionally. |
  | `src/i18n/index.ts` | `document.documentElement.dir` and `document.documentElement.lang` set when `Platform.OS === "web"` (lines 45–46) | Remove the web branch. On native, `I18nManager.allowRTL` / `I18nManager.forceRTL` is the correct API (already in the else branch). |
  | `src/components/common/map/MapCanvas.web.tsx` | Entire file injects `<script>` and `<link>` tags via `document.*` — this is a web-only Leaflet loader | Audit whether `MapCanvas.tsx` (the non-web counterpart) exists and covers all mobile map use cases. If `MapCanvas.web.tsx` is only ever used for the web dev runner and the native file handles iOS/Android correctly, no code change is needed (Expo's platform splitting will exclude it from native builds) — but confirm this is the case and document it. If any import path could accidentally pull in the `.web.tsx` on native, add a guard. |

- **Search sweep — run these and fix any additional findings:**
  ```
  grep -r "localStorage\|sessionStorage" src/ --include="*.ts" --include="*.tsx"
  grep -r "window\." src/ --include="*.ts" --include="*.tsx"
  grep -r "document\." src/ --include="*.ts" --include="*.tsx"
  grep -r "XMLHttpRequest\|IndexedDB\|WebGL\|Web Audio" src/ --include="*.ts" --include="*.tsx"
  ```

**Acceptance criteria:**
- [x] `src/utils/secure-storage.ts` — `localStorage` fallback removed; only `expo-secure-store` ✅
- [x] `src/utils/alert.ts` — `window.confirm` removed; calls `Alert.alert` unconditionally ✅
- [x] `src/i18n/index.ts` — `document.documentElement` reference removed; RTL via `I18nManager` only ✅
- [x] `MapCanvas.web.tsx` — deleted; `MapCanvas.native.tsx` renamed to `MapCanvas.tsx` ✅
- [x] No `localStorage`, `window.*`, or `document.*` calls in `src/` ✅
- [x] `app/_layout.tsx` — web-only `setColorScheme`/`document.documentElement.classList` `useEffect` blocks removed ✅

---

### Q2 — Web-Only Dependencies ✅

- **Owner:** `feature-builder`
- **Status:** Done — 2026-06-17
- **Known findings from `package.json` audit:**

  | Package | Why it is in package.json | Action |
  |---|---|---|
  | `react-dom 19.1.0` | Required by Expo web runner. Not needed for native builds but harmless if tree-shaken. | Assess: if the project will never be deployed to web, move to `devDependencies` or remove entirely. If Expo SDK requires it as a peer dep for the SDK version in use, leave it but document why. Do not import anything from `react-dom` in `src/`. |
  | `react-native-web ^0.21.0` | Required by Expo web support. Same rationale as above. | Same decision as `react-dom`. Confirm no `src/` file imports from `react-native-web` directly. |
  | `tailwindcss ^3.4.17` | Required by NativeWind as a peer dep for the PostCSS/babel transform pipeline. This is correct and expected — NativeWind uses Tailwind's class resolution at build time. | No action needed. This is not a runtime dependency; it runs only at build time. Document this so future auditors do not flag it incorrectly. |
  | `expo-web-browser ~15.0.5` | Used for OAuth flows or deep links in some Expo apps. | Check whether any screen actually calls `expo-web-browser` APIs. If unused, remove. If used (e.g., email verification link), keep — it works on iOS/Android. |

- **Search sweep:**
  ```
  grep -r "from 'react-dom'" src/ --include="*.ts" --include="*.tsx"
  grep -r "from 'react-native-web'" src/ --include="*.ts" --include="*.tsx"
  grep -r "from 'expo-web-browser'" src/ --include="*.ts" --include="*.tsx"
  ```
- **CSS-in-JS check:** Confirm no library in `package.json` is a pure CSS-in-JS lib (e.g., `styled-components`, `emotion`) that does not support React Native. NativeWind is the only CSS-related dependency and it is approved.

**Acceptance criteria:**
- [x] `react-dom` removed from `package.json` ✅
- [x] `react-native-web` removed from `package.json` ✅
- [x] `expo-web-browser` confirmed unused on native — removed from `package.json` ✅
- [x] `tailwindcss` kept — build-time NativeWind peer dep only; not imported in `src/` ✅
- [x] No unapproved CSS-in-JS library present ✅

---

### Q3 — Platform-Specific Code (iOS vs Android) ✅

- **Owner:** `feature-builder` · **Task:** TASK-Q683 (closes out the remaining checkboxes left by the earlier TASK-Q301 audit pass, board card 156, Done 2026-06-18)
- **Status:** Done — 2026-07-03
- **Scope:** Verify that any `Platform.select()` or `Platform.OS` branches are correct and complete for both iOS and Android. The web branch is handled in Q1; this ticket is about iOS-vs-Android differences.

- **Files with Platform usage (known from audit):**
  - `src/screens/chat/Conversation.tsx` — `KeyboardAvoidingView` iOS `"padding"` / Android `"height"` (audited 2026-06-18, both branches correct); photo-attachment permission flow (fixed 2026-07-03, see below)
  - `src/screens/shared/ListingDetail.tsx` — `Share.share()` iOS/Android payload branch (audit comment added 2026-07-03; both branches intentional, no omission)
  - `src/screens/chat/conversation/MessageBubble.tsx` — `openInMaps()` android `geo:` / iOS `maps:` / catch-all default, each with a web-fallback URL (audited 2026-06-18, all three branches correct)
  - `src/screens/chat/conversation/MeetupSheet.tsx` — `KeyboardAvoidingView` iOS `"padding"` / Android `"height"` (audited 2026-06-18, correct)
  - `src/api/auth.ts` — re-confirmed 2026-07-03: contains **zero** `Platform` branches (the old `Platform.OS === "web"` localStorage path was already removed in Q1); all `secureStorage` calls are async-only — nothing to fix
  - `src/screens/seller/listing-form/PhotosSection.tsx` — iOS 14+ "limited" photo access + camera/library denial (rewired 2026-07-03 to the centralized helper, see below)
  - `src/screens/seller/ListingForm.tsx` — `KeyboardAvoidingView` iOS/Android branch (audited 2026-06-18, correct); composes `PhotosSection` + `LocationRangePicker`, both fixed below
- **No `Platform.select()` calls exist anywhere in `src/`** (confirmed via repo-wide grep, 2026-07-03) — nothing to fix for the "safe default" checklist item.

- **Permission-denial UX (the substantive fix, 2026-07-03 — TASK-Q683):**
  - New centralized helper `src/lib/permissions.ts` — `showPermissionDeniedAlert(kind, t)` and `showLimitedPhotoAccessAlert(t)`. Always routes through `confirmAlert` (never raw `Alert.alert`), always offers an **Open Settings** action via `Linking.openSettings()` instead of a silent dead end.
  - `PhotosSection.tsx` (listing photos) — library + camera denial now call the helper; iOS 14+/Android 14+ `limited` access still lets the user pick from their allowed subset (unchanged behavior, now via the shared helper).
  - `Profile.tsx` avatar picker — same duplicated pattern found and fixed (denied/limited handling now shares the helper instead of forking its own copy).
  - `Conversation.tsx` photo-message attachment — was previously a bare `toast.error()` with no recovery path; now uses the centralized helper (denied) and also surfaces the `limited` notice (previously not handled at all in this call site).
  - `LocationRangePicker.tsx` ("Use my location") and `Browse.tsx` ("Nearest" sort) — on `denied` specifically, now also fire the centralized alert with Open Settings; non-permission errors (timeout/unavailable/unsupported) keep their existing inline banner/toast since Settings wouldn't help there.
  - Found and fixed a **leftover web-specific string** in `browse.locationDenied` (all 3 locales) that told mobile users to "tap the lock/location icon in the address bar" — a dead instruction on a mobile-only app, missed by the Q1 web-string sweep.
  - New `permissions` i18n namespace (`en`/`ps`/`fa`) with `permissionNeededTitle`, `photosDenied`, `photosLimited`, `cameraDenied`, `locationDenied`, `openSettings` — registered in `en.ts`/`ps.ts`/`fa.ts`.
  - Unit test: `src/lib/__tests__/permissions.test.ts` (7 tests — message-key resolution per kind, confirmAlert-only invocation, Open Settings wiring).

**Acceptance criteria:**
- [x] Every `Platform.OS === "ios"` branch has been reviewed; Android fallback is intentional (not an accidental omission).
- [x] Every `Platform.OS === "android"` branch has been reviewed; iOS fallback is intentional.
- [x] Image picker handles `limited` permission status on iOS 14+ (and now consistently across all three photo-picker call sites).
- [x] Location permission denial shows a graceful UI state on both platforms (persistent inline banner/toast + centralized Open-Settings alert on `denied`).
- [x] Camera permission denial shows a graceful UI state on both platforms (centralized Open-Settings alert).
- [x] `expo-secure-store` is called only asynchronously (verified in `secure-storage.ts` and all `auth.ts` call sites).
- [x] All `Platform.OS === "web"` branches removed (covered in Q1 — cross-reference; re-confirmed no regressions).

---

### Q4 — Build & Configuration ✅

- **Owner:** `feature-builder`
- **Status:** Done — 2026-06-17
- **Known findings from `app.json` audit:**

  | Config | Current state | Action |
  |---|---|---|
  | `expo.web` block in `app.json` | Present: `{ "bundler": "metro", "output": "static", "favicon": "./assets/favicon.png" }` | Since this is a mobile-only app, this block is unnecessary and potentially misleading. Remove the `web` block entirely, or if Expo SDK requires it as a no-op placeholder, add a comment explaining it is intentionally inert. Removing it prevents accidental `expo export --platform web` in CI. |
  | `app/` route files | No web-specific entry points found — all routes are under `(auth)` and `(main)` | Confirm no `+html.tsx` or `+not-found.tsx` file exists that targets web. Run `find app/ -name "+html.tsx"`. |
  | `.web.tsx` platform split | `src/components/common/map/MapCanvas.web.tsx` exists | This is a valid Expo platform split. Confirm the base file `MapCanvas.tsx` exists and handles iOS and Android. If `MapCanvas.web.tsx` is the only map implementation, the native builds will silently skip the map — that is a bug. |
  | `newArchEnabled: true` in app.json | React Native New Architecture is enabled | This is correct and modern. Confirm all native modules in `package.json` are compatible with the New Architecture (check their GitHub pages for "Fabric" / "TurboModules" support). Flag any that are not. |

- **Webpack / Vite / Rollup:** No `webpack.config.js`, `vite.config.ts`, or `rollup.config.js` were found. No action needed; document this finding.

- **Entry point check:**
  ```
  find app/ -name "+html.tsx" -o -name "_document.tsx"
  ```

- **MapCanvas native counterpart check:**
  ```
  find src/ -name "MapCanvas.tsx" -not -name "*.web.tsx"
  ```

**Acceptance criteria:**
- [x] `expo.web` block removed from `app.json` ✅
- [x] No `+html.tsx` or `_document.tsx` files in `app/` ✅
- [x] `MapCanvas.tsx` exists (renamed from `MapCanvas.native.tsx`) — handles iOS/Android ✅
- [x] No `.web.tsx` / `.web.ts` files remain in `src/` ✅
- [x] `"web"` script removed from `package.json`; `docker-compose.yml` web service removed ✅
- [x] `jest.config.js` `transformIgnorePatterns` — `expo-web-browser` entry removed ✅
- [ ] All native modules confirmed compatible with New Architecture (`newArchEnabled: true`)
- [ ] `expo-router` entry point (`app/index.tsx`, `app/_layout.tsx`) targets only native platforms.

---

### Q5 — Testing on Real Devices ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Status:** Not started
- **Scope:** End-to-end manual test on a physical iOS device and a physical Android device (or high-fidelity simulator/emulator as a fallback). This ticket is the final gate before a production build.
- **Dependency:** Q1, Q2, Q3, Q4 must all be Done before Q5 begins.

- **iOS test checklist:**
  - [ ] App launches from cold start, splash resolves to correct screen (auth or browse)
  - [ ] Register new account; login; logout; login again
  - [ ] Browse feed: photos load, infinite scroll works, search and category filter work
  - [ ] Listing detail: gallery swipes, "Message seller" button opens conversation
  - [ ] Create listing: camera permission prompt appears; photo picker works; form submits; listing appears in My Listings
  - [ ] Edit listing: photos reorder; save works
  - [ ] My Listings lifecycle: Publish, Reserve, Mark Sold, Delete (with confirmation)
  - [ ] Chat: send a message; receive a message; meetup proposal visible; offer accept/decline works
  - [ ] Saved listings: heart toggle; saved screen reflects changes
  - [ ] Profile: edit name/location; map location picker works; language switch (en -> ps -> fa) applies RTL correctly
  - [ ] Report flow: report sheet opens from listing detail and seller profile
  - [ ] Dark mode: switch device to dark mode; all screens readable
  - [ ] RTL: switch to Pashto; all screens mirror correctly
  - [ ] Sign out: clears all state, returns to login
  - [ ] No JavaScript errors in Metro bundler output during any of the above

- **Android test checklist (identical steps as iOS):**
  - [ ] App launches from cold start
  - [ ] Register / login / logout
  - [ ] Browse, search, filter
  - [ ] Listing detail and message
  - [ ] Create listing (camera + photo picker permissions)
  - [ ] My Listings lifecycle
  - [ ] Chat and deal actions
  - [ ] Saved listings
  - [ ] Profile edit + map
  - [ ] Language switch + RTL
  - [ ] Report flow
  - [ ] Dark mode
  - [ ] Sign out
  - [ ] No Metro errors

- **Performance bar (Android-specific, mid-range device target):**
  - [ ] Browse feed scrolls at 60 fps (no dropped frames visible)
  - [ ] Listing gallery swipe is smooth
  - [ ] App cold-start to interactive < 4 seconds

**Acceptance criteria:**
- [ ] All iOS checklist items pass on a physical device or simulator.
- [ ] All Android checklist items pass on a physical device or emulator.
- [ ] Performance bar met on Android.
- [ ] Zero crash-level errors during any test flow.
- [ ] Q0 (parent ticket) may now be marked Done.

---

## R — Concurrent Development Workflow & Agent Coordination System

**Parent Ticket: R0 — Agent Coordination & Concurrency Management**

This section establishes protocols and tools for running multiple agents in parallel on different features without conflicts, race conditions, or breaking each other's work.

### R0 — Agent Coordination & Concurrency Management ⬜

- **Owner:** _unassigned_ (system/process)
- **Status:** Not started
- **Priority:** CRITICAL (infrastructure)
- **Scope:** Establish a complete system to safely run 3+ agents in parallel on independent features without merge conflicts, file lock contention, or dependency breakage.

**Definition of Done:**
- [ ] R1 — Work Isolation & Locking System complete
- [ ] R2 — Task Dependency Tracking complete
- [ ] R3 — Merge Conflict Prevention complete
- [ ] R4 — Real-Time Status Tracking complete
- [ ] R5 — Session Isolation (Worktree Strategy) complete
- [ ] R6 — Communication & Handoff Protocol complete
- [ ] One successful multi-agent parallel session conducted with zero conflicts or rework

---

### R1 — Work Isolation & Locking System ⬜

- **Owner:** _unassigned_ → `feature-builder` (or process-owner)
- **Status:** Not started
- **Scope:** Create and maintain `docs/WORK_LOCKS.md` — a per-agent file lock registry showing what files each agent is modifying and in what status (in_progress / waiting / blocked / completed).

**Implementation:**
- File: `docs/WORK_LOCKS.md` — a live table with columns:
  - Agent ID (e.g., `agent-1`, `marketplace-designer-A`)
  - Task ID (e.g., `P1`, `Q3`, `F2`)
  - Files locked (e.g., `src/lib/animation/*.ts`, `src/screens/shared/Profile.tsx`)
  - Status: `in_progress` / `waiting` / `blocked` / `completed`
  - Start time (ISO 8601)
  - Expected completion time (ETA)
  - Notes (reason if blocked; PR link when completed)

**Lock protocol:**
1. Before starting: check WORK_LOCKS.md for file conflicts; if found, wait or reassign
2. On start: add row to WORK_LOCKS.md with `in_progress` status
3. If blocked: update status to `blocked` with reason; notify main agent via conversation comment
4. On completion: update status to `completed`, add PR link, remove row after merge
5. Forced unlock (agent crashed): main agent updates lock to `completed` with note "[auto-released due to agent crash]"

**Acceptance criteria:**
- [ ] WORK_LOCKS.md created and checked into repo
- [ ] Lock protocol documented above and in-file
- [ ] Each agent reads locks before starting
- [ ] Each agent updates locks on status change
- [ ] Completed locks cleaned up within 1 hour of merge

---

### R2 — Task Dependency Tracking ⬜

- **Owner:** _unassigned_ → `product-owner`
- **Status:** Not started
- **Scope:** Create `docs/TASK_DEPENDENCIES.md` — a dependency graph showing which tasks block which, and which can safely run in parallel.

**Implementation:**
- File: `docs/TASK_DEPENDENCIES.md`
- Format: Directed acyclic graph (DAG) of all A-through-R tasks
- Each task listed with:
  - Task ID
  - Task name
  - Prerequisites (what must be Done first)
  - Safe parallel companions (what can run at same time)
  - Critical blockers (what breaks if this task is incomplete)

**Key gates to document:**
- P1 (Animation System) must be Done before P3 (Screen Polish) starts
- P2 (Design Refinements) must be Done before P3 starts
- P4 (Micro-interactions) depends on P1 (Animation System)
- Q1-Q4 must all be Done before Q5 (Real Device Testing) starts
- R1-R5 must all be Done before R6 (Protocol) is finalized
- F1, F2, F3, C1, C2, D1–D3, E1, G1 can all run in parallel (no file overlaps)

**Safe parallel work paths:**
- Animation system (P1) can run parallel with web API cleanup (Q1)
- Screen polish (P3) can start once P1+P2 done, even while Q1-Q4 in progress
- Bug fixes and design refines (P, Q) can run parallel to feature builds (F, B, C, D, E, G)

**Acceptance criteria:**
- [ ] TASK_DEPENDENCIES.md created
- [ ] All A-through-R tasks mapped
- [ ] Blocker relationships documented
- [ ] Safe parallel paths identified
- [ ] Updated whenever a new task is added to backlog

---

### R3 — Merge Conflict Prevention ⬜

- **Owner:** _unassigned_ → `feature-builder` / `marketplace-designer` (policy + execution)
- **Status:** Not started
- **Scope:** Establish git workflow rules to prevent merge conflicts when multiple agents commit in parallel.

**Branch naming convention:**
```
agent/<agent-type>/<task-id>-<short-slug>

Examples:
  agent/feature-builder/p1-animation-system
  agent/marketplace-designer/p3-screen-polish
  agent/feature-builder/q1-web-apis-cleanup
  agent/feature-builder/f1-profile-redesign
```

**Commit strategy:**
- Small, scoped commits per-feature (not per-session)
- Commit message includes task ID: e.g., "[P1] Add slide transition to screen navigation"
- Commits are atomic: each builds/tests in isolation
- Frequency: 1 commit per 30–60 min of work; don't batch 5+ hours into one commit

**Merge workflow:**
1. Agent pushes feature branch frequently (every 1–2 hours)
2. Before opening PR: rebase onto `main` to catch conflicts early
3. PR title format: `[TASK-ID] Short description` (e.g., `[P1] Animation System — slide transitions`)
4. If conflicts appear during rebase: resolve immediately, don't defer
5. Merge with squash only if sub-commits are noise; prefer fast-forward or merge commit for readability

**Conflict resolution playbook (if two agents touch same file):**
1. **Prevention first:** check WORK_LOCKS.md before starting; if file is locked, negotiate with other agent
2. **Early detection:** rebase daily onto main; don't wait until end of task
3. **In conflict:** both agents meet (async in conversation) to decide who owns that file section
4. **Resolution:** one agent takes ownership, other rewrites their change on top
5. **Verification:** both test together before merge

**Acceptance criteria:**
- [ ] Branch naming convention documented and enforced
- [ ] All active branches follow `agent/<type>/<task-id>` pattern
- [ ] Commit messages include task ID
- [ ] No merge commits with >2 conflicted files
- [ ] All rebases completed before PR

---

### R4 — Real-Time Status Tracking ⬜

- **Owner:** _unassigned_ → `product-owner`
- **Status:** Not started
- **Scope:** Maintain `docs/STATUS_BOARD.md` — a live snapshot of what agents are working on right now, what's blocked, and when completion is expected.

**Implementation:**
- File: `docs/STATUS_BOARD.md` (human-readable, not a table)
- Updated at session start and session end by each agent
- Three sections:

**Section 1: Active Sessions**
```
## Active Sessions (updated 2026-06-14 11:00 UTC)

| Agent | Task | Files | Status | ETA | Notes |
|-------|------|-------|--------|-----|-------|
| feature-builder | P1 | src/lib/animation/ | in_progress | 2026-06-14 16:00 | Slide transitions done, gesture feedback pending |
| marketplace-designer | P2 | src/components/, src/screens/ | in_progress | 2026-06-14 18:00 | Logo & color palette review in progress |
| feature-builder | Q1 | src/utils/secure-storage.ts | in_progress | 2026-06-14 14:00 | localStorage cleanup done, testing |
```

**Section 2: Completed This Session**
```
## Completed This Session

- [P1] Animation System slide transitions — merged PR #42
- [Q1] Web API cleanup (secure-storage.ts) — merged PR #43
```

**Section 3: Known Blockers**
```
## Known Blockers

- P3 (Screen Polish) waiting for P1 merge (ETA 16:00)
- Q5 (Real Device Testing) waiting for Q1-Q4 completion
- None currently active
```

**Acceptance criteria:**
- [ ] STATUS_BOARD.md created and checked in
- [ ] Updated at start of each agent session
- [ ] Updated at end of each agent session
- [ ] Shows all active agents, tasks, files, status, ETA
- [ ] Visible to all future work (in docs/ folder)

---

### R5 — Session Isolation (Git Worktree Strategy) ⬜

- **Owner:** _unassigned_ → `feature-builder` (first multi-agent run)
- **Status:** Not started
- **Scope:** Use git worktrees to give each agent a dedicated, isolated filesystem checkout so agents don't interfere with each other's uncommitted changes.

**Why worktrees:**
- Each agent gets separate working directory (e.g., `/repo-worktree-p1/`, `/repo-worktree-p2/`)
- No file lock contention (agent A's uncommitted changes don't block agent B's edits)
- Can run different branches/commits in parallel
- Easy rollback per-agent without affecting others
- Automatic cleanup on completion

**Implementation:**
1. Main agent (coordinating agent) creates worktrees as agents start:
   ```bash
   git worktree add ../hatiwal-agent-p1 agent/feature-builder/p1-animation-system
   git worktree add ../hatiwal-agent-q1 agent/feature-builder/q1-web-apis-cleanup
   ```

2. Each agent works in its own directory, unaware of others

3. When agent completes:
   ```bash
   # Within agent's worktree, create/merge PR
   git push origin agent/feature-builder/p1-animation-system
   # Main agent removes worktree after merge
   git worktree remove ../hatiwal-agent-p1
   git worktree prune
   ```

4. Recovery (if agent hangs or crashes):
   ```bash
   # Main agent forces cleanup
   git worktree remove --force ../hatiwal-agent-p1
   git worktree prune
   ```

**Acceptance criteria:**
- [ ] Git worktrees documented above and in team reference
- [ ] `isolation: "worktree"` used in Agent tool for all parallel multi-file work
- [ ] Main agent knows how to create/cleanup worktrees
- [ ] At least one successful parallel session run with 2+ worktrees
- [ ] No file conflicts or stale state issues

---

### R6 — Communication & Handoff Protocol ⬜

- **Owner:** _unassigned_ → `product-owner` (define) + all agents (execute)
- **Status:** Not started
- **Scope:** Capstone protocol tying R1–R5 together; defines how agents communicate, escalate blockers, and hand off work.

**Before starting a task:**
- [ ] Read WORK_LOCKS.md; if files are locked, ask in conversation before starting
- [ ] Read TASK_DEPENDENCIES.md; ensure all prerequisites are Done
- [ ] Read STATUS_BOARD.md; understand current active work and known blockers
- [ ] Rebase onto latest `main` to sync
- [ ] Create feature branch: `agent/<type>/<task-id>-<slug>`
- [ ] Update WORK_LOCKS.md with new row (status: `in_progress`)
- [ ] Update STATUS_BOARD.md active sessions section

**During work:**
- [ ] Commit frequently (every 30–60 min)
- [ ] Push to remote daily (even if incomplete)
- [ ] If blocked: update WORK_LOCKS.md (status: `blocked`, reason noted) + post comment in conversation
- [ ] If dependencies change: notify main agent immediately
- [ ] If you'll exceed ETA: update WORK_LOCKS.md and notify main agent

**On completion:**
- [ ] Rebase onto latest `main`
- [ ] Open PR with format: `[TASK-ID] description`
- [ ] Link to any related issues or prior PRs
- [ ] Post summary in conversation
- [ ] Update STATUS_BOARD.md (move to "Completed This Session")
- [ ] Update WORK_LOCKS.md (status: `completed`, add PR link)

**Handoff to next agent:**
- [ ] Previous agent merges PR, deletes feature branch
- [ ] Previous agent leaves code comments for next agent if needed (e.g., "TODO: next agent should integrate this with X")
- [ ] Next agent reads previous agent's PR description and commit messages
- [ ] Next agent checks previous agent's acceptance criteria
- [ ] Next agent tests the merged work before starting follow-up task

**If blocked on another agent's work:**
1. Check WORK_LOCKS.md for their status and ETA
2. If ETA reasonable: wait and update your own ETA in WORK_LOCKS.md
3. If ETA expired: post in conversation with `@agent-id: [BLOCKER] I'm waiting for task X; ETA was [time], can you provide update?`
4. Main agent will escalate if agent is unresponsive

**If you discover a bug in someone else's completed work:**
1. Don't fix it immediately (respect their work boundary)
2. Open an issue or post in conversation: "Found bug in [PR]: [description]"
3. Original author can fix or approve your PR
4. If author unavailable: main agent approves the fix

**Acceptance criteria:**
- [ ] Protocol documented above and printed/posted where agents can reference it
- [ ] All agents trained on protocol before first parallel session
- [ ] First 3-agent parallel session completes with protocol followed
- [ ] Zero surprises or unexpected conflicts
- [ ] R0 parent ticket may be marked Done

---

## New Tasks — Groomed 2026-06-17

> The following 10 tasks were added on 2026-06-17 after the board was confirmed empty (all prior cards Done). They cover: one missing P5 accessibility primitive (useReduceMotion), two pre-deployment gates (Q3, Q5), two polish passes (P2, P3/P4), one CI task (T701), and five new features (N801-N805) that extend trust and engagement without violating MVP boundaries.

---

### Q3 — Platform-Specific Code (iOS vs Android) — TASK-Q301 ✅

- **Board card ID:** 156 · **Priority:** CRITICAL · **Owner:** `feature-builder` · **Sprint:** Pre-Deployment (4)
- **Status:** Done — 2026-06-18 (Platform-branch annotation pass) + 2026-07-03 (TASK-Q683 closed the remaining permission-denial UX gaps — see the detailed §Q3 write-up above for the full list of files touched, the new `src/lib/permissions.ts` centralized helper, and the `permissions` i18n namespace).
- **Why:** Several screens use `Platform.OS` branches. An unreviewed Android fallback means features work on iOS but silently break on Android.
- **Files with known Platform usage:**
  - `src/screens/chat/Conversation.tsx` — KeyboardAvoidingView behavior
  - `src/screens/seller/listing-form/PhotosSection.tsx` — iOS 14+ limited photo access
  - `src/screens/chat/conversation/MessageBubble.tsx`
  - `src/screens/chat/conversation/MeetupSheet.tsx`
  - `src/api/auth.ts`
  - `src/screens/seller/ListingForm.tsx`
- **What to audit:** Every `Platform.OS === "ios"` must have a correct Android fallback. Every `Platform.OS === "android"` must have a correct iOS fallback. `Platform.select` defaults must be safe. iOS 14+ `limited` photo permission status must show a friendly partial-access explanation (not silence). Location and camera permission denial must show a graceful UI state.
- **Acceptance:** ✅ Every Platform branch annotated with a comment. ✅ Limited photo access handled (consistently, across all 3 photo-picker call sites). ✅ Permission denial shows graceful UI with an Open-Settings action via the centralized helper. ✅ No `Platform.OS === "web"` branches remain.

---

### Q5 — Testing on Real Devices — TASK-Q501 ⬜

- **Board card ID:** 161 · **Priority:** CRITICAL · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** Pre-Deployment (4)
- **Dependency:** Q1, Q2, Q3, Q4 all Done.
- **Scope:** End-to-end manual test on a physical iOS device (or Xcode simulator, iOS 17+) and a physical Android device (or emulator, API 34+) via `npx expo run:ios` and `npx expo run:android`.
- **Full checklist (both platforms):** cold start, register/login/logout, browse/search/filter, listing detail + message, create listing (camera + photos), edit listing, My Listings lifecycle (publish/reserve/sold/delete), chat + meetup + offer, saved listings, profile edit + map, language switch + RTL, report flow, dark mode, sign out, zero Metro errors.
- **Android performance bar:** 60fps feed scroll, smooth gallery swipe, cold start < 4 seconds.
- **Acceptance:** All 15 checklist steps pass on both platforms. Performance bar met. Zero crashes. Any failure spawns a follow-up bug card.

---

### P2 — Design System Refinements — TASK-P201 ⬜

- **Board card ID:** 157 · **Priority:** P1 · **Owner:** _unassigned_ → `marketplace-designer` · **Sprint:** Polish (3)
- **Scope:** Visual consistency pass — no new backend calls. Skip logo (needs external design input). Focus: color audit (grep for hardcoded hex in `src/`), StatusBadge consistency across all surfaces, typography hierarchy (screen titles `text-2xl font-bold`, card titles `text-base font-semibold`, meta text `text-xs mutedForeground`), spacing rhythm (screen inset `paddingHorizontal: 16`, `gap-4` sections), dark mode screenshot audit, RTL Pashto walk-through.
- **Acceptance:** `grep -r "#[0-9a-fA-F]{3,6}" src/` returns zero. StatusBadge identical everywhere. Typography consistent. RTL screenshot shows correct mirroring. No dark mode contrast failures.

---

### P3 — Screen-by-Screen Polish — TASK-P301 ⬜

- **Board card ID:** 159 · **Priority:** P1 · **Owner:** _unassigned_ → `marketplace-designer` · **Sprint:** Polish (3)
- **Dependency:** P1 (animation system — confirmed Done), P2 (design system — should be done first).
- **Browse:** category chip active state animates; pull-to-refresh uses `primary` tint; photo aspect ratio never stretches; search clear button animates in.
- **Listing Detail:** gallery dots configured; PriceTag dominant; sticky button respects safe area insets; sold/reserved banner animates slide-in.
- **Chat:** unread badge pulses; new messages animate in (FadeInLeft/FadeInRight); meetup bubble distinct styling; keyboard avoidance correct on Android.
- **Profile:** mode toggle no layout reflow; sign-out row visually subdued (not a red button).
- **Public Seller Profile:** listings grid stagger entrance; verified badge consistent; EmptyState component used.
- **Acceptance:** Every screen passes DESIGN_SYSTEM.md definition-of-looks-good checklist. Verified on light/dark and LTR/RTL.

---

### P4 — Micro-interactions — TASK-P401 ⬜

- **Board card ID:** 160 · **Priority:** P1 · **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Sprint:** Polish (3)
- **Dependency:** P1 animation system (confirmed Done).
- **Input focus:** border color transitions from `border` to `primary` over 150ms on focus. Wrap as `FocusAnimatedInput` (wraps RNR Input — do not hand-roll). Do not replace RNR Input.
- **Toast consistency:** destructive actions use destructive color; successful publish uses primary + CheckCircle icon; errors use destructive + X icon.
- **Empty state illustrations:** four surfaces — Browse no-results (magnifying glass), Saved (outlined heart), Chat (speech bubble), My Listings (shop tag). Store in `assets/illustrations/`. Use `react-native-svg` (install if needed). Animate mount: FadeIn + scale 0.8 → 1.0. `EmptyState` component accepts optional `illustration` prop.
- **Skeleton audit:** replace any bare `ActivityIndicator` on list screens with skeletons. All skeletons use `usePulse` from P1.
- **Acceptance:** Input focus transitions smoothly. Toasts styled per outcome type. Four illustration variants render and animate. No bare `ActivityIndicator` on list screens.

---

### P5 — useReduceMotion hook — TASK-P501 ⬜

- **Board card ID:** 158 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** Polish (3)
- **Gap:** `src/lib/animation/` has AnimatedPressable, haptics, usePulse, listItemAnimation — but `useReduceMotion.ts` does not exist. This means the animation system does not respect the OS-level "reduce motion" accessibility setting.
- **What to build:**
  - `src/lib/animation/useReduceMotion.ts` — wraps `AccessibilityInfo.isReduceMotionEnabled()` with a real-time change listener
  - `AnimatedPressable.tsx` — skip scale/opacity animation when `reduceMotion` is `true`
  - `haptics.ts` `triggerHaptic()` — fire only `ImpactFeedbackStyle.Light` when `reduceMotion` is `true`
  - `usePulse.ts` — return static opacity when `reduceMotion` is `true`
  - `listItemAnimation.ts` — return no `entering`/`exiting` prop when `reduceMotion` is `true`
  - `app/(main)/_layout.tsx` and `app/(auth)/_layout.tsx` — set `animation: 'none'` on Stack when `reduceMotion` is `true`
- **Acceptance:** Hook exists and reacts to system changes in real time. Every animation primitive checks it. App fully usable with all animations disabled. Jest unit test in `src/lib/animation/__tests__/useReduceMotion.test.ts`.

---

### T701 — Android CI: Maestro E2E GitHub Actions pipeline ⬜

- **Board card ID:** 162 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** Testing (6)
- **Context:** 151 Maestro flows already exist in `maestro/` across auth, browse, chat, listings, profile, RTL, dark mode, pagination, gallery, mode, report, saved. `maestro/config.yaml` exists. No CI runner wires them yet.
- **What to build:** `.github/workflows/e2e-android.yml` — GitHub Actions workflow using `ubuntu-latest`, `reactivecircus/android-emulator-runner` (API 34, x86_64), `npx expo run:android --no-install`, `maestro test maestro/ --retry 2`. Upload artifacts (screenshots/logs) on failure. Trigger on `pull_request` → main and `workflow_dispatch`. Gradle + node_modules + prebuild cache. 30-minute timeout.
- **Acceptance:** Workflow file exists and runs on a clean PR. PR check turns red on any failing flow. Artifacts uploaded on failure. Completes in under 25 minutes cold.

---

### T702 — React Query everywhere + persistent cache (never lose data) ⬜

- **Board card ID:** 228 · **Priority:** P1 (data-layer standard) · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** MVP Core (2)
- **Why:** `@tanstack/react-query` v5 is installed and the `QueryClientProvider` lives in `app/_layout.tsx`, but many screens (MyListings, EditProfile, UserProfile, ListingForm, MyListingDetail, …) still fetch manually with `useState` + `useFocusEffect` — their data is lost on every navigation and app restart. Screens already on `useQuery` still lose cache on restart because there is no persister.
- **What to build:**
  1. `@tanstack/query-async-storage-persister` + `PersistQueryClientProvider` backed by AsyncStorage in `app/_layout.tsx` (keep existing defaults; `gcTime` ≥ 24h for persisted queries).
  2. Shared query-key factory `src/api/queryKeys.ts` so invalidation is consistent across screens.
  3. Migrate every manual-fetch screen to `useQuery`/`useMutation` + `invalidateQueries`.
  4. Clear persisted cache on logout (extends the logout-reset rule).
- **Standing rule (already in `prompts/mobile.prompt.md` §12 + CLAUDE.md):** every future build that shows server data MUST use React Query — no manual `useState` fetching, ever.
- **Acceptance:** kill app → reopen → previously viewed lists/details render instantly from cache, then refresh in background. No screen left on manual fetch. Cache cleared on logout.

---

### N801 — Push notification groundwork ⬜

- **Board card ID:** 163 · **Priority:** P2 post-MVP prep · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** MVP Core (2)
- **Scope:** Token registration plumbing only. No notification sending, scheduling, or delivery.
- **Backend:** Add `push_token` string column to `users` table. Accept it in `PUT /users/me` params. Validate: optional, max 200 chars. RSpec + RSwag tests.
- **Mobile:** `npx expo install expo-notifications`. Create `src/utils/push-token.ts` — `registerPushToken()`: requests permission, gets Expo push token, PUTs to `/users/me`, stores in AsyncStorage to avoid re-registration. Call once after login (not on every launch). Graceful permission denial (silent skip, no crash).
- **Acceptance:** Migration runs. `PUT /users/me` persists token. After login, token sent if permission granted. AsyncStorage prevents duplicate registration. Backend tests cover: token saved, updated, empty accepted.

---

### N802 — Seller listing analytics sparkline ⬜

- **Board card ID:** 164 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** MVP Core (2)
- **Backend:** `GET /my/listings/:id/analytics` returns 7-day view breakdown: `[{date, count}]` — always 7 entries (0-fill gaps), distinct viewer per day, scoped to owner via Pundit. RSwag test.
- **Mobile:** Add to `src/screens/seller/MyListingDetail.tsx` below the stats row. Use 7 proportional-height View bars (no extra library needed — hand-built from Views). Primary color bars, today bar slightly darker. X-axis: day abbreviations via `useLocalization()`. Skeleton: 7 grey bars. EmptyState if all zero.
- **Acceptance:** Endpoint returns correct 7-day counts. Chart visible in MyListingDetail. Dark mode (bar color from `useColors().primary`). RTL (bars in correct reading direction).

---

### N803 — Conversation message search ⬜

- **Board card ID:** 165 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** MVP Core (2)
- **Scope:** Client-side only. No backend endpoint. Filters the already-loaded messages array.
- **What to build:** Search toggle icon (Search, lucide) in `Conversation.tsx` header. Tapping expands a search bar (RNR Input, animate slide-down 200ms). As user types, filter displayed messages to those whose body contains the string (case-insensitive). Highlight matching substring in each bubble (primary background tinted span). Show match count "3 of 12" in search bar suffix. X or back collapses. Note about pagination: "Showing results in loaded messages only".
- **Files:** `src/screens/chat/Conversation.tsx`, `src/screens/chat/conversation/MessageBubble.tsx`.
- **Acceptance:** Filter works instantly as user types. Matching text highlighted. Match count shown. Collapses correctly. RTL: search input `textAlign` respects `isRtl`. Dark mode: highlight readable. Jest unit test for filter/highlight logic.

---

### N804 — Listing price history badge ⬜

- **Board card ID:** 166 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Sprint:** MVP Core (2)
- **Backend:** `ListingPriceHistory` model (listing_id, old_price, new_price, currency, changed_at). Create a history record in `My::ListingsController#update` when price changes. Add `price_dropped_at` and `price_drop_percent` (integer) to `:detailed` serializer — only surface if drop happened within last 14 days. RSpec model + controller tests. RSwag.
- **Mobile:** In `ListingDetail`: if `price_dropped_at` present, show badge next to `PriceTag` — "15% price drop" with TrendingDown lucide icon, `text-xs`, tinted background pill. In `ListingCard`: if `price_dropped` is true, tiny percentage badge overlay. RTL: badge text direction. Dark mode: `useColors()`.
- **Acceptance:** History recorded on price change. `:detailed` serializer exposes fields. ListingDetail badge renders. Browse card badge renders. Tests cover: history created, price unchanged does not create history, percent calculated correctly.

---

### N805 — Seller response rate badge ⬜

- **Board card ID:** 167 · **Priority:** P2 trust · **Owner:** _unassigned_ → `feature-builder` · **Sprint:** MVP Core (2)
- **Backend:** Add `response_rate_percent` (integer or null) and `response_time_label` (string or null) computed attributes to `User` model. Definition: percent of conversations (last 90 days, where user is seller) where seller replied within 24h. Only show if seller has had 5+ conversations. `response_time_label` maps median first-response time to one of three strings: "Usually responds within 1 hour" / "Usually responds within a day" / "Usually responds within a few days". Add to `:public` serializer. RSpec tests for computation.
- **Mobile:** In `SellerProfile` and `ListingDetail` seller card: if `response_time_label` present, show a row below name — clock icon + label string. `text-xs`, `mutedForeground`. 3-locale translations (`en/ps/fa`) for all label variants. RTL row direction.
- **Acceptance:** Computation correct per definition. Null if threshold not met. Shown on SellerProfile and ListingDetail. Translations in all 3 locales. RSpec tests for: no convos, under threshold, fast responder, slow responder.

---

### N806 — FirstMessageSheet title/price hierarchy ⬜

- **Board card ID:** TASK-F513 · **Priority:** P3 · **Owner:** _unassigned_ → `marketplace-designer` · **Surfaced by:** TASK-J952 design review (CYCLE-4), 2026-08
- **Context:** `src/screens/shared/listing-detail/FirstMessageSheet.tsx:149-160` renders the listing-reference row (title `text-sm font-semibold` above `PriceTag size="sm"`) with no visual hierarchy between the two — the exact same gap `PublishSuccessSheet.tsx`'s own summary row had before its CYCLE-3 design-review fix (price must outrank title, matching every other listing surface where price is the dominant text). Deliberately left out of TASK-J952's scope (that card only touches `PublishSuccessSheet`/`MyListingDetail`) — tracked here so the follow-up isn't lost.
- **What to build:** Bump `PriceTag` to `size="md"` (or otherwise make it the visually dominant element) and de-emphasize the title, mirroring the exact treatment `PublishSuccessSheet.tsx`'s summary row now uses.
- **Acceptance:** In the "send first message" sheet's listing-reference row, price visually outranks the title (weight/size), matching `PublishSuccessSheet`'s summary row. Light/dark + RTL correct. No new hardcoded strings/colors.

---

### T703 — Fix pre-existing auth Maestro flows: clearState no longer lands on Login ⬜

- **Board card ID:** 229 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Surfaced by:** TASK-W924 (onboarding) code review, 2026-07-03
- **Context:** ~18–21 Maestro flows under `maestro/auth/` (`login.yaml`, `logout.yaml`, `sign_up*.yaml`, etc.) plus `maestro/_helpers/login.yaml` do `launchApp: {clearState: true}` and then immediately `assertVisible: "Welcome to Hatiwal"` / interact with Email+Password fields, assuming a fully-cleared app state lands on the Login screen. That assumption broke when guest browsing shipped (**A4**, 2026-06-14) — `Splash.tsx` now routes a token-less launch straight to Bazaar (Browse), never a login wall. TASK-W924's onboarding carousel compounds this further: a truly fresh `clearState: true` launch now shows the onboarding carousel first (whose slide 1 happens to also be titled "Welcome to Hatiwal", so the very first assertion may still pass) before landing on Bazaar — so every one of these flows now hangs/fails on the next step (`tapOn: "Email"`) regardless.
- **What to build:** Update each affected flow to either (1) run through onboarding first (`tapOn: "Skip"`) and navigate to the Me/Profile tab to reach Login explicitly instead of relying on a bare `clearState` launch landing there, or (2) seed the `hatiwal:onboarding-seen` AsyncStorage flag via a test-only mechanism before asserting Login.
- **Acceptance:** All affected flows pass against current Splash/onboarding behavior; `maestro/_helpers/login.yaml` (used by many other flows via `runFlow`) fixed first since it's the highest-leverage file.

---

### T704 — Maestro sweep: update 5 stale "Listing posted" publish flows (post TASK-P736) ⬜

- **Board card ID:** 245 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Surfaced by:** TASK-P736 review (CR round 2), 2026-08
- **Context:** TASK-P736 added a mandatory ≥1-photo + exact-map-pin gate to Publish on `ListingForm`, and an earlier card (TASK-J952) replaced the old "Listing posted" toast with `PublishSuccessSheet` ("Your listing is live!" + "Done"). `maestro/browse/full_marketplace_cycle.yaml` broke outright under the new gate (it published with zero photos/no pin) and was fixed directly as part of TASK-P736. Five more flows that publish through `ListingForm` still assert the removed "Listing posted" copy, and three of them (`maestro/listings/create_listing_all_fields.yaml`, `create_listing_currency_usd.yaml`, `create_listing_location_picker.yaml`) never drop a photo or a pin, so they can no longer reach Publish at all. The other two (`create_listing_draft_restore.yaml`, `draft_lifecycle.yaml`) need a per-flow check — verify whether the draft being restored/published already carries a photo+pin before assuming they're blocked too.
- **What to build:** For each of the 3 photo/pin-less flows, paste the `Add Photos` → `Gallery` → pick index 0 → assert `Cover` block AND the `Tap to set exact location on map` → search "Kabul" → pick index 0 → `Confirm location` block (both already written in `maestro/listings/create_listing_with_condition.yaml`) immediately before the `Publish` tap; then swap the final `assertVisible: "Listing posted"` for `assertVisible: "Your listing is live!"` + `tapOn: "Done"` (matches `create_listing_publish_direct.yaml`). For the other 2 flows, audit whether their draft already has a photo+pin; if not, add the same blocks; either way, fix the stale assertion.
- **Acceptance:** All 5 flows pass against current Publish/`PublishSuccessSheet` behavior; `grep -rn "Listing posted" maestro/` returns nothing anywhere in the suite.

---

### T705 — ListingForm zodResolver generic degrades to `FieldValues` ⬜

- **Board card ID:** 251 · **Priority:** P3 · **Owner:** _unassigned_ → `feature-builder` · **Surfaced by:** TASK-P736 review (CR round 2), 2026-08
- **Context:** `npx tsc --noEmit` fails at `src/screens/seller/ListingForm.tsx` — a `zodResolver` output-vs-input mismatch caused by `negotiable: z.boolean().default(true)` in `listingSchema` degrades every `handleSubmit((values) => ...)` callback's `values` to the generic `FieldValues` type instead of the real `ListingFormValues` shape. Confirmed pre-existing and unrelated to TASK-P736 (`listingSchema` itself is untouched by that card). Concretely: the Price field's `onChangeText={(v) => field.onChange(normalizeDigits(v) as unknown as number)}` double-cast (storing a `string` in a field declared `number`) is NOT type-checked by the compiler at all — verified safe at RUNTIME only (`@hookform/resolvers` 5.4.0 returns the parsed zod OUTPUT unless `raw: true`, so `saveMutation`/`publishMutation` receive a real `number`, and `listings.ts`'s `String(data.price)` is correct; `getPublishBlockers`'s `isPositiveFiniteNumber` accepts `string | number`) — but the type system can't catch a future regression here.
- **What to build:** Give `listingSchema`'s zod `z.input` side an explicit `price: string | number` (or split input/output types so the resolver's generic doesn't collapse to `FieldValues`), then remove the `as unknown as number` cast once `field.onChange` is properly typed.
- **Acceptance:** `npx tsc --noEmit` no longer reports a `Resolver<...>` mismatch for `ListingForm.tsx`; `handleSubmit`'s `values` parameter is the real `ListingFormValues` type at every call site; no behavior change (still verified safe at runtime today).

---

### N807 — Systemic RTL: manual `row-reverse` double-flips native `forceRTL` mirroring ⬜

- **Board card ID:** 243 · **Priority:** P2 · **Owner:** _unassigned_ → `feature-builder` · **Surfaced by:** TASK-K729 review, 2026-08
- **Context:** Native `forceRTL` is on for `ps`/`fa` (`src/i18n/index.ts`), which means RN already mirrors logical properties (`borderStartWidth`/`borderStartColor`, `marginStart`/`marginEnd`, and plain `flexDirection: "row"`) automatically — a `row` already lays out right-to-left under forceRTL. Many components (e.g. `ListingStatusBanner.tsx`) ALSO manually flip with `rowDir = isRtl ? "row-reverse" : "row"`. The two conventions disagree: under forceRTL, `row-reverse` double-flips back to a VISUALLY LTR order (content flush left) while a sibling logical-property border (`borderStart*`) correctly mirrors to the right — producing a badge/title row flush on one side with an accent edge on the other, and a `textAlign: "right"` subtitle underneath that doesn't match either. First observed on `ListingStatusBanner`'s `layout="row"` (TASK-K729) but the same `rowDir` pattern exists across many other screens (`ListingUnavailableNotice.tsx`, `ComposerActionsSheet.tsx`, `ListingHeader.tsx`, etc.) — this ticket is the audit, not a single-component fix.
- **What to build:** Pick ONE convention for the whole app and apply it consistently: (a) drop `rowDir`/manual `isRtl` flips entirely and let native `forceRTL` mirror everything (works for `flexDirection: "row"` and logical `Start`/`End` properties, but NOT for icons that must visually flip, e.g. chevrons — those still need an explicit swap), or (b) keep the manual `isRtl` convention everywhere and swap any new logical properties (`borderStart*`) for their manual equivalents (`borderLeftWidth`/`borderRightWidth` keyed on `isRtl`) until (a) is done app-wide. Audit every `row-reverse` call site against every `borderStart*`/`marginStart*`/`paddingStart*` call site for the disagreement described above.
- **Acceptance:** One documented convention, applied consistently across `src/`; a real-device check on iOS + Android in `ps` confirms badge/title alignment and the accent edge land on the SAME visual side; no more sibling elements disagreeing on which edge is "leading" within one component.

---

### N808 — Bottom-sheet library-compliance audit: raw `Modal` sheets beyond `MeetupSheet` ⬜

- **Board card ID:** 244 · **Priority:** P3 · **Owner:** _unassigned_ → `feature-builder` · **Surfaced by:** TASK-K729 review, 2026-08
- **Context:** `docs/DESIGN_SYSTEM.md` §4 says "do not hand-roll any of the above" (sheets should use `@gorhom/bottom-sheet`). P1 §5 (above) already carries an explicit, dated waiver for `MeetupSheet` (needs `KeyboardAvoidingView`, which `@gorhom/bottom-sheet` doesn't natively compose with on Android) and names `ReportSheet`/`MeetupSheet`/`CategoryPickerSheet` as the audit list — but `ComposerActionsSheet.tsx`, `ReviewPromptSheet.tsx`, `BuyerPickerSheet.tsx`, and `PhotosSection.tsx`'s inline `SourcePickerSheet` ALSO use a raw `<Modal>` and were never added to that audit list or given their own waiver entry, even though each already carries an inline comment justifying it (native-only platform splits crash the web dev runner, per `MapCanvas`'s precedent).
- **What to build:** For each of the four components, confirm the inline waiver rationale still holds (native-only platform split vs. `KeyboardAvoidingView` composition) and either (a) formally extend the P1 §5 waiver list to include them with the SAME justification, closing this as "audited, no change needed", or (b) migrate any that turn out NOT to need the waiver (e.g. a sheet with no `KeyboardAvoidingView` dependency and no native-only import) to `@gorhom/bottom-sheet`.
- **Acceptance:** Every raw-`Modal` sheet in `src/` is either migrated to `@gorhom/bottom-sheet` or has its waiver rationale recorded in ONE place (P1 §5 / this ticket), not scattered per-file comments only.

---

### N809 — ListingForm: move Save Draft/Publish from the top toolbar to a sticky bottom bar ⬜

- **Board card ID:** _pending_ · **Priority:** P3 · **Owner:** _unassigned_ → `feature-builder` · **Surfaced by:** TASK-P736 review, 2026-08
- **Context:** `docs/DESIGN_INSPIRATION.md` §5 specifies a **sticky bottom** submit bar (`[ Save Draft (outline) ] [ Publish (primary) ]`) and `docs/DESIGN_SYSTEM.md` §1 principle 3 says the primary action must be the loudest thing on screen. `ListingForm.tsx` instead puts two `text-sm` buttons in the top-right toolbar — the smallest, hardest-to-reach corner on a mid-range Android, and on an edit of an already-published listing the toolbar also flips between a single `[Save]` and the `[Save Draft | Publish]` pair while `existingListing` is loading (mitigated, not eliminated, by the `status` route-param hint — see `isPublished`'s comment in `ListingForm.tsx`), which is a mistap risk precisely because the buttons sit in the smallest tap zone.
- **What to build:** Move the toolbar's Save Draft / Publish (and the single Save for an already-published listing) into a sticky bottom bar, full-width Publish as the loudest primary action, matching `docs/DESIGN_INSPIRATION.md` §5. Must preserve: the disabled/busy states while `isFormBlocking`/`isLoading`, the `hideFormActions` unmounting for the three terminal non-form states (bad deep link / confirmed 404 / retry-with-nothing-cached — see `ListingForm.tsx`'s own comment on why those states must not show dead controls), and every existing test's ability to find and press these buttons by their current `t(...)` label text (`ListingForm.publish.test.tsx`, `ListingForm.draft.test.tsx`, `ListingForm.duplicate.test.tsx`, `ListingForm.routing.test.tsx`).
- **Acceptance:** Publish is the loudest, most reachable control on the screen (sticky bottom, full-width, primary variant); the button-count flip during the edit-mode loading window no longer happens under the seller's thumb (bottom bar, not top-right corner); all four `ListingForm.*.test.tsx` suites still pass unmodified or with only mechanical selector updates; RTL layout (Pashto/Dari) verified; a Maestro flow exercises tapping the bottom-bar Publish button.

---

## Sell Flow Redesign — Groomed 2026-08-27, SHIPPED same day

> **Status: shipped.** SF-B1–B9 (backend), SF-M1–M8 (mobile) and the QA fixture seed (SF-M4b) are all
> `✅ Done` (board cards 274–284, 288–294, 297). RSpec 1704 examples / 0 failures, RuboCop clean
> (301 files); Jest 154 suites / 2472 tests, 0 failures. **No Maestro flow has been executed on a
> device for this redesign yet** — device QA is tracked separately as SF-QA1 (board card 296, in
> progress) and is NOT implied by any status above. `hatiwal-web` was **not** touched (SF-W1, board
> card 285, still blocked/unscheduled) and still runs the pre-redesign reserve-then-sold model.
>
> Owner mandate: *"we change completely what we have... we will do what big tech does and what is
> good for UI/UX."* Full spec, state diagram, screen-by-screen detail, API shapes, judgment calls,
> and copy: **`docs/SELL_FLOW_REDESIGN.md`**. Audit of what the flow did before this pass (verified
> file:line): `docs/SELL_FLOW_AUDIT.md`. This section is the ticket breakdown only — read the
> redesign doc before touching any of this surface, it has the full context these summaries
> deliberately omit.
>
> **Model in one line:** sell is the one-tap primary from any live listing (reserved included);
> reserve is initiated from chat, not the listing; a reserved listing stays fully in search/chat
> (was NOT true before this pass); mistakes are fixed by an Undo toast or an editable Sales-screen
> row, never a "correction form"; a buyer-side quantity stepper feeds a written unit×qty=total
> first message. DB keeps its 4-value `status` enum untouched — "3 states" is presentation only.
> **`status == "reserved"` does NOT mean "has a hold"** — a multi-unit batch holds units while
> staying `status: active`; always check `held_units`/`listing.sale`, never bare `status`. Three
> separate bugs shipped from that exact confusion and were fixed same-day (SF-B8, SF-B9, and the
> mark-sold-in-chat wiring) — a fourth instance (`reserved_at` never set for a batch hold) is filed
> as SF-B10, not fixed.
>
> **What's still open, in priority order:** SF-QA1 (device QA — in progress), SF-M3b (type-level
> cleanup, cosmetic), TASK-API-FEEDN1 (feed N+1 from the new `held_units` field), SF-B10
> (`reserved_at` gap), SF-M9 (BuyerPickerSheet → shared stepper, needs the swap sequenced after
> SF-QA1's Maestro rewrite), SF-W1 (web parity, unscheduled). See each ticket in the Status Overview
> table above for full detail.

### SF-B1 (board card 274) — Widen live/browsable/messaging to keep reserved listings in search ✅

- **Priority:** P0 (governs the whole redesign) · **Owner:** claude (backend feature-builder) · **Sprint:** MVP Core (2)
- **Files:** `hatiwal-api/app/models/listing.rb` (`browsable`/`for_status_filter` scopes, new `live` scope + `live?`), `app/policies/listing_policy.rb` (`start_conversation?`), `app/services/conversations/start_service.rb`, `app/models/saved_listing.rb`, `app/controllers/api/v1/my/listing_status_counts_controller.rb`
- **What:** `Listing.browsable` and `Listing.for_status_filter("active")` must include `reserved` rows, not just `active` (§5.1 of the redesign doc has the exact scope diff). `ListingPolicy#start_conversation?` and `Conversations::StartService` widen from `active?` to the new `live?` predicate. `listing_status_counts_controller.rb`'s `live` count folds in `reserved`. No data migration — no `status` value changes, only which values count as "live" for search/messaging.
- **Ships atomically with SF-M3** (see below) — do not merge one without the other.
- **Acceptance:** a freshly-reserved single-item listing still returns from `GET /listings`, `GET /listings?search=`, and `GET /categories/:id/listings`; `POST /listings/:id/conversations` succeeds from a non-owner against a reserved listing; RSpec covers all of the above plus the status-counts widen.
- **BUILT — deviations from the written spec, with reasons** (this row was contradictory as written: `docs/SELL_FLOW_AUDIT.md` §7 says widen `unpublish?`/`renew?`/`expired?`, `docs/SELL_FLOW_REDESIGN.md` §5.2 says leave them `active?`-only. Resolved in favour of the audit):
  - `ListingPolicy#renew?` → `live?`. **Required**, not optional: `Listing#expired?` widened to `live?` in the same ticket, so a held listing can now expire out of `browsable`. Leaving `renew?` at `active?` would let a reserved listing expire with no way to renew it — a listing stranded off the market with no seller-reachable fix.
  - `ListingPolicy#unpublish?` → `live?`, and `My::ListingsController#unpublish` now cancels the open hold in the same DB transaction (mirroring `#activate`). Reserving no longer removes a listing from the feed, so "take it off the market while I finish this deal" needs a one-step route from `reserved`; the alternative (release the hold, then unpublish) destroys the record of who it was held for. The hold is cancelled because a *draft* listing cannot carry a live reservation — a surviving `reserved` row is exactly what TASK-TX02's review fix exists to prevent.
  - `Listing.expired_active` widened to `live` alongside `expired?`, so the seller's "Expired" tab and the `expired` badge agree, and the Active/Expired tabs still partition the live set (a reserved-and-expired listing would otherwise appear in neither tab).
  - `ListingPolicy#reserve?` left at `active?` (both docs agree) — re-reserving a held listing is release-the-hold-first. A multi-unit batch keeps status `active` while units are held, so moving a batch's hold to another buyer still works.
  - `SavedListing#price_dropped?` and `UserSerializer`'s `listings_count`/`items_active_count` widened to `live` per audit §7.

### SF-B2 (board card 275) — Reserve gains an optional quantity; expose "N held" ✅

- **Priority:** P0 · **Owner:** claude (backend feature-builder) · **Sprint:** MVP Core (2)
- **Files:** `listing.rb` (`reserve_with_buyer!`, `current_sale`, new `held_units`), `my/listings_controller.rb#reserve` + `lifecycle_params`, `listing_serializer.rb`
- **What:** `reserve_with_buyer!` accepts an optional `quantity:` (multi-unit only, defaults 1, clamped to `available_units`) and stores it on the transaction — mirrors the already-shipped sold-quantity mechanism field-for-field (§6 of the redesign doc has the exact method body). `current_sale` is fixed to surface an open reservation on an **active** multi-unit listing too (today it only looks when `status` is `reserved`/`sold`, which a held multi-unit listing never is). New public-safe `held_units` method + serializer field (base fields, no buyer identity — that stays on the existing owner-only `sale` field).
- **Depends on:** nothing (independent of SF-B1, can run in parallel).
- **Acceptance:** `PUT /my/listings/:id/reserve` with `quantity: 2` on a 15-unit listing stores it and `held_units` reads 2 on both `:list`/`:detailed`; a single-item listing's reserve call ignores any quantity param and behaves byte-identically to today (`held_units` never asked for, `multi_unit? == false` path untouched); `available_units`'s formula is untouched (held units are advisory, not subtracted — §3.6/§6 of the redesign doc).
- **BUILT — additions beyond the written spec:**
  - `held_units` on the BASE serializer fields means the PUBLIC feed asks every row for its open hold, and an association scope always queries — a straight N+1 across the whole browse feed. Added `Listing#open_sale` (reads the eager-loaded array when there is one, exactly like `current_sale` already did) and preloaded `:sale_transactions` in all six `:list`/`:seller_list` renderers. Guarded by a query-count spec that adds holds to a fixed row set and asserts the count does not move.
  - `current_sale` also falls back to the newest SOLD row when there is no open hold. §6's version returns nil there, which would leave a partially-sold LIVE batch with no `sale` block at all — so `SaleBuyerCard` would not render and SF-B5's "+N more · View all sales" link (which sits on that card) would have nowhere to live. A `sold` listing still prefers its completing sale over any stale hold.

### SF-B3 (board card 276) — Outside-buyer sales get a ledger row ✅

- **Priority:** P1 · **Owner:** claude (backend feature-builder) · **Sprint:** MVP Core (2)
- **Files:** migration (`change_column_null :transactions, :buyer_id, true`), `transaction.rb` (`belongs_to :buyer, optional: true`, `bump_trust_counters!` nil-guard), `listing.rb` (`sold_with_buyer!` restructure), `transaction_serializer.rb` (`field(:buyer)` nil-guard), delete `bump_seller_sold_count_for_legacy_sale!` + its controller call site once this ships
- **What:** today, "sold to someone not on Hatiwal" (`clear_buyer: true`) records **nothing** — no Transaction row, so the sale is invisible to any future ledger and there's nothing for SF-B4 to correct. This ticket makes that path create a `sold` Transaction with `buyer_id: nil` instead of a silent no-op. `buyer_is_not_seller`/`buyer_is_conversation_participant` already guard `blank?` — no change needed there, only the DB `NOT NULL` + missing `optional: true` were blocking it. Full method bodies in §7 of the redesign doc.
- **Depends on:** nothing (independent).
- **Blocks:** SF-B4 (correction needs something to point at for this case), SF-M5 (ledger needs to show it).
- **Acceptance:** marking sold with `clear_buyer: true` creates a sold `Transaction` with `buyer_id: nil`; `GET /my/transactions` returns it; `TransactionSerializer`'s `buyer` field renders `null`, not a 500; existing mobile `SaleBuyerCard.tsx` (already optional-chains `sale.buyer?.name`) renders correctly against this with zero mobile changes (verify, don't just assume).
- **BUILT — corrections to the written spec:**
  - **The spec's stated reason for deleting `bump_seller_sold_count_for_legacy_sale!` was wrong on both halves.** (a) It could not have double-counted: its call site was already guarded by `if txn.nil?`, and SF-B3 makes `clear_buyer` return a txn, so it would simply have stopped firing there. (b) Deleting it as written WOULD have regressed a different path — the bare legacy `PUT .../sold` (no `buyer_id`, no `clear_buyer`, never reserved) still created no Transaction, so its seller counter would have silently dropped to zero. Resolved by making the premise true: `sold_with_buyer!` now records **every** sale, so the bare legacy call gets the same buyer-less row. There is no `return nil` branch left, the method is genuinely dead, and the counter still moves exactly once (asserted in both directions).
  - **§7's `units` computation would have re-broken a device-reported bug.** It defaults to `available_units` (the whole shelf) and the controller then reads `txn.quantity` — so `clear_buyer` with no quantity on a batch of 50 would have retired all 50, which is the exact report the controller comment already documents ("50 in stock, one sale, listing retired with 0 of 50 left"). The default now lives in one place (`Listing#units_for_sale`) and is `multi_unit? ? 1 : available_units`, matching the controller's documented intent. This also fixes a pre-existing inconsistency the same shape: a batch sold to an IDENTIFIED buyer with no quantity used to retire the whole stock. `spec/models/listing_quantity_spec.rb`'s "defaults to the whole remaining stock" was inverted accordingly.
  - Closing out a hold now defaults to the units already HELD rather than a guess — possible only because SF-B2 gave a hold a real quantity.
  - `GET /my/reviews/pending` gained `Transaction.with_counterparty`: without it a seller is prompted to review a buyer with no account, and the submit 422s on `Review`'s own `belongs_to :reviewee`. A prompt you cannot satisfy is worse than no prompt.
  - `ListingSerializer::SALE_FIELD` needed the same nil guard as `TransactionSerializer` (the spec only named the latter), plus a nil check before the `conversation_id` lookup so we never query `buyer_id IS NULL`.

### SF-B4 (board card 277) — Undo & edit a recorded sale ✅

- **Priority:** P1 · **Owner:** claude (backend feature-builder) · **Sprint:** MVP Core (2)
- **Depends on:** SF-B3 (outside-buyer sales must exist as rows before they can be corrected)
- **Files:** `transaction.rb` (`#correct!`, `#void!`), `listing.rb` (`Listing::CorrectionBlocked`, `#correct_sold_transaction!`), `transaction_policy.rb` (`update?`/`destroy?`), `config/routes.rb` (widen `resources :transactions` to `[:index, :update, :destroy]`), new controller actions on `api/v1/my/transactions_controller.rb`
- **What:** `PATCH /my/transactions/:id` (quantity/buyer_id/clear_buyer/final_price, partial) and `DELETE /my/transactions/:id` (void) — the ONE mechanism behind both the mobile Undo toast (SF-M5) and the Sales screen's editable row (SF-M5). Voiding/reassigning a transaction that already has a review attached is refused (422, `Listing::CorrectionBlocked`) — quantity/price edits on a reviewed sale are still allowed. A correction that leaves `sold_units < quantity` on a `sold` listing flips it back to `active` automatically — this **is** "re-opening a listing that went sold-out by mistake," not a separate action. Full method bodies + the exact capacity-clamp math in §8 of the redesign doc.
- **Acceptance:** `PATCH` with a smaller quantity re-opens a sold-out listing back to `active`; `DELETE` on a listing's only sale returns `sold_units: 0` and `status: active`; either call against a transaction with an existing review returns 422 and changes nothing; RSpec covers the capacity-clamp boundary and the reviewed-sale refusal explicitly.
- **BUILT — corrections to the written spec:**
  - **§8.1's status-reconciliation lines contain a real bug:** `update!(status: :active) if sold? && new_sold_units < quantity` — inside `correct_sold_transaction!`, `quantity` is the KEYWORD ARGUMENT (the seller's requested number), not the listing's total. As written, correcting a 5-unit listing to `quantity: 1` compares `1 < 1` and leaves it `sold`. Built with a `total_units = self.quantity` local named so the shadowing cannot happen, plus a spec that fails on exactly that mistake.
  - `raise ActiveRecord::RecordInvalid, self` with no errors on the record renders `{ errors: [] }` — a 422 that tells the seller nothing. The capacity failure now adds a real field error to the transaction first, so the client shows an actual message.
  - The reviewed-sale 422 carries `code: "sale_has_review"` (via a new optional `code:` on `render_unprocessable_entity`, additive, no existing caller affected). A three-locale client cannot render `listing.sale.voidBlockedReviewed` off English prose. Follows the `account_suspended` convention `reject_blocked_user!` already uses.
  - `void!` only decrements when the row is `sold?` — a reserved row never bumped a counter, so voiding one must not give anything back.
  - The transaction row is locked inside the listing's `with_lock`, in a fixed order, and `old_units` is read after the lock (§8.1 reads it before, so two concurrent corrections could lose one adjustment).
  - `sold_at` is cleared when a listing re-opens, so its card stops claiming a sale date for a live listing.
  - `TransactionPolicy#update?/#destroy?` are seller-only as specified — a spec pins that the BUYER gets 403 (they can see the sale, they must never edit the seller's ledger).

### SF-B5 (board card 278) — Per-listing sales ledger read ✅

- **Priority:** P2 · **Owner:** claude (backend feature-builder) · **Sprint:** MVP Core (2)
- **Files:** `api/v1/my/transactions_controller.rb` (`listing_id` filter param), `listing_serializer.rb` (`sales_count` field)
- **What:** one-line addition to the already-shipped `GET /my/transactions` — filter by `listing_id` alongside the existing `as` param. Plus a cheap `sales_count` (COUNT of sold transactions) on `ListingSerializer` so `SaleBuyerCard` can show "+2 more · View all sales" without a second round trip. No new endpoint, no serializer changes to `TransactionSerializer` (already returns everything the ledger needs).
- **Depends on:** nothing (independent — can run in parallel with SF-B3/SF-B4).
- **Acceptance:** `GET /my/transactions?listing_id=42&as=seller` returns only that listing's rows, correctly paginated; `sales_count` matches an independent `COUNT` for the same listing.
- **BUILT:** `?status=` is also honoured (the Sales screen's documented call is `?listing_id=42&as=seller&status=sold`, and the spec's own §9 example sends it — it was silently dropped before). An unrecognised status is ignored rather than raising `ArgumentError` from the enum. `sales_count` counts SALES, not units (a buyer taking 3 of 15 is one sale) and uses the same loaded-array guard as everything else reading `sale_transactions`.

### SF-M1 (board card 279) — "Mark sold" is the one-tap primary from Live; drop Reserve from the listing surface ✅

- **Priority:** P0 · **Owner:** claude (mobile feature-builder) · **Sprint:** MVP Core (2)
- **Depended on:** SF-B1 + SF-B2 (shipped first, same day, per the hard sequencing note above — the tab-drop and the release-hold condition both needed the backend changes to be correct on day one)
- **Files:** `src/hooks/useListingLifecycle.ts`, `src/screens/seller/MyListings.tsx` (`STATUS_TABS`, `StatusCounts`)
- **What:** `primaryAction` for `active` (not expired) **and** `reserved` both become "Mark sold" (today only `reserved` does; `active`'s primary is "Mark reserved" — the exact gap `docs/SELL_FLOW_AUDIT.md` §2 names). Delete the `reserve` mutation/handler/moreActions entry from this hook entirely — reserve only exists in chat now (SF-M2). Rename "Activate" → "Release hold" in the moreActions row; widen its condition from `status === "reserved"` to `listing.sale?.status === "reserved"` (the one check that correctly covers both single- and multi-item holds — see §6/§10.1 of the redesign doc for why). New moreActions entry "View sales" whenever `hasSoldSome(listing)`. Drop "Reserved" from `MyListings.tsx`'s `STATUS_TABS` — a held listing now simply appears under Active with its hold badge.
- **Acceptance:** a fresh active listing's primary button reads "Mark sold", never "Mark reserved"; a reserved listing (single or multi) also shows "Mark sold" as primary; "Release hold" appears exactly when `sale?.status === "reserved"` for both item counts; My Listings has no "Reserved" tab and the "Active" tab's count/contents include held listings; "View sales" appears the moment any unit has sold.

### SF-M2 (board card 280) — Reserve moves into the chat thread; mark-sold in chat becomes one-tap for the known buyer ✅

- **Priority:** P1 · **Owner:** claude (mobile feature-builder) · **Sprint:** MVP Core (2)
- **Depended on:** SF-B2 (hold quantity); reused `SF-M6`'s `QuantityStepper`
- **Files:** `src/screens/chat/conversation/ListingHeader.tsx`, `src/screens/chat/conversation/ComposerActionsSheet.tsx`, `src/screens/chat/conversation/reserveAfterAccept.ts` (generalize, don't fork)
- **What:** `ListingHeader`'s inline pill drops its `showReserve`/`showMarkSold` toggle — it's **always** "Mark sold" for `isOwner && listing.live`, opening `BuyerPickerSheet` in confirm mode scoped to this conversation's participant (no picker, the buyer is who you're already talking to) with the quantity stepper when `multiUnit`. "Place a hold for {name}" / "Release hold" move into `ComposerActionsSheet`'s "+" menu (seller-only, conditional per §4.4.2 of the redesign doc). Both reuse the pure-builder/side-effect split already proven by `reserveAfterAccept.ts` — generalize it rather than duplicating the toast copy/bidi-isolation/stay-open-on-error contract it already got right.
- **Acceptance:** tapping "Mark sold" in a chat thread never shows a buyer list — straight to the confirm sheet for that thread's participant; "Place a hold"/"Release hold" appear/disappear exactly per the conditions in §4.4.2 of the redesign doc (never both, never for a hold that belongs to a different buyer than this thread's).

### SF-M3 (board card 281) — Stop treating a reserved listing as a dead end on mobile ✅

- **Priority:** P0 · **Owner:** claude (mobile feature-builder) → marketplace-designer · **Sprint:** MVP Core (2)
- **Ships atomically with SF-B1** — SF-B1 is merged; do not merge this independently of it either.
- **Files:** `src/screens/shared/ListingDetail.tsx` (`canContact` — was line ~419/435, the dead-end ternary — was line ~1006/1057, the offer-button gate — was line ~959/1010), new `src/screens/shared/listing-detail/listingAvailability.ts` (+ `__tests__`), `src/screens/shared/listing-detail/SellerPhoneReveal.tsx` (renamed `isActive`→`isContactable`, widened), `src/screens/chat/conversation/threadAvailability.ts` (`showUnavailableNotice`, now sold-only) + its test, `src/screens/chat/conversation/ListingUnavailableNotice.tsx` (doc only, see BUILT note), `src/components/common/ListingStatusBanner.stories.tsx` (new `StripReservedWithNote` story), `maestro/browse/listing_detail_reserved_contactable.yaml` (new), `maestro/browse/listing_detail_sold_recovery.yaml` (reserved half removed), `maestro/chat/reserved_sold_dead_end_notice.yaml` (rewritten for the new contract).
- **What:** every file above used to branch on `status === "sold" || status === "reserved"` to mean "this is unavailable" — per the redesign, that's now sold-only. `canContact` widens to include `reserved`; the offer button gets an **explicit** new `listing.status !== "reserved"` check. The buyer-facing status banner (`ListingStatusBanner layout="strip"`) is KEPT for reserved and gains a second line (`listing.detail.reservedStillAvailableNote`) explaining why a buyer can still message it — only the dead-end block below it and the chat notice change.
- **Acceptance:** a non-owner opening a reserved listing's detail page sees the Message button (Offer button hidden) instead of the "see similar" dead end; a reserved thread in chat is not dimmed and shows no recovery notice; offers remain unavailable on a reserved listing (verified — did NOT silently flip).
- **BUILT — extracted `canContact`/offer-gate/dead-end into a new pure `listingAvailability.ts` module** (mirrors `threadAvailability.ts`'s own split) so "a reserved listing is contactable; a sold one is not" is unit-tested directly rather than only through a full-screen render — 15 new Jest cases.
- **BUILT — also widened the direct-call reveal** (`SellerPhoneReveal.tsx`, renamed `isActive`→`isContactable`): the redesign doc flagged this exact call site (`ListingDetail.tsx`'s old line 756) as unresolved and asked the builder to decide. Resolved to match `canContact` — a reserved listing is "still for sale", so the seller's phone number is reachable the same way messaging is.
- **NOT narrowed, flagged rather than silently left wrong:** `ListingUnavailableNotice.tsx`'s `status` prop stays `"reserved" | "sold"` (not narrowed to `"sold"` as the redesign doc's §4.4.3 asked) and `ListingUnavailableActions.tsx` was not touched at all. Both would need `Conversation.tsx` (an explicit hard `as "reserved" | "sold"` cast at its `ListingUnavailableNotice` call site) and/or `ListingUnavailableActions.tsx` edited to compile cleanly narrowed — both files are outside this ticket's strict ownership (the concurrently in-flight SF-M1/M2 ticket owns adjacent chat-thread files). The **behavioural** fix is complete regardless (`showUnavailableNotice` already never feeds `"reserved"` to either component at runtime; `ListingDetail.tsx`'s own ternary already never reaches `ListingUnavailableActions` with `"reserved"`) — only the type-level cleanup + `ConversationRow.tsx`'s dimming condition (also untouched, same reason) are the fast-follow.
- **BUILT — no seed fixture exists for a multi-unit listing with an open hold**, so the Maestro flow cannot assert SF-M4's positive "N held" text end-to-end; noted in the new flow's comments and here as a fast-follow (either a new `hatiwal-api/db/seeds/e2e.rb` fixture, or wait for SF-M2's manual "Place a hold" chat action to exist).

### SF-M4 (board card 282) — Multi-unit "held" transparency on the stock pill ✅

- **Priority:** P2 · **Owner:** claude (mobile feature-builder) → marketplace-designer · **Sprint:** MVP Core (2)
- **Depends on:** SF-B2 (`held_units` field) — merged.
- **Files:** `src/utils/stock.ts` (new `heldUnitsOf` + `StockFields.heldUnits`, + tests), `src/api/listings.ts` (new `Listing.heldUnits` field), `src/screens/shared/ListingDetail.tsx` (public "N held" clause), `src/screens/seller/MyListingDetail.tsx` (owner "N held for {name}" clause).
- **What:** when `multiUnit && heldUnits > 0`, the stock pill gains a held clause — public/buyer view (`ListingDetail.tsx`): "{{available}} in stock · {{count}} held" (no name — this route's `GET /listings/:id` never returns the owner-only `sale` block, so this screen literally cannot show a name even for `isOwnListing`); seller's own view (`MyListingDetail.tsx`, `GET /my/listings/:id`): "... · {{count}} held for {{name}}" (existing owner-only `sale.buyer.name`, falling back to the nameless phrasing for a legacy buyer-less hold). Single-item listings render nothing new — the held clause is nested inside the existing `hasStockToShow(listing)` gate, untouched.
- **Acceptance:** a multi-unit listing with an open hold shows the held clause correctly on both buyer and seller detail; a single-item listing shows neither clause regardless of hold state — asserted in Jest (`heldUnitsOf` unit tests) and Maestro (`listing_detail_reserved_contactable.yaml` + a reinforcing assertion in `listing_detail_multi_quantity.yaml`).
- **BUILT — did not fork `src/components/common/StockBadge.tsx`:** that shared component exists but neither `ListingDetail.tsx` nor `MyListingDetail.tsx` actually consume it (both hand-roll their own `Badge` with the same label logic inline, pre-existing tech debt, unrelated to this ticket) — only `SellerListingCard.tsx` (owned by the concurrent SF-M1/M2 ticket right now) does. The held clause was added to the two inline call sites this ticket owns instead of migrating either screen onto `StockBadge` (out of scope) or forking it (against house rules). `SellerListingCard.tsx`'s own stock pill does not yet show a held clause — flagged as a fast-follow once that file is free, ideally alongside consolidating all three call sites onto `StockBadge`.
- **NOT asserted in Maestro:** the positive "N held"/"N held for {name}" text on an actual multi-unit + open-hold fixture — no such seed fixture exists yet (see the SF-M3 note above). Covered instead by `heldUnitsOf`'s Jest suite and the single-item negative case in Maestro.

### SF-M5 (board card 283) — Undo toast on Mark Sold + a real Sales screen with an editable/deletable row ✅

- **Priority:** P1 · **Owner:** claude (feature-builder → marketplace-designer) · **Sprint:** MVP Core (2)
- **Depended on:** SF-B3, SF-B4, SF-B5, and SF-M6 (for `QuantityStepper` in the edit sheet)
- **New route:** `/(main)/listing/[id]/sales` · **New files:** `src/screens/seller/ListingSales.tsx`, `src/components/common/SaleRowEditSheet.tsx`
- **What:** (1) `useListingLifecycle`'s `markSold` success toast gains a `sonner-native` `action: { label: t('common.undo'), onClick: ... }` (the library already supports this, confirmed — `ToastAction` in `sonner-native`'s own types) calling `DELETE /my/transactions/:id`, extended toast duration (~6-8s). (2) New Sales screen: `GET /my/transactions?listing_id=&as=seller&status=sold`, tally header when multi-unit, stacked rows (`UserIdentity` or "Buyer not on Hatiwal" fallback, quantity, `PriceTag perUnit`, date), row tap → `SaleRowEditSheet` (quantity `QuantityStepper`, buyer reassignment via the listing's conversation list + "Not on Hatiwal", final price, Save/Delete). Delete on a reviewed sale is refused inline (422 → `listing.sale.voidBlockedReviewed`, quantity/price still editable). Full spec: §9/§10.3 of the redesign doc.
- **Acceptance:** the Undo toast reverses a just-completed sale and restores stock; the Sales screen lists every sold transaction for the listing and tallies correctly when multi-unit; deleting a row restores stock and, if it was the last unit, flips the listing back to Live; a reviewed sale cannot be deleted/reassigned but its quantity can still be corrected; skeleton/empty/error states present; RTL + dark verified.

### SF-M6 (board card 284) — `QuantityStepper` + buyer-side quantity intent + structured first message ✅

- **Priority:** P1 · **Owner:** claude (feature-builder → marketplace-designer, polish commit 09cb4d0) · **Sprint:** MVP Core (2)
- **Depended on:** nothing — **shipped first among the mobile tickets.**
- **New files:** `src/components/common/QuantityStepper.tsx` (+ `.test.tsx`, `.stories.tsx`), `src/screens/shared/listing-detail/firstMessageQuantity.ts` (+ `__tests__/firstMessageQuantity.test.ts`) · **Files touched:** `src/screens/shared/ListingDetail.tsx` (new buyer-side stepper + quantity state), `src/screens/shared/listing-detail/FirstMessageSheet.tsx` (structured template via `buildFirstMessageText`) · **New Maestro flow:** `maestro/browse/listing_detail_quantity_intent.yaml`
- **What:** new shared `−`/tap-to-edit-number/`+` component (RNR primitives only, no new dependency) — resolves the tap-count tension between "big tech uses a stepper" and the original spike's own rejection of a stepper for a 15-unit case (§10.4 of the redesign doc). On the buyer-facing `ListingDetail`, a `QuantityStepper` (default 1, max `availableUnits`) appears near the sticky action bar when `multiUnit`, feeding `FirstMessageSheet`'s prefilled message: "Hi! I'd like to buy 3 × AFN 14,000 = AFN 42,000. Is this still available?" — no backend change, purely templated text. **Flagged explicitly in the redesign doc §3.3:** label this control "How many are you asking about?", never "Buy"/checkout framing — Hatiwal has no cart or payment, and a stepper styled like one would misrepresent what tapping it does.
- **Acceptance:** `QuantityStepper` renders identically at `value=1` regardless of mount point ✅ (unit-tested); a single-item listing's buyer detail page renders no stepper at all ✅ (Maestro); selecting qty=3 changes `FirstMessageSheet`'s prefilled text to the unit×qty=total sentence in the buyer's own locale's number formatting ✅ (unit-tested against the real en/ps/fa catalogs + Maestro); `BuyerPickerSheet`'s existing quantity behaviour (default-to-1, clamp-to-remainder) is unchanged, just rendered via the new control — **NOT done this pass, deliberately deferred (tracked as SF-M9 above).**
- **Deferred, flagged explicitly (not silently dropped):** the `BuyerPickerSheet.tsx` swap. Its own `__tests__/BuyerPickerSheet.test.tsx` already carried 4 failing tests from a different, concurrently in-flight ticket (all about the sold-quantity pre-fill default — "whole remainder" vs "1" — nothing to do with SF-M6), and the remaining 34 passing tests assert the exact free-text `Input` interaction (typing past the remainder, a destructive hint color, `selectTextOnFocus`) that a clamp-on-commit `QuantityStepper` cannot reproduce byte-for-byte. Swapping the control then would have turned 4 known, owned-elsewhere failures into ~15+ new ones in a file another ticket was actively mid-edit on — a shared-working-tree collision, not a design tradeoff. **Still open as SF-M9** (board card 298) — product-owner decided 2026-08-27 to keep the over-stock warning rather than switch to a silent clamp; see that ticket for the scoped swap.

### Same-day fast-follows (board cards 288–294, 297) — all ✅ Done

Discovered and fixed the same day as SF-B1–B9/SF-M1–M6, once real fixtures existed to exercise the
new model against. Full detail lives in the commits (`hatiwal-api` `c5e155c`, `48c1cc2`;
`hatiwal-mobile` `16cd19f`) — summarized here so they aren't lost.

- **SF-M4b (card 288)** — seeded a multi-unit listing ("Winter Gloves – 15 Pairs") WITH an open hold
  for a buyer, so Maestro can finally assert the positive "N held" text SF-M3/SF-M4 shipped with no
  fixture to prove. Part of the 5-fixture QA seed in `hatiwal-api/db/seeds/e2e.rb`
  (`db:seed:reset_e2e`), which also self-checks its own invariants (`sold_units <= quantity`,
  `available_units >= held_units`, at most one open hold per listing) and raises rather than handing
  QA a fixture that lies.
- **SF-B6 (cards 289/290)** — editing a listing's `quantity` now reconciles its `sold` status **both
  directions**: raising it re-opens a sold-out listing to `active` (the owner's own reported bug —
  15/15 sold, raised to 20, stayed `sold` with 5 unsellable units); lowering it below what's already
  sold is a 422 with a `quantity_below_sold_units` field-error code (localizable), not an uncaught
  `CheckViolation` 500.
- **SF-B7 (card 292)** — `renew`/`unpublish`/`activate` now rescue `ActiveRecord::RecordInvalid` like
  `sold`/`reserve` already did — a listing invalidated by a retroactive rule used to 500 with an empty
  body on these three actions.
- **SF-B8 (card 293)** — lowering a listing's `quantity` below an **open hold**'s quantity is now
  refused (422), not silently accepted — it used to render "2 available · 10 held" to buyers, which
  is a promise the seller can't keep. `activate?` (release hold) widened alongside it — it was
  returning 403 on exactly the batches where "release the hold first" is the advice being given.
- **SF-B9 (card 294)** — selling a BATCH now closes out its own open hold. The close-out used to gate
  on `status == "reserved"`, but a batch stays `active` while holding units (SF-B2), so selling the
  held units to the very buyer holding them left a phantom hold and "5 available · 10 held" on
  already-sold stock. Now gated on "an open hold for THIS buyer"; `available_units >= held_units` is
  an asserted invariant.
- **SF-M7 (card 291)** — mobile side of SF-B6: the quantity-edit failure is now legible — an inline
  note under the field before saving ("this will put your listing back on sale, with N available"),
  and the refusal pinned to the field itself, localized from the server's `quantity_below_sold_units`
  code rather than raw English shown to a Pashto/Dari seller.
- **SF-M8 (card 297, design-pass commit `09cb4d0`)** — `BuyerPickerSheet`'s shared instance in
  `Conversation.tsx` never received `remainingQuantity` and discarded `result.quantity` on confirm —
  a seller could never place a hold for more than one unit from chat. Both wires fixed, with a
  regression test typing 3 and asserting `reserveListing` receives `quantity: 3`. The same design pass
  also fixed the buyer-side `QuantityStepper` reading as a shopping-cart control next to "Contact
  Seller" (restyled as a quiet settings-row, not a stepper-beside-a-buy-button), consolidated the
  three hand-rolled "N of M left" badges onto one `StockBadge` component (previously built, unused,
  and missing the held clause the inline copies had each grown independently), fixed six raw-number
  interpolations that rendered Western digits in Pashto/Dari, and raised `QuantityStepper`'s `−`/`+`
  hit targets to the 44px floor.

### SF-W1 (board card 285) — Bring hatiwal-web to the same sell-flow model ⏸ (NOT THIS PASS)

- **Priority:** P2 · **Owner:** _unassigned_ · **Sprint:** _unscheduled_
- **Status:** ⏸ Blocked — explicitly deferred. The owner asked for mobile first, web after; recorded here so the debt is tracked, not discovered later.
- **Blocked on:** every SF-B*/SF-M* ticket above shipping first.
- **Scope note:** `reserved` is referenced in **26 hatiwal-web files** (grepped 2026-08-27) — same audit-then-port approach as the mobile tickets, mirroring the mobile contract per `docs/MOBILE_TO_WEB_MIGRATION.md`'s convention. Do not start until explicitly scheduled by product-owner. **Two small bug fixes already landed on web the same day, independent of the model port**: mark-sold defaults to ONE unit rather than the whole remaining stock (`hatiwal-web` `a3c3c1e`, mirrors the mobile/API fix), and an off-platform sale ("sold to someone not on Hatiwal") now sends its quantity instead of silently wiping the whole batch (`hatiwal-web` `9853405`). Neither touches the reserve/search model — web still requires reserving before some flows treat a listing as "spoken for" and still drops a single-item `reserved` listing out of search, unlike mobile/API post-SF-B1.

### Other open follow-ups from this pass (board cards 286, 287, 295, 296)

Full detail in the Status Overview table above (`TASK-API-FEEDN1`, `SF-M3b`, `SF-B10`, `SF-QA1`) —
listed here only so this section's own ticket numbering is complete:

- **TASK-API-FEEDN1 (card 286, Backlog)** — `GET /listings` N+1: the feed serializer touches
  associations (now including `sale_transactions` for `held_units`) that aren't always eager-loaded.
  SF-B2 already fixed the worst instance of this class of bug for `held_units` specifically
  (`Listing#open_sale` + preloading in the six `:list`/`:seller_list` renderers) — this card is
  whatever's left across the rest of the feed.
- **SF-M3b (card 287, Backlog)** — type-level cleanup only, no behavioural change: narrow
  `ListingUnavailableNotice`'s `status` prop from `"reserved" | "sold"` to `"sold"`, and remove
  `ConversationRow.tsx`'s now-dead `"reserved"` branch from its dimming condition. Flagged, not
  fixed, by SF-M3 because the files are owned by adjacent in-flight tickets at the time.
- **SF-B10 (card 295, To Do)** — `reserved_at` stays `nil` while a batch holds units. The 3rd
  instance of "code reading `status == reserved` to mean `has a hold`", which SF-B9's commit message
  names explicitly as a known-but-unfixed 4th instance of that root cause.
- **SF-QA1 (card 296, In Progress)** — device QA readiness: rewrite `qa/features.yaml` (still
  describes the old reserve-then-sell flow), fix 3 stale Maestro flows, verify the 5 seed fixtures
  (SF-M4b) on an actual emulator. **No Maestro flow for this redesign has ever run on a device** — do
  not read any ✅ above as device-verified. See `docs/SELL_FLOW_QA_PLAN.md` for the environment
  facts this ticket needs (two-Metro-bundler trap, preflight false-positive, concurrency ceiling).

---

## Ideas (💡 — product-owner grows this over time, post-MVP)

| Idea                             | Value                 | Notes                                                                     |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| ~~Recently viewed~~ ✅ shipped   | re-engagement         | done as **B6** — per-user `ListingView`, card shows dimmed + "Seen" badge |
| ~~Similar listings on detail~~ ✅ shipped | discovery    | done — horizontal "Similar Listings" rail under B2 (`ListingDetail.tsx`): same-category, excludes current, capped at 6, `ListingCard`s, 3-locale + RTL |
| ~~Share listing (deep link)~~ ✅ shipped | growth         | done — `Share.share` in `ListingDetail` (More menu)                       |
| ~~Draft autosave~~ ✅ shipped     | fewer lost posts      | done — new-listing form autosaves to AsyncStorage; restore/discard banner on reopen; cleared on submit |
| ~~In-chat meetup scheduler~~ ✅ shipped | core deal mechanic | propose (place+time) + **accept/decline** with confirmed/declined bubbles — `meetup_accepted`/`meetup_declined` kinds |
| ~~Offer accept/decline~~ ✅ shipped | negotiation | seller Accept/Decline on the offer card; `offer_accepted`/`offer_declined` + `responds_to` link; outcome on card |
| ~~Verified seller badge~~ ✅ shipped | trust | `users.verified` flag; `BadgeCheck` badge on seller profile (with label) + ListingDetail seller card; serializers + tests. _Verification set manually (console) until an admin tool exists._ |
| ~~Draft autosave~~ ✅ shipped | fewer lost posts | new-listing form autosaves to AsyncStorage + restore/discard banner |
| ~~Listing expiry + renew~~ ✅ shipped | fresh feed | `listings.expires_at` (30d, set on publish); browse hides expired; seller sees Expired badge + Renew action (`PUT /my/listings/:id/renew`) |
| Seller ratings / reviews → **promoted to REV1–REV3** | trust | Foundation exists (sold `Transaction` links seller+buyer). Full spec: `docs/REVIEWS_SYSTEM.md`. Keep buyer "skip" — reviews only on confirmed in-app deals. |
| Price-drop / saved-search alerts | retention             | **needs push (post-MVP)** — N801 lays the token groundwork                |
| Listing boost / bump             | (future monetization) | **needs backend**                                                         |
| Conversation read receipts (visual) | trust in chat      | Show double-tick (sent/read) on outgoing messages using existing `read_at` field — no backend change needed, purely UI polish in MessageBubble |
| Seller "away" mode              | trust / expectation   | A seller can mark themselves as temporarily away; listings stay active but a banner shows "Seller is away until [date]" — needs a `away_until` field on User and a banner in ListingDetail |
| Recently active filter in Browse | buyer utility        | Filter listings by when seller was last active (last_sign_in_at on User) — "Posted by active sellers" chip — gives buyers confidence someone will reply |
| ~~Multi-quantity listings (Tier 1)~~ ✅ shipped | traders / clarity | 15 identical items on one listing. `listings.quantity`/`sold_units` + `transactions.quantity` (+ DB CHECKs so the DB itself cannot oversell); collapsed toggle in the form; `PriceTag perUnit` ("14,000 each") at every price site; stock pill on both detail screens; "how many did you sell?" in the buyer picker; a partial sale leaves the listing **active**. Shared rules in `src/utils/stock.ts` (mirrored 1:1 in `hatiwal-web/src/lib/stock.ts` — change one, change both). Full spec + what shipped: `docs/SPIKE_LISTING_QUANTITY.md` §13. |
| ~~Seller sales history screen~~ ✅ shipped as **SF-M5** | seller trust / records | Shipped 2026-08-27 as part of the Sell Flow Redesign — a **per-listing** Sales screen (`/(main)/listing/[id]/sales`, not cross-listing) with an editable/deletable row per sale, undo-on-toast for the common case. See `docs/SELL_FLOW_REDESIGN.md` §9/§10.3 and `SF-M5` above. A cross-listing "all my sales, every item" dashboard remains a distinct, later idea (below) if sellers ask for it now that SF-M5 has shipped. |
| **Cross-listing "My Sales" dashboard** | seller trust / records | Now that SF-M5's per-listing Sales screen has shipped, a seller with many listings still can't see ALL their sales in one place (`GET /my/transactions` already supports this with no `listing_id` filter — the read side is free). Only worth building once a seller actually has several listings with sales; watch for the request rather than building speculatively. |
| **"My Holds" — cross-listing view of what's currently reserved** | seller convenience | After the Sell Flow Redesign, "Reserved" is no longer its own tab in My Listings (folded into "Active" with a hold badge, `SF-M1`) — a seller with many active listings has no single place to see everything currently on hold. Not asked for in the redesign brief; noted here as a plausible follow-up if the hold badge alone proves hard to scan across a large shop. |
| **Hold-gone-stale nudge in chat** | trust / fewer dead holds | Held units are deliberately **advisory, not a real per-unit hold with expiry** (`docs/SPIKE_LISTING_QUANTITY.md` §5.2 decision B, reaffirmed by the Sell Flow Redesign). That means a hold placed for a buyer who ghosts sits invisibly forever with no signal to the seller that it's worth releasing. A cheap, no-schema-change version: if a hold's conversation has had no new message in N days, surface a dismissible "Still holding this for {name}? [Release hold] [Keep holding]" prompt the next time the seller opens that thread or listing — reuses the existing `release hold` action, adds no new lifecycle state, and directly protects the "reserved is advisory" bet the redesign made. |
| **Share a sale as a plain-text receipt** | trust, no payment system | With no online payment, the Sales-ledger row (`SF-M5`) is the closest thing either side has to a receipt. A "Share" action on a sale row (native `Share.share`, already used for listing deep-links) that formats item, quantity, unit price, total and date as one message — pasteable into the same chat thread — gives both buyer and seller a durable, referenceable record of what was agreed, at zero backend cost. |
| **Browse filter: "sellers with bulk stock"** | discovery for traders/buyers | Now that multi-unit listings are common enough to have earned their own redesign pass, a Browse chip filtering to `multi_unit: true` listings would surface traders/bulk sellers for a buyer specifically looking to buy several of something — the exact "15 bags" trader case `docs/SPIKE_LISTING_QUANTITY.md` was written around, but as a discovery feature rather than a display one. Needs a `GET /listings?multi_unit=true` param (cheap) and one chip in the existing category-chip row. |

**Never schedule (MVP boundaries):** online payment · delivery/shipping · web app · admin web · push delivery · voice/video.

---

## How this board is maintained

- The **product-owner** agent owns this file: it reconciles status with the real code each run, grooms the next page(s) with full detail, assigns owners, and adds 1–3 new `💡 Idea` rows over time.
- **feature-builder** picks a `⬜`/`🟡` page, sets it `🟡` + owner, builds it, then sets it ready for design.
- **marketplace-designer** polishes, then product-owner flips it `✅`.

### 2026-09-02 — owner-reported, built and shipped same day

Raised directly by the owner while testing TestFlight 1.0.4, in the order they
were reported. All committed; the ones marked *(build 15)* landed after build 14
was cut and are not on his phone yet.

| # | What | Where | State |
|---|---|---|---|
| 1 | Newest chat message hidden behind the composer + quick-reply bar | mobile | **fixed & device-measured** (build 14). List viewport now ends at the bar (437→2001) instead of running behind it; the newest message clears it by 144px. Three earlier timing fixes all failed on measurement — the working fix was structural. |
| 2 | Language change reloaded 2-3× and reverted | mobile | **fixed, owner-confirmed** (build 14). setLanguage did not await the backend PATCH before restarting, so bootstrap read the stale value back and overwrote the choice. |
| 3 | No gap between icon and text in ps/fa | mobile | **fixed** (build 14 + 15). 8 sites: `marginEnd`/`marginLeft` on rows that are manually reversed or natively flipped. An audit now reports ZERO physical horizontal margins in app code. |
| 4 | "Jump to latest" for a scrolled-up thread | mobile | **shipped** (build 14). |
| 5 | "All" button on the quantity stepper (200 units = 1 tap) | mobile | **shipped** (build 14), in the shared QuantityStepper so mark-sold / buyer picker / sales-row editor all get it. |
| 6 | Edit Profile: remove the city input and province picker; the map pin is the only source | mobile | **shipped** *(build 15)*. His screenshot had City reading "Qarabagh, Kabul Province" beside a province of "پروان" — two editable sources for one fact. |
| 7 | WhatsApp option beside "Call seller" | mobile | **shipped** *(build 15)*. `https://wa.me/` not `whatsapp://` — the scheme form needs an iOS plist entry and fails silently without one. |
| 8 | A WhatsApp number field, and switches for showing phone / address | api + mobile + web | **shipped** *(build 15)*. Defaults ON, because both are already visible today; the new capability is saying no. Address visibility covers the USER's address only, never a listing's location. |
| 9 | QA must pass on a small screen (360dp) | rig | **in progress** — blocked on host RAM (the rig requires 4GB free; another project's dev services hold ~4.6GB). A memory-aware chain is queued and starts by itself. |

Rig defects found and fixed along the way, all of which had been producing false
bug reports: `qa.sh` exit codes now mean the flows' verdict (0/1/2/3, with
"unmeasured" distinct from "failed"); Expo's dev-menu FAB crashes on a window
resize and is now classified as a rig failure rather than an app assertion; the
debug APK carries no JS (it comes from Metro), so an APK's date says nothing
about what is running.

## KB-1 — Lift the three `<Textarea>` sheets above the Android keyboard  ·  board #310  ·  To Do

**Status:** not started · **Found:** 2026-09-03 QA session · **Owner:** unassigned

ReportSheet, FirstMessageSheet and ReviewPromptSheet draw their submit button
UNDER the soft keyboard on Android. Proven on MeetupSheet and fixed there
(`d46c896`): each sheet's `KeyboardAvoidingView` is content-sized, because a
`flex: 1` backdrop sits above it, so `behavior="height"` has nothing to shrink —
and under the edge-to-edge Expo SDK 54 enforces, the IME is an inset drawn OVER a
full-height window, so nothing moves on its own.

**Scope is exactly these three.** Seven sheets share the broken layout; the four
with no `<Textarea>` are cleared by passing flows that type into them and then tap
their own submit (OfferSheet, BuyerPickerSheet, SaleRowEditSheet, FilterSheet).
Those four must NOT be touched — a lift they do not need is a regression risk for
nothing.

**Why `<Textarea>` is the test:** it is tall, so it pushes the submit past the
IME's top edge where a short single-line `Input` leaves it above; and it cannot be
dismissed with `pressKey: Enter`, because Enter inserts a newline there. That is
why `report_listing.yaml:60` reaches for `hideKeyboard` — a Back press — instead.
A flow is currently paying for this defect.

**Fix:** the house pattern already applied to the chat composer, MeetupSheet and
EditProfile's sticky Save — `useKeyboardHeight()` + `keyboardBarLift()` +
`keyboardSafeBottom()` from `src/hooks/useKeyboardVisible.ts`. Leave iOS's
`behavior="padding"` alone; no Mac here to verify a change to it. Add testIDs to
FirstMessageSheet while there — it has none, which is why nothing covers it.

## WA-W1 — hatiwal-web has no WhatsApp contact button on listing detail  ·  board #311  ·  Backlog

**Status:** not started · **Found:** 2026-09-03 QA session · **Owner:** unassigned

Mobile offers Call AND WhatsApp on a listing. Web has the phone reveal with a
`tel:` link and no WhatsApp option at all — no button, no util, no copy.

A parity gap, not a bug: the owner asked for the button on mobile and for the
FIELD on web edit, which shipped. Recorded rather than built unasked.

Needs ~40 lines plus copy: a port of `src/utils/whatsapp.ts` (the +93 / 0093 /
070 / 70 normalisation is the part that actually breaks), `listing.detail.
whatsappSeller` in en/ps/fa taken verbatim from mobile, a `wa.me` anchor beside
the `tel:` one preferring `seller.whatsappNumber` over `seller.phone`, and a
Playwright test. No backend work — the API already sends `whatsapp_number` on the
listing `:detailed` view, on the same visibility switch as the phone.

**Watch out:** mobile shipped this half-wired — the field, its "same as my phone"
shortcut and its visibility switch all worked while nothing READ
`seller.whatsappNumber`, so every `wa.me` link used the phone instead (fixed in
`2dfb5d3`). Wire the read, not just the write.

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
> _Last reconciled: 2026-06-17 by product-owner. Board was empty (all 42 prior cards in Done). Reconciled all screen statuses against real code — every A/B/C/D/E/F/G/P/Q/R feature is confirmed built. Added 12 new cards (IDs 156-167) covering: Q3 Platform guards, P2-P4 polish, P5 reduce-motion gap, Q5 device testing, T701 CI pipeline, and new features N801-N805 (push token groundwork, seller analytics, conversation search, price history badge, seller response rate). BACKLOG statuses updated to match board reality. R-series (R0-R6) and P-series (P1-P5) and Q3/Q5 remain Not started per actual code._

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
| C2     | My Listings + lifecycle (publish/unpublish/reserve/activate/sold + clear text actions) | ✅ Done | — | P0 | `/(main)/(tabs)/my-listings` |
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

### C2 — My Listings + lifecycle 🟡 (migrate)

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Route:** `/(main)/(tabs)/my-listings`
- **Endpoints:** `GET /my/listings?status` (`:seller_list`: views_count, conversations_count, timestamps); `DELETE /my/listings/:id`; `PUT .../publish|reserve|sold` · **File:** `src/screens/seller/MyListings.tsx` (exists, raw RN + `Alert` — replace; **uses `Alert` = rule violation**)
- **Options & detail:**
  - `UniversalList` of `ListingCard` (seller variant) with **views** + **conversation count**.
  - **Status tabs/filter:** All · Draft · Active · Reserved · Sold.
  - **Per-card next-action button** (the one obvious action by state): Draft→**Publish** · Active→**Reserve** · Reserved→**Mark sold** · any→Edit/Delete (overflow).
  - **Delete** via `confirmAlert` (destructive) + toast. **Replace the raw `Alert.alert`.**
  - FAB / header **"+ Post"** → C1.
  - **States:** skeleton · empty "You haven't posted anything yet" + **Post a listing**.
  - `useFocusEffect` refetch (so a new/published listing shows immediately).
- **Acceptance:** every lifecycle transition works with confirmation + toast; status filter works; no raw `Alert`.

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

**Never schedule (MVP boundaries):** online payment · delivery/shipping · web app · admin web · push delivery · voice/video.

---

## How this board is maintained

- The **product-owner** agent owns this file: it reconciles status with the real code each run, grooms the next page(s) with full detail, assigns owners, and adds 1–3 new `💡 Idea` rows over time.
- **feature-builder** picks a `⬜`/`🟡` page, sets it `🟡` + owner, builds it, then sets it ready for design.
- **marketplace-designer** polishes, then product-owner flips it `✅`.

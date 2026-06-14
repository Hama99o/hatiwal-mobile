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
> _Last reconciled: 2026-06-14 by product-owner. Recently shipped: offer accept/decline, verified seller badge, draft autosave, listing expiry+renew, UserIdentity refactor. Added: Animation & UI/UX Polish section (P1, post-MVP, unassigned). Added: Q — Mobile Compatibility Audit & Fixes (CRITICAL pre-deployment). Added: R — Concurrent Development Workflow & Agent Coordination System (CRITICAL infrastructure). Statuses reflect real code._

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
| D1     | Conversations list (+ friendly previews, sold dimming)                                                                 | ✅ Done                                  | —                | P1       | `/(main)/(tabs)/chat`               |
| D2     | Conversation thread                                                                                                    | ✅ Done                                  | —                | P1       | `/(main)/conversation/[id]`         |
| **D3** | **Chat deal actions** — meetup propose + accept/decline, **offer accept/decline** (`responds_to` link, outcome on card) | ✅ Done | — | P1 | within D2 |
| E1     | Saved / Favorites                                                                                                      | ✅ Done                                  | —                | P1       | `/(main)/(tabs)/saved`              |
| F1     | Profile (mine)                                                                                                         | 🟡 In progress                           | _unassigned_     | P1       | `/(main)/(tabs)/profile`            |
| F2     | Edit profile (inline + **map location**)                                                                               | ✅ Done                                  | claude           | P2       | within F1                           |
| F3     | Public seller profile                                                                                                  | ✅ Done                                  | —                | P2       | `/(main)/seller/[userId]`           |
| G1     | Report listing / user                                                                                                  | ✅ Done                                  | —                | P2       | `ReportSheet`                       |
| **P1** | **Animation System** — screen transitions, button feedback, list entrances, haptics                                    | ⬜ Not started                           | _unassigned_     | P1 (polish) | `src/lib/animation/`, layouts   |
| **P2** | **Design System Refinements** — logo, color consistency, typography scale, dark-mode edge cases, RTL perfection        | ⬜ Not started                           | _unassigned_     | P1 (polish) | cross-cutting                   |
| **P3** | **Screen-by-Screen Polish** — Browse cards, Listing detail gallery, Chat bubbles, Profile toggle, Seller grid         | ⬜ Not started                           | _unassigned_     | P1 (polish) | all screens                     |
| **P4** | **Micro-interactions** — button press states, input focus, success/error toasts, empty-state illustrations             | ⬜ Not started                           | _unassigned_     | P1 (polish) | cross-cutting                   |
| **P5** | **Performance & Accessibility** — GPU-accelerated animations, bundle size, reduce-motion support                       | ⬜ Not started                           | _unassigned_     | P2 (polish) | cross-cutting                   |
| **Q0** | **Pre-Deployment Mobile Audit** — parent ticket; systematically identify web-specific code that breaks on iOS/Android  | ⬜ Not started                           | _unassigned_     | CRITICAL     | cross-cutting                   |
| **Q1** | **Web APIs & Browser Compatibility** — localStorage, window.*, document.*, web-only patterns                          | ⬜ Not started                           | _unassigned_     | CRITICAL     | `src/utils/`, `src/i18n/`       |
| **Q2** | **Web-Only Dependencies** — react-dom, react-native-web, tailwindcss in package.json; CSS-in-JS audit                 | ⬜ Not started                           | _unassigned_     | CRITICAL     | `package.json`                  |
| **Q3** | **Platform-Specific Code (iOS vs Android)** — Platform.select guards, permissions, native module fallbacks            | ⬜ Not started                           | _unassigned_     | CRITICAL     | `src/` cross-cutting            |
| **Q4** | **Build & Configuration** — web output in app.json, .web.tsx files, entry point isolation, Expo config for mobile     | ⬜ Not started                           | _unassigned_     | CRITICAL     | `app.json`, `*.web.tsx`         |
| **Q5** | **Testing on Real Devices** — full flow on iOS and Android, camera/location/storage/permissions, performance          | ⬜ Not started                           | _unassigned_     | CRITICAL     | all screens                     |
| **R0** | **Agent Coordination & Concurrency Management** — parent ticket; safe multi-agent parallel work with zero conflicts   | ⬜ Not started                           | _unassigned_     | CRITICAL     | process/docs                    |
| **R1** | **Work Isolation & Locking System** — WORK_LOCKS.md; per-agent file locks; start/complete protocol                   | ⬜ Not started                           | _unassigned_     | CRITICAL     | `docs/WORK_LOCKS.md`            |
| **R2** | **Task Dependency Tracking** — TASK_DEPENDENCIES.md; dependency graph; safe parallel paths; blockers                 | ⬜ Not started                           | _unassigned_     | CRITICAL     | `docs/TASK_DEPENDENCIES.md`     |
| **R3** | **Merge Conflict Prevention** — branch naming convention; per-feature commits; conflict resolution playbook           | ⬜ Not started                           | _unassigned_     | CRITICAL     | git workflow                    |
| **R4** | **Real-Time Status Tracking** — STATUS_BOARD.md; updated per session; shows active agents, locked files, ETAs        | ⬜ Not started                           | _unassigned_     | CRITICAL     | `docs/STATUS_BOARD.md`          |
| **R5** | **Session Isolation (Worktree Strategy)** — git worktrees per agent; filesystem-level isolation; cleanup/recovery    | ⬜ Not started                           | _unassigned_     | CRITICAL     | git worktrees                   |
| **R6** | **Communication & Handoff Protocol** — before/during/completion rules; blocker escalation; agent-to-agent handoffs   | ⬜ Not started                           | _unassigned_     | CRITICAL     | process/docs                    |
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

### A3 — App bootstrap / splash redirect 🟡

- **File:** `app/index.tsx` · **Endpoint:** `GET /auth/validate_token`
- **Detail / options:** on launch, validate stored token → route to `(main)` if valid, else `(auth)/login`. Splash while deciding. **TODO:** wire `validate_token`; currently redirects on local auth state only.
- **Acceptance:** cold start lands on the right screen without a flash of the wrong one.

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

### D2 — Conversation thread ⬜

- **Owner:** _unassigned_ → `feature-builder → marketplace-designer` · **Route:** `/(main)/conversation/[id]`
- **Endpoints:** `GET /conversations/:id` (`:detailed`); `GET /conversations/:id/messages` (paginated, asc); `POST /conversations/:id/messages` (`body`,`kind`; only if `open`); **start:** `POST /listings/:listing_id/conversations` (`message`) · **File:** `src/screens/chat/Conversation.tsx`
- **Options & detail:**
  - **`react-native-gifted-chat`** themed to tokens, RTL bubbles, read receipts (`read_at`).
  - **Pinned listing header** card (thumbnail + `PriceTag` + `StatusBadge`) so both sides remember the item.
  - **Meetup proposal** action (`kind: meetup_proposal`) via `@gorhom/bottom-sheet` (place/time) → special bubble.
  - Start flow: first-message sheet from B2; 422 (inactive/self/duplicate) → friendly toast → open existing if duplicate.
  - Closed conversation → input disabled with notice.
  - **States:** loading messages skeleton · empty thread (just the listing header) · send failure toast (optimistic).
- **Acceptance:** can start from a listing and exchange messages; RTL bubbles; pinned listing visible.

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

### Q0 — Pre-Deployment Mobile Audit (Parent Ticket) ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Status:** Not started
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
- [ ] Q1 through Q5 are each marked Done.
- [ ] `npx expo run:ios` succeeds with no runtime errors on a clean simulator.
- [ ] `npx expo run:android` succeeds with no runtime errors on a clean emulator or device.
- [ ] No `Platform.OS === "web"` branch remains that touches `localStorage`, `window`, or `document`.

---

### Q1 — Web APIs & Browser Compatibility ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Status:** Not started
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
- [ ] `src/utils/secure-storage.ts` has no `localStorage` reference. Only `expo-secure-store` is used.
- [ ] `src/utils/alert.ts` has no `window.confirm`. The function calls `Alert.alert` unconditionally.
- [ ] `src/i18n/index.ts` has no `document.documentElement` reference. RTL is set via `I18nManager` only.
- [ ] `MapCanvas.web.tsx` is confirmed to be excluded from native builds (Expo platform splitting) and documented as such.
- [ ] No other `localStorage`, `window.*`, or `document.*` calls exist in `src/` outside of confirmed `.web.ts` / `.web.tsx` files.
- [ ] `fetch()` calls (via axios) have no browser-specific options (check `src/api/http.ts` — headers and interceptors should be RN-safe).

---

### Q2 — Web-Only Dependencies ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Status:** Not started
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
- [ ] No `src/` file imports from `react-dom` or `react-native-web`.
- [ ] `tailwindcss` is documented as a build-time NativeWind peer dep (not a runtime concern).
- [ ] `expo-web-browser` is either confirmed used on native or removed.
- [ ] No unapproved CSS-in-JS library is present.
- [ ] `package.json` has a comment or inline note (in a companion doc) explaining why `react-dom` and `react-native-web` are present, if kept.

---

### Q3 — Platform-Specific Code (iOS vs Android) ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Status:** Not started
- **Scope:** Verify that any `Platform.select()` or `Platform.OS` branches are correct and complete for both iOS and Android. The web branch is handled in Q1; this ticket is about iOS-vs-Android differences.

- **Files with Platform usage (known from audit):**
  - `src/screens/chat/Conversation.tsx`
  - `src/screens/buyer/ListingDetail.tsx`
  - `src/screens/chat/conversation/MessageBubble.tsx`
  - `src/screens/chat/conversation/MeetupSheet.tsx`
  - `src/api/auth.ts`
  - `src/screens/seller/listing-form/PhotosSection.tsx`
  - `src/screens/seller/ListingForm.tsx`

- **Checklist per file:**
  - Does the `Platform.OS === "ios"` branch have a matching `else` for Android, or is Android silently missing?
  - Does the `Platform.OS === "android"` branch have a matching `else` for iOS?
  - Any `Platform.select({ ios: ..., android: ..., default: ... })` — is `default` safe?

- **Permissions handling (known iOS/Android differences):**
  - `expo-image-picker`: `requestMediaLibraryPermissionsAsync()` behaves differently on iOS 14+ (limited photo access) vs Android. Confirm the `PhotosSection.tsx` handles `granted` and `limited` statuses correctly on both platforms.
  - `expo-location`: `requestForegroundPermissionsAsync()` must handle denial gracefully on both platforms. Confirm the map/location picker shows a clear "permission denied" state rather than crashing or hanging.
  - Camera permission: same pattern — confirm graceful denial handling.

- **Native module calls:**
  - `expo-secure-store`: confirmed to work on iOS and Android. Verify the app does not call `SecureStore` methods synchronously (they are all async).
  - `expo-haptics` (if installed for P1): gated behind a try/catch or availability check — some Android devices may not support all haptic feedback types.

**Acceptance criteria:**
- [ ] Every `Platform.OS === "ios"` branch has been reviewed; Android fallback is intentional (not an accidental omission).
- [ ] Every `Platform.OS === "android"` branch has been reviewed; iOS fallback is intentional.
- [ ] Image picker handles `limited` permission status on iOS 14+.
- [ ] Location permission denial shows a graceful UI state on both platforms.
- [ ] Camera permission denial shows a graceful UI state on both platforms.
- [ ] `expo-secure-store` is called only asynchronously.
- [ ] All `Platform.OS === "web"` branches removed (covered in Q1 — cross-reference).

---

### Q4 — Build & Configuration ⬜

- **Owner:** _unassigned_ -> `feature-builder`
- **Status:** Not started
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
- [ ] `expo.web` block removed from `app.json` (or documented as intentionally inert).
- [ ] No `+html.tsx` or `_document.tsx` files exist in `app/`.
- [ ] `MapCanvas.tsx` (non-web) exists and correctly handles iOS/Android map rendering.
- [ ] All native modules confirmed compatible with New Architecture (`newArchEnabled: true`).
- [ ] No webpack, vite, or rollup config files exist in the project root.
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
| Seller ratings / reviews         | trust                 | **needs backend** — post-MVP per CLAUDE.md                                |
| Price-drop / saved-search alerts | retention             | **needs push (post-MVP)**                                                 |
| Listing boost / bump             | (future monetization) | **needs backend**                                                         |

**Never schedule (MVP boundaries):** online payment · delivery/shipping · web app · admin web · push delivery · voice/video.

---

## How this board is maintained

- The **product-owner** agent owns this file: it reconciles status with the real code each run, grooms the next page(s) with full detail, assigns owners, and adds 1–3 new `💡 Idea` rows over time.
- **feature-builder** picks a `⬜`/`🟡` page, sets it `🟡` + owner, builds it, then sets it ready for design.
- **marketplace-designer** polishes, then product-owner flips it `✅`.

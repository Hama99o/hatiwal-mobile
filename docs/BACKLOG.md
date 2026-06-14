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
> _Last reconciled: 2026-06-14 by claude (autonomous build loop). Recently shipped: offer accept/decline, verified seller badge, draft autosave, listing expiry+renew, **UserIdentity refactor** (one avatar+name+verified component everywhere; fixed empty-name bug on public profile; rule documented in CLAUDE.md + mobile/design prompts). NEXT: listing condition (new/used) field. Then drop unused ProvincePickerSheet/afghan_provinces. Reviews deferred per user. Statuses reflect real code._

---

## Status Overview

| ID     | Page / Feature                                                                                                         | Status                                   | Owner (taken by) | Priority | Route                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------- | -------- | ----------------------------------- |
| A1     | Login                                                                                                                  | ✅ Done                                  | —                | P0       | `/(auth)/login`                     |
| A2     | Register                                                                                                               | ✅ Done                                  | —                | P0       | `/(auth)/register`                  |
| A3     | App bootstrap / splash redirect                                                                                        | ✅ Done (validates token in Splash)      | —                | P1       | `app/index.tsx`                     |
| **S0** | **Shared components** (`ListingCard`, `PriceTag`, `StatusBadge`, `EmptyState`, skeletons)                              | ✅ Done                                  | —                | P0       | `src/components/common/`            |
| B1     | Browse feed                                                                                                            | ✅ Done (design system + filters)        | —                | P0       | `/(main)/(tabs)/browse`             |
| B2     | Listing detail                                                                                                         | ✅ Done                                  | —                | P0       | `/(main)/listing/[id]`              |
| B3     | Search & category filter                                                                                               | ✅ Done                                  | —                | P1       | within B1                           |
| **B4** | **Saved searches / filter history** (auto-save, dedupe, last-4 chips)                                                  | ✅ Done                                  | —                | P1       | within B1                           |
| **B5** | **Map location & distance search** (province coords + Nominatim geocoding + Haversine radius)                          | ✅ Done                                  | —                | P1       | `LocationRangePicker`               |
| **B6** | **"Seen / already viewed" indicator** (per-user `ListingView`; dim + badge on card) — _was the "Recently viewed" idea_ | ✅ Done                                  | —                | P2       | within B1/B2                        |
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

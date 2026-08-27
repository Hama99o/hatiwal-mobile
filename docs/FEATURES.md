# Hatiwal — Feature Catalog

> The complete map of **what the backend supports** → **the mobile screen that exposes it** → **the
> design treatment + third-party library chosen for it**. This is the single source of truth for what
> to build and how it should look.
>
> Read with [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (libraries + visual language) and
> [prompts/mobile.prompt.md](prompts/mobile.prompt.md) (engineering rules).
>
> **Status legend:** ✅ done · 🟡 partial · ⬜ to build.
> **API base:** `http://localhost:3007/api/v1` (dev). Auth: `devise_token_auth` (header tokens:
> `access-token` / `client` / `uid`). JSON via Blueprinter; lists paginated with Pagy
> (`meta.pagination`). Mobile API rules: `convertKeysToSnake` out, `convertKeysToCamel` in.

---

## 0. Domain at a glance

| Model | Role in the app |
|---|---|
| **User** | One account = both buyer and seller. `status`: active/suspended/banned. `preferred_language`: en/ps/fa. |
| **Listing** | An item for sale. `status`: `draft`/`active`/`reserved`/`sold` (4 DB values, unchanged). **Sell Flow Redesign (2026-08-27):** presented to the seller as **3 states — Draft, Live, Sold** — `active` and `reserved` both mean "Live"; a hold shows as a badge, not a 4th state or its own tab. Selling is the one-tap primary from any live listing and never requires reserving first; a reserved listing stays fully browsable/searchable/message-able (only `sold` is a dead end). See `docs/SELL_FLOW_REDESIGN.md`. Photos via Active Storage. `price`+`currency` (AFN/USD), `category`, `location` (+lat/long), `views_count`, `quantity`/`available_units`/`held_units` (multi-unit listings). |
| **Category** | 12 marketplace categories, trilingual names (`name_en/ps/fa`), `icon`, `position`. |
| **Conversation** | Chat thread between a **buyer** and **seller** about one listing. `status`: open/closed. `last_message_at`, `unread_count`. |
| **Message** | One message in a conversation. `kind`: text / meetup_proposal / system. `read_at`. |
| **SavedListing** | A buyer's bookmarked listing (favorites/shortlist). |
| **Report** | Polymorphic report against a Listing or User. `reason`: spam/inappropriate/fraud/wrong_category/prohibited_item/other. |

**Listing lifecycle (seller-driven) — Sell Flow Redesign, 2026-08-27:**
```
draft ──publish──▶  Live (active ⇄ reserved)  ──mark sold, always available, no hold required──▶ sold
                     a hold is a badge on Live, placed/released from the CHAT thread
                     ▲                                                │
                     └──────────────────── release hold ──────────────┘
```
Both `active` and `reserved` are "Live": browsable, searchable, message-able. `reserved` does **not**
mean off-market — check `held_units` and the `sale` block, not `status`, to know whether a hold
exists (a multi-unit batch holds units while staying `status: active`). Mistakes after marking sold
are fixed with an Undo toast or an editable Sales-ledger row (`PATCH`/`DELETE /my/transactions/:id`),
not a second sold state. Full spec: `docs/SELL_FLOW_REDESIGN.md`. **`hatiwal-web` has not been ported
to this model yet** (SF-W1, board card 285) — it still requires reserving before a single-item sale
and treats `reserved` as leaving search.

---

## 1. Authentication & Onboarding

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| Sign in | `POST /auth/sign_in` (flat `email`,`password`) | `screens/shared/Login` | Centered card, `react-hook-form`+`zod`, RNR `Input`/`Button`, **language switcher** (en default), inline error. | ✅ |
| Register | `POST /auth` (`email`,`password`,`password_confirmation`,`firstname`,`lastname`) | `screens/shared/Register` | Same form system; persists auth headers on success → lands in browse. | ✅ |
| Sign out | `DELETE /auth/sign_out` | Profile action | `confirmAlert`; clears tokens; resilient if the call fails. | ✅ |
| Token validate / bootstrap | `GET /auth/validate_token` | App root redirect (`app/index.tsx`) | Splash → route to browse (authed) or login. | 🟡 |

**Notes.** Default language is **English**; the chooser (English / پښتو / دری) persists to AsyncStorage and sets RTL. Tokens stored via `expo-secure-store` (native-only; no web fallback).

---

## 2. Buyer — Browse, Search & Discover

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| Browse active listings | `GET /listings` (`search`, `category_id`, `page`) → `listings[]` + `meta.pagination` (`:list` view) | `screens/buyer/Browse` | **Photo-first feed** via `UniversalList` → `@shopify/flash-list`; `ListingCard` (expo-image thumbnail, `PriceTag`, city, `StatusBadge`, save-heart). | ⬜ |
| Search | `GET /listings?search=` | Browse search bar | Debounced RNR `Input`; empty/no-results `EmptyState` + reset. | ⬜ |
| Filter by category | `GET /listings?category_id=` | Category chips / filter | Horizontal chip row (RNR `Badge`) + `CategoryPicker` bottom sheet (`@gorhom/bottom-sheet`). | ⬜ |
| Listing detail | `GET /listings/:id` (`:detailed`: images[], description, location, lat/long, seller{name,city,phone}, category) — **increments `views_count`** | `screens/shared/ListingDetail` | Full-bleed **`ListingGallery`** (`reanimated-carousel`+expo-image+dots) → `PriceTag` → title → category/condition badges → description → location (map snippet via `expo-location`/`react-native-maps`) → `SellerCard` → **sticky "Message seller"** primary button. Quiet Report affordance. | ⬜ |

**Card anatomy (the most-reused component):** large photo (4:3) · price (bold) · title (1–2 lines) · seller city + "posted X ago" (`formatDate`) · status badge · save-heart. Split into `screens/shared/listing-detail/` tab files if it grows > 300 lines.

---

## 3. Seller — Listing Management & Lifecycle

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| My listings | `GET /my/listings` (`status` filter) → `:seller_list` (views_count, conversations_count, timestamps) | `screens/seller/MyListings` | `UniversalList` + status **tabs/filter**; each `ListingCard` shows views + conversation count + the **next lifecycle action** button. Empty → "Post your first listing". | ⬜ |
| Listing detail (owner) | `GET /my/listings/:id` | `screens/seller/MyListingDetail` | Owner view with manage actions + analytics (views, conversations). | ⬜ |
| Create listing | `POST /my/listings` (`listing:{title,description,price,currency,category_id,location,lat,long,images[]}`) → starts as **draft** | `screens/seller/ListingForm` | Sectioned `react-hook-form`+`zod`: **photos first** (`expo-image-picker` multi + reorder + cover) → title → `PriceTag` input + currency → `CategoryPicker` sheet → description → location (`expo-location`). Sticky submit; Save draft vs Publish. Upload via `FormData`. | ⬜ |
| Edit listing (draft) | `PUT /my/listings/:id` | reuse `ListingForm` | Same form, prefilled. Edit allowed while draft. | ⬜ |
| Delete listing | `DELETE /my/listings/:id` | My listings row action | `confirmAlert` (destructive) + `sonner-native` toast. | ⬜ |
| Publish (draft → active) | `PUT /my/listings/:id/publish` | Lifecycle action | Primary button on a draft; toast on success; sets `published_at`. | ✅ |
| Mark sold (active or reserved → sold, one-tap, reserve never required) | `PUT /my/listings/:id/sold` (`buyer_id`/`clear_buyer`/`quantity`) | Lifecycle action (listing surfaces + inline in chat header) | Always the loudest primary action on any live listing; `BuyerPickerSheet` proposes the buyer (from the listing's own conversations, or "not on Hatiwal"); undo toast on success; dims card when sold-out. | ✅ |
| Place / release a hold (optional; active ⇄ reserved) | `PUT /my/listings/:id/reserve` / `PUT /my/listings/:id/activate` | **Chat thread** composer "+" menu (`ComposerActionsSheet`) — **not** a listing action anymore | "Place a hold for {name}" scoped to that conversation's buyer; "Release hold" when this thread's buyer holds it. Shows as a badge/ribbon on the listing, never removes it from search or chat. | ✅ |
| Undo a sale / view & edit sales ledger | `PATCH`/`DELETE /my/transactions/:id`, `GET /my/transactions?listing_id=` | New `Sales` screen (`/(main)/listing/[id]/sales`) + "Undo" on the mark-sold toast | Every sold row is listed, editable (quantity/buyer/price) and voidable (restores stock); a sale with a review attached can't be voided/reassigned. | ✅ |

**Lifecycle UX rule:** the card/detail always answers "what state is this, and what's my next action?" via `StatusBadge` + a single obvious primary button — **Publish** on a draft, **Mark sold** on any live listing (reserved included). Reserve/release-hold live in chat, not on the listing's own action list. See `docs/SELL_FLOW_REDESIGN.md`.

---

## 4. Categories

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| List categories | `GET /categories` → all active, ordered (trilingual names + icon) | Browse filter, create form | Trilingual via `category.name_for(locale)` (use `name_en/ps/fa` by current lang). Chip row + `CategoryPicker` sheet. Lucide icon per category. | ⬜ |

---

## 5. Chat — Conversations & Messages

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| Start conversation | `POST /listings/:listing_id/conversations` (`message`) — via `Conversations::StartService` | From Listing detail "Message seller" | Pre-filled first message sheet; 422 if listing inactive / self / duplicate → friendly toast. | ⬜ |
| Conversations list | `GET /conversations` → `:list` (listing{title,thumbnail,status}, other_participant{name,city}, last_message_body, unread_count) | `screens/chat/Conversations` | `UniversalList`; row = participant avatar + listing thumb + last message + **unread badge** + time (`formatDate`). Ordered by `last_message_at`. | ⬜ |
| Conversation thread | `GET /conversations/:id` (`:detailed`: listing, buyer, seller) | `screens/chat/Conversation` | **`react-native-gifted-chat`** themed to tokens, RTL bubbles; **listing pinned** as header card (`SellerCard`/`PriceTag`). | ⬜ |
| Messages list | `GET /conversations/:id/messages` (paginated, asc) | within thread | Loaded into gifted-chat; `read_at` → read receipts. | ⬜ |
| Send message | `POST /conversations/:id/messages` (`body`, `kind`) — only if `conversation.open?` | thread input bar | gifted-chat input; optimistic send + `sonner-native` on failure. | ⬜ |
| Meetup proposal | `kind: meetup_proposal` message | thread action | Bottom sheet (`@gorhom/bottom-sheet`) to propose place/time → special message bubble. (No payment/delivery — meetups are the core deal mechanic.) | ⬜ |

**Participant guard:** only buyer/seller can read/send (Pundit). `unread_count` drives the chat tab badge.

---

## 6. Saved / Favorites

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| Save listing | `POST /listings/:id/save` | Save-heart on card/detail | Animated heart pop; optimistic; toast. | ⬜ |
| Unsave | `DELETE /listings/:id/unsave` | Save-heart toggle | Same control toggles off. | ⬜ |
| Saved list | `GET /my/saved_listings` → `:list` (no pagination) | `screens/buyer/Saved` | `UniversalList` of `ListingCard`; empty → "No saved items yet" + Browse. A buyer's shortlist. | ⬜ |

---

## 7. Profile & Account

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| My profile | `GET /users/me` (`:me`: phone, bio, province, lat/long, status, preferred_language) | `screens/shared/Profile` | Avatar header, info cards, **buyer/seller mode toggle**, language switcher, **Sign out** (`confirmAlert`). | 🟡 |
| Edit profile | `PUT /users/me` (`user:{firstname,lastname,phone,bio,city,province,lat,long,preferred_language}`) | `screens/shared/EditProfile` | `react-hook-form`+`zod`; sectioned (identity, contact, location, language). | ⬜ |
| Public seller profile | `GET /users/:id` (`:public`: full_name, bio, province, listings_count) | `screens/shared/UserProfile` | Trust dossier: avatar, name, city, member-since (`formatDate`), active-listings count + their active listings grid. Report affordance. | ⬜ |
| Buyer/Seller mode | local (`useModeStore`) | Tab/sidebar switch | Toggles tab set + accent context; one account, two modes. | 🟡 |

---

## 8. Reporting & Safety

| Capability | Endpoint | Screen | Design / Library | Status |
|---|---|---|---|---|
| Report listing/user | `POST /reports` (`report:{reportable_type:"Listing"|"User", reportable_id, reason, description}`) | `ReportSheet` from detail/profile | `@gorhom/bottom-sheet` + RNR `RadioGroup` (6 reasons) + optional `Textarea`. Blocks self-report & duplicates (422 → toast). | ⬜ |

**Reasons (enum):** spam · inappropriate · fraud · wrong_category · prohibited_item · other.

---

## 9. Cross-cutting (applies to every screen)

| Concern | Rule |
|---|---|
| **Language** | Default **en**; also ps + fa (RTL). All copy via `t()` in all 3 locales. |
| **Localization** | Prices/dates/numbers via `useLocalization()` (`formatCurrency` → AFN). |
| **Theming** | Token classes only; light + dark; never hex. |
| **RTL** | Mirror with `isRtl`; verify Pashto. |
| **Images** | `expo-image` everywhere; never raw remote `<Image>`. |
| **Lists** | `UniversalList` (+ `FlashList` for large feeds). |
| **Forms** | `react-hook-form` + `zod`. |
| **Destructive** | `confirmAlert` (never `Alert.alert`). |
| **Feedback** | `sonner-native` toasts. |
| **Freshness** | `useFocusEffect` refetch on every server-data screen. |
| **API** | `http` instance only; snake out / camel in; typed, no `any`. |

---

## 10. Build Order (suggested)

1. **Browse feed + `ListingCard`** (the shop window — establishes the card, price, status, image patterns). ⬜
2. **Listing detail + gallery** (trust + Message seller). ⬜
3. **Create/Edit listing form** (image picker, category sheet). ⬜
4. **My Listings + lifecycle actions** (publish / mark sold one-tap / hold from chat / sales ledger). ✅
5. **Chat** (conversations list + gifted-chat thread). ⬜
6. **Saved** (save-heart + list). ⬜
7. **Profile / Edit / Public profile**. 🟡
8. **Report flow**. ⬜

Each step: build with **feature-builder**, then deep-review with **marketplace-designer**. Install any library from [DESIGN_SYSTEM.md §4](DESIGN_SYSTEM.md) with `npx expo install` before first use.

---

## 11. MVP boundaries (do NOT build)

❌ Online payment · ❌ delivery/shipping · ❌ web app · ❌ admin web dashboard · ❌ push delivery (post-MVP) · ❌ voice/video. Meetups happen **in person**; the app's job is discovery, trust, and chat.

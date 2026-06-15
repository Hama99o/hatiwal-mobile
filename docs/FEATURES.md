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
| **Listing** | An item for sale. `status`: **draft → active → reserved → sold**. Photos via Active Storage. `price`+`currency` (AFN/USD), `category`, `location` (+lat/long), `views_count`. |
| **Category** | 12 marketplace categories, trilingual names (`name_en/ps/fa`), `icon`, `position`. |
| **Conversation** | Chat thread between a **buyer** and **seller** about one listing. `status`: open/closed. `last_message_at`, `unread_count`. |
| **Message** | One message in a conversation. `kind`: text / meetup_proposal / system. `read_at`. |
| **SavedListing** | A buyer's bookmarked listing (favorites/shortlist). |
| **Report** | Polymorphic report against a Listing or User. `reason`: spam/inappropriate/fraud/wrong_category/prohibited_item/other. |

**Listing lifecycle (seller-driven):**
```
draft ──publish──▶ active ──reserve──▶ reserved ──sold──▶ sold
                     ▲                                   
                     └────── (deal falls through, future) 
```

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
| Publish (draft → active) | `PUT /my/listings/:id/publish` | Lifecycle action | Primary button on a draft; toast on success; sets `published_at`. | ⬜ |
| Reserve (active → reserved) | `PUT /my/listings/:id/reserve` | Lifecycle action | Amber state; often triggered from a conversation. | ⬜ |
| Mark sold (reserved → sold) | `PUT /my/listings/:id/sold` | Lifecycle action | Confirm; dims card; celebratory toast. | ⬜ |

**Lifecycle UX rule:** the card/detail always answers "what state is this, and what's my next action?" via `StatusBadge` + a single obvious primary button (Publish / Reserve / Mark sold).

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
4. **My Listings + lifecycle actions** (publish/reserve/sold). ⬜
5. **Chat** (conversations list + gifted-chat thread). ⬜
6. **Saved** (save-heart + list). ⬜
7. **Profile / Edit / Public profile**. 🟡
8. **Report flow**. ⬜

Each step: build with **feature-builder**, then deep-review with **marketplace-designer**. Install any library from [DESIGN_SYSTEM.md §4](DESIGN_SYSTEM.md) with `npx expo install` before first use.

---

## 11. MVP boundaries (do NOT build)

❌ Online payment · ❌ delivery/shipping · ❌ web app · ❌ admin web dashboard · ❌ push delivery (post-MVP) · ❌ voice/video. Meetups happen **in person**; the app's job is discovery, trust, and chat.

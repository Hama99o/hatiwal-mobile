# Hatiwal — Design Inspiration & Page Specs

> **Source:** Vinted (second-hand marketplace) — 25 screenshots analyzed.
> **Our adaptation:** local marketplace for Afghanistan, no shipping, no online payment,
> meetup in person. Keep the UX patterns; drop features we don't need (postage,
> buyer protection, balance/wallet, bundles, badges, promotional tools, cookie settings).
> Add: negotiation (price offer via chat), meetup arrangement, RTL layout.

---

## Navigation (Tab Bar)

Five tabs, always visible at bottom:

| Tab | Icon | Screen |
|-----|------|--------|
| Home | House | Feed (Browse) |
| Browse | Grid | Category browser |
| Sell | `+` circle (prominent) | Create listing |
| Inbox | Envelope | Messages + Notifications |
| Profile | Person | My profile / settings |

**Design rules:**
- Active tab uses primary teal/brand color, inactive uses muted gray
- Sell tab center `+` is slightly larger and visually raised — draws attention
- Badge count on Inbox tab for unread messages

---

## 1. Browse — Category Grid

**Route:** `/(main)/(tabs)/browse`

### What it does
Landing page of Browse tab. Shows all top-level categories as a 2-column illustrated card grid. Tapping a category opens the subcategory list.

### Layout
```
┌─────────────────────────────────────────┐
│  🔍 Search for items or members   [📷]  │  ← search bar + camera search
├──────────────────┬──────────────────────┤
│  Women           │  Men                 │  ← 2-col grid
│  [illustration]  │  [illustration]      │
├──────────────────┼──────────────────────┤
│  Electronics     │  Vehicles            │
│  [illustration]  │  [illustration]      │
├──────────────────┴──────────────────────┤
│  ...more categories                     │
└─────────────────────────────────────────┘
```

### Design details
- Each category card: label top-left in bold, illustrated image bottom-right (decorative, not a photo)
- Card background: slightly lighter than page background (card token)
- No border, subtle rounded corners (radius 8–10)
- 2-column equal-width grid, 12px gap
- Page background = `colors.background`, cards = `colors.card`
- Search bar at top with placeholder text, camera icon on right (future: image search)

### Hatiwal categories
Electronics, Clothing, Vehicles, Furniture & Home, Books & Media, Sporting Goods, Tools & Equipment, Kids & Toys, Other

---

## 2. Browse — Listing Feed

**Route:** `/(main)/(tabs)/` (Home tab) and filtered from browse

### What it does
The main feed. Horizontal scrollable category filter chips at top; 2-column listing grid below. Infinite scroll.

### Layout
```
┌─────────────────────────────────────────┐
│  🔍 Search for items                    │
├─────────────────────────────────────────┤
│  [All] [Electronics] [Clothing] [Cars]→ │  ← horizontal chip row, scrollable
├──────────────────┬──────────────────────┤
│  [photo]  ♥12   │  [photo]  ♥39        │
│  Title           │  Title               │
│  Condition       │  Condition           │
│  AFN 1,500       │  AFN 800             │
├──────────────────┼──────────────────────┤
│  [photo]  ♥ 5   │  [photo]             │
│  ...             │  ...                 │
└─────────────────────────────────────────┘
```

### Listing card design
- Photo fills top 75% of card (4:3 ratio)
- Heart button: top-right overlay on photo, dark semi-transparent circle background
- Heart fill = `colors.destructive` when saved
- Below photo:
  - **Price** — largest text, `colors.foreground`, bold (`PriceTag` component)
  - Title — medium weight, 2 lines max
  - Seller city + posted time — small muted text with MapPin icon
- Card background: `colors.card`, subtle border `colors.border`, radius 8
- Status badge (draft/reserved/sold) overlays top-left of photo when `showStatus=true`

### Chip row
- Pill-shaped chips, scrollable horizontal, no wrap
- Active chip: `colors.primary` background, white text
- Inactive chip: `colors.muted` background, `colors.mutedForeground` text
- Fixed height container (50px) — prevents chips hiding behind cards on scroll

---

## 3. Category — Subcategory List

**Route:** `/(main)/category/[slug]`

### What it does
After tapping a top-level category, user sees a flat list of subcategories + "All" at top.

### Layout
```
┌─────────────────────────────────────────┐
│  ← Electronics                    🔍   │
├─────────────────────────────────────────┤
│  ⠿  All                             >  │
│  📱  Phones & Tablets               >  │
│  💻  Laptops & Computers            >  │
│  🎮  Gaming                         >  │
│  📷  Cameras                        >  │
│  🔌  Accessories                    >  │
└─────────────────────────────────────────┘
```

### Design details
- Clean list rows: teal icon + label + right chevron
- "All" row at top with grid icon
- Dividers between rows (`colors.border`, hairline)
- Search icon in header to filter within category
- Tapping any row → filtered Browse feed

---

## 4. Listing Detail

**Route:** `/(main)/listing/[id]`

### What it does
Full listing view. Photo gallery, price, title, condition, description, seller info, similar items. Primary CTAs: "Make an Offer" + "Contact Seller" (our version of "Buy now").

### Layout (scrollable, sticky bottom bar)
```
┌─────────────────────────────────────────┐
│  ← back                           •••  │  ← header (share/report on •••)
├─────────────────────────────────────────┤
│                                         │
│         [full-width photo]              │  ← swipeable gallery
│                   •••  (dots)     ♥33  │  ← pagination + save heart
├─────────────────────────────────────────┤
│  Brand name · Size · Condition          │  ← muted small text
│  AFN 1,500                              │  ← PRICE — hero, large bold
│  Uploaded 24 min ago                    │  ← muted
├─────────────────────────────────────────┤
│  Description                            │
│  Great condition, barely used...        │
│  [more]                                 │
├─────────────────────────────────────────┤
│  [avatar]  SellerName  ★4.8 (120)      │
│  [Frequent Uploads]  [Quick Replies]    │  ← seller trust badges
│                          [Ask Seller]   │
├─────────────────────────────────────────┤
│  📍 Kabul · Last seen 1h ago            │
├─────────────────────────────────────────┤
│  More from this seller                  │
│  [photo]  [photo]  [photo] →            │  ← horizontal row
├─────────────────────────────────────────┤
│  Similar listings                       │
│  [2-col grid]                           │
└─────────────────────────────────────────┘

[ Make an Offer ]  [ Contact Seller → ]   ← sticky bottom bar
```

### Design details — photo gallery
- Full-width, no padding, aspect ratio 1:1 or 4:3
- Swipe horizontally between photos
- Dot pagination indicator bottom-center of photo
- Save (heart) button — top-right overlay, dark semi-transparent circle
- Back arrow top-left

### Design details — info section
- Price: 24–28sp bold, `colors.foreground`, most prominent text on page
- Brand / size / condition: 13sp muted, single line
- "Uploaded X ago" in muted small text

### Design details — seller row
- Avatar circle (48px), username bold, star rating + count
- "Ask Seller" button (outline, right-aligned) → opens chat
- Trust badges: pill chips (e.g. "Quick Replies", "Active Seller") — teal outlined chips
- Location + last seen below seller row

### Design details — sticky bottom bar
- Fixed at bottom, above tab bar
- Two equal buttons: `Make an Offer` (outline) + `Contact Seller` (primary teal/filled)
- On tap "Make an Offer" → opens negotiation sheet (see §8)
- On tap "Contact Seller" → opens or creates conversation

### "•••" action sheet (top-right)
Three options:
- Share listing
- Report listing
- Close

---

## 5. Create / Edit Listing

**Route:** `/(main)/listing/new` and `/(main)/listing/edit/[id]`

### What it does
Seller creates or edits a listing. Photos first, then text fields, then category + price. Sticky bottom: Save Draft + Publish.

### Layout
```
┌─────────────────────────────────────────┐
│  ✕ Sell an item                         │
├─────────────────────────────────────────┤
│  Photos                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ main │  │  +2  │  │  [+] │          │  ← first photo tagged "Main"
│  └──────┘  └──────┘  └──────┘          │
├─────────────────────────────────────────┤
│  About your item                        │
│  ┄┄ Title ──────────────────────────── │
│  ┄┄ Description ──────────────────────  │
├─────────────────────────────────────────┤
│  Item details                           │
│  Category                            >  │
│  Location                            >  │
├─────────────────────────────────────────┤
│  Pricing                                │
│  Price                               >  │
│  Currency      [AFN]  [USD]             │
└─────────────────────────────────────────┘

[ Save Draft (outline) ]  [ Publish (primary) ]  ← sticky bottom
```

### Design details — photos section
- 3 photo slots visible in a row, scrollable if more
- First slot auto-labeled "Main" with a small badge
- Empty slot shows dashed border + camera icon
- Tap any photo → view/remove options
- Max 8 photos

### Design details — form fields
- Section headings: "About your item", "Item details", "Pricing" — medium bold, with separator above
- Fields are full-width borderless inputs with bottom-line only (or light card background)
- Category and Location rows use chevron `>` — open picker sheet on tap
- Price: numeric input with AFN/USD segmented control beside it

### Design details — submit bar
- "Save draft" → outline button, saves without publishing
- "Publish" → filled teal primary button, creates + makes active
- Both disabled while mutation pending, show loading state on active button

---

## 6. My Listings (Seller view)

**Route:** `/(main)/(tabs)/my-listings`

> **Updated 2026-08-27 — Sell Flow Redesign.** Reserve is no longer a listing-surface action and
> "Reserved" is no longer its own status tab — see `docs/SELL_FLOW_REDESIGN.md`. The layout/tabs/CTA
> table below reflect what shipped, not the pre-redesign design.

### What it does
Seller's own listings. Filter tabs for status. 2-column grid. Each card shows photo collage, price, views/favourites count, a hold clause when applicable, and one obvious next-action button per status.

### Layout
```
┌─────────────────────────────────────────┐
│  My Listings                      [+]  │
├─────────────────────────────────────────┤
│  [All] [Draft] [Active] [Expired] →    │  ← filter chips, fixed height 52px — no "Reserved" tab
├──────────────────┬──────────────────────┤
│  [photo collage] │  [photo collage]     │  ← 2-col grid
│  DRAFT           │  ACTIVE · Reserved ↩ │  ← StatusBadge + hold ribbon overlay
│  AFN 1,500       │  AFN 800             │
│  0 views · 0 ♥  │  12 views · 3 ♥     │
│ [Finish Editing] │  [Mark Sold]         │  ← "Mark Sold" always, one tap, no hold required
├──────────────────┴──────────────────────┤
│  ...more listings                       │
└─────────────────────────────────────────┘
```

### Listing card (seller variant) — `SellerListingCard`
- Photo: same 4:3 ratio, StatusBadge overlay top-left (+ a "Reserved"/hold ribbon when applicable)
- Below photo: Price (bold), Title (2 lines), views + saves row with Eye + Heart icons, and a stock
  pill ("N available · M held [for {name}]") when the listing is multi-unit
- Bottom action row: primary action button (flex 1) + overflow "More" menu (Edit / Duplicate /
  Delete / Release hold / View sales)
- Primary action per status:
  - `draft` → "Publish" (primary blue)
  - `active` (no hold) → "Mark Sold" (primary) — reserve is **not** on this card; it's initiated from
    the chat thread with the specific buyer (`ComposerActionsSheet`'s "+" menu)
  - `active` or `reserved` (**with** a hold) → still "Mark Sold" (primary), identically — a hold never
    blocks or gates the sell action; "Release hold" moves to the overflow menu
  - `sold` → no primary action button; overflow still offers Edit / Duplicate / Delete / View sales
- Destructive delete lives in the overflow menu, not a standalone icon button on the row

### Filter chips
- Horizontal scroll, fixed height 52px wrapper — prevents stretching full page
- All / Draft / Active / Expired / Sold — **no separate Reserved chip.** A held listing (single- or
  multi-item) appears under **Active** with its hold badge.

---

## 7. Profile — Own Profile

**Route:** `/(main)/(tabs)/profile`

### What it does
Three-tab profile: Listings (public view), Reviews, About (bio/location). Plus a settings menu accessible from the same screen.

### Profile header (for viewing another user's profile)
```
┌─────────────────────────────────────────┐
│  ← username                       •••  │
├─────────────────────────────────────────┤
│  [ Listings ]  [ Reviews ]  [ About ]  │  ← tab bar
│ ─────────────                           │  ← underline indicator
```

### About tab layout
```
┌─────────────────────────────────────────┐
│                                         │
│       [full-bleed profile photo]        │  ← large photo hero, ~40% screen height
│                                         │
├─────────────────────────────────────────┤
│  Username (large bold)                  │
│                                         │
│  Verified info                          │
│  ✓ Google   ✓ Email                    │
│                                         │
│  📍 Kabul                               │
│  🕐 Last seen 15 min ago                │
│  👥 0 followers, 0 following            │
└─────────────────────────────────────────┘
```

### Listings tab layout
- Same 2-column grid as public Browse feed
- If own profile: shows all statuses including drafts
- "Boost your visibility" promo card at top (post-MVP only)

### Reviews tab
- Star rating summary
- List of reviews with avatar, username, rating, text, date
- Empty state: star illustration + "No reviews yet" + subtitle

---

## 8. Profile — Settings Menu

**Route:** `/(main)/(tabs)/profile` (own profile, logged-in user)

### Layout
```
┌─────────────────────────────────────────┐
│  [avatar]  Username                     │
│            View my listings          >  │
├─────────────────────────────────────────┤
│  ❤️  Saved listings                   >  │
│  💬  My conversations                 >  │
├─────────────────────────────────────────┤
│  Account                                │
│  ⚙️  Settings                         >  │
│  🌐  Language              English  >   │
│  🌙  Appearance          System    >   │  ← dark/light/system
├─────────────────────────────────────────┤
│  Help                                   │
│  ❓  Help & Support                   >  │
│  ℹ️  About Hatiwal                    >  │
├─────────────────────────────────────────┤
│  [Log out]                              │  ← destructive, red text
└─────────────────────────────────────────┘
```

### Design details
- Avatar + username row at top — tapping navigates to public profile
- Grouped sections with section headers in muted small caps
- Each row: icon (teal) + label + optional right value + chevron
- Language row shows current language as right-side value
- Appearance row shows current theme as right-side value
- Log out: standalone row, `colors.destructive` text, no icon, no chevron
- No cookie settings, no promotional tools, no balance, no bundles (not applicable)

---

## 9. Inbox

**Route:** `/(main)/(tabs)/inbox`

### What it does
Two-tab inbox: Messages (conversations about listings) + Notifications (system notifications).

### Layout
```
┌─────────────────────────────────────────┐
│  Inbox                                  │
├─────────────────────────────────────────┤
│  [ Messages 3 ]  [ Notifications 2 ]   │  ← tab bar with unread count
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ [avatar]  SellerName       2h ago   ││
│  │           Re: iPhone 14...          ││  ← listing title preview
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ [listing photo] BuyerName  5h ago   ││
│  │           Is this available?        ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Message row design
- Avatar (40px circle) on left
- Username bold, time muted right-aligned
- Message preview text, truncated 1 line, muted
- Unread: row has slightly highlighted background or bold preview text
- Tapping row → Conversation screen

### Notifications tab
- System messages (Hatiwal announcements, tips)
- Icon: "H" logo avatar or type-specific icon
- Same row layout as messages

---

## 10. Conversation / Chat

**Route:** `/(main)/conversation/[id]`

### What it does
Full chat thread between buyer and seller about a specific listing. Listing preview card at top. Messages in bubbles. Negotiation offer cards inline.

### Layout
```
┌─────────────────────────────────────────┐
│  ← SellerName                           │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ [photo] iPhone 14  AFN 35,000       ││  ← listing preview card
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│                   Is this available? ◀  │  ← buyer bubble (right)
│  ▶ Yes, still available!               │  ← seller bubble (left)
│                                         │
│  ┌─── Offer ──────────────────────────┐│
│  │  AFN 30,000 offered               ││  ← negotiation card
│  │  [Accept]  [Decline]  [Counter]   ││
│  └────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [📷] [Type a message...    ] [Send ▶] │  ← input bar
│                    [Make an Offer]      │  ← offer button above keyboard
└─────────────────────────────────────────┘
```

### Design details
- Listing card at top (pinned): thumbnail + title + price, tappable → listing detail
- Buyer messages: right-aligned, primary color bubble
- Seller messages: left-aligned, card-color bubble
- Negotiation offer card: distinct card with offer amount bold + 3 action buttons
- "Make an Offer" shortcut button above input bar
- Message input: text + send button + optional photo attachment

---

## 11. Negotiation — Make an Offer Sheet

**Triggered from:** Listing Detail or Conversation

### What it does
Buyer enters a price offer. Seller receives it as a special message card with Accept / Decline / Counter actions.

### Layout (bottom sheet)
```
┌─────────────────────────────────────────┐
│  Make an Offer                          │
│                                         │
│  Listed price: AFN 1,500               │
│                                         │
│  Your offer                             │
│  ┌─────────────────────────────────────┐│
│  │  AFN  [  1,200                   ] ││
│  └─────────────────────────────────────┘│
│                                         │
│  ℹ️ Your offer will be sent to the seller│
│  as a message. No payment is required.  │
│                                         │
│  [ Send Offer ]                         │
└─────────────────────────────────────────┘
```

### Design details
- Sheet slides up from bottom (50% height)
- Shows listed price for reference
- Numeric input pre-focused
- Disclaimer: "No payment required — this is just a message to the seller"
- On send → creates conversation if none exists + sends offer card message
- Seller sees offer card with Accept / Decline / Counter-offer buttons
- Counter-offer → opens same sheet for seller with buyer's price as reference

---

## 12. Meetup Arrangement (in Chat)

**Triggered from:** Conversation (after deal agreed)

### What it does
After buyer and seller agree on price, either party can suggest a meetup. Inline meetup card in chat.

### Layout (bottom sheet to create)
```
┌─────────────────────────────────────────┐
│  Suggest a Meetup                       │
│                                         │
│  Location                               │
│  ┌─────────────────────────────────────┐│
│  │  Kabul city center, Taimani...      ││
│  └─────────────────────────────────────┘│
│                                         │
│  Date & Time                            │
│  ┌─────────────────────────────────────┐│
│  │  Tomorrow, 3:00 PM                  ││
│  └─────────────────────────────────────┘│
│                                         │
│  [ Suggest Meetup ]                     │
└─────────────────────────────────────────┘
```

### Meetup card in chat
```
┌─── Meetup Suggestion ──────────────────┐
│  📍 Kabul city center, Taimani         │
│  📅 Tomorrow at 3:00 PM                │
│                                         │
│  [ Confirm ]        [ Suggest Another ]│
└─────────────────────────────────────────┘
```

---

## 13. Empty States

Every list/feed screen needs a polished empty state. Pattern from Vinted:

| Screen | Illustration style | Heading | Subtext |
|--------|-------------------|---------|---------|
| Browse feed (no results) | Illustrated magnifying glass | "Nothing found" | "Try different filters" |
| My Listings (empty) | Illustrated camera/item | "No listings yet" | "Start selling — it's free" |
| Saved (no saves) | Illustrated heart | "Nothing saved yet" | "Tap the heart on any listing" |
| Conversations (empty) | Illustrated chat bubble | "No messages yet" | "Start chatting with sellers" |
| Reviews (empty) | Star outline illustration | "No reviews yet" | "Reviews appear after transactions" |
| Orders (empty) | Illustrated envelope/box | "No orders yet" | "When you sell something, it appears here" |

### Design rules for empty states
- Illustration: 80–100px, centered, teal/brand color accent
- Heading: 18sp medium, `colors.foreground`, centered
- Subtext: 14sp, `colors.mutedForeground`, centered, max 2 lines
- Optional CTA button below subtext

---

## 14. Search

**Route:** `/(main)/search`

### What it does
Full-text search across listings. Triggered by tapping the search bar on Home or Browse.

### Layout
```
┌─────────────────────────────────────────┐
│  ← [🔍 Search items...           ] ✕  │
├─────────────────────────────────────────┤
│  Recent searches                        │
│  🕐 iPhone                          ✕  │
│  🕐 Adidas shoes                    ✕  │
├─────────────────────────────────────────┤
│  [results appear as user types]         │
│  2-column listing grid                  │
└─────────────────────────────────────────┘
```

---

## 15. Design Tokens (Hatiwal-specific)

### Colors
Follow `useColors()` hook — never hardcode, never use className color tokens.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `background` | white | dark | page background |
| `card` | off-white | dark-elevated | card / section background |
| `foreground` | near-black | near-white | primary text |
| `mutedForeground` | gray-500 | gray-400 | secondary text, icons |
| `primary` | teal/blue | teal/blue | CTA buttons, active states |
| `primaryForeground` | white | white | text on primary bg |
| `destructive` | red | red-lighter | delete, logout, error |
| `border` | gray-200 | gray-700 | dividers, input borders |
| `imagePlaceholder` | gray-100 | gray-800 | photo placeholder bg |

### Typography scale
| Use | Size | Weight |
|-----|------|--------|
| Page title | 24sp | 700 |
| Section heading | 18sp | 600 |
| Price (hero) | 22–24sp | 700 |
| Body / label | 14–15sp | 400–500 |
| Meta / caption | 12sp | 400 |
| Chip / badge | 12sp | 500 |

### Spacing
- Page horizontal padding: 16px
- Card inner padding: 12px
- Section gap: 24px
- Between related elements: 8px
- Chip row height: 50–52px fixed

### Border radius
- Cards: 8px
- Chips/pills: 999px (fully rounded)
- Buttons: 8px
- Avatar: 999px (circle)
- Bottom sheets: 16px top corners

---

## 16. What We Are NOT Building (skip entirely)

| Vinted feature | Reason to skip |
|---------------|----------------|
| Postage / shipping | No delivery — meetup only |
| Buyer Protection | No payment — no refunds needed |
| Balance / wallet | No online payment |
| Bundle discounts | Post-MVP |
| Promotional tools (Bump) | Post-MVP |
| Holiday mode | Post-MVP |
| Badges / gamification | Post-MVP |
| Referral program | Post-MVP |
| Donations | Not applicable |
| Cookie settings | GDPR not applicable for MVP |
| Image search (camera) | Post-MVP |
| Followers / following | Post-MVP |

---

## Priority Build Order

Based on the core listing flow the user specified:

1. **Browse Category Grid** — categories with illustrations
2. **Browse Listing Feed** — 2-col grid + filter chips
3. **Listing Detail** — photo gallery, price, seller info, Make an Offer + Contact CTA
4. **Create Listing** — photos + form + save/publish
5. **My Listings** — grid with status, quick actions
6. **Negotiation Sheet** — Make an Offer bottom sheet + offer card in chat
7. **Chat / Conversation** — full thread with listing card header
8. **Profile — About + Listings tabs**
9. **Search**
10. **Settings** — language, theme, logout

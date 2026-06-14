# Hatiwal Mobile — Design System

> The visual language and the **approved third-party libraries** for the Hatiwal marketplace app.
> Read this together with [docs/prompts/mobile.prompt.md](prompts/mobile.prompt.md) (the engineering rulebook).
>
> **Golden rule:** *Don't build what a maintained library already gives you.* Every UI need below has a
> chosen library. Reach for it. If a need isn't covered here, propose adding a well-maintained library
> before writing a bespoke component. UI atoms still come from **react-native-reusables (RNR)** — the
> libraries below provide the *complex* pieces (galleries, pickers, sheets, chat) RNR doesn't.

---

## 1. Design Principles (a buy/sell marketplace)

Hatiwal connects strangers who will **meet in person** to trade — there is no online payment, no delivery.
Every design decision serves one of three jobs:

1. **Show the product** — this is a visual marketplace. Photos are large, crisp, and never distorted.
2. **Make price + trust obvious** — price is the second hero; seller identity, freshness, and status badges earn the message tap.
3. **Move the deal forward** — the primary action (Message seller / Publish / Mark sold) is always the loudest thing on screen.

**Tone:** calm, trustworthy, local. Generous whitespace, strong photography, no clutter. Optimized for a **mid-range Android on a slow network** — fast images, skeletons, no jank.

**Language:** default **English (`en`)**; also **Pashto (`ps`)** and **Dari (`fa`)** — both **RTL**. Everything localized and RTL-safe.

---

## 2. Color Tokens

> **Critical — NativeWind v4 dark mode limitation:** NativeWind bakes light-mode `rgba()` values at build time. Color className tokens (`bg-background`, `text-foreground`, `border-border`, etc.) do **not** flip in dark mode — they always render their light-mode value. **Always use `useColors()` inline styles for colors.**

```tsx
// ❌ WRONG — bg-card is always light-mode rgba, broken in dark mode
<View className="bg-card border border-border">
  <Text className="text-foreground">Title</Text>
</View>

// ✅ CORRECT — reads actual scheme at runtime
const colors = useColors();
<View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
  <Text style={{ color: colors.foreground }}>Title</Text>
</View>
```

`className` is safe **only for layout**: `flex-1`, `p-4`, `gap-2`, `rounded-lg`, `overflow-hidden`, etc.

**Available color values via `useColors()`:**

| `colors.*` | Semantic use |
|---|---|
| `background` | Page background |
| `foreground` | Primary text |
| `card` | Cards, sheets, surfaces |
| `border` | Hairlines, dividers, card borders |
| `muted` | Subtle fills, skeleton base, pressed ripple |
| `mutedForeground` | Secondary/meta text (city, timestamps, labels) |
| `primary` / `primaryForeground` | Primary actions (Message, Publish), active states |
| `secondary` / `secondaryForeground` | Secondary actions |
| `destructive` / `destructiveForeground` | Delete, report, errors |

### Listing status → badge color (use everywhere a status appears)

| Status | Token / variant | Meaning |
|---|---|---|
| `draft` | `muted` (grey) | Not yet published; only the owner sees it |
| `active` | `success` (green) | Live, visible to buyers, open for chat |
| `reserved` | `warning` (amber) | Held for a buyer; negotiation in progress |
| `sold` | `secondary`/grey, dimmed | Done; archived |

Define one `<StatusBadge status={listing.status} />` in `src/components/common/` and use it on every surface (card, detail, my-listings). Map the status enum → token there once.

---

## 3. Typography & Spacing

- **Type scale** (NativeWind): screen title `text-2xl font-bold`, section heading `text-lg font-semibold`, card title `text-base font-semibold`, body `text-sm`, meta `text-xs text-muted-foreground`.
- **Price** is its own treatment — a shared `<PriceTag price currency size="lg|md|sm" />` using `formatCurrency`. Large + `font-bold` + `text-foreground`. Never muted, never inline-mixed with description.
- **Spacing rhythm**: section gaps `gap-4`, field gaps `gap-3`, card padding `p-4`, screen inset `paddingHorizontal: 16` (via `ScreenContainer padded`). No per-card `marginHorizontal` (it double-insets list screens).
- **Radius**: cards/sheets `rounded-lg`, inputs/buttons `rounded-md`, chips `rounded-full`.
- **Touch targets**: ≥ 44px. Icon buttons `h-9 w-9` minimum with `hitSlop`.

---

## 4. Approved Third-Party Libraries

> Install with `npx expo install <pkg>` so versions match Expo SDK 54 (React 19 / RN 0.81 / Reanimated 4).
> All of these are Expo-Go/dev-build compatible and actively maintained.

| Need | Library | Why / notes |
|---|---|---|
| **Fast images & thumbnails** | `expo-image` | Disk+memory cache, `blurhash`/`placeholder`, `contentFit`. Use for **every** listing image. Never raw `<Image>` for remote photos. |
| **Photo gallery / swiper** (listing detail) | `react-native-reanimated-carousel` | Reanimated-4 based, smooth, page indicator. The listing-detail hero gallery. |
| **Pick / capture listing photos** | `expo-image-picker` | Multi-select from library + camera. Feeds the create/edit form; upload via `FormData`. |
| **Long feeds / grids** (browse, my listings, saved) | `@shopify/flash-list` | High-perf virtualized list for the marketplace feed. Use inside `UniversalList`'s renderer where the dataset is large. |
| **Bottom sheets & pickers** (category, report reason, filters, meetup) | `@gorhom/bottom-sheet` | The standard. Needs `react-native-gesture-handler` + `react-native-reanimated` (installed). Use for category picker, report flow, filter drawer. |
| **Chat thread UI** (conversation messages) | `react-native-gifted-chat` | Don't build a chat list. Theme bubbles to tokens, RTL-aware, handles input bar, timestamps, avatars. |
| **Toasts / transient feedback** | `sonner-native` | Success/error toasts ("Listing published", "Message sent"). Non-blocking. |
| **Forms + validation** | `react-hook-form` + `zod` (`@hookform/resolvers`) | All forms (create listing, edit profile, auth). Schema-validated, inline errors. |
| **Gestures** (peer dep for sheet/carousel/chat) | `react-native-gesture-handler` | Required by the above. Wrap the app root in `GestureHandlerRootView`. |
| **Dates** | `date-fns` | Date math only; **user-facing formatting still goes through `useLocalization()`**, never `date-fns/format` directly in JSX. |
| **Location** (pick/show listing location) | `expo-location` (+ optional `react-native-maps`) | Capture lat/long for a listing; show a static map snippet on detail. Maps optional for MVP — city string is the fallback. |
| **Icons** | `lucide-react-native` (via RNR `Icon`) | Already in stack. Never emoji as UI icons. |

**Do not** introduce a second library for the same job, and **do not** hand-roll any of the above. Atoms (Button, Input, Card, Badge, Avatar, Tabs, Dialog, Switch, Skeleton, Text) always come from RNR.

---

## 5. Shared Marketplace Components

Build these once in `src/components/common/` (compositions of RNR + the libraries above) and reuse everywhere:

| Component | Composed of | Used by |
|---|---|---|
| `ListingCard` | `expo-image` + `PriceTag` + `StatusBadge` + RNR `Card`/`Text` + save-heart | Browse, Saved, My Listings, Profile listings |
| `PriceTag` | RNR `Text` + `useLocalization().formatCurrency` | Cards, detail, chat header |
| `StatusBadge` | RNR `Badge` + status→token map | Anywhere a listing status shows |
| **`ConditionBadge`** | neutral pill + `listing.condition.<key>` | Anywhere a listing's condition shows (detail, card). Never inline a condition label. |
| **`ExpiryBadge`** | Clock pill; muted → amber (≤3d) → destructive (expired); owns all day-count logic | Seller surfaces only (My Listings card, owner's listing detail). Renders null for draft/reserved/sold/buyer. Never re-implement the countdown. |
| **`ConditionChips`** | selectable chip row over `LISTING_CONDITIONS`; `allowClear` for filters | The ONE condition selector — create/edit form (required pick) **and** Browse filter (clearable). Never hand-roll condition chips. |
| `ListingGallery` | `react-native-reanimated-carousel` + `expo-image` + page dots | Listing detail hero |
| **`UserAvatar`** | `expo-image` photo **or** colored initial circle | The ONE avatar impl — used *inside* `UserIdentity`; never render an avatar any other way |
| **`UserIdentity`** | `UserAvatar` + name + `VerifiedBadge` (+ optional subtitle); `layout="row"\|"stacked"` | **Every place a person is shown** — listing-detail seller card, seller profile header, own profile, conversation rows. Do NOT re-assemble avatar+name+verified inline. |
| `VerifiedBadge` | `BadgeCheck` (lucide) + `useColors().primary` | Inside `UserIdentity`; `withLabel` for a "Verified" pill |
| `CategoryPicker` | `@gorhom/bottom-sheet` + searchable list | Create/edit form, browse filter |
| `ReportSheet` | `@gorhom/bottom-sheet` + RNR `RadioGroup` + `Textarea` | Listing detail, profile |
| `EmptyState` | RNR `Icon` + `Text` + `Button` (primary action) | Every list/empty surface |
| `ListingCardSkeleton` | RNR `Skeleton` mirroring `ListingCard` | List loading states |

---

## 6. States (every screen)

- **Loading** → a `Skeleton` composition mirroring the real layout (e.g. `ListingCardSkeleton`), not a bare spinner.
- **Empty** → `EmptyState`: feature icon + title + one-line guidance + a primary action. Examples:
  - Browse no-results → "Nothing matches your search" + Reset.
  - My Listings empty → "You haven't posted anything yet" + **Post a listing**.
  - Saved empty → "No saved items yet" + Browse.
  - Chat empty → "No conversations yet" + Browse.
- **Error** → friendly message + retry; transient failures use a `sonner-native` toast.

---

## 7. Motion

Subtle and purposeful, via `react-native-reanimated`:
- Card press: `opacity`/scale feedback (+ `android_ripple` with `bg-muted`).
- Save-heart: quick pop/scale on tap.
- Gallery: native swipe + animated page dots.
- List items: `FadeInDown` stagger on first render.
- Bottom sheets: spring (handled by `@gorhom/bottom-sheet`).
Never block interaction; keep it smooth on mid-range Android.

---

## 8. RTL & Localization (mandatory)

- Default `en`; `ps` + `fa` are RTL. Mirror rows with `useLocalization().isRtl`; never hard-code `left/right`.
- All copy via `t('...')` in **all 3** locales. All prices/dates/numbers via `useLocalization()`.
- Test every new screen with `isRtl = true` (Pashto) before calling it done.

---

## 9. Definition of "looks good" (review gate)

A screen ships only when:
- [ ] Photos use `expo-image`, correctly aspect-ratioed, with placeholder.
- [ ] Price uses `PriceTag` + `formatCurrency`; it's the second-most prominent element.
- [ ] Status uses `StatusBadge` with the standard color map.
- [ ] Primary action is unmistakable and reachable; destructive actions use `confirmAlert`.
- [ ] Loading = skeleton, empty = `EmptyState` with a primary action, error handled.
- [ ] No hex, no raw `Text`, no `Alert.alert`, no hand-rolled carousel/picker/sheet/chat.
- [ ] All strings in en/ps/fa; layout correct in RTL; correct in light **and** dark mode. All colors via `useColors()` — no className color tokens.
- [ ] Smooth on mid-range Android (FlashList for big lists, no layout jank).

Run the **marketplace-designer** agent for a deep review before shipping a new screen.

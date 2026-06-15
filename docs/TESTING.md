# Hatiwal Mobile — Testing Guide

---

## ⛔ MANDATORY — Nothing Ships Without Tests

**Every new feature, screen, or change MUST include tests before it is considered done. No exceptions.**

| What you built | What you must add |
|---|---|
| New screen | Maestro E2E flow (happy path + error state + empty state) |
| New API function | Jest unit test (success + error + pagination if applicable) |
| New shared component | Jest unit test + Storybook story (all states, light/dark, LTR/RTL) |
| Changed a screen flow | Update the Maestro flow |
| Changed an API function | Update the Jest unit test |
| Changed a shared component | Update the unit test + Storybook story |

**If a flow or test is missing for an existing feature, add it before shipping the next feature.** Do not let the test debt grow.

---

> **Rule:** Nothing ships without tests. Every new feature or change must add or update tests in all three layers. This doc is the single source of truth for what to test and how.

---

## Testing Philosophy

| Principle | What it means |
|---|---|
| **Nothing ships untested** | New screen → E2E flow. New service/hook → unit test. New component → Storybook story. |
| **Tests live next to the code** | Unit tests in `__tests__/` beside the file. E2E flows in `maestro/`. Stories in `__stories__/`. |
| **Update tests on every change** | Changed a form field? Update the E2E flow. Changed an API hook? Update the unit test. |
| **Test the real thing** | E2E runs on a real simulator. Unit tests mock only the network, never internal logic. |
| **Fail loudly** | A failing test blocks the feature. Never skip or comment out a failing test — fix it. |

---

## Three Layers

```
┌─────────────────────────────────────────────────┐
│  Layer 1: E2E — Maestro                         │
│  Tests full user flows on a real simulator      │
│  → Does the feature work end to end?            │
├─────────────────────────────────────────────────┤
│  Layer 2: Unit — Jest + RNTL + MSW              │
│  Tests services, hooks, and components          │
│  → Does each piece work in isolation?           │
├─────────────────────────────────────────────────┤
│  Layer 3: Visual — Storybook                    │
│  Renders every shared component in all states   │
│  → Does it look right? Colors, RTL, dark mode?  │
└─────────────────────────────────────────────────┘
```

---

## Tools

| Tool | Purpose | Install |
|---|---|---|
| **Maestro** | E2E flows on simulator/device | `brew install maestro` (Mac) or [maestro.mobile.dev](https://maestro.mobile.dev) |
| **Jest** | Unit test runner | Already in Expo |
| **React Native Testing Library (RNTL)** | Component rendering + interaction | `npx expo install @testing-library/react-native` |
| **MSW (Mock Service Worker)** | Mock Rails API in unit tests | `npm install msw --save-dev` |
| **Storybook for React Native** | Visual component catalog | `npx storybook@latest init` |

---

## Layer 1 — E2E Tests (Maestro)

### File Structure

```
maestro/
  auth/
    sign_up.yaml
    login.yaml
    logout.yaml
  listings/
    create_listing.yaml
    create_listing_with_photos.yaml
    edit_listing.yaml
    delete_listing.yaml
    lifecycle_publish.yaml
    lifecycle_reserve.yaml
    lifecycle_sold.yaml
    lifecycle_reactivate.yaml
  browse/
    browse_listings.yaml
    search_listings.yaml
    filter_by_category.yaml
    listing_detail.yaml
  chat/
    start_conversation.yaml
    send_message.yaml
    meetup_proposal.yaml
  saved/
    save_listing.yaml
    unsave_listing.yaml
    saved_list.yaml
  profile/
    edit_profile.yaml
    change_language_pashto.yaml
    change_language_dari.yaml
    change_language_english.yaml
  report/
    report_listing.yaml
    report_user.yaml
  rtl/
    browse_rtl_pashto.yaml
    browse_rtl_dari.yaml
  dark_mode/
    browse_dark.yaml
    listing_detail_dark.yaml
```

### How to Run

```bash
# run all flows
maestro test maestro/

# run one flow
maestro test maestro/listings/create_listing.yaml

# run with device connected
maestro test --device <device-id> maestro/auth/login.yaml
```

---

### Complete Flow Specs

Each flow below must be implemented as a Maestro YAML file. The **happy path** and **error states** are both required.

---

#### Auth

**`auth/sign_up.yaml`**
- Open app → tap Register
- Fill firstname, lastname, email, password, password confirmation
- Submit → lands on Browse
- Verify welcome state (no listings yet)

**`auth/sign_up_validation.yaml`**
- Submit empty form → see required field errors on all fields
- Submit mismatched passwords → see password error
- Submit duplicate email → see "already taken" error

**`auth/login.yaml`**
- Open app → tap Login
- Fill email + password → submit
- Lands on Browse
- Verify user is authenticated (profile tab shows name)

**`auth/login_wrong_password.yaml`**
- Submit wrong password → see error message
- Form stays filled (email preserved)

**`auth/logout.yaml`**
- Go to Profile → tap Sign Out
- Confirm dialog appears → tap Confirm
- Lands on Login screen
- Verify tokens cleared (navigate to protected screen → redirected to login)

---

#### Browse

**`browse/browse_listings.yaml`**
- Login → land on Browse
- Listings feed loads with photos, prices, titles
- Scroll down → more listings load (pagination)
- Tap a listing → Listing Detail opens

**`browse/browse_empty.yaml`**
- Login as new user with no listings in DB
- Browse shows empty state with call to action

**`browse/search_listings.yaml`**
- Type in search bar → listings filter in real time
- Clear search → full feed returns
- Search with no results → empty state shown

**`browse/filter_by_category.yaml`**
- Open category filter → bottom sheet appears
- Select a category → listings filter
- Clear filter → full feed returns
- Verify selected category chip is highlighted

**`browse/listing_detail.yaml`**
- Tap listing from browse → detail screen opens
- Photos gallery visible → swipe through photos
- Price, title, description, category, location visible
- Seller name and city visible
- "Message Seller" button visible and tappable
- Save heart visible and tappable
- Report affordance visible

---

#### Listings (Seller)

**`listings/create_listing.yaml`**
- Go to Seller tab → tap Create Listing
- Fill title, description, price, currency (AFN)
- Select category from bottom sheet
- Fill location
- Tap "Save as Draft" → listing appears in My Listings as draft
- Verify status badge shows "draft"

**`listings/create_listing_with_photos.yaml`**
- Create listing form → tap photo picker
- Select 1 photo → preview appears
- Add another photo → 2 photos shown
- Reorder photos (drag)
- Submit → listing saved with photos
- Open listing detail → photos gallery works

**`listings/create_listing_validation.yaml`**
- Submit empty form → required field errors on title, price, category
- Submit price = 0 → validation error
- Submit with no photos → allowed (photos optional in form, verify behavior)

**`listings/edit_listing.yaml`**
- Open a draft listing → tap Edit
- Change title → save → verify new title shown
- Change price → save → verify new price shown
- Add another photo → save → verify in gallery
- Remove a photo → save → verify removed

**`listings/delete_listing.yaml`**
- Open My Listings → swipe/tap delete on a listing
- Confirm dialog appears
- Confirm → listing removed from My Listings
- Toast "Listing deleted" shown

**`listings/lifecycle_publish.yaml`**
- Open a draft listing
- Tap "Publish" → confirm
- Status badge changes from "draft" to "active"
- Listing now appears in public Browse feed

**`listings/lifecycle_reserve.yaml`**
- Open an active listing (seller view)
- Tap "Mark as Reserved"
- Status badge changes to "reserved" (amber)
- Listing still visible in Browse with reserved badge

**`listings/lifecycle_sold.yaml`**
- Open a reserved listing
- Tap "Mark as Sold" → confirm
- Status badge changes to "sold"
- Listing no longer appears in Browse feed
- Toast shown

**`listings/lifecycle_reactivate.yaml`**
- Open a reserved listing
- Tap "Reactivate" (deal fell through)
- Status returns to "active"
- Listing visible in Browse again

---

#### Chat

**`chat/start_conversation.yaml`**
- Browse → open listing detail
- Tap "Message Seller"
- First message sheet appears → type message → send
- Redirected to conversation thread
- Message visible in thread
- Listing pinned at top of thread

**`chat/start_conversation_duplicate.yaml`**
- Try to start a second conversation on the same listing
- Existing conversation opens instead of creating duplicate

**`chat/send_message.yaml`**
- Open an existing conversation
- Type message → send
- Message appears in thread (optimistic)
- Read receipt behavior visible

**`chat/meetup_proposal.yaml`**
- Open conversation thread
- Tap meetup proposal action
- Bottom sheet opens → fill place + time → send
- Meetup proposal bubble appears in thread (different style from text)

**`chat/conversations_list.yaml`**
- Go to Chat tab
- Conversations listed with last message preview
- Unread badge visible on conversations with unread messages
- Tap conversation → opens thread

---

#### Saved

**`saved/save_listing.yaml`**
- Browse → tap save heart on listing card
- Heart animates → filled
- Go to Saved tab → listing appears

**`saved/unsave_listing.yaml`**
- Go to Saved tab → tap heart on saved listing
- Listing removed from Saved list
- Toast shown

**`saved/save_from_detail.yaml`**
- Open listing detail → tap save heart
- Heart fills → navigate to Saved tab → listing there

---

#### Profile

**`profile/edit_profile.yaml`**
- Go to Profile → tap Edit
- Change firstname → save
- Profile screen shows updated name

**`profile/edit_profile_validation.yaml`**
- Clear firstname → submit → required field error

**`profile/change_language_pashto.yaml`**
- Profile → change language to Pashto
- App switches to RTL layout
- All visible strings in Pashto
- Verify Browse screen renders correctly in RTL

**`profile/change_language_dari.yaml`**
- Same as above for Dari (fa)

**`profile/change_language_english.yaml`**
- Switch back to English from RTL language
- Layout returns to LTR

---

#### Report

**`report/report_listing.yaml`**
- Open listing detail → tap Report
- Bottom sheet opens with 6 reason options
- Select "Spam" → optionally add description → submit
- Toast "Report submitted"
- Report affordance disabled (already reported)

**`report/report_user.yaml`**
- Open seller public profile → tap Report
- Same flow as above

**`report/self_report_blocked.yaml`**
- Try to report your own listing → affordance not shown

---

#### RTL

**`rtl/browse_rtl_pashto.yaml`**
- Switch to Pashto
- Browse screen: verify layout is mirrored (text right-aligned, back arrow on right, etc.)
- Listing card: price/title text starts from right
- No text overflow or truncation

**`rtl/browse_rtl_dari.yaml`**
- Same as above for Dari

---

#### Dark Mode

**`dark_mode/browse_dark.yaml`**
- Switch device to dark mode
- Browse screen: background dark, cards dark, text readable
- No white/blank areas visible (common if className used for colors instead of useColors())

**`dark_mode/listing_detail_dark.yaml`**
- Open listing detail in dark mode
- Gallery, price, description all readable
- Buttons have correct contrast

---

## Layer 2 — Unit Tests (Jest + RNTL + MSW)

### File Structure

```
src/
  services/
    listings.ts
    __tests__/
      listings.test.ts
  hooks/
    useListings.ts
    useSaveListing.ts
    __tests__/
      useListings.test.ts
      useSaveListing.test.ts
  components/
    shared/
      ListingCard.tsx
      PriceTag.tsx
      StatusBadge.tsx
      UserIdentity.tsx
      __tests__/
        ListingCard.test.tsx
        PriceTag.test.tsx
        StatusBadge.test.tsx
        UserIdentity.test.tsx
  utils/
    formatCurrency.ts
    formatDate.ts
    __tests__/
      formatCurrency.test.ts
      formatDate.test.ts
```

### What to Unit Test

#### Services (`src/services/__tests__/`)

Every API service function must have tests covering:

| Test | What it checks |
|---|---|
| Success response | Correct data returned, keys converted to camelCase |
| 401 response | Auth error handled, logout triggered |
| 422 response | Validation errors surfaced correctly |
| Network error | Graceful failure, error message returned |
| Pagination | `meta.pagination` parsed and returned correctly |

```ts
// example: listings.test.ts
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { fetchListings } from '../listings'

describe('fetchListings', () => {
  it('returns camelCased listings on success', async () => {
    server.use(
      http.get('/api/v1/listings', () =>
        HttpResponse.json({ listings: [{ id: 1, title: 'Phone', views_count: 5 }], meta: { pagination: { page: 1 } } })
      )
    )
    const result = await fetchListings()
    expect(result.listings[0].viewsCount).toBe(5) // snake → camel
  })

  it('throws on 401', async () => {
    server.use(http.get('/api/v1/listings', () => HttpResponse.json({}, { status: 401 })))
    await expect(fetchListings()).rejects.toThrow()
  })
})
```

#### Hooks (`src/hooks/__tests__/`)

Every custom hook must have tests covering:

| Test | What it checks |
|---|---|
| Loading state | `isLoading` true while fetching |
| Success state | Data populated correctly |
| Error state | Error message exposed |
| Refetch on focus | `useFocusEffect` triggers refetch |
| Optimistic update | UI updates before API confirms (save/unsave) |

#### Shared Components (`src/components/shared/__tests__/`)

Every shared component must have tests covering:

| Component | Tests |
|---|---|
| `ListingCard` | Renders photo, price, title, city, status badge; save heart toggles; navigates on tap |
| `PriceTag` | Formats AFN correctly; formats USD correctly; handles zero price |
| `StatusBadge` | Renders correct color token for each status (draft/active/reserved/sold) |
| `UserIdentity` | Shows avatar, name, verified badge; no verified badge when unverified |
| `EmptyState` | Renders title, message, action button |

#### Utils (`src/utils/__tests__/`)

| Function | Tests |
|---|---|
| `formatCurrency` | AFN formatted correctly; USD formatted correctly; zero handled |
| `formatDate` | Relative time correct; absolute date correct; RTL locales correct |
| `convertKeysToCamel` | Nested snake_case → camelCase |
| `convertKeysToSnake` | Nested camelCase → snake_case |

---

### MSW Setup

```ts
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// src/mocks/handlers.ts — default happy-path responses for all endpoints
// Override per-test with server.use(...) for error cases
```

### Run Unit Tests

```bash
npx jest                        # run all
npx jest --watch                # watch mode
npx jest src/services/          # run a folder
npx jest --coverage             # coverage report
```

---

## Layer 3 — Visual Tests (Storybook)

### Purpose

Storybook renders every shared component in every possible state so you can visually verify:
- Colors are correct in light mode and dark mode
- RTL layout is correct for Pashto and Dari
- All states render (loading, empty, error, filled)
- Design tokens are respected (`useColors()` used, no hardcoded hex)
- Typography scale is correct
- Touch targets are large enough (≥ 44px)

### What Needs a Story

Every component in `src/components/shared/` must have a story file.

```
src/components/shared/
  ListingCard/
    ListingCard.tsx
    ListingCard.stories.tsx   ← required
  PriceTag/
    PriceTag.tsx
    PriceTag.stories.tsx      ← required
  StatusBadge/
    StatusBadge.tsx
    StatusBadge.stories.tsx   ← required
  UserIdentity/
    UserIdentity.tsx
    UserIdentity.stories.tsx  ← required
```

### Required Stories Per Component

| Component | Stories to write |
|---|---|
| `ListingCard` | Default, saved, unsaved, reserved, sold, draft, no photo, long title, LTR, RTL |
| `PriceTag` | AFN small, AFN large, USD, zero, LTR, RTL |
| `StatusBadge` | draft, active, reserved, sold — light mode, dark mode |
| `UserIdentity` | with avatar, no avatar (initials), verified, unverified, LTR, RTL |
| `EmptyState` | with action button, without button, icon variant |
| `SellerCard` | verified seller, unverified, with listings count |
| `ConversationRow` | with unread badge, no unread, long message preview, RTL |

### Story Checklist (for each component)

When writing or reviewing a story, check:
- [ ] Light mode looks correct
- [ ] Dark mode looks correct (switch Storybook theme)
- [ ] LTR layout correct
- [ ] RTL layout correct (set locale to `ps` or `fa`)
- [ ] Loading skeleton state shown
- [ ] Empty/null data handled (no crash)
- [ ] Colors come from `useColors()` — not hardcoded
- [ ] Touch targets ≥ 44px

### Run Storybook

```bash
npx storybook
# opens in browser at http://localhost:6006
# or on device via Expo Storybook app
```

---

## Design Rules Verified by Tests

These rules from `DESIGN_SYSTEM.md` must be caught in Storybook and unit tests:

| Rule | How to verify |
|---|---|
| `useColors()` for all colors, never `className` for colors | Storybook dark mode switch — if dark mode breaks, className was used |
| `PriceTag` component used everywhere, never inline price | Unit test: no raw price text outside `PriceTag` in ListingCard |
| `StatusBadge` used everywhere, never inline status text | Unit test: StatusBadge renders for all 4 statuses |
| `UserIdentity` used everywhere, never hand-rolled avatar | Storybook story required for every surface that shows a user |
| `confirmAlert` for destructive actions, never `Alert.alert` | E2E: confirm dialog always appears before delete/logout |
| RTL works for ps and fa | E2E: `rtl/` flows; Storybook: RTL stories |
| All strings via `t()`, never hardcoded | Unit test: render component with `ps` locale → no English visible |
| `useFocusEffect` refetch on every server-data screen | Unit test: navigate away and back → API called again |

---

## Adding Tests for a New Feature

When `feature-builder` ships a new feature, tests must be added in the **same PR**:

### Checklist

```
New screen added:
  [ ] E2E flow: happy path + main error state + empty state
  [ ] Unit tests: service function + hook
  [ ] Storybook story: every new shared component

Existing screen changed:
  [ ] Update E2E flow if user interaction changed
  [ ] Update unit tests if service/hook logic changed
  [ ] Update Storybook story if component props changed

New shared component:
  [ ] Storybook story: all states, light/dark, LTR/RTL
  [ ] Unit test: renders correctly, handles null/empty props

API endpoint changed:
  [ ] Update MSW handler in mocks/handlers.ts
  [ ] Update affected service unit tests
```

---

## CI — Run All Tests Before Shipping

```bash
# run this before every PR merge
npx jest --coverage          # unit tests must pass, 0 failures
maestro test maestro/        # all E2E flows must pass
```

Storybook is manual — open it and do a visual pass for any changed component before shipping.

---

## Quick Reference

| I changed... | Update these tests |
|---|---|
| A service function | `src/services/__tests__/` |
| A custom hook | `src/hooks/__tests__/` |
| A shared component | `src/components/shared/__tests__/` + Storybook story |
| A screen flow | `maestro/` flow file |
| A translation key | E2E flows that check text + unit tests with locale |
| Color/theme logic | Storybook dark mode + RTL stories |
| A form field | E2E validation flow |
| An API endpoint | MSW handler + service unit test |

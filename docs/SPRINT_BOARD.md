# Hatiwal Sprint Board

> **Machine-readable task board** for the continuous software-house loop.
> Owned by the orchestration workflow — do not manually edit IN_PROGRESS tasks.
>
> **Statuses:** `AVAILABLE` · `IN_PROGRESS` · `CHANGES_REQUESTED` · `DONE` · `STUCK`
> **Types:** `frontend` · `backend` · `fullstack` · `design` · `product`
> **Priorities:** `P0` (critical/blocking) · `P1` (core MVP) · `P2` (polish)

---
## TASK-D002
- **Title**: Build conversation thread screen (gifted-chat, meetup proposal)
- **Type**: fullstack
- **Priority**: P1
- **Status**: IN_PROGRESS
- **Session**: house-1
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: RULE VIOLATION (render json:) - conversations_controller.rb:34. RULE VIOLATION (raw Alert.alert) - MessageBubble.tsx:392. SECURITY (cross-conversation responds_to_id). SECURITY (forgeable message kind). PERFORMANCE (N+1 in conversations#index). MINOR (type-safety casts). LIBRARY COMPLIANCE (blocking rule) — hand-rolled FlatList instead of react-native-gifted-chat. LIBRARY COMPLIANCE — MeetupSheet.…
- **Description**: Backend: ensure GET /conversations/:id (detailed: listing, buyer, seller), GET /conversations/:id/messages (paginated asc), POST /conversations/:id/messages (body, kind), POST /listings/:listing_id/conversations (start flow). Mobile: src/screens/chat/Conversation.tsx using react-native-gifted-chat themed to NativeWind tokens. Pinned listing header card (thumbnail + PriceTag + StatusBadge). RTL bubbles. Read receipts (read_at). Meetup proposal action (kind: meetup_proposal) via @gorhom/bottom-sheet (place+time) → special bubble. Start flow: first-message sheet from listing detail; 422 (inactive/self/duplicate) → friendly toast → open existing if duplicate. Closed conversation → input disabled with notice. States: loading skeleton, empty thread (just listing header), send failure toast. Route: app/(main)/conversation/[id].tsx
- **Acceptance**: Can start from a listing and exchange messages; RTL bubbles correct; pinned listing visible; meetup proposal works
## TASK-P401
- **Title**: Micro-interactions: input focus, empty state illustrations, toast polish
- **Type**: frontend
- **Priority**: P1
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-P501
- **ReviewNotes**: -
- **Description**: ## Goal P4 — Micro-interactions. Small targeted interactions that make the app feel polished and alive.  ## Dependency P1 animation system (AnimatedPressable, haptics.ts) must exist. Check P1 card before starting.  ## Sub-features  ### 1. Form input focus animations - When an Input or Textarea gains focus: border color transitions from border to primary over 150ms (withTiming) - Label text transit
- **Acceptance**: Ship with no console errors. All mobile coding rules satisfied.
## TASK-Q501
- **Title**: End-to-end manual test on iOS simulator and Android emulator
- **Type**: frontend
- **Priority**: P0
- **Status**: CHANGES_REQUESTED
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-Q301
- **ReviewNotes**: FALSE TEST CLAIM (must fix): `npx jest --watchAll=false` reports `Tests: 1 failed, 584 passed, 585 total` — NOT 585/585 as the summary states. The failure is in /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/src/components/common/__tests__/SavedSearches.test.tsx, test 'SavedSearches — optimistic delete › calls savedSearchesAPI.delete with the correct id when X is tapped'. It fails at line 267 …
- **Description**: ## Goal Q5 — Testing on Real Devices. Final gate before a production build.  ## Dependency Q1, Q2, Q3, Q4 must all be Done before this starts.  ## Test environment - iOS: physical iPhone or Xcode simulator (iOS 17+) - Android: physical device or Android emulator (API 34+) - Run the app via: npx expo run:ios and npx expo run:android  ## Full checklist (run on BOTH platforms) 1. App launches from cold start...
- **Acceptance**: Ship with no console errors. All mobile coding rules satisfied.
## TASK-N804
- **Title**: Listing price history: track price changes and show a badge on detail
- **Type**: fullstack
- **Priority**: P2
- **Status**: IN_PROGRESS
- **Session**: house-1
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: REGRESSION (must fix) — /home/hama99o/Apps/Personal/Hatiwal/hatiwal-api/app/controllers/api/v1/my/saved_listings_controller.rb lines 11-14: The saved-listings index renders ListingSerializer with view: :list (line 17), which now invokes price_drop_percent and price_dropped_at. Its includes(listing: [...]) chain eager-loads :category, :user/avatar, :images but NOT :price_histories. Because price_hi…
- **Description**: ## Goal Buyers should know if a seller has recently lowered their price. A price-drop badge on the listing detail builds urgency and trust. Sellers benefit because serious buyers notice the drop.  ## Backend - Add ListingPriceHistory model: listing_id, old_price, new_price, currency, changed_at - After each PUT /my/listings/:id, if price changed: create a ListingPriceHistory record - Add price_drop badge/indicator on listing detail screen...
- **Acceptance**: Ship with no console errors. All mobile coding rules satisfied.
## TASK-N805
- **Title**: Seller response rate badge: show on public seller profile
- **Type**: fullstack
- **Priority**: P2
- **Status**: IN_PROGRESS
- **Session**: house-1
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: PERFORMANCE (must fix) — app/models/user.rb:88-89: response_time_label calls response_rate_percent (which runs the full seller_conversations.where(created_at: 90.days.ago..).includes(:messages) query) and then runs the SAME window query AGAIN at lines 91-93. Meanwhile the serializer (user_serializer.rb:24-25 and listing_serializer.rb:59-60) ALSO calls response_rate_percent directly. Net result: ea…
- **Description**: ## Goal Buyers cannot know in advance if a seller actually responds to messages. A response-rate badge on the public seller profile (and optionally on listing detail) gives buyers a strong trust signal before they decide to message.  ## Backend - Add a response_rate computed attribute to the User model: a. Definition: percentage of conversations where the seller sent at least one message within...
- **Acceptance**: Ship with no console errors. All mobile coding rules satisfied.

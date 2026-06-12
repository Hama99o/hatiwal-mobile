# Hatiwal Sprint Board

> **Machine-readable task board** for the continuous software-house loop.
> Owned by the orchestration workflow — do not manually edit IN_PROGRESS tasks.
>
> **Statuses:** `AVAILABLE` · `IN_PROGRESS` · `CHANGES_REQUESTED` · `DONE` · `STUCK`
> **Types:** `frontend` · `backend` · `fullstack` · `design` · `product`
> **Priorities:** `P0` (critical/blocking) · `P1` (core MVP) · `P2` (polish)

---

## TASK-S001
- **Title**: Build shared components (ListingCard, PriceTag, StatusBadge, EmptyState, Skeletons)
- **Type**: frontend
- **Priority**: P0
- **Status**: IN_PROGRESS
- **Session**: software-house
- **Blocks**: TASK-B001, TASK-B002, TASK-C002, TASK-D001, TASK-E001, TASK-F003
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: Build the core reusable components used across all listing screens. ListingCard (expo-image 4:3 blurhash, PriceTag, title 1-2 lines, seller city, "posted X ago" via formatDate, StatusBadge, save-heart animated toggle, android_ripple). PriceTag (formatCurrency, sizes lg/md/sm). StatusBadge (draft→muted, active→success, reserved→warning, sold→grey via RNR Badge). EmptyState (Lucide icon + title + guidance + optional Button). ListingCardSkeleton (RNR Skeleton mirroring card layout). All RTL-safe, dark-mode ready, NativeWind tokens only. Files: src/components/common/
- **Acceptance**: Card renders in light/dark + RTL; skeleton matches card layout; used by ≥2 screens; no hardcoded colors or strings

## TASK-A003
- **Title**: Fix app bootstrap / splash redirect (wire validate_token)
- **Type**: frontend
- **Priority**: P1
- **Status**: IN_PROGRESS
- **Session**: software-house
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: Wire GET /auth/validate_token in app/index.tsx. On launch: call validate_token with stored headers → if valid route to (main)/(tabs)/browse, else route to (auth)/login. Show a splash/loading state while deciding. Currently redirects on local auth state only — must hit the real endpoint. Use secureStorage to read tokens.
- **Acceptance**: Cold start on authed device lands on browse without flash; cold start on unauthed device lands on login; expired token goes to login

## TASK-C001
- **Title**: Create / Edit listing form (photos, title, price, category, location)
- **Type**: fullstack
- **Priority**: P0
- **Status**: IN_PROGRESS
- **Session**: software-house
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: Backend: POST /my/listings (multipart, starts as draft), PUT /my/listings/:id, GET /categories. Mobile: src/screens/seller/ListingForm.tsx using react-hook-form + zod. Sections: (1) Photos — expo-image-picker multi-select + camera, thumbnail strip with reorder + cover indicator + remove, upload via FormData; (2) Title — required ≤150 chars; (3) Price + currency — AFN default/USD segmented; (4) Category — CategoryPicker bottom sheet (@gorhom/bottom-sheet, searchable, trilingual); (5) Description — RNR Textarea optional; (6) Location — city text. Submit: Save draft vs Publish now (publish = create then PUT publish). Sticky submit bar, sonner-native toast, inline validation. Routes: app/(main)/listing/new.tsx and app/(main)/listing/edit/[id].tsx
- **Acceptance**: Can create listing with photos end-to-end; draft and publish both work; category picker works; RTL + dark

## TASK-C002
- **Title**: Migrate My Listings screen to design system (replace raw RN + Alert)
- **Type**: frontend
- **Priority**: P0
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: src/screens/seller/MyListings.tsx exists with raw RN + raw Alert.alert (rule violation). Replace entirely: UniversalList of ListingCard (seller variant with views count + conversation count). Status tabs/filter: All · Draft · Active · Reserved · Sold. Per-card next-action button by state: Draft→Publish, Active→Reserve, Reserved→Mark sold, any→Edit/Delete (overflow). Delete via confirmAlert (destructive) + sonner-native toast. FAB/header "+ Post" → C1. States: skeleton, empty "You haven't posted anything yet" + Post a listing button. useFocusEffect refetch. Endpoints: GET /my/listings?status, DELETE /my/listings/:id, PUT .../publish|reserve|sold
- **Acceptance**: Every lifecycle transition works with confirmation + toast; no raw Alert.alert; status filter works; RTL + dark

## TASK-D002
- **Title**: Build conversation thread screen (gifted-chat, meetup proposal)
- **Type**: fullstack
- **Priority**: P1
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: Backend: ensure GET /conversations/:id (detailed: listing, buyer, seller), GET /conversations/:id/messages (paginated asc), POST /conversations/:id/messages (body, kind), POST /listings/:listing_id/conversations (start flow). Mobile: src/screens/chat/Conversation.tsx using react-native-gifted-chat themed to NativeWind tokens. Pinned listing header card (thumbnail + PriceTag + StatusBadge). RTL bubbles. Read receipts (read_at). Meetup proposal action (kind: meetup_proposal) via @gorhom/bottom-sheet (place+time) → special bubble. Start flow: first-message sheet from listing detail; 422 (inactive/self/duplicate) → friendly toast → open existing if duplicate. Closed conversation → input disabled with notice. States: loading skeleton, empty thread (just listing header), send failure toast. Route: app/(main)/conversation/[id].tsx
- **Acceptance**: Can start from a listing and exchange messages; RTL bubbles correct; pinned listing visible; meetup proposal works

## TASK-G001
- **Title**: Build report sheet (report listing or user)
- **Type**: frontend
- **Priority**: P2
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: src/components/common/ReportSheet.tsx — @gorhom/bottom-sheet surface (no route). Props: reportableType ("Listing"|"User"), reportableId. RNR RadioGroup with 6 reasons: spam, inappropriate, fraud, wrong_category, prohibited_item, other. Optional RNR Textarea for note. Submit → POST /reports. Blocks self-report and duplicates (422 → toast). Success → close sheet + toast. Triggered from listing detail and public user profile.
- **Acceptance**: Sheet opens from both surfaces; all 6 reasons selectable; submit works; 422 handled gracefully; RTL + dark

## TASK-F002
- **Title**: Build Edit Profile screen
- **Type**: frontend
- **Priority**: P2
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: -
- **ReviewNotes**: -
- **Description**: src/screens/shared/EditProfile.tsx. Endpoint: PUT /users/me (user: firstname, lastname, phone, bio, city, province, lat, long, preferred_language). Sectioned form using react-hook-form + zod: (1) Identity — first/last name; (2) Contact — phone, bio (Textarea); (3) Location — city, province; (4) Language — preferred_language selector (en/ps/fa). Sticky save button + sonner-native toast on success/error. Prefill from GET /users/me. Route: app/(main)/profile/edit.tsx. Link from Profile screen F1.
- **Acceptance**: All fields save correctly; prefill works; language change persists; RTL + dark

## TASK-B001
- **Title**: Build browse feed screen (photo-first feed, search, category filter)
- **Type**: frontend
- **Priority**: P0
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-S001
- **ReviewNotes**: -
- **Description**: src/screens/buyer/Browse.tsx — replace existing raw RN implementation. Endpoint: GET /listings?search&category_id&page → listings[] + meta.pagination. UniversalList → @shopify/flash-list of ListingCard (from S001). Search bar: debounced RNR Input, clears, submit re-queries. Category filter: horizontal chip row (RNR Badge) + "All" + CategoryPicker sheet (@gorhom/bottom-sheet). Pull-to-refresh + infinite scroll (Pagy pagination). Save-heart on each card (optimistic). States: ListingCardSkeleton grid (loading), EmptyState "Nothing here yet", no-results "Nothing matches '<q>'" + Reset, error + retry. useFocusEffect refetch. Route: app/(main)/(tabs)/browse.tsx
- **Acceptance**: Photo-first, price prominent; search + category filter work; smooth on Android; RTL + dark; skeleton on load

## TASK-B002
- **Title**: Build listing detail screen (gallery, seller card, message CTA)
- **Type**: frontend
- **Priority**: P0
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-S001
- **ReviewNotes**: -
- **Description**: src/screens/shared/ListingDetail.tsx. Endpoint: GET /listings/:id (detailed: images[], description, location, seller{name,city}, category). ListingGallery hero: react-native-reanimated-carousel + expo-image + page dots. PriceTag (lg) → title → category + condition Badges → description → location (city). SellerCard: avatar, name, city → tap → public profile F3. Sticky primary "Message seller" button → opens first-message sheet (D2 start flow). Hidden/disabled if viewing own listing or not active. Save-heart in header. Report affordance → ReportSheet G1. StatusBadge + "posted X ago" + views count. States: skeleton (gallery + lines), error "Listing not found", sold/reserved banner. Route: app/(main)/listing/[id].tsx
- **Acceptance**: Gallery swipes; sticky CTA visible and functional; RTL + dark; sold/reserved states clear

## TASK-D001
- **Title**: Migrate conversations list screen to design system
- **Type**: frontend
- **Priority**: P1
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-S001
- **ReviewNotes**: -
- **Description**: src/screens/chat/Conversations.tsx exists with raw RN — replace entirely. Endpoint: GET /conversations (list: listing{title,thumbnail,status}, other_participant{name,city}, last_message_body, unread_count). UniversalList rows: participant avatar (expo-image) + listing thumbnail + last message (truncated) + time (formatDate) + unread badge (RNR Badge). Ordered by last_message_at. Tap → thread D2. Unread total drives the chat tab badge. States: skeleton rows, EmptyState "No conversations yet" + Browse button. useFocusEffect refetch.
- **Acceptance**: Unread counts correct; RTL row layout mirrors; dark mode; tab badge updates

## TASK-E001
- **Title**: Build saved / favorites screen
- **Type**: frontend
- **Priority**: P1
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-S001
- **ReviewNotes**: -
- **Description**: src/screens/buyer/Saved.tsx. Endpoints: GET /my/saved_listings (list, no pagination); save POST /listings/:id/save; unsave DELETE /listings/:id/unsave. UniversalList of ListingCard with save-heart toggle (shared across B1/B2 — must be consistent). Heart animates: optimistic toggle + sonner-native toast on error. Tap card → detail. States: skeleton, EmptyState "No saved items yet" + Browse button. useFocusEffect refetch. Route: app/(main)/(tabs)/saved.tsx
- **Acceptance**: Heart state consistent across B1/B2/E1; unsave updates list immediately; RTL + dark

## TASK-F003
- **Title**: Build public seller profile screen
- **Type**: frontend
- **Priority**: P2
- **Status**: AVAILABLE
- **Session**: -
- **Blocks**: -
- **BlockedBy**: TASK-S001
- **ReviewNotes**: -
- **Description**: src/screens/shared/UserProfile.tsx. Endpoint: GET /users/:id (public: full_name, bio, province, listings_count). Trust dossier layout: large avatar, name, city, member-since (formatDate), active-listings count, grid of their active listings (ListingCard, tap → detail). Report affordance → ReportSheet G1. Reached from SellerCard in listing detail. Route: app/(main)/user/[id].tsx
- **Acceptance**: All public info shown; listings grid works; report affordance present; RTL + dark

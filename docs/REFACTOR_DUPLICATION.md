# Hatiwal Mobile — Duplication & Shared-Component Refactor Plan

> **Goal:** stop repeating code. Extract a real shared-component / hook system so each
> pattern lives in **one** place. We implement these **one ticket at a time**, and every
> ticket lists the **variants/conditions each copy differs by** so a refactor never breaks
> existing behavior.
>
> Produced from a 6-way codebase audit (2026-06-14). Status legend: `⬜ todo` · `🟡 in progress` · `✅ done`.
> All paths are under `hatiwal-mobile/`. Line numbers are from the audit snapshot — re-confirm before editing.

---

## How to use this doc

1. Pick the next ticket (follow the **Recommended sequence** — low-risk foundations first).
2. Read its **Variants to preserve** list. That is the don't-break-it checklist.
3. Build the shared abstraction, migrate call sites one by one, eyeball **light + dark + RTL (ps/fa)**.
4. Flip the ticket to `✅` and note anything that changed behavior.

---

## TL;DR — the root causes

Three documented-but-missing pieces explain most of the duplication:

| Missing thing | Mandated by | Consequence |
|---|---|---|
| `UniversalList` | `mobile.prompt.md §7` | All **5 feeds** hand-roll their own `FlatList`; **none paginate** (feeds silently truncate to page 1). |
| `@gorhom/bottom-sheet` | `DESIGN_SYSTEM.md §4` | Not installed → **10 hand-rolled** `<Modal animationType="slide">` sheets. |
| `react-native-reanimated-carousel` + `ListingGallery` | `DESIGN_SYSTEM.md` | Every photo gallery is a hand-rolled paging `FlatList` (4 copies). |

Plus two screens bypass existing primitives, and `SellerListingCard` is a full fork of `ListingCard`.

**Good news — these are already shared and should be the reuse targets (do NOT fork them):**
`PriceTag`, `StatusBadge`, `UserAvatar`, `UserIdentity`, `VerifiedBadge`, `EmptyState`, `useLocalization`.

---

## Recommended sequence

Ordered so each ticket unblocks the next and risk ramps up gradually:

**Tier 0 — trivial, zero-risk foundations**
- R1 `LISTING_BLURHASH` constant
- R4 `localizedCategoryName()` + `useCategoryName()`
- R5 `useCategories()` hook

**Tier 1 — low-risk primitives**
- R2 `<RemoteImage>` (needs R1)
- R3 `<NoPhotoPlaceholder>`
- R8 `formatPrice()` single source
- R10 `<OverlayIconButton>`
- R11 `<SectionHeader>`

**Tier 2 — medium primitives/hooks**
- R6 `useRtlStyles()` / `<Row>` (highest churn — do incrementally)
- R7 `<SaveHeart>` + `useSaveToggle()`
- R9 `useStatusMeta()` taxonomy

**Tier 3 — components**
- R12 `<BottomSheet>` + `<SheetRow>` + `<SelectableRow>` (needs nothing; unblocks R13/R14)
- R13 `<SearchablePickerSheet>` (needs R12, R4)
- R14 Wire `ReportSheet` as the single report entry point (needs R12)
- R15 `<SearchBar>` + `<FilterChip>` + `<CategoryChips>` (needs R4, R6)
- R16 `<ListingGallery>` + `<FullscreenImageViewer>` (needs R2; carousel lib)

**Tier 4 — big structural (highest value, highest risk — do last, one at a time)**
- R17 `ListingCard` variant system — absorb the `SellerListingCard` fork (needs R2, R7, R16, R9)
- R18 Build `<UniversalList>` + `useFocusRefetch()` + `useAppMutation()` + pagination (needs most of the above)

---

# Tickets

## R1 — Single `LISTING_BLURHASH` constant ✅
**Impact:** trivial · **Risk:** none
The blurhash string `"L6PZfSi_.AyE_3t7t7R**0o#DgR4"` is redeclared in 5+ files.
- **Locations:** `ListingCard.tsx:22` (`PHOTO_BLURHASH`), `ListingDetail.tsx:69` (`BLURHASH`), `SellerListingCard.tsx:25` (`BLURHASH`), `Conversations.tsx:17` (`PHOTO_BLURHASH`), `PhotosSection.tsx:43`, `ListingHeader.tsx:67` (inline literal).
- **Do:** export one `LISTING_BLURHASH` (e.g. `src/constants/images.ts`); import everywhere.
- **Variants to preserve:** none — identical string.

## R2 — `<RemoteImage>` wrapper around `expo-image` ⬜  *(needs R1)*
**Impact:** 7 files · **Risk:** low
Same `<Image source={{uri}} placeholder={{blurhash}} contentFit="cover" transition>` copy-pasted everywhere.
- **Locations:** `ListingDetail.tsx:458,1001`, `PhotosSection.tsx:244`, `ListingCard.tsx:123`, `SellerListingCard.tsx:56`, `Conversations.tsx:125`, `ListingHeader.tsx:63-69`, `UserAvatar.tsx:38-44`.
- **Do:** `<RemoteImage uri contentFit? transition? dimmed? style />` with defaults `blurhash=LISTING_BLURHASH`, `contentFit="cover"`, `transition=250`.
- **Variants to preserve:**
  - `transition` differs by surface: **300** (card, detail inline+fullscreen), **200** (PhotosSection, ListingHeader, seller slide), **150** (Conversations, map tiles) — keep overridable.
  - `contentFit="contain"` for the fullscreen viewer (not cover).
  - `UserAvatar` has **no blurhash** + transparent bg → allow opting out of the blurhash default.
  - `ListingCard` dims viewed items `opacity:0.62`; `Conversations` dims sold/reserved `opacity:0.5` → `dimmed` prop.
  - `ListingHeader` uses `source={undefined}` so blurhash shows as the empty tile → keep that fallback path.

## R3 — `<NoPhotoPlaceholder>` ⬜
**Impact:** 5 copies · **Risk:** trivial
Centered `Camera` icon + `t("listing.noPhoto")` on a muted bg, rebuilt 5×.
- **Locations:** `ListingDetail.tsx:476-487` & `1007-1013`, `ListingCard.tsx:129-134`, `SellerListingCard.tsx:356-368`, `Conversations.tsx:128-130`.
- **Do:** `<NoPhotoPlaceholder size? caption? bg? />`; or make it the `renderEmpty` default of `<RemoteImage>`/`<ListingGallery>`.
- **Variants to preserve:** icon size 24/28/40; caption on/off (Conversations omits; fullscreen appends slide number); bg token `imagePlaceholder` vs `muted`.

## R4 — `localizedCategoryName()` + `useCategoryName()` ✅
**Impact:** 5 copies (pure logic) · **Risk:** low
`lang === 'ps' ? namePs : lang === 'fa' ? nameFa : nameEn` hand-written 5×.
- **Locations:** `Browse.tsx:26-30` (has `?? nameEn` fallback), `SellerProfile.tsx:39-44`, `CategoryPickerSheet.tsx:56-60`, `ListingForm.tsx:747-751` (takes `lang` arg), `ListingDetail.tsx:412-417` (inline). Parallel: `afghan_provinces.ts:48-55` `getProvinceName`.
- **Do:** pure `localizedCategoryName(cat, lang)` in `api/categories.ts` + `useCategoryName()` hook reading `i18n.language`.
- **Variants to preserve:** **adopt Browse's `?? nameEn` fallback everywhere** (safest); keep `i18n.language` as source so a language switch re-renders; ListingForm's call passes `lang` explicitly.

## R5 — `useCategories()` query hook ✅
**Impact:** 3 copies + a real inconsistency · **Risk:** low
`useQuery(["categories"])` declared 3× with **3 different `staleTime`s** (60min / unset / 5min) → unpredictable refetch.
- **Locations:** `Browse.tsx:56-60`, `SellerProfile.tsx:67-70` (no staleTime), `CategoryPickerSheet.tsx:48-52`.
- **Do:** `useCategories()` in `api/categories.ts` with one canonical `staleTime` (long — categories rarely change) + `[]` default.
- **Variants to preserve:** confirm CategoryPicker still gets fresh-enough data on open; SellerProfile should stop over-refetching (improvement).

## R6 — `useRtlStyles()` / `<Row>` — kill the inline RTL flip ⬜
**Impact:** ~156 inline sites across 22 files (BIGGEST win) · **Risk:** medium (high churn)
`flexDirection: isRtl ? "row-reverse" : "row"` (~86×) and `textAlign: isRtl ? "right":"left"` (~70×) everywhere, plus ~8 `left/right` edge swaps.
- **Heaviest:** `ListingDetail.tsx` (12+8), `Profile.tsx` (11+2), `MessageBubble.tsx` (9+11), `SellerProfile.tsx` (7+2), `Conversations.tsx` (7), `ListingForm.tsx` (6+8). `ListingCard.tsx:105` already has a local `metaRowDirection`.
- **Do:** `<Row>` (auto `flexDirection` from `isRtl`, forwards `gap/align/justify/style`) + `useRtlStyles()` → `{ row, textStart, startEdge: 'left'|'right' }`. Optionally an RTL-aware `Text` defaulting `textAlign` to start.
- **Variants to preserve:** many rows add `flexWrap/gap/justifyContent/alignItems` — `<Row>` must let callers fully override and must NOT force default `alignItems`/`gap`. Absolute `left/right` swaps are easy to invert — QA in ps + fa. Some sites use raw `RNText` vs reusable `Text`.
- **Strategy:** migrate **file-by-file**, not in one commit. Lowest-churn files first to validate the API.

## R7 — `<SaveHeart>` + `useSaveToggle()` ⬜
**Impact:** save logic in 3 screens + heart anim in 2 (already drifting) · **Risk:** medium (optimistic state)
- **Save logic locations:** `Browse.tsx:44-107` (`savedMap`, both mutations, seed-from-server effect), `SavedListings.tsx:21-42` (unsave only, filters list), `ListingDetail.tsx:229,307-330` (scalar `isSaved`, one branching mutation).
- **Heart anim locations:** `ListingCard.tsx:61-73,180-186` (spring 1.4/stiff 300) vs `ListingDetail.tsx:234-237,322-324,712-717` (spring **1.45**/stiff **320** — accidental drift).
- **Do:** `useSaveToggle(id, initial)` → `{ isSaved, toggle, isPending }` owning optimistic update + `saveListing`/`unsaveListing` + rollback. `<SaveHeart isSaved size onPress unsavedColor>` owning the spring + icon coloring.
- **Variants to preserve:** Browse re-seeds from `listings`; Detail invalidates `["listing",id]` on focus; **SavedListings removes the row on unsave** (don't lose that). Unsaved heart color differs: token on card vs `#fff` on photo overlay → prop. Detail fires the pop in `onMutate` (keep optional trigger point).

## R8 — `formatPrice()` single source (kill inline price strings) ⬜
**Impact:** 3 sites · **Risk:** low-medium (locale correctness)
Inline `${currency} ${Number(x).toLocaleString()}` bypasses `formatCurrency`/`PriceTag`.
- **Locations:** `ListingDetail.tsx:383` (Share msg), `ListingDetail.tsx:865` (offer-sheet listed price), `MessageBubble.tsx:94-95` (offer bubble).
- **Do:** decide one canonical price **string** helper (`formatPrice(amount, currency)`) used by both `PriceTag` and these string sites. These are strings (Share/i18n/bubble), so `PriceTag` can't drop in.
- **Variants to preserve:** ⚠️ `Intl` currency formatting for `AFN` under `fa-AF`/`fa-IR` may render Persian digits / localized symbol — **verify rendered output in all 3 locales** before swapping; match the current `"AFN 1,234"` style if that's desired.

## R9 — `useStatusMeta()` status taxonomy ⬜
**Impact:** 4 sites · **Risk:** medium (keep distinct visuals)
Status→meaning (`draft/active/reserved/sold` + `expired`) re-decided inline instead of one source.
- **Locations:** `SellerListingCard.tsx:254-281` (status→action switch) & `323-331` (custom expired badge), `Conversations.tsx:30-32,139-146` (sold/reserved overlay tag), `ListingDetail.tsx:778-782` (notice text), `ListingHeader.tsx:38-41` (status coercion).
- **Do:** `useStatusMeta(status)` → `{ label, isInactive, isTerminal, badgeBg, badgeFg }`. Keep distinct render components (`StatusBadge` pill, chat `StatusTag` overlay) but draw labels/booleans from one map. Add `expired` pseudo-status.
- **Variants to preserve:** the chat thumbnail tag and the expired amber badge are **intentionally different visuals** — refactor only the mapping/booleans, NOT the rendering.

## R10 — `<OverlayIconButton>` ⬜
**Impact:** ~3 styles · **Risk:** low
Circular translucent overlay button (back/heart/more, photo controls).
- **Locations:** `ListingDetail.tsx` `overlayBtn` 38px/0.45 (×3: 693/704/722), `ListingCard.tsx:274-282` heart 36px/0.35, `PhotosSection.tsx:450,471,486` (0.35/0.4/0.45).
- **Do:** `<OverlayIconButton size? opacity? onPress accessibilityLabel>{icon}</>`. Maybe a shared `OVERLAY_SCRIM` constant.
- **Variants to preserve:** size 36/38, opacity 0.35/0.45 as props; PhotosSection buttons have positioning + hitSlop.

## R11 — `<SectionHeader>` ⬜
**Impact:** 5+ sites + size drift · **Risk:** low
`fontSize:16 / fontWeight:600 / foreground / RTL start-align` re-typed; sheet titles drift 16/17/18.
- **Locations:** `ListingDetail.tsx:1132` (`sectionHead`, used 579/604/645), `Profile.tsx:127`, `SellerProfile.tsx:184,223`. Title drift: `ListingForm.tsx:681` (17), `MeetupSheet.tsx:83` (18), `ReportSheet.tsx:169` (18), `EmptyState.tsx:38` (18).
- **Do:** `<SectionHeader>` (16/600 + RTL start), or a `Text variant="sectionTitle"`. Consider a small type scale for 16/17/18.
- **Variants to preserve:** per-site `marginBottom/flex/padding`; don't force sheet titles down to 16.

## R12 — `<BottomSheet>` + `<SheetRow>` + `<SelectableRow>` ⬜
**Impact:** 10 hand-rolled sheets · **Risk:** medium
Every sheet rebuilds: `<Modal slide>` → backdrop `Pressable` → rounded-top card → padding.
- **The 10 sheets:** `ListingDetail.tsx:789` (more), `:830` (offer), `ReportSheet.tsx:138`, `CategoryPickerSheet.tsx:113`, `ProvincePickerSheet.tsx:63`, `MeetupSheet.tsx:62`, `SellerProfile.tsx:415` (block/report), `PhotosSection.tsx:341` (source), `ListingForm.tsx:665` (currency). (`LocationRangePicker.tsx:167` is a full-screen map modal — leave alone; fullscreen gallery `ListingDetail.tsx:936` fade-modal — leave alone.)
- **Do:** `<BottomSheet visible onClose handle? maxHeight? keyboardAvoiding? radius?>` owning Modal + standardized backdrop (pick `0.45`) + `useSafeAreaInsets().bottom` + optional handle + optional `KeyboardAvoidingView`. Plus `<SheetRow icon? label onPress destructive? trailing?>` (action rows) and `<SelectableRow leading? label selected onPress>` (Check + selected bg).
- **Variants to preserve:** backdrop opacity 0.45/0.4/0.3; radius 16 vs 20; handle bar present in Report/Meetup/SellerProfile only; `borderTopWidth` in some; **SellerProfile uses `onTouchEnd`+`stopPropagation` + absolute positioning** (the §5 documented pattern) — convert carefully. Bottom padding inconsistent (iOS 34/38 vs flat 32/16) → standardize on safe-area insets. maxHeight 88/90/80% (with inner ScrollView) vs auto-height. ⚠️ **offer sheet has `autoFocus` Input (`:906`) with NO KeyboardAvoidingView today** — give it `keyboardAvoiding`. MeetupSheet's existing `KeyboardAvoidingView` must be reproduced. Action rows: SellerProfile uses `RNText` (per §5) — keep `RNText` inside `<SheetRow>` to avoid the custom-Text context bug.
- **Note:** build on raw `<Modal>` now (matches §5 fallback). `@gorhom/bottom-sheet` is documented but **not installed** (needs gesture-handler + root wrap) → treat as a separate later task; expose `enablePanDownToClose` in the API as a migration seam.

## R13 — `<SearchablePickerSheet>` ⬜  *(needs R12, R4)*
**Impact:** Category vs Province pickers are near-twins · **Risk:** medium-high
Whole body duplicated: header(title+X) → Separator → search row → scrollable selectable list → Cancel.
- **Locations:** `CategoryPickerSheet.tsx:120-248`, `ProvincePickerSheet.tsx:70-161` (its comment literally says "exact same pattern as CategoryPickerSheet").
- **Do:** `<SearchablePickerSheet items getLabel selectedKey onSelect title searchPlaceholder>` on `<BottomSheet>`+`<SelectableRow>`, with an optional step/render slot for Category's two-step nav.
- **Variants to preserve:** Category is **two-step** (parent→sub, back button, chevrons, emoji icons, fetched); Province is flat/static. Search field mapping differs (`nameEn/namePs/nameFa` vs `en/ps/fa`). maxHeight 90 vs 80%. Don't flatten the two-step state machine.

## R14 — Make `ReportSheet` the single report entry point ⬜  *(needs R12)*
**Impact:** report UI duplicated-by-divergence · **Risk:** low-medium
Real `ReportSheet` exists but two call sites fake it: `SellerProfile.tsx:137-154` uses `Alert.alert`; `ListingDetail.tsx:388-391` just toasts and never opens the sheet.
- **Do:** open the real `<ReportSheet>` from both. Optionally swap its custom radio rows (`ReportSheet.tsx:201-252`) for RNR `RadioGroup` if it exists. Wrap in `<BottomSheet>`.
- **Variants to preserve:** the 6 reasons + note + 422 handling already in `ReportSheet`; selected/error states if swapping the radio block.

## R15 — `<SearchBar>` + `<FilterChip>` + `<ChipScrollRow>` + `<CategoryChips>` ⬜  *(needs R4, R6)*
**Impact:** search + chip rows across 4 screens · **Risk:** medium
- **Search bar:** `Browse.tsx:170-196` (server, 400ms debounce, no clear), `SellerProfile.tsx:313-346` (client instant, clear X), picker sheets use RNR `Input`.
- **Chip rows:** `Browse.tsx:298-329` (FlatList, "All" id:null), `SellerProfile.tsx:348-384` (map, no scroll, hardcoded `"white"` ← **token bug**), `MyListings.tsx:55-90` (status tabs), `Conversations.tsx:273-313` (filter chips w/ icons), `SavedSearchItem.tsx:38-74` (non-toggle, delete X).
- **Do:** `<SearchBar value onChangeText onClear? debounceMs?>` (RTL, wraps RNR `Input`). `<FilterChip active label onPress trailing?>` + `<ChipScrollRow>` (RTL horizontal). `<CategoryChips categories selectedId onSelect includeAll>` composing them + `useCategoryName`.
- **Variants to preserve:** debounce-vs-instant and **server-refetch vs client-`useMemo` filter** stay caller's choice (component only reports `onSelect`). Browse selection flows into queryKey; SellerProfile filters client-side and **lacks horizontal scroll today** (fix it). Fix `"white"` → `colors.primaryForeground`. SavedSearchItem is non-toggle w/ delete + `maxWidth`. Keep RTL ordering identical. Status tabs (MyListings) and Conversations chips compose `<FilterChip>` but keep their distinct active-text tokens + leading icons.

## R16 — `<ListingGallery>` + `<FullscreenImageViewer>` ⬜  *(needs R2; carousel lib)*
**Impact:** 4 hand-rolled paging galleries · **Risk:** medium-high (animation coupling)
- **Locations:** `ListingDetail.tsx:434-474` (inline hero, `GalleryDot` 166-185), `:968-1047` (fullscreen modal, own dots), `SellerListingCard.tsx:295-354` (card gallery, `PhotoSlide`/`PhotoSkeleton` 28-63).
- **Do:** `<ListingGallery photos width aspectRatio? contentFit? showDots? dotVariant? initialIndex? onIndexChange? onPhotoPress? renderEmpty?>` on `react-native-reanimated-carousel` (per DESIGN_SYSTEM). `<FullscreenImageViewer photos initialIndex visible onClose>` reusing it with `contentFit="contain"`.
- **Variants to preserve:** index tracking differs (`onViewableItemsChanged`+50% vs `onMomentumScrollEnd`+math) — pick one but verify which photo the dots highlight mid-swipe. Width basis: `SW` vs `cardWidth (window-32)`. Aspect 4:3 cover vs fullscreen contain. **3 dot designs:** animated spring (detail), tappable (fullscreen), plain (card). Only SellerListingCard has per-slide load shimmer. Tap: detail→fullscreen, card→edit, fullscreen→none. `cachePolicy="memory-disk"` only on fullscreen. ⚠️ **HIGH COUPLING:** the inline gallery is wrapped in `Animated.View galleryHeightAnim` (`:431,249-266`) driving a reanimated collapse-on-scroll tied to the screen's `scrollY` — the component must accept an external animated style/height or expose its inner View, or the collapse breaks. Keep `onViewableItemsChanged`/`viewabilityConfig` as **stable refs** (file notes the "changing on the fly" invariant). Fullscreen `animationType="fade"` + iOS/Android paddingTop. Collapse two index states (`photoIndex` / `galleryPhotoIndex`) into one.

## R17 — `ListingCard` variant system (absorb the `SellerListingCard` fork) ⬜  *(needs R2, R7, R9, R16)*
**Impact:** ~150+ lines of layout collapse · **Risk:** medium-high
`SellerListingCard` independently re-implements ListingCard's photo + body. Highest-value consolidation.
- **Locations:** `ListingCard.tsx:107-235` vs `SellerListingCard.tsx:284-444`.
- **Do:** add `variant?: "buyer"|"seller"` + opt-in props `showCounts?` (views + tappable conversations), `showCarousel?` (multi-photo via R16), `footer?: ReactNode` (seller action bar). Move carousel + "Expired" badge into `ListingCard`; `SellerListingCard` shrinks to its 7 mutations/handlers + `<ListingCard variant="seller" showCounts showCarousel footer={actionBar} onPress={edit} />`.
- **Variants to preserve:** buyer card = single `thumbnailUrl`, save-heart, isViewed dim, location+date, taps to detail, grid width; seller card = multi-photo carousel, **always** StatusBadge + **custom amber "Expired" badge** (`:323-331`), views + **tappable** conversations count (navigates), **no** save-heart/isViewed, action bar (publish/reserve/markSold/unpublish/activate/renew/edit/delete + 7 `confirmAlert`), taps to **edit**, full width. Press feedback: card uses Reanimated opacity + android_ripple, seller plain Pressable. Carousel `getItemLayout` needs **measured** width, not `window.width`.
- **Quick bug to fix here:** `ListingDetail.tsx:667-674` passes `<ListingCard className="w-40">` but `ListingCardProps` has **no `className`** and never consumes it → the "Similar" rail cards have **no width constraint** (silently dropped). Add a real `width`/`style` API and give the rail a ~160px fixed width.

## R18 — `<UniversalList>` + `useFocusRefetch()` + `useAppMutation()` + pagination ⬜  *(needs most above)*
**Impact:** root cause, 5 feeds · **Risk:** highest (do last, one feed at a time)
`UniversalList` is mandated by `mobile.prompt.md §7` but **does not exist**; every feed hand-rolls a `FlatList` and **none paginate**.
- **Hand-rolled shells:** `Browse.tsx:335-373` (2-col), `SavedListings.tsx:64-99` (2-col), `MyListings.tsx:93-122` (1-col), `SellerProfile.tsx:240-412` (2-col, header-in-list), `Conversations.tsx:316-339` (1-col).
- **`useFocusEffect` two idioms:** **refetchKey bump** (`Browse.tsx:42,54,65`, `SavedListings.tsx:20,23,26`, `MyListings.tsx:27,29,32` — pollutes query keys) vs **refetch/invalidate** (`Conversations.tsx:232`, `SellerProfile.tsx:96-100`, `ListingDetail.tsx:291-295`, `Conversation.tsx:212`).
- **Mutation boilerplate:** `onError: () => toast.error(t('common.error'))` ×12 (7 in `SellerListingCard.tsx:95-149` alone, `ListingDetail.tsx:328,339,356`).
- **Skeletons:** 4 different wirings + private `SkeletonBlock` re-implemented in `ListingDetail.tsx:78` & `SellerListingCard.tsx:29` (exists unexported in `ListingCardSkeleton.tsx:11`); `SellerProfile.tsx:158-164` uses a bare `ActivityIndicator` (no skeleton).
- **EmptyState:** hand-rolled in `SellerProfile.tsx:405-411` vs shared `<EmptyState>` everywhere else.
- **Pagination:** API fully models it (`listings.ts:62-92`) but **no feed reads `.pagination`/does `onEndReached`** → feeds show page 1 only; `SellerProfile` masks with `pageSize:50`.
- **Do:** build `<UniversalList config>` per the prompt's `UniversalListConfig<T>` (infinite query, searchable+debounced, refreshable, numColumns, ListHeaderComponent, skeleton grid/rows/custom, EmptyState w/ no-results variant, built-in focus refetch). Plus `useFocusRefetch()` (standardize on `refetch`/`invalidate`, drop the refetchKey integer), `useAppMutation()` (or a global QueryClient `onError`), and export `SkeletonBlock`.
- **Variants to preserve:** per-screen `numColumns`, search server-vs-client, refresh present/absent (SellerProfile none), SellerProfile's header-in-list + client `useMemo` filter, Conversations' `deletedIds` post-filter, SavedListings' optimistic-unsave filter, Saved being genuinely **non-paginated** (`paginated:false` opt-out). ⚠️ switching `useQuery`→`useInfiniteQuery` changes data shape (`data.pages` vs `data.items`) — migrate each feed's optimistic/filter code in lockstep. Removing refetchKey changes cache identity — migrate keys + dependent optimistic seeding together.

---

## Cross-references found while auditing (not duplication, worth noting)
- **Real bug:** `ListingCard className="w-40"` dropped (see R17).
- **Locale-correctness risk:** inline price strings (R8) — verify ps/fa output.
- **Token violation:** `SellerProfile` chip active text hardcodes `"white"` (R15) instead of `colors.primaryForeground`.
- **Stale doc:** `ReportSheet` header comment claims `@gorhom/bottom-sheet` but uses raw `<Modal>` (lib not installed).
- **Inconsistency:** `SellerProfile` uses `ActivityIndicator` where every other feed uses a skeleton (R18).

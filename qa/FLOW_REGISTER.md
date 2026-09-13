# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**152 of 258 flows passing** · 102 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 152 | green, and no backend error underneath |
| FAIL-assert | 75 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 24 | failed, cause unclear — read the log |
| (rig) | 3 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 2 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `listings` — Seller create/edit/delete + the 3-state lifecycle (Draft/Live/Sold) — Mark sold is always the one-tap primary, no Reserved tab

21/40 passing · 16 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-528 | 267 | PASS (run-525, 275s) — and it is the reference: it scrolls to each field before tapping, which is exactly what its three failing siblings were missing. |  |
| `create_listing_all_fields` | FAIL-assert ⟳stale | run-528 | 257 | flow — the description scroll WORKED and the failure MOVED one field. run-525 died on `listing-form-description-input`; run-528 dies on `listing-form-price-input`, which is a different field and a different direction. Price sits ABOVE description in the form (ListingForm.tsx: price ~1400, description ~1785), so scrolling DOWN to the description leaves price above the viewport, and the price `tapOn` had no scroll at all — `tapOn` never scrolls. Added scrollUntilVisible direction UP with centerElement. Still 0/7, but one field further along. | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
| `create_listing_category_search` | FAIL-assert | run-528 | 206 | flow — FIXED. Typed "Elect" then asserted "Electronics" after only a waitForAnimationToEnd, but FILTERING a category list is a data operation, not an animation. "Electronics" is not stale copy either — it comes from the API's categories, not i18n. Converted to extendedWaitUntil (15s). | [Failed] create_listing_category_search (3m 4s) (Assertion is false: "Electronics" is visible) |
| `create_listing_currency_eur` | PASS | run-528 | 252 | flow — **FIXED, CONFIRMED**. Second fix of this campaign that holds. sha 198aa2244b02 FAILED five consecutive runs (498, 502, 506, 517, 525); commit 66c3093 (scroll to the field the keyboard covers) changed it to sha d1b204d29bd0; run-528 PASSED at 252s. Trustworthy because the flow was STABLE FAIL 0/5. | My Shop list is virtualised, so an unrendered card is absent; now searches. Price is one node (€250.00). |
| `create_listing_currency_usd` | PASS | run-528 | 272 | PASS in run-528 (272s) at the new sha 51c4e9ae9adf, but NOT claimable: at the old sha it was 1/5 — it had already passed once in run-517 — so it is FLAKY and a single pass proves nothing. Needs 3+ consecutive runs before the same fix can be credited here. | Asserted "$450" — `$` is a regex end-anchor, so it could never match. |
| `create_listing_draft_discard` | FAIL-assert | run-528 | 206 |  | [Failed] create_listing_draft_discard (3m 5s) (Assertion is false: "Discard changes?" is visible) |
| `create_listing_draft_restore` | FAIL-assert | run-528 | 298 | flow | "Draft saved" is a toast from toast.success; a bare assert races it. Now polls. |
| `create_listing_full_publish` | PASS | run-528 | 289 |  | AxiosError |
| `create_listing_multi_quantity` | FAIL-assert ⟳stale | run-528 | 237 | flow (heading off screen) — the flow taps the inert "Create Listing" HEADING to blur a field, which is the right trick: `hideKeyboard` is BACK on Android and a dirty form intercepts BACK as "Discard changes?" (run-034). But the heading sits INSIDE the scroll view, not in a fixed header, so once the form has scrolled and the keypad covers the lower half it is off the top — and `tapOn` never scrolls. run-528 died at step-75 on `Element not found: Text matching regex: Create Listing`, a heading that is present and correct. Added scrollUntilVisible direction UP before BOTH heading taps. Kept the tap, not hideKeyboard. | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | run-528 | 241 |  |  |
| `create_listing_publish_blocked` | FAIL-assert ⟳stale | run-528 | 269 | flow (heading off screen) — same cause, assert instead of tap. Died at step-96 on `"Create Listing" is visible`, the check that the form is STILL OPEN after a blocked publish. By then the flow has scrolled down to reach Publish, so the heading is above the viewport and assertVisible means ON SCREEN. The line above it (`assertNotVisible: "Your listing is live!"`) already proves the form is open, so this was never about state. Added scrollUntilVisible direction UP before it. | Touched the form before the location sheet closed; the helper allows 45s for it. |
| `create_listing_publish_direct` | PASS | run-528 | 305 |  |  |
| `create_listing_publish_requirements` | PASS | run-528 | 225 |  |  |
| `create_listing_quantity_edges` | FAIL-assert | run-528 | 247 | flow (heading inside the scroll view) — died at step-84 on the LATE `"Create Listing"` assert (line 130, not the one at line 27), the check that the form is still open after Save Draft refuses quantity 1000. By then the flow has scrolled to the quantity field, so the heading is above the viewport. Third flow of this face, after create_listing_multi_quantity and create_listing_publish_blocked. Added scrollUntilVisible UP. | Field maps empty to 1, so eraseText appends. Blur-then-focus lets selectTextOnFocus replace. |
| `create_listing_title_edges` | PASS | run-528 | 252 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS | run-528 | 212 |  |  |
| `create_listing_with_condition` | PASS | run-528 | 517 | PASS in run-528 (517s) at sha 55325c0659f3 — UNCHANGED since August, so this is NOT a campaign fix and is not claimable. Its four prior failures span three different kinds (app_bug_or_flow, rig_fail at 602s, app_error), i.e. environment-sensitive rather than stably broken. Now 1/4 once the rig_fail row is excluded. A reminder that STABLE FAIL is provisional: 0/4 can become 1/5 with no edit at all. | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-517 | 214 |  |  |
| `delete_listing` | PASS | run-517 | 196 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert | run-517 | 251 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | PASS | run-517 | 212 |  |  |
| `edit_listing_all_fields` | FAIL-assert | run-517 | 180 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | PASS | run-517 | 167 | STALE — run-252 executed the old route (commands.json proves it); already fixed | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | PASS | run-517 | 231 |  |  |
| `edit_listing_remove_photo` | FAIL-assert | run-517 | 202 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-assert | run-517 | 233 | flow — optional gallery tap no-opped silently; now by testID. Fixed 34e713a | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert | run-517 | 169 | flow — tab switch refires the request; nothing waited for the list. Fixed 34e713a | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | FAIL-assert | run-517 | 189 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | PASS | run-517 | 215 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | FAIL-assert | run-517 | 226 |  | [Failed] lifecycle_reserve (3m 31s) (Element not found: Text matching regex: Contact Seller) |
| `lifecycle_sold` | PASS | run-517 | 179 |  |  |
| `lifecycle_unpublish` | PASS | run-517 | 179 |  |  |
| `listing_analytics_sparkline` | FAIL-assert | run-517 | 174 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | run-517 | 157 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert | run-517 | 169 | flow — same missing wait as expired_listing_badge. Fixed 34e713a | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | FAIL-assert | run-517 | 192 | flow — swipe fix already present; tab taps now by testID (SOLD badge collided). Verdict stale | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-assert | run-517 | 172 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | PASS | run-517 | 168 | flow — same; executed step was pre-swipe scrollUntilVisible. Verdict stale | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | PASS | run-517 | 163 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-assert | run-517 | 200 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile — a reserved listing stays searchable + messageable, and a held batch shows its hold

25/42 passing · 15 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-519 | 204 |  | AxiosError |
| `browse_listings` | FAIL-? ⚠slow | run-519 | 1747 |  | [Failed] browse_listings (28m 50s) |
| `browse_sort_most_viewed` | PASS | run-519 | 172 | flow — chip strip. Labels are NOT stale (browse.json still has sort.mostViewed/nearest, FilterSheet SORT_OPTIONS renders 5 chips in a horizontal ScrollView). The blind `repeat 6x swipe 85%->20% @74%/68%` is not scrolling that strip at all: 6 iterations move ~2800dp, five chips need ~200. Replace with scrollUntilVisible direction:RIGHT. NOT yet verified on device. | AxiosError AxiosError |
| `browse_sort_nearest` | PASS | run-519 | 5660 | flow — same chip strip as browse_sort_most_viewed. Extra wrinkle: `nearest` is NOT in SORT_OPTIONS; it is a separate chip (FilterSheet:409) that acquires location on tap, so it may also need a location fixture. |  |
| `categories_hub` | PASS | run-519 | 184 |  |  |
| `clear_all_filters` | PASS | run-519 | 176 |  |  |
| `filter_active_sellers` | PASS | run-519 | 170 |  |  |
| `filter_by_category` | PASS | run-519 | 179 |  |  |
| `filter_condition` | PASS | run-519 | 224 |  |  |
| `filter_price_range` | PASS | run-519 | 215 |  |  |
| `full_marketplace_cycle` | FAIL-assert | run-519 | 254 | flow — doubled search (missing eraseText) + inherited price filter emptied the feed; fixed | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_contact_whatsapp` | PASS | run-519 | 212 |  |  |
| `listing_detail` | PASS | run-519 | 257 | flow — converted to open_listing_by_title.yaml (search instead of scrolling a ~98-listing feed). Helper is proven in run-496 via reserve_after_accept. |  |
| `listing_detail_held_units_transparency` | FAIL-assert | run-519 | 473 | REVERT CONFIRMED — no longer exits the app (run-494 fails on `listing-card` not visible, not the Android home screen). The hideKeyboard->drag revert worked here. Remaining failure is the scroll race. | [Failed] listing_detail_held_units_transparency (7m 25s) (Assertion is false: "Switch to .*" is visible) |
| `listing_detail_multi_quantity` | FAIL-? | run-519 | 233 | flow — scroll stopped at the clipped bottom row so the price row never showed; centred. API data verified correct | [Failed] listing_detail_multi_quantity (3m 28s) (No visible element found: "Phone Case Silicone Clear - Wholes |
| `listing_detail_offer` | PASS | run-519 | 266 | flow — converted to open_listing_by_title.yaml. |  |
| `listing_detail_offer_invalid` | FAIL-? | run-519 | 209 |  | [Failed] listing_detail_offer_invalid (2m 50s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_price_drop_badge` | FAIL-? | run-519 | 208 | flow — scroll race (Lenovo ThinkPad Laptop Core i5 8GB). Gated on open_listing_by_title rollout. | [Failed] listing_detail_price_drop_badge (3m) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |
| `listing_detail_quantity_intent` | FAIL-assert | run-519 | 280 | flow — both listing opens converted to open_listing_by_title.yaml. | [Failed] listing_detail_quantity_intent (4m 3s) (Assertion is false: "Phone Case Silicone Clear - Wholesale" i |
| `listing_detail_report` | PASS | run-519 | 244 | flow — converted to open_listing_by_title.yaml. | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_reserved_contactable` | PASS | run-519 | 185 |  |  |
| `listing_detail_save_unsave` | FAIL-assert | run-519 | 272 | flow — CORRECTED DIAGNOSIS. Not a scroll-length problem: this flow calls the opener straight after login.yaml, and login.yaml ENDS ON THE PROFILE SCREEN (its last steps are ensure_english + ensure_buyer_mode, both working the profile's mode toggle). So the feed was never on screen and no scroll timeout could have helped. Now uses open_listing_by_title.yaml, which reaches the Bazaar feed itself. | [Failed] listing_detail_save_unsave (4m 11s) (Assertion is false: id: listing-card is visible) |
| `listing_detail_saves_count` | FAIL-assert | run-519 | 192 | flow — tapped the save TOGGLE blind and unsaved it, so savesCount hit 0; now state-aware | [Failed] listing_detail_saves_count (2m 53s) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-519 | 167 |  |  |
| `listing_detail_similar` | PASS | run-519 | 184 |  |  |
| `listing_detail_sold_recovery` | FAIL-? | run-508 | 166 | rig — 'emulator died and could not be rebooted'. Host disk was 98% full and swap exhausted; pruned 2026-09-05. Re-run. | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | FAIL-assert | run-508 | 151 | flow — same cold-start deep-link loss; fixed alongside sold_recovery | [Failed] listing_detail_sold_state (2m 17s) (Assertion is false: "Description" is visible) |
| `listing_detail_views_count` | PASS | run-508 | 210 |  |  |
| `not_interested` | PASS | run-508 | 149 |  |  |
| `saved_search_apply` | FAIL-assert | run-508 | 178 | flow — tapped the SHEET's "Clear" after closing the sheet; now the feed's clear-filters chip | [Failed] saved_search_apply (2m 44s) (Assertion is false: "Saved search" is visible) |
| `scroll_to_top` | PASS | run-508 | 154 |  |  |
| `search_empty_state` | FAIL-assert | run-508 | 167 |  | [Failed] search_empty_state (2m 33s) (Assertion is false: "No listings found" is visible) |
| `search_listings` | FAIL-assert | run-508 | 228 |  | [Failed] search_listings (3m 34s) (Assertion is false: "No listings found" is visible) |
| `search_with_filter` | PASS | run-508 | 182 |  |  |
| `seller_profile` | FAIL-? | run-508 | 156 |  | [Failed] seller_profile (2m 22s) (No visible element found: "Wool Blanket Handmade King Size") |
| `seller_profile_from_listing` | PASS | run-508 | 162 |  |  |
| `seller_response_rate_badge` | FAIL-? ⚠slow | run-508 | 39235 | flow — anchored pattern started mid-label; badge renders "82% reply rate · Usually responds…" as one Text | [Failed] seller_response_rate_badge (10h 53m 40s) (No visible element found: "Phone Case.*") |
| `subcategory_drilldown` | PASS | run-508 | 172 | flow — chip reads "Subcategory: Phones & Tablets"; the two chip asserts still said "Phones" | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | FAIL-? | run-508 | 162 | flow — index 0 of a recency-ordered inbox reached Fatima (owns a listing); now targets Ahmad | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | PASS | run-508 | 162 | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | PASS | run-508 | 153 | flow — asserted a "Message" button the profile has never had (contact is per-listing by design) | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | PASS | run-508 | 190 | REVERT CONFIRMED — PASSED in run-494 after the hideKeyboard->drag revert. | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `chat` — Conversations, messages, offers, meetup arrangement, read state — mark-sold one-tap from the thread, place/release a hold with the buyer you're already talking to

32/49 passing · 15 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-526 | 244 | PASS on a quiet box (run-523) — confirms the extendedWaitUntil-before-conversation-row fix. |  |
| `block_from_conversation` | PASS | run-526 | 171 | CANDIDATE APP BUG (not filed — mechanism unproven). On a QUIET pass (run-523, 188s, zero SUSPECT/rig_fail) the unblock SUCCEEDED — step-081 asserted the "User unblocked" toast — and step-082's hierarchy still shows "You can't message this user." with NO composer. Server verified clean at that moment: GET /blocks returns {"users":[]} and 0 of 8 conversations are flagged blocked, so the unblock committed and blockedWithParticipant is correctly false. Mechanism candidate: unblockMutation.onSuccess sets blockedByMe false then calls load() EXACTLY ONCE with no retry; isBlocked is re-derived only from that single fetch (Conversation.tsx:565), so if it races the commit the banner stays up until the user navigates away. Cannot be proven from the artifacts — the logcat does not record API traffic. TO CONFIRM: re-run and, on failure, navigate out of the thread and back; if the composer returns, the single-shot refetch is the bug. | 2026-09-05 CAUSE FOUND, board BLK-2. The block SUCCEEDS server-side (INSERT+COMMIT in the API log; endpoint returns 204 by hand) while the app shows "Could not block user. Try again." 401s in the same window and devise rotates the token per request; http.ts clears the session on any 401. Load-sensitive: passed at 147s on a quiet host. Supersedes the older #312 note. |
| `chat_older_messages_pagination` | PASS | run-526 | 165 |  | AxiosError |
| `composer_draft` | PASS | run-526 | 202 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | PASS | run-526 | 186 | PASS on a quiet box (run-523) — confirms the extendedWaitUntil-before-conversation-row fix; this is the flow whose hierarchy dump originally proved the list had not loaded. |  |
| `conversation_delete` | PASS | run-526 | 167 | flow — NOT a My Shop case, checked before converting: it taps chat-tab and scrolls the CONVERSATIONS list, so search_my_shop.yaml would be the wrong tool. Its fixture "QA Disposable conversation_delete" IS present and active. Needs the conversations search bar instead — same idea, different list. | 2026-09-02: soft-DELETED its own fixture. Targeted the shared Xiaomi thread as "safe because SOLD"; the delete stamped buyer_deleted_at (09-01 17:54) so not_deleted_for hid it from the buyer for good and every later run failed. App was correct. Now owns "QA Disposable conversation_delete"; the seed clears delete/archive flags on disposable convos each run. |
| `conversation_read_status` | PASS | run-526 | 194 | flow — same list race as conversation_archive. 1 `Network Error` line in its logcat. | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | run-526 | 221 |  | AxiosError |
| `conversations_empty_state` | FAIL-assert | run-526 | 171 | flow — `register-email-input` not found, but it IS current (Register.tsx:232), so this is a reach/timing failure: the flow never got to the Register screen. Needs its own read; ran on a QUIET pass (176s, no SUSPECT/rig_fail) so the result is trustworthy. | [Failed] conversations_empty_state (2m 35s) (Element not found: Id matching regex: register-email-input) |
| `conversations_filter` | PASS | run-526 | 226 | rig/env — inside the 14:47-14:59 window where four flows failed consecutively; asserts `profile-tab` (a signed-in tab bar) and does not get one. 1 `Network Error` line. | 2026-09-02: asserted the "All caught up!" EMPTY state on the Unread tab, which 3 sibling flows mutate and the seed gives exactly ONE unread. Order-dependent. Now branches with runFlow: when (native in 2.7.0). |
| `conversations_list` | PASS | run-526 | 180 | rig/env — same window. 2 `Network Error` lines. The 'Unread' label is NOT stale (chat.json filters.unread = 'Unread', and it is visible in conversation_archive's screenshot). |  |
| `conversations_role_filter` | FAIL-? ⟳stale | run-526 | 240 | flow — MY FIRST FIX MADE IT WORSE; corrected. The scrollUntilVisible direction:RIGHT I added did not just fail to find role-chip-selling: run-526's end-of-flow screenshot is a CONVERSATION THREAD (bubbles, composer, "Mark Sold" header), so the unanchored directional swipe landed on a conversation row and OPENED it, after which the chips genuinely did not exist. The asserts above it (Messages, All, role-chip-buying) all passed, so the flow was on the list until that step. Replaced with a swipe anchored to `conversations-filter-chip-row`, which keeps the gesture inside the scroller. | 2026-09-02: asserted 2 listings on screen at once; they sit at positions 10-11 of a 24-thread seller inbox (the seed adds 6 badge threads at 18-22). Positive asserts now scroll. NB the assertNotVisible ones are weak by nature — filtered-out and below-the-fold are indistinguishable to Maestro; documented in the flow. |
| `dead_end_notice_absent_when_active` | PASS | run-526 | 238 | flow — login silently skipped. Asserts `profile-tab` (a signed-in tab bar) and does not get one. See _helpers/login.yaml's unguarded `when: visible: login-email-input` — no wait, so a slow login screen means the whole sign-in block is skipped and the 60s profile-tab gate can never pass. 1 `Network Error` line. |  |
| `dead_end_notice_sold` | FAIL-assert | run-526 | 254 | NOT an app bug — verified end to end, and the notice was RIGHT to be absent. The fixture is correct (conversation 1775, listing "Xiaomi Redmi Note 11 128GB", API says status=sold), and showUnavailableNotice (threadAvailability.ts:59) requires viewerKnown && !isOwner && !listingDeleted && status==="sold". The failing term is !isOwner: the end-of-flow screenshot shows the OTHER participant as "A" (Ahmad Karimi, the buyer), so the viewer was the SELLER, and the composer is present — exactly an owner's view. The notice is deliberately never shown to the listing's own seller. This flow logs in via login.yaml (buyer), so it is another instance of the WRONG-ACCOUNT family (see 7d84539), not a UI defect. The thread was also EMPTY ("No messages yet"), so check it opened the intended Xiaomi conversation. | [Failed] dead_end_notice_sold (3m 55s) (Assertion is false: id: listing-unavailable-notice is visible) |
| `delete_message` | PASS | run-526 | 258 | app+flow | 2026-09-02: failed on "Delete message" with the message sent and visible. Cause was the APP — the bubble sat behind the composer bar so the long press hit the bar and no sheet opened. Fixed structurally in 61ad571 (list ends at the bar). Flow also now waits for the sheet's animation. |
| `jump_to_latest` | PASS | run-526 | 340 | flow — same login skip. Fails on `No visible element found: "Switch to .*"`, which is login.yaml's post-login mode check; it can only be reached authenticated. | 2026-09-05 "Switch to .*" was OFF-SCREEN on a scrolled profile, not missing — the app was signed in and healthy in the screenshot. ensure_buyer_mode now scrolls UP to recover it (UP matters: a previous fix used a DOWN scroll and carried the toggle further away). |
| `lifecycle_from_chat` | FAIL-assert | run-526 | 382 | REGRESSION vs run-523 — passed there, fails here on `"View Listing" is visible`. Not obviously related to any change made in this campaign; needs its own read from run-526's artifacts before anything is done to it. | [Failed] lifecycle_from_chat (6m 3s) (Assertion is false: "View Listing" is visible) |
| `mark_read` | PASS | run-526 | 241 | flow — asserts the LOGIN tagline 'Buy and sell locally in Afghanistan' is visible and it is not. Needs its own read once the login helper is fixed; the session state it assumes is the thing currently unstable. | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | PASS | run-526 | 222 | FAIL -> PASS in run-526, but NOT from a fix — nothing in this campaign touched it. Same intermittent family as block_from_conversation and conversation_delete; its earlier failure was the EMPTY-thread problem, so the fixture/thread state it lands on varies. | 2026-09-02: asserted an unread badge exists then tapped conversation-row index 0 — the newest thread, not necessarily the unread one. The divider only exists inside a thread with unread messages. Now taps unread-badge, which bubbles to its own row. |
| `meetup_decline` | FAIL-assert | run-526 | 403 | flow — fails on login_seller.yaml's mode gate (`"Switch to .*" is visible`, line 342), NOT a missing toggle: the hierarchy at the failing step is the Profile screen scrolled DOWN into settings (ACTIVITY, Appearance, Blocked Users, Language), and the toggle is at the TOP. The gate does not scroll — the file says so itself at line 118. Fix written up as PENDING fix 9 for that file's owner; the working pattern is the UP scroll in _helpers/ensure_buyer_mode.yaml:114. | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | PASS | run-526 | 547 | flow — same mode-gate failure as meetup_decline (PENDING fix 9). NOTE the listing-opener conversion WORKED here: the final hierarchy has no browse-search-input, so it left the feed correctly and got much further than before. | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | PASS | run-526 | 264 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | PASS | run-526 | 310 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | FAIL-assert | run-526 | 454 | PASS on a quiet box (418s) — and it was deliberately NOT converted to open_listing_by_title (it searches the PARTIAL title "Phone Case" while the helper asserts the exact one). Leaving it alone was right. | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | PASS | run-526 | 282 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | PASS | run-526 | 304 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-assert | run-526 | 275 | rig (identity switch) — NOT an app bug, NOT timing. run-526's logcat carries the owner notice itself: `TextView; text: This is your listing; boundsInScreen: Rect(258, 1180 - 510, 1180); visible: false`. `isOwnListing` (ListingDetail.tsx:472) was TRUE, so currentUser.id was 420 (Omar Noori) — the app was signed in as the SELLER while the flow had run login.yaml (buyer@hatiwal.test, id 419) and its guard had visibly fired (step-027 sign-out, step-044 login-email-input). Fixture verified clean via the API as the buyer: listing 3210 active, negotiable, 1 available, 0 held, not expired, price 3500.0 (matches the screenshot), seller 420, buyer owns ZERO listings, /blocks empty. So the app was RIGHT to hide "Make an Offer". RETRACTING my own fix: the 20s extendedWaitUntil read an absent button as a slow one and could never have helped. Root cause is login.yaml (7d84539's file) — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | 2026-09-05 scroll-to-title; searches inline and taps the card BY testID — after typing, the title is also the search input's own text, so a text tap can hit the field (flow_lint SEARCHTAP). |
| `offer_in_existing_thread` | FAIL-assert | run-526 | 254 | flow — fails on `"Send Offer" is visible`; same pass, and it also LEFT THE FEED. Likely the same action-area readiness race as its siblings but on a different control — apply the same extendedWaitUntil treatment once confirmed. | [Failed] offer_in_existing_thread (3m 55s) (Assertion is false: "Send Offer" is visible) |
| `offer_quantity_round_trip` | FAIL-assert | run-526 | 269 | rig (identity switch) — NOT an app bug, NOT timing. run-526's logcat carries the owner notice itself: `TextView; text: This is your listing; boundsInScreen: Rect(258, 1180 - 510, 1180); visible: false`. `isOwnListing` (ListingDetail.tsx:472) was TRUE, so currentUser.id was 420 (Omar Noori) — the app was signed in as the SELLER while the flow had run login.yaml (buyer@hatiwal.test, id 419) and its guard had visibly fired (step-027 sign-out, step-044 login-email-input). Fixture verified clean via the API as the buyer: listing 3210 active, negotiable, 1 available, 0 held, not expired, price 3500.0 (matches the screenshot), seller 420, buyer owns ZERO listings, /blocks empty. So the app was RIGHT to hide "Make an Offer". RETRACTING my own fix: the 20s extendedWaitUntil read an absent button as a slow one and could never have helped. Root cause is login.yaml (7d84539's file) — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | [Failed] offer_quantity_round_trip (4m 10s) (Assertion is false: "Make an Offer" is visible) |
| `offer_send_and_accept` | FAIL-assert | run-526 | 276 | rig (identity switch) — NOT an app bug, NOT timing. run-526's logcat carries the owner notice itself: `TextView; text: This is your listing; boundsInScreen: Rect(258, 1180 - 510, 1180); visible: false`. `isOwnListing` (ListingDetail.tsx:472) was TRUE, so currentUser.id was 420 (Omar Noori) — the app was signed in as the SELLER while the flow had run login.yaml (buyer@hatiwal.test, id 419) and its guard had visibly fired (step-027 sign-out, step-044 login-email-input). Fixture verified clean via the API as the buyer: listing 3210 active, negotiable, 1 available, 0 held, not expired, price 3500.0 (matches the screenshot), seller 420, buyer owns ZERO listings, /blocks empty. So the app was RIGHT to hide "Make an Offer". RETRACTING my own fix: the 20s extendedWaitUntil read an absent button as a slow one and could never have helped. Root cause is login.yaml (7d84539's file) — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | 2026-09-05 scroll-to-title lost its race with a 98-listing feed (timeout had already gone 8s->20s). Now uses _helpers/open_listing_by_title.yaml, the same search sequence that keeps browse/listing_detail_held_units_transparency green. |
| `offer_send_and_decline` | FAIL-assert | run-526 | 270 | rig (identity switch) — NOT an app bug, NOT timing. run-526's logcat carries the owner notice itself: `TextView; text: This is your listing; boundsInScreen: Rect(258, 1180 - 510, 1180); visible: false`. `isOwnListing` (ListingDetail.tsx:472) was TRUE, so currentUser.id was 420 (Omar Noori) — the app was signed in as the SELLER while the flow had run login.yaml (buyer@hatiwal.test, id 419) and its guard had visibly fired (step-027 sign-out, step-044 login-email-input). Fixture verified clean via the API as the buyer: listing 3210 active, negotiable, 1 available, 0 held, not expired, price 3500.0 (matches the screenshot), seller 420, buyer owns ZERO listings, /blocks empty. So the app was RIGHT to hide "Make an Offer". RETRACTING my own fix: the 20s extendedWaitUntil read an absent button as a slow one and could never have helped. Root cause is login.yaml (7d84539's file) — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | 2026-09-05 same scroll-to-title cause as offer_send_and_accept; wired to _helpers/open_listing_by_title.yaml. |
| `place_and_release_hold` | PASS | run-526 | 208 | PASS — first flow to run with fixes 6+4 in place. |  |
| `quick_replies` | FAIL-assert | run-526 | 238 | rig (identity switch) — NOT an app bug. The quick-reply row IS rendered; the screenshot shows "Yes, it's available" / "Let's meet at [place]" / "The pr…", which are chat.json `quickReplies.SELLER.*`, while the flow asserts `quickReplies.BUYER.stillAvailable` ("Is this still available?"). The thread header also carries "Mark Sold", a seller-only action. So the app was signed in as the SELLER and was RIGHT to show seller replies. Same root cause as the offer family — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". NOTE the owner-notice logcat probe does NOT work here: that string lives on ListingDetail, not in a thread — for chat threads the tell is seller-only UI (Mark Sold) or the seller quick replies. | Exception in thread "Thread-5" java.io.IOException: Command failed (shell,v2,raw:pm list packages --user 0 dev |
| `report_participant` | FAIL-assert ⟳stale | run-526 | 299 | flow (bare assert on a 3s TOAST) + rig (identity switch). THE BACKEND IS CORRECT: the Rails log shows POST /api/v1/reports 201 Created at 23:27:16 UTC then 422 Unprocessable at 23:27:50 — exactly the duplicate the flow is testing. It failed only because `assertVisible: ".*already reported.*"` is a SINGLE check on a toast that lives ~3s, with a `waitForAnimationToEnd` in front of it burning that window (same class the register already records for listing_actions_sheet). FIX QUEUED, not applied: the flow was IN FLIGHT this tick. Separately, both reports carry `reportable_id: 419` (the BUYER) and the log updates tokens for user 420 — so the app was signed in as the SELLER reporting the buyer, backwards from what the flow intends: identity switch again. | 2026-09-05 NOT an app bug. A Report is unique per reporter+target and one from an e2e account existed at 02:48, created AFTER that pass's 02:42 seed, so the flow's FIRST submit already took the duplicate path — and ReportSheet offers "Block this user?" from inside onSuccess, making everything after it unreachable (RIG-004). reset_e2e clears reports BETWEEN passes, which cannot help one created DURING one. FIX: delete its own report row first, or target a user no other flow reports. |
| `reserve_after_accept` | FAIL-assert | run-526 | 278 | rig (identity switch) — NOT an app bug, NOT timing. run-526's logcat carries the owner notice itself: `TextView; text: This is your listing; boundsInScreen: Rect(258, 1180 - 510, 1180); visible: false`. `isOwnListing` (ListingDetail.tsx:472) was TRUE, so currentUser.id was 420 (Omar Noori) — the app was signed in as the SELLER while the flow had run login.yaml (buyer@hatiwal.test, id 419) and its guard had visibly fired (step-027 sign-out, step-044 login-email-input). Fixture verified clean via the API as the buyer: listing 3210 active, negotiable, 1 available, 0 held, not expired, price 3500.0 (matches the screenshot), seller 420, buyer owns ZERO listings, /blocks empty. So the app was RIGHT to hide "Make an Offer". RETRACTING my own fix: the 20s extendedWaitUntil read an absent button as a slow one and could never have helped. Root cause is login.yaml (7d84539's file) — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | 2026-09-05 same scroll-to-title cause; wired to _helpers/open_listing_by_title.yaml. |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | run-526 | 275 | rig (identity switch) — NOT an app bug, NOT timing. run-526's logcat carries the owner notice itself: `TextView; text: This is your listing; boundsInScreen: Rect(258, 1180 - 510, 1180); visible: false`. `isOwnListing` (ListingDetail.tsx:472) was TRUE, so currentUser.id was 420 (Omar Noori) — the app was signed in as the SELLER while the flow had run login.yaml (buyer@hatiwal.test, id 419) and its guard had visibly fired (step-027 sign-out, step-044 login-email-input). Fixture verified clean via the API as the buyer: listing 3210 active, negotiable, 1 available, 0 held, not expired, price 3500.0 (matches the screenshot), seller 420, buyer owns ZERO listings, /blocks empty. So the app was RIGHT to hide "Make an Offer". RETRACTING my own fix: the 20s extendedWaitUntil read an absent button as a slow one and could never have helped. Root cause is login.yaml (7d84539's file) — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | PASS | run-526 | 444 | rig — TIMEOUT, not hung, and now fixed at the rig. Hit the 600s cap in BOTH run-521 and run-523 while neighbours passed in 282-354s, so it is not host load. It runs BOTH login helpers (login_seller.yaml then login.yaml) and its debug screenshots reach step-125, the SECOND login's notification prompt — two cold stopApp/launchApp/bundle/onboarding/sign-in cycles plus its own work does not fit in ten minutes. qa/lib/flows.sh now gives any flow that references both helpers 2x FLOW_TIMEOUT. | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `scroll_to_latest` | PASS | run-526 | 489 | rig — TIMEOUT, not hung, same fix. Sends SEVEN messages (repeat times:6 plus one) and then cold-restarts the app with a 120s wait for chat-tab; summed declared timeouts alone are 320s. Also timed out in run-521. Covered by the 2x budget for double-login flows. | 2026-09-03 SOLVED: the meetup sheet was drawn UNDER the Android keyboard, so Time and Propose were unreachable when the sheet opened with the IME already up — the ordinary path, which no meetup flow covered. Fixed d46c896; PASS at BOTH widths after the rebuild. Its earlier 600s timeout at 360dp was a SYMPTOM of the same bug (dead waits), not a ceiling that needed raising. |
| `send_message` | PASS | run-526 | 265 | rig/env — recorded with kind=rig_fail in run-521, a pass that ran under HOST CONTENTION: session 1's emulator plus ANOTHER agent's three chrome-headless processes, ffmpeg and Rails on the same box. The pass averaged 310s/flow (15205s for 49) against a ~208s baseline and the driver began backing off at load 16.9. NOT an app or flow defect — re-run on a quiet box before triaging. (Note results.jsonl marks these via `kind`, while `result` still reads "fail" — filtering on result alone misses them.) | AxiosError |
| `send_message_double_tap` | PASS | run-526 | 267 | rig/env — recorded with kind=rig_fail in run-521, a pass that ran under HOST CONTENTION: session 1's emulator plus ANOTHER agent's three chrome-headless processes, ffmpeg and Rails on the same box. The pass averaged 310s/flow (15205s for 49) against a ~208s baseline and the driver began backing off at load 16.9. NOT an app or flow defect — re-run on a quiet box before triaging. (Note results.jsonl marks these via `kind`, while `result` still reads "fail" — filtering on result alone misses them.) |  |
| `send_message_empty` | PASS | run-526 | 254 |  | AxiosError |
| `send_message_offline` | PASS | run-526 | 270 | flow — **FIXED, CONFIRMED**. This campaign's first verdict that actually holds. The flow asserted the OPPOSITE of its own comment (assertNotVisible where the comment described the message staying put) and the app was right; corrected in 6a19ce7. Attribution is clean, not a flaky draw: sha 79f02cb2531f FAILED six consecutive runs (496, 500, 504, 515, 521, 523), the edit changed it to 5cfa980e2335, and run-526 PASSED (270s). Trustworthy because the flow was STABLE FAIL 0/6 — on a flaky flow this would have proved nothing. | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | run-526 | 260 |  |  |
| `send_multiple_messages` | PASS | run-526 | 304 |  |  |
| `send_photo` | PASS | run-526 | 280 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-assert | run-526 | 285 | rig (identity switch) — NOT my conversion. The listing-opener worked; the failure is downstream. It fails on `Assertion is false: "Contact Seller" is visible`, and "Contact Seller" lives inside the same `canContact` row the OWNER branch replaces (canContactListing returns false for isOwnListing regardless of status). The probe confirms it: `grep -a "This is your listing" start_conversation.logcat` HITS. Ninth flow of the identity-switch family — see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | PASS | run-526 | 277 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `unread_badge_survives_navigation` | FAIL-assert | run-526 | 197 |  | [Failed] unread_badge_survives_navigation (2m 53s) (Element not found: Id matching regex: conversation-action- |
| `view_other_profile_from_conversation` | PASS | run-526 | 248 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

18/30 passing · 11 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-? | run-518 | 184 |  | [Failed] account_delete_and_restore (2m 50s) (No visible element found: id: register-confirm-password-input) |
| `account_delete_cancel` | FAIL-? | run-518 | 213 |  | [Failed] account_delete_cancel (3m 18s) (No visible element found: "Delete account") |
| `away_mode` | PASS | run-518 | 212 | app+flow — away row was untappable (no Pressable/testID); fixed cb68fa4 (live via Metro, no rebuild) |  |
| `blocked_users` | PASS | run-518 | 170 |  |  |
| `change_language_dari` | PASS | run-518 | 176 |  |  |
| `change_language_english` | PASS | run-518 | 572 | flow — toothless restart wait; helper+nav fixed cb68fa4 |  |
| `change_language_pashto` | PASS | run-518 | 175 |  |  |
| `contact_visibility` | PASS | run-518 | 571 | flow | 2026-09-03: the failing assertion named the copied number but the cause was navigation. hideKeyboard is a Back press and popped Edit Profile to Profile; the next THREE commands reported COMPLETED against a stale hierarchy, so the assertNotVisible before it passed for the WRONG reason. Replaced with pressKey:Enter, which turned out to SUBMIT the form — both removed. Green at 360dp once the keypress was gone; now unstable again from my keyboardDismissMode=on-drag reflowing the form mid-scroll (board #313). NOT an app bug. |
| `edit_profile` | PASS | run-518 | 166 | stale — toast assertion already replaced by durable name check |  |
| `edit_profile_all_fields` | FAIL-assert | run-518 | 267 | flow+app | 2026-09-03: FOUR causes, two of them app bugs. (1) asserted text 'Save' on a button reading 'Save Changes'; (2) centerElement on the sticky save button; (3) APP — the sticky Save sat BEHIND the keyboard (d8edc9e), verified visually at 360dp; (4) APP — the keyboard swallowed the tap on the NEXT field, so 'UpdatedLast' landed in the First Name box (e36a6b4, keyboardDismissMode=on-drag). Also a pre-existing viewport assumption on the final derived-city assertion (no scroll). MY OWN regressions along the way: a pressKey:Enter that SUBMITTED the form (608ddda, reverted) and a scrollUntilVisible that is a no-op when the target is already 'visible'. Flow-side stability still open — board #313. |
| `edit_profile_avatar` | PASS | run-518 | 185 |  |  |
| `edit_profile_bio_too_long` | PASS | run-518 | 289 | flow — 520 chars do type; error renders above viewport; now scrolls UP cb68fa4 |  |
| `edit_profile_province` | FAIL-assert | run-518 | 260 | flow | 2026-09-02: DOWN + centerElement:true on profile-edit-button, which sits near the TOP of Profile — DOWN scrolls away from it and centring is impossible with too little content above. ORDER-DEPENDENT (siblings passed on the identical block). Now UP + visibilityPercentage 40, applied to all 8 flows carrying it. |
| `edit_profile_validation` | PASS | run-518 | 199 |  |  |
| `hidden_listings` | PASS | run-518 | 198 |  |  |
| `language_persists_across_tabs` | PASS | run-518 | 290 |  |  |
| `language_switch_all_screens` | PASS | run-518 | 310 | flow — asserted Profile content while restart left app on feed; reordered cb68fa4 |  |
| `profile_stats_verify` | FAIL-? | run-518 | 200 | rig — killed mid-flow (no failure reason, 7m45s); feature-timeout truncation, re-run | Same hardcoded year. |
| `recently_viewed` | PASS | run-518 | 175 | flow+app — row had no testID; added profile-row-recently-viewed. Fixed 34e713a |  |
| `recently_viewed_empty_state` | PASS | run-518 | 168 |  |  |
| `seller_mode_toggle` | PASS | run-518 | 187 |  |  |
| `theme_switch` | FAIL-? | run-518 | 213 |  | [Failed] theme_switch (3m 19s) (No visible element found: id: theme-option-light) |
| `transaction_stats_hidden_when_zero` | PASS | run-518 | 157 |  |  |
| `transaction_stats_own_profile` | FAIL-assert | run-518 | 192 |  | [Failed] transaction_stats_own_profile (2m 57s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | run-518 | 200 | flow — vacuous assertNotVisible on the dead soldItems key; removed | [Failed] transaction_stats_public_profile (3m 5s) (Assertion is false: id: transaction-stats-badge is visible) |
| `transaction_stats_seller_own_profile` | FAIL-assert | run-518 | 216 |  | [Failed] transaction_stats_seller_own_profile (3m 21s) (Assertion is false: "Sold" is visible) |
| `user_profile_sold_tab` | FAIL-assert | run-518 | 219 | flow | Same ${visible()} problem. |
| `view_profile` | FAIL-assert ⟳stale | run-518 | 216 |  | [Failed] view_profile (3m 21s) (Assertion is false: "Language" is visible) |
| `view_profile_error` | PASS | run-518 | 216 |  | AxiosError |
| `view_seller_profile_from_profile` | FAIL-assert | run-518 | 217 |  | [Failed] view_seller_profile_from_profile (3m 21s) (Assertion is false: "Ahmad Karimi" is visible) |

## `seller` — One-tap Mark sold from any live listing (never reserve-first) + the Sales ledger (edit/void a row, reviewed-sale refusal, outside-buyer rows, undo-after-sold)

7/18 passing · 6 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `held_quantity_refusal` | FAIL-assert ⟳stale | run-527 | 313 | flow (screen keeps its scroll position) — the SAVE SUCCEEDED and the fixture is fine; I nearly filed a seeder bug on a bad query. The API says listing 3246 is active, quantity 15, held_units 10, exactly what the asserts expect. (`/my/listings?per_page=100` returned only 20 of `total_count: 31` — per_page is CAPPED at 20, so the Gloves listing was on page 2 and looked missing.) The flow fails because saving returns to the owner detail, which KEEPS the scroll position it left at the quantity field, and the title is at the TOP — assertVisible means ON SCREEN, so 30s of polling could never find it. run-527's screenshot is that screen at the bottom, showing the map, "Manage Listing" and "View Conversations". Added a scrollUntilVisible direction UP before the title wait. | [Failed] held_quantity_refusal (4m 52s) (Assertion is false: "Winter Gloves Wholesale Box - 15 Pairs" is visib |
| `listing_actions_sheet` | FAIL-assert ⟳stale | run-527 | 297 | flow — the id tap WORKED, and the failure moved. run-527 died at **step-118**, the `browse-tab` tap AFTER publishing, not the identical one at the top of the flow: by then the listing was created AND published — the screenshot is its owner detail reading "Listing Actions Sheet Test Item", AFN 5,000, Active, posted today, so the publish and its "Listing published!" toast are both behind us. Publishing lands on a PUSHED screen with no tab bar, so the tab tap failed on a testID that is present and correct. Added `_helpers/pop_to_tab_bar.yaml` before it. Still 0/7, but the blocker is now two sections later than it was. | [Failed] listing_actions_sheet (4m 36s) (Element not found: Id matching regex: browse-tab) |
| `listing_conversations` | FAIL-assert | run-527 | 270 | rig (identity switch) — TENTH flow of the family. Fails on `"Make an Offer" is visible` and the probe hits: `grep -a "This is your listing" listing_conversations.logcat` in run-527. "Make an Offer" lives in the same canContact row the OWNER branch replaces. Not an app bug; see qa/PENDING_RIG_FIXES.md "REOPENED 2026-09-13". | 2026-09-05 same IME cause. Its note claimed scrollUntilVisible dismisses the keyboard — true only if it scrolls, and it is a NO-OP when the target is already visible, which after a filtering search it always is. Dead scroll removed, margin drag used instead (Back is unsafe here — it exited the app once). |
| `mark_sold_all_units` | PASS | run-527 | 249 | flow — FIXED. The fixture was NOT missing: checked against the API, the seller has 36 listings with 11 "QA Disposable ..." among them and "QA Disposable quantity_all" is present and ACTIVE. The flow was already guarded (extendedWaitUntil on seller-listing-card), so this was a scrollUntilVisible running out of TIME across 36 cards at 20s — the same race the Bazaar feed lost. Converted to _helpers/search_my_shop.yaml (QUERY "quantity_all") + wait + tap; search is O(1) in list size. |  |
| `mark_sold_with_buyer` | PASS | run-527 | 223 | SUSPECT — ran in run-522 while the host was at load 17-25, shared with another agent's chrome-headless, ffmpeg and Rails. That pass came back 0 of 8, worse than any seller pass on record (previous: 11%, 27%, 38%), and flow times were 400-470s against a ~208s baseline. Do NOT triage as an app bug — re-run on a quiet box. The driver's own gate has since been changed to hold up to an hour for load, and to log SUSPECT PASS if it proceeds anyway. |  |
| `multi_quantity_offplatform_sale` | PASS | run-527 | 257 | flow — FIXED, same cause and same fix as mark_sold_all_units. "QA Disposable offplatform_units" verified present and ACTIVE via the API; converted to search_my_shop.yaml (QUERY "offplatform_units"). |  |
| `multi_quantity_partial_sale` | FAIL-assert | run-527 | 274 | flow — FIXED. Bare assertVisible on "The price for one item" inside the buyer-picker sheet, which fills in progressively — the quantity control asserted just above can be present before the hint is. Copy is CURRENT (buyerPicker.json `finalPricePerUnitHint`). Converted to extendedWaitUntil (15s). | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | FAIL-assert ⟳stale | run-527 | 333 | flow — MY DIALOG FIX WORKED, and the failure moved. run-527 no longer fails on "Publish this listing?"; it now fails on `"Active" is visible` at the very end, i.e. it got through the dialog, the success sheet and Done. New cause, same class as held_quantity_refusal: the owner detail KEEPS the scroll position the flow left at the Publish button, and the badge is at the TOP — assertVisible means ON SCREEN. run-527's screenshot is that screen showing "Views - last 7 days", "Location" and the map, badge off the top; the listing had published correctly. Added scrollUntilVisible direction UP to the (unique) TITLE, not to "Active", which is too generic to anchor on. | [Failed] publish_from_owner_detail (5m 11s) (Assertion is false: "Active" is visible) |
| `publish_success` | FAIL-assert ⟳stale | run-527 | 307 | flow (same scroll cause) — and NOT an identity switch, despite the owner-notice probe hitting. This flow uses login_seller ONLY, so the seller seeing "This is your listing" on their own listing is CORRECT; the probe is only meaningful for a flow that logs in as the BUYER. It fails on `"Active" is visible` after `back`, with the owner detail still scrolled down to the Publish button. The SECOND "Active" assert further down this same file was already protected by a scrollUntilVisible UP — only this one was bare. Added the same idiom. | 2026-09-05 title asserted while the detail screen was scrolled past it; guarded UP scroll added. |
| `reserved_buyer` | FAIL-assert | run-527 | 265 | flow — WRONG ACCOUNT, proven from logcat 2026-09-08. Corrects the earlier "never reached the listing detail" verdict: it DOES reach it, as the OWNER. The hierarchy dump holds `text: This is your listing` 105-140x per run across offer_counter_flow / offer_quantity_round_trip / offer_send_and_accept / offer_send_and_decline / reserve_after_accept / reserve_after_buyer_accepts_counter and seller/{listing_conversations,reserved_buyer}. So the app is signed in as seller@hatiwal.test while a buyer leg runs, isOwnListing is true, and canOfferOnListing correctly hides Make an Offer (ListingDetail.tsx:1120) — the APP IS RIGHT. Fixture is innocent: `Men Winter Jacket XL Black` is `user: seller`, `status: :active`, and the seed never sets `negotiable` so it defaults true. offer_send_and_accept fails BEFORE its own login_seller leg, so the dumps are the buyer leg, not the legitimate seller one. offer_in_existing_thread passes because it works inside an existing thread and never opens a listing detail. REPRODUCIBLE in both clean cycles (run-504..507, run-515..518), so 8a91b71's profile-tab wait did not close it. PROVEN 2026-09-12 from Maestro's step-screenshot trace (debug-<flow>/.maestro/tests/*/screenshots, one PNG per EXECUTED step). offer_send_and_accept ran: step-015/016 dev-menu, step-027 scrollUntilVisible sign-out-button, step-034 tapOn Skip (onboarding, in ps/fa), step-044 assertCondition login-email-input, step-048 Don't allow, step-098 Make an Offer (fail). The guard DID detect the wrong account and entered the sign-out branch at 027 — but there is NO tapOnElement sign-out-button and NO android:id/button1 between 027 and 034, so the scroll found nothing, `when: visible: sign-out-button` was FALSE and the tap was SILENTLY SKIPPED. No sign-out means no login form, so the sign-in block's `when: visible: login-email-input` gate at 044 was also false and skipped — the flow carried on as the seller and died 60 steps later. Note the ordering: login.yaml runs the wrong-account guard BEFORE goto_login.yaml, and goto_login is what invokes skip_onboarding.yaml — so the guard can run while the app is still on the onboarding carousel with no Profile to scroll. FIX (not yet applied, needs a free device to confirm): make the identity guarantee POSITIVE and terminal — after the sign-in block, assert profile-display-name matches Ahmad Karimi. Today every check is a silent no-op chain, and being signed in as the WRONG user is indistinguishable from being signed in as the right one. Worst case of the new assert is 156 flows failing loudly AT LOGIN, which is immediately visible and trivially revertible — strictly better than silent wrong-account corruption. | 2026-09-05 the IME covered the search result; the card tap landed on the keyboard (Maestro reports covered taps COMPLETED) so the app never left BROWSE and the failure surfaced later on 'Make an Offer'. hideKeyboard added after typing. |
| `sales_screen_correct_quantity` | FAIL-assert | run-527 | 381 |  | [Failed] sales_screen_correct_quantity (6m) (Assertion is false: id: sales-tally is not visible) |
| `sales_screen_reviewed_sale_refusal` | FAIL-assert | run-527 | 209 | flow — `seller-card-more-action` not found; the testID IS current (SellerListingCard.tsx:464), so this is a reach/timing failure, not selector rot. Ran AFTER the identity fix and shows no wrong-account signature. | [Failed] sales_screen_reviewed_sale_refusal (3m 7s) (Element not found: Id matching regex: seller-card-more-ac |
| `sales_screen_void_row` | PASS | run-527 | 381 |  |  |
| `save_draft` | FAIL-assert | run-527 | 283 | flow (heading inside the scroll view) — died at step-107 on the LATE `"Create Listing"` assert (line 178). The file has four occurrences including an assertNotVisible, so the message alone could not say which; the screenshot settled it — the form is scrolled to Title/Price showing "Title is required (max 150 characters)" with the numeric keypad up, which is the validation section at line 178, not the fresh form at line 122. Added scrollUntilVisible UP. Fourth flow of this face. | [Failed] save_draft (4m 21s) (Assertion is false: "Create Listing" is visible) |
| `sell_without_reserving` | PASS | run-527 | 318 |  |  |
| `sold_quantity_reconciliation` | FAIL-assert ⟳stale | run-527 | 356 | flow (IME covers the field) — the app and the fixture are BOTH correct, checked before touching the flow. `showQuantityReopenNote = hasMultipleUnits && willReopenOnSave(...)` (ListingForm.tsx:481) needs a SOLD listing, and the API says listing 3274 "QA SF-M7 Reconcile Batch" is status=sold, quantity=5, sales_count=1 — so typing 8 yields exactly the "3 available" the next line asserts. The note IS rendered; it is simply not ON SCREEN. Typing into the quantity field raises the NUMERIC KEYPAD and the form ends up back at the top — run-527's screenshot is this form showing Photos and the Title with the keypad covering everything below, and the note sits directly under the quantity field. Added scrollUntilVisible DOWN with centerElement so it lands ABOVE the keypad (not hideKeyboard, which is Back on Android and would pop the form). | [Failed] sold_quantity_reconciliation (5m 34s) (Assertion is false: id: listing-form-quantity-reopen-note is v |
| `undo_mark_sold` | PASS | run-527 | 319 | flow — `location-confirm` not visible; testID IS current (LocationRangePicker.tsx:470). Reach/timing — the location sheet had not opened or had not rendered. Post-identity-fix. |  |
| `undo_mark_sold_with_buyer` | PASS | run-527 | 237 |  |  |

## `auth` — Sign up, login, logout, session persistence, guest gating

11/16 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | run-514 | 193 |  |  |
| `guest_browse` | PASS | run-514 | 171 |  |  |
| `guest_offer_redirect` | FAIL-? | run-514 | 194 |  | [Failed] guest_offer_redirect (2m 49s) (No visible element found: "Wool Blanket Handmade King Size") |
| `guest_save_redirect` | FAIL-? | run-514 | 164 |  |  |
| `login` | PASS | run-514 | 173 |  |  |
| `login_deep` | PASS | run-514 | 225 |  |  |
| `login_empty_fields` | PASS | run-514 | 139 |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | PASS | run-514 | 140 |  |  |
| `login_wrong_password` | PASS | run-514 | 154 |  | Request failed with status code |
| `logout` | PASS | run-514 | 224 | rig | ENVIRONMENT, not the flow. run-241 aborted mid-feature: an openaleph-mobile Gradle build took the load average to 49 on 16 cores and this session's emulator died — the rig logged "CPU only 0% idle — refusing to boot" and "could not recover the emulator — aborting feature 'auth'". Re-run on a quiet machine before reading anything into it. logout is also the reference flow that showed sign-out lands on the Bazaar (see login_deep). |
| `logout_cancel` | PASS | run-514 | 222 |  |  |
| `register_duplicate_email` | FAIL-? | run-514 | 185 | flow | APP IS CORRECT (422 + errors.full_messages surfaced) but the FLOW was wrong, and my first diagnosis blamed the wrong thing. Register.tsx renders each error as `<Text>{"• "}{msg}</Text>`, so the node reads "• Email has already been taken" and Maestro's anchored regex cannot match the bare literal. It would have failed on a quiet machine too — the `Refreshing…` banner in the first screenshot was real but incidental. Now asserts ".*Email has already been taken.*". |
| `register_navigate_to_login` | PASS | run-514 | 140 |  |  |
| `session_persist` | PASS | run-514 | 210 |  |  |
| `sign_up` | FAIL-? | run-514 | 202 |  | [Failed] sign_up (3m 2s) (No visible element found: id: register-confirm-password-input) |
| `sign_up_validation` | FAIL-? | run-514 | 209 |  | [Failed] sign_up_validation (3m 11s) (No visible element found: id: register-confirm-password-input) |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

3/8 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | PASS | run-512 | 199 |  |  |
| `save_listing` | FAIL-? | run-512 | 155 |  | [Failed] save_listing (2m 21s) (No visible element found: "Wool Blanket Handmade King Size") |
| `save_multiple_listings` | FAIL-assert | run-512 | 167 |  | [Failed] save_multiple_listings (2m 33s) (Assertion is false: id: listing-card, Index: 2 is visible) |
| `saved_empty_state` | PASS | run-512 | 157 |  |  |
| `saved_listing_goes_sold` | FAIL-assert | run-512 | 426 |  | [Failed] saved_listing_goes_sold (6m 52s) (Element not found: Id matching regex: seller-card-primary-action) |
| `saved_pagination` | FAIL-assert | run-512 | 211 |  | [Failed] saved_pagination (3m 17s) (Element not found: Id matching regex: listing-card) |
| `unsave_from_browse_feed` | PASS | run-512 | 199 |  |  |
| `unsave_listing` | FAIL-assert | run-512 | 211 |  | [Failed] unsave_listing (3m 16s) (Element not found: Text matching regex: Remove from saved) |

## `report` — Report a listing or user, block, block side-effects

4/8 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | PASS | run-510 | 268 |  |  |
| `block_user` | FAIL-? | run-510 | 157 |  | [Failed] block_user (2m 23s) (No visible element found: "Wool Blanket Handmade King Size") |
| `block_user_hides_listings` | PASS | run-510 | 205 | PASS, but its logcat carries one `Network Error` line — worth watching, not a defect on its own. |  |
| `report_listing` | FAIL-? | run-510 | 158 | rig — no cause line and its end-of-flow screenshot is a CORRUPT PNG (PIL: cannot identify image file), i.e. the flow was killed mid-screenshot. Re-run. | RIG-004; also gained the duplicate-rule assertion for listings, which nothing covered. |
| `report_listing_no_reason` | FAIL-? | run-510 | 158 | rig — same auth/timing family as report_user (asserts `profile-tab`, i.e. a signed-in tab bar, and does not get one). No Network Error in its own logcat, so re-run before triaging further. | [Failed] report_listing_no_reason (2m 23s) (No visible element found: "Wool Blanket Handmade King Size") |
| `report_user` | PASS | run-510 | 178 | rig/env — login never completed. Screenshot is the LOGIN screen showing 'No connection. Check your internet and try again.' and the logcat carries `Network Error` against http://10.0.2.2:3007/api/v1. API verified healthy from the host (200 on listings and sign_in) and the emulator reaches the host (ping 0% loss), so this was a transient timeout — the driver started this pass while host load was ~13. NOT evidence about the hideKeyboard revert either way. | RIG-004 part 2: retargeted to ahmad (36) so it cannot collide intra-cycle. |
| `report_user_from_profile` | PASS | run-510 | 175 | rig — never opened the listing. The result card (Honda CG 125 Motorbike 2021) is rendered in the screenshot and the flow failed on `seller-profile-link` without tapping it. Also shows the inputText character drop: field holds '5 Motorbike 2021', leading 'Honda CG 12' dropped. open_listing_by_title.yaml's wait-on-listing-card + tap-by-testID is the pattern that fixes this. | Retargeted to omar (37); stopped using nondeterministic listing-card index 0. |
| `report_user_then_block` | FAIL-assert | run-510 | 195 | rig — ran UNAUTHENTICATED. The end-of-flow screenshot's tab bar reads Bazaar / Categories / Login, so `seller-profile-link` (which DOES exist, ListingDetail.tsx:797) was never reachable. Also shows the inputText character drop: the search field holds 'nch 4K Smart TV' — the leading 'Sony 55 i' was dropped. | Retargeted to maryam (40); now unblocks, which it never did. |

## `dark_mode` — Every main screen in dark theme + theme persistence

4/8 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | PASS | s2/run-528 | 276 |  |  |
| `chat_dark` | PASS | s2/run-528 | 269 |  |  |
| `listing_detail_dark` | FAIL-? | s2/run-528 | 222 |  | [Failed] listing_detail_dark (3m 21s) (No visible element found: "Wool Blanket Handmade King Size") |
| `my_listings_dark` | PASS | s2/run-528 | 305 | MY REGRESSION — restart helper waited for listing-card; seller mode returns to seller-listing-card. Fixed |  |
| `profile_dark` | FAIL-assert | s2/run-528 | 282 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | FAIL-assert | s2/run-528 | 247 |  | [Failed] saved_tab_dark (3m 44s) (Assertion is false: id: (browse-search-bar|my-listings-search-input) is visi |
| `theme_light_all_screens` | FAIL-assert | s2/run-528 | 230 |  | [Failed] theme_light_all_screens (3m 31s) (Assertion is false: "Switch to .*" is visible) |
| `theme_persists_after_navigate` | PASS | s2/run-528 | 398 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

## `reviews` — Double-blind reviews after a sold transaction

1/3 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-redbox | run-511 | 262 |  | [Failed] pending_reviews_nudge (4m 8s) (Assertion is false: "Review saved" is visible) |
| `profile_reviews_empty_state` | PASS | run-511 | 157 |  |  |
| `rate_buyer_after_sale` | FAIL-assert | run-511 | 237 |  | [Failed] rate_buyer_after_sale (3m 43s) (Assertion is false: id: seller-listing-card is visible) |

## `safety` — Safety tips on listing detail and in the meetup sheet

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | UNTESTED | — |  |  |  |
| `safety_tips_meetup_sheet` | UNTESTED | — |  |  |  |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

6/7 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | s2/run-529 | 350 |  |  |
| `filter_map_default_kabul` | PASS | s2/run-529 | 247 |  |  |
| `filter_map_location_denied` | PASS | s2/run-529 | 282 |  |  |
| `filter_map_use_my_location` | PASS | s2/run-529 | 266 |  |  |
| `filter_map_use_my_location_granted` | PASS | s2/run-529 | 248 |  |  |
| `map_location_outside_afghanistan` | PASS | s2/run-529 | 292 |  |  |
| `zoom_controls_not_occluded` | FAIL-? | s2/run-529 | 209 |  | [Failed] zoom_controls_not_occluded (3m 8s) (No visible element found: "Toyota Corolla 2016 Automatic") |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-509 | 289 | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | PASS | run-509 | 187 | flow | 2026-09-02: never scrolled to its own Save button, which adding a photo pushes below the fold — the rule this file's own header states. Now scrolls at visibilityPercentage 40. |
| `listing_gallery_no_photo` | PASS | run-509 | 200 |  |  |
| `listing_gallery_swipe` | PASS | run-509 | 203 |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | run-513 | 178 | candidate — one spurious 401 logged the app out; see UI_FINDINGS, needs 2nd sighting | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | PASS | run-513 | 241 |  |  |
| `seller_mode_tab_bar_changes` | PASS | run-513 | 154 |  |  |
| `seller_views_own_listing_buyer_mode` | PASS | run-513 | 222 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

## `share` — Deep links into a listing and a seller profile

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | PASS | s2/run-529 | 112 |  |  |
| `open_seller_deep_link` | FAIL-assert | s2/run-529 | 125 |  | [Failed] open_seller_deep_link (1m 43s) (Assertion is false: id: more-options-button is visible) |

## `onboarding` — First-run experience

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | s2/run-529 | 357 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | s2/run-529 | 195 |  |  |
| `conversations_pagination` | PASS | s2/run-529 | 200 |  | AxiosError |
| `filter_combined_pagination` | PASS | s2/run-529 | 217 | flow — assertNotVisible on dead copy (vacuous); now asserts a cross-category listing is absent |  |
| `my_listings_pagination` | PASS | s2/run-529 | 292 |  |  |
| `saved_pagination_deep` | PASS | s2/run-529 | 243 |  |  |
| `search_pagination` | PASS | s2/run-529 | 241 |  |  |

## `rtl` — Pashto + Dari right-to-left layout across main screens

6/10 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | PASS | s2/run-527 | 298 |  |  |
| `browse_rtl_pashto` | (rig) | s2/run-527 | 601 |  |  |
| `buyer_picker_rtl` | (rig) | s2/run-527 | 601 |  |  |
| `categories_hub_rtl` | PASS | s2/run-527 | 340 | flow | 2026-09-02: tapped text "Back" in a flow whose whole purpose is Pashto. The app renders no literal "Back" — BackButton has accessibilityLabel t(common.goBack) (ps شاته ځه) and testID back_button. Now targets the testID. |
| `chat_rtl` | FAIL | s2/run-527 | 581 | flow? | 2026-09-02: expects ps common.send "لیږل", present verbatim. Same language-revert hypothesis as profile_rtl. |
| `listing_detail_rtl` | (rig) | s2/run-527 | 602 |  | AxiosError |
| `my_listings_rtl` | PASS | s2/run-527 | 343 |  |  |
| `profile_quick_actions_rtl` | PASS | s2/run-527 | 333 | flow | 2026-09-02 SOLVED, flow bug, b20007e: the language-revert hypothesis was WRONG, and so was the mode-toggle one. Profile.tsx:306 renders this row as `${t('…myListings')} (${count})`, so the text is 'زما اعلانونه (0)' and Maestro's anchored regex could not match the bare label — the three sibling labels carry no suffix, which is why only this row failed. run-379's screenshot shows Profile correctly in seller mode (green tab bar, three tabs, saved-tab gone). Matched as a prefix now. NOT an app bug. |
| `profile_rtl` | PASS | s2/run-527 | 257 | flow? | 2026-09-02: expects fa profile.editProfile "ویرایش پروفایل", which EXISTS verbatim in the locale file — so not a stale selector. Hypothesis: the language-revert bug (fixed 8097ab3) left the app in English after the switch, so no translated string could match. Re-running on a build with that fix. |
| `sales_ledger_rtl` | PASS | s2/run-527 | 411 |  |  |

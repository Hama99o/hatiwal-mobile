# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**69 of 258 flows passing** · 188 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 69 | green, and no backend error underneath |
| SILENT | 1 | **assertions passed while the API errored** — the app told the user nothing |
| FAIL-assert | 80 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-crash | 1 | the app crashed (FATAL EXCEPTION in logcat) |
| FAIL-? | 18 | failed, cause unclear — read the log |
| (rig) | 1 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 87 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile — a reserved listing stays searchable + messageable, and a held batch shows its hold

1/42 passing · 41 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | FAIL-assert | s3/run-108 | 272 |  | AxiosError |
| `browse_listings` | FAIL-assert | s3/run-108 | 249 |  | [Failed] browse_listings (3m 42s) (Assertion is false: "Development Build" is not visible) |
| `browse_sort_most_viewed` | FAIL-assert | s3/run-108 | 257 |  | AxiosError AxiosError |
| `browse_sort_nearest` | FAIL-assert | s3/run-108 | 251 |  | [Failed] browse_sort_nearest (3m 46s) (Assertion is false: "Development Build" is not visible) |
| `categories_hub` | FAIL-assert | s3/run-108 | 262 |  | [Failed] categories_hub (3m 49s) (Assertion is false: "Development Build" is not visible) |
| `clear_all_filters` | UNTESTED | — |  |  |  |
| `filter_active_sellers` | UNTESTED | — |  |  |  |
| `filter_by_category` | UNTESTED | — |  |  |  |
| `filter_condition` | UNTESTED | — |  |  |  |
| `filter_price_range` | UNTESTED | — |  |  |  |
| `full_marketplace_cycle` | UNTESTED | — |  | flow — doubled search (missing eraseText) + inherited price filter emptied the feed; fixed | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_contact_whatsapp` | UNTESTED | — |  |  |  |
| `listing_detail` | UNTESTED | — |  |  |  |
| `listing_detail_held_units_transparency` | UNTESTED | — |  |  |  |
| `listing_detail_multi_quantity` | UNTESTED | — |  | flow — scroll stopped at the clipped bottom row so the price row never showed; centred. API data verified correct |  |
| `listing_detail_offer` | UNTESTED | — |  |  |  |
| `listing_detail_offer_invalid` | UNTESTED | — |  |  |  |
| `listing_detail_price_drop_badge` | UNTESTED | — |  | flow — asserted the drop badge on a listing with no drop; retargeted to the seeded Lenovo |  |
| `listing_detail_quantity_intent` | UNTESTED | — |  |  |  |
| `listing_detail_report` | UNTESTED | — |  | fixture | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_reserved_contactable` | UNTESTED | — |  |  |  |
| `listing_detail_save_unsave` | UNTESTED | — |  | flow — asserted a global 'No saved items yet' it does not own; now asserts this listing is gone |  |
| `listing_detail_saves_count` | UNTESTED | — |  | flow — tapped the save TOGGLE blind and unsaved it, so savesCount hit 0; now state-aware |  |
| `listing_detail_share` | UNTESTED | — |  |  |  |
| `listing_detail_similar` | UNTESTED | — |  |  |  |
| `listing_detail_sold_recovery` | UNTESTED | — |  | flow — cold-start deep link discarded by startup nav; waits for settle + re-fires. See UI_FINDINGS | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | UNTESTED | — |  | flow — same cold-start deep-link loss; fixed alongside sold_recovery |  |
| `listing_detail_views_count` | UNTESTED | — |  |  |  |
| `not_interested` | UNTESTED | — |  |  |  |
| `saved_search_apply` | UNTESTED | — |  | flow — tapped the SHEET's "Clear" after closing the sheet; now the feed's clear-filters chip |  |
| `scroll_to_top` | UNTESTED | — |  |  |  |
| `search_empty_state` | UNTESTED | — |  |  |  |
| `search_listings` | UNTESTED | — |  |  |  |
| `search_with_filter` | UNTESTED | — |  |  |  |
| `seller_profile` | UNTESTED | — |  |  |  |
| `seller_profile_from_listing` | PASS | s2/run-141 | 237 |  |  |
| `seller_response_rate_badge` | UNTESTED | — |  | flow — anchored pattern started mid-label; badge renders "82% reply rate · Usually responds…" as one Text |  |
| `subcategory_drilldown` | UNTESTED | — |  | flow — chip reads "Subcategory: Phones & Tablets"; the two chip asserts still said "Phones" | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | UNTESTED | — |  | flow — index 0 of a recency-ordered inbox reached Fatima (owns a listing); now targets Ahmad | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | UNTESTED | — |  | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | UNTESTED | — |  | flow — asserted a "Message" button the profile has never had (contact is per-listing by design) | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | UNTESTED | — |  | flow | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `listings` — Seller create/edit/delete + the 3-state lifecycle (Draft/Live/Sold) — Mark sold is always the one-tap primary, no Reserved tab

10/40 passing · 29 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-468 | 214 |  |  |
| `create_listing_all_fields` | FAIL-assert | s2/run-151 | 260 | STALE — already retargeted off tapOn "Kabul" (comment at :85 records it); awaiting re-run | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
| `create_listing_category_search` | PASS | s2/run-151 | 271 |  |  |
| `create_listing_currency_eur` | FAIL-assert | s2/run-151 | 314 | flow | My Shop list is virtualised, so an unrendered card is absent; now searches. Price is one node (€250.00). |
| `create_listing_currency_usd` | (rig) ⚠slow | s2/run-151 | 852 | flow | Asserted "$450" — `$` is a regex end-anchor, so it could never match. |
| `create_listing_draft_discard` | PASS | s2/run-151 | 243 |  |  |
| `create_listing_draft_restore` | FAIL-assert | s2/run-151 | 259 | flow | "Draft saved" is a toast from toast.success; a bare assert races it. Now polls. |
| `create_listing_full_publish` | PASS | s2/run-151 | 363 |  | AxiosError |
| `create_listing_multi_quantity` | PASS | s2/run-151 | 252 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | s2/run-151 | 305 |  |  |
| `create_listing_publish_blocked` | FAIL-assert | s2/run-151 | 264 | flow | Touched the form before the location sheet closed; the helper allows 45s for it. |
| `create_listing_publish_direct` | FAIL-assert | s2/run-151 | 235 |  | [Failed] create_listing_publish_direct (3m 37s) (Assertion is false: "Cover" is visible) |
| `create_listing_publish_requirements` | FAIL-assert | s2/run-151 | 276 |  | [Failed] create_listing_publish_requirements (4m 16s) (Assertion is false: "A live listing needs at least one  |
| `create_listing_quantity_edges` | FAIL-assert | s2/run-151 | 255 | flow | Field maps empty to 1, so eraseText appends. Blur-then-focus lets selectTextOnFocus replace. |
| `create_listing_title_edges` | PASS | s2/run-151 | 271 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS | s2/run-151 | 233 |  |  |
| `create_listing_with_condition` | FAIL-assert | s2/run-151 | 231 | flow | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-471 | 382 |  |  |
| `delete_listing` | FAIL-assert | s2/run-151 | 211 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert | s2/run-151 | 260 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | FAIL-? | s2/run-151 | 224 |  | [Failed] edit_listing (3m 29s) (No visible element found: "Edit") |
| `edit_listing_all_fields` | FAIL-? | s2/run-151 | 221 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | FAIL-? | s2/run-151 | 220 | STALE — run-252 executed the old route (commands.json proves it); already fixed | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | FAIL-assert | s2/run-151 | 197 |  | [Failed] edit_listing_quantity (3m) (Assertion is false: "QA Phone Cases Bulk 15" is visible) |
| `edit_listing_remove_photo` | FAIL-? | s2/run-151 | 220 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-? | s2/run-151 | 211 | flow — optional gallery tap no-opped silently; now by testID. Fixed 34e713a | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert | s2/run-151 | 216 | flow — tab switch refires the request; nothing waited for the list. Fixed 34e713a | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | FAIL-assert | s2/run-151 | 161 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | FAIL-? | s2/run-151 | 470 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | FAIL-assert | s2/run-151 | 222 |  | [Failed] lifecycle_reserve (3m 24s) (Element not found: Text matching regex: Mark as Reserved) |
| `lifecycle_sold` | FAIL-? | s2/run-151 | 498 |  | [Failed] lifecycle_sold (8m) (No visible element found: id: lifecycle-primary-action) |
| `lifecycle_unpublish` | FAIL-? | s2/run-151 | 232 |  | [Failed] lifecycle_unpublish (3m 34s) (No visible element found: id: lifecycle-more-action) |
| `listing_analytics_sparkline` | FAIL-assert | s2/run-151 | 213 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | s2/run-151 | 213 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert | s2/run-151 | 223 | flow — same missing wait as expired_listing_badge. Fixed 34e713a | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | FAIL-assert | s2/run-151 | 230 | flow — swipe fix already present; tab taps now by testID (SOLD badge collided). Verdict stale | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-assert | s2/run-151 | 209 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | FAIL-assert | s2/run-151 | 211 | flow — same; executed step was pre-swipe scrollUntilVisible. Verdict stale | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | FAIL-assert | s2/run-151 | 220 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-? | s2/run-151 | 212 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

4/30 passing · 25 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert | s2/run-156 | 207 |  | [Failed] account_delete_and_restore (3m 8s) (Assertion is false: "Bazaar" is visible) |
| `account_delete_cancel` | FAIL-assert | s2/run-156 | 460 |  | [Failed] account_delete_cancel (7m 19s) (Assertion is false: "Me" is visible) |
| `away_mode` | FAIL-assert | s2/run-156 | 466 | app+flow — away row was untappable (no Pressable/testID); fixed cb68fa4 (live via Metro, no rebuild) | [Failed] away_mode (7m 27s) (Assertion is false: "Me" is visible) |
| `blocked_users` | FAIL-assert | s2/run-156 | 457 |  | [Failed] blocked_users (7m 18s) (Assertion is false: "Me" is visible) |
| `change_language_dari` | FAIL-assert | s2/run-156 | 458 |  | [Failed] change_language_dari (7m 18s) (Assertion is false: "Me" is visible) |
| `change_language_english` | FAIL-assert | s2/run-156 | 455 | flow — toothless restart wait; helper+nav fixed cb68fa4 | [Failed] change_language_english (7m 17s) (Assertion is false: "Me" is visible) |
| `change_language_pashto` | FAIL-assert | s2/run-156 | 453 |  | [Failed] change_language_pashto (7m 15s) (Assertion is false: "Me" is visible) |
| `contact_visibility` | PASS | run-466 | 210 | flow | 2026-09-03: the failing assertion named the copied number but the cause was navigation. hideKeyboard is a Back press and popped Edit Profile to Profile; the next THREE commands reported COMPLETED against a stale hierarchy, so the assertNotVisible before it passed for the WRONG reason. Replaced with pressKey:Enter, which turned out to SUBMIT the form — both removed. Green at 360dp once the keypress was gone; now unstable again from my keyboardDismissMode=on-drag reflowing the form mid-scroll (board #313). NOT an app bug. |
| `edit_profile` | FAIL-assert | s2/run-156 | 460 | stale — toast assertion already replaced by durable name check | [Failed] edit_profile (7m 21s) (Assertion is false: "Me" is visible) |
| `edit_profile_all_fields` | FAIL-? ⟳stale | run-467 | 170 | flow+app | 2026-09-03: FOUR causes, two of them app bugs. (1) asserted text 'Save' on a button reading 'Save Changes'; (2) centerElement on the sticky save button; (3) APP — the sticky Save sat BEHIND the keyboard (d8edc9e), verified visually at 360dp; (4) APP — the keyboard swallowed the tap on the NEXT field, so 'UpdatedLast' landed in the First Name box (e36a6b4, keyboardDismissMode=on-drag). Also a pre-existing viewport assumption on the final derived-city assertion (no scroll). MY OWN regressions along the way: a pressKey:Enter that SUBMITTED the form (608ddda, reverted) and a scrollUntilVisible that is a no-op when the target is already 'visible'. Flow-side stability still open — board #313. |
| `edit_profile_avatar` | FAIL-assert | run-472 | 145 |  | [Failed] edit_profile_avatar (2m 16s) (Assertion is false: "Switch to .*" is visible) |
| `edit_profile_bio_too_long` | FAIL-assert | s2/run-156 | 464 | flow — 520 chars do type; error renders above viewport; now scrolls UP cb68fa4 | [Failed] edit_profile_bio_too_long (7m 20s) (Assertion is false: "Me" is visible) |
| `edit_profile_province` | FAIL-assert | s2/run-156 | 468 | flow | 2026-09-02: DOWN + centerElement:true on profile-edit-button, which sits near the TOP of Profile — DOWN scrolls away from it and centring is impossible with too little content above. ORDER-DEPENDENT (siblings passed on the identical block). Now UP + visibilityPercentage 40, applied to all 8 flows carrying it. |
| `edit_profile_validation` | FAIL-assert | s2/run-156 | 468 |  | [Failed] edit_profile_validation (7m 25s) (Assertion is false: "Me" is visible) |
| `hidden_listings` | FAIL-assert | s2/run-156 | 463 |  | [Failed] hidden_listings (7m 19s) (Assertion is false: "Me" is visible) |
| `language_persists_across_tabs` | FAIL-assert | s2/run-156 | 463 |  | [Failed] language_persists_across_tabs (7m 20s) (Assertion is false: "Me" is visible) |
| `language_switch_all_screens` | FAIL-assert | s2/run-156 | 454 | flow — asserted Profile content while restart left app on feed; reordered cb68fa4 | [Failed] language_switch_all_screens (7m 16s) (Assertion is false: "Me" is visible) |
| `profile_stats_verify` | FAIL-assert | s2/run-156 | 463 | rig — killed mid-flow (no failure reason, 7m45s); feature-timeout truncation, re-run | Same hardcoded year. |
| `recently_viewed` | FAIL-assert | s2/run-156 | 157 | flow+app — row had no testID; added profile-row-recently-viewed. Fixed 34e713a | [Failed] recently_viewed (2m 18s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `recently_viewed_empty_state` | FAIL-assert | s2/run-156 | 160 |  | [Failed] recently_viewed_empty_state (2m 20s) (Assertion is false: "Buy and sell locally in Afghanistan" is vi |
| `seller_mode_toggle` | PASS | s2/run-156 | 187 |  |  |
| `theme_switch` | FAIL-assert | s2/run-156 | 168 |  | [Failed] theme_switch (2m 28s) (Element not found: Id matching regex: theme-option-light) |
| `transaction_stats_hidden_when_zero` | FAIL-assert | s2/run-156 | 157 |  | [Failed] transaction_stats_hidden_when_zero (2m 16s) (Assertion is false: "Buy and sell locally in Afghanistan |
| `transaction_stats_own_profile` | FAIL-assert | s2/run-156 | 183 |  | [Failed] transaction_stats_own_profile (2m 41s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | s2/run-156 | 170 | flow — vacuous assertNotVisible on the dead soldItems key; removed | [Failed] transaction_stats_public_profile (2m 30s) (Assertion is false: id: transaction-stats-badge is visible |
| `transaction_stats_seller_own_profile` | PASS | s2/run-156 | 205 |  |  |
| `user_profile_sold_tab` | FAIL-? | s2/run-156 | 168 | flow | Same ${visible()} problem. |
| `view_profile` | FAIL-assert | s2/run-156 | 178 |  | [Failed] view_profile (2m 38s) (Assertion is false: "Edit Profile" is visible) |
| `view_profile_error` | PASS | s2/run-156 | 188 |  | AxiosError |
| `view_seller_profile_from_profile` | FAIL-assert | s2/run-156 | 177 |  | [Failed] view_seller_profile_from_profile (2m 37s) (Assertion is false: "Switch to .*" is visible) |

## `chat` — Conversations, messages, offers, meetup arrangement, read state — mark-sold one-tap from the thread, place/release a hold with the buyer you're already talking to

25/49 passing · 23 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-489 | 226 |  |  |
| `block_from_conversation` | FAIL-assert | run-489 | 177 | app-bug | 2026-09-05 CAUSE FOUND, board BLK-2. The block SUCCEEDS server-side (INSERT+COMMIT in the API log; endpoint returns 204 by hand) while the app shows "Could not block user. Try again." 401s in the same window and devise rotates the token per request; http.ts clears the session on any 401. Load-sensitive: passed at 147s on a quiet host. Supersedes the older #312 note. |
| `chat_older_messages_pagination` | SILENT ⚠1 | run-489 | 201 |  | AxiosError  |
| `composer_draft` | PASS | run-489 | 195 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | PASS | run-489 | 179 |  |  |
| `conversation_delete` | FAIL-? | run-489 | 169 | flow | 2026-09-02: soft-DELETED its own fixture. Targeted the shared Xiaomi thread as "safe because SOLD"; the delete stamped buyer_deleted_at (09-01 17:54) so not_deleted_for hid it from the buyer for good and every later run failed. App was correct. Now owns "QA Disposable conversation_delete"; the seed clears delete/archive flags on disposable convos each run. |
| `conversation_read_status` | PASS | run-489 | 188 | fixture | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | run-489 | 223 |  |  |
| `conversations_empty_state` | FAIL-assert | run-489 | 180 |  | [Failed] conversations_empty_state (2m 41s) (Element not found: Id matching regex: register-email-input) |
| `conversations_filter` | PASS | run-489 | 221 | flow | 2026-09-02: asserted the "All caught up!" EMPTY state on the Unread tab, which 3 sibling flows mutate and the seed gives exactly ONE unread. Order-dependent. Now branches with runFlow: when (native in 2.7.0). |
| `conversations_list` | PASS | run-489 | 165 |  |  |
| `conversations_role_filter` | FAIL-assert | run-489 | 227 | flow | 2026-09-02: asserted 2 listings on screen at once; they sit at positions 10-11 of a 24-thread seller inbox (the seed adds 6 badge threads at 18-22). Positive asserts now scroll. NB the assertNotVisible ones are weak by nature — filtered-out and below-the-fold are indistinguishable to Maestro; documented in the flow. |
| `dead_end_notice_absent_when_active` | FAIL-assert | run-489 | 192 | flow — helper ran before the inbox appeared; the helper now waits (fixes 3 callers) | [Failed] dead_end_notice_absent_when_active (2m 53s) (Assertion is false: "Switch to .*" is visible) |
| `dead_end_notice_sold` | FAIL-assert | run-489 | 195 | new flow (added 27-Aug) — conversation-row not visible; awaiting first triage pass | [Failed] dead_end_notice_sold (2m 55s) (Assertion is false: "Switch to .*" is visible) |
| `delete_message` | FAIL-assert | run-489 | 192 | app+flow | 2026-09-02: failed on "Delete message" with the message sent and visible. Cause was the APP — the bubble sat behind the composer bar so the long press hit the bar and no sheet opened. Fixed structurally in 61ad571 (list ends at the bar). Flow also now waits for the sheet's animation. |
| `jump_to_latest` | FAIL-assert | run-489 | 177 | flow-bug fixed | 2026-09-05 "Switch to .*" was OFF-SCREEN on a scrolled profile, not missing — the app was signed in and healthy in the screenshot. ensure_buyer_mode now scrolls UP to recover it (UP matters: a previous fix used a DOWN scroll and carried the toggle further away). |
| `lifecycle_from_chat` | PASS | run-489 | 316 | flow — toast race ("Listing marked as sold"); load-bearing wait, see audit_toasts note |  |
| `mark_read` | PASS | run-489 | 215 | fixture | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | FAIL-assert | run-489 | 201 | flow | 2026-09-02: asserted an unread badge exists then tapped conversation-row index 0 — the newest thread, not necessarily the unread one. The divider only exists inside a thread with unread messages. Now taps unread-badge, which bubbles to its own row. |
| `meetup_decline` | PASS | run-489 | 376 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | FAIL-assert | run-489 | 177 | flow — both legs used index 0 (arbitrary listing, arbitrary thread); pinned to the seeded phone-case thread | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | PASS | run-489 | 229 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | PASS | run-489 | 256 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | FAIL-assert | run-489 | 381 | flow | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | PASS | run-489 | 231 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | PASS | run-489 | 258 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-? ⟳stale | run-489 | 204 | flow-bug fixed | 2026-09-05 scroll-to-title; searches inline and taps the card BY testID — after typing, the title is also the search input's own text, so a text tap can hit the field (flow_lint SEARCHTAP). |
| `offer_in_existing_thread` | FAIL-assert | run-489 | 219 | flow — tap raced the composer Modal; 7 sites now wait for the sheet's contents | [Failed] offer_in_existing_thread (3m 24s) (Assertion is false: "Send Offer" is visible) |
| `offer_quantity_round_trip` | FAIL-? | run-489 | 203 |  | [Failed] offer_quantity_round_trip (3m 8s) (No visible element found: "Wool Socks Bulk Pack - 12 Pairs") |
| `offer_send_and_accept` | FAIL-? | run-489 | 206 | flow-bug fixed | 2026-09-05 scroll-to-title lost its race with a 98-listing feed (timeout had already gone 8s->20s). Now uses _helpers/open_listing_by_title.yaml, the same search sequence that keeps browse/listing_detail_held_units_transparency green. |
| `offer_send_and_decline` | FAIL-? | run-489 | 199 | flow-bug fixed | 2026-09-05 same scroll-to-title cause as offer_send_and_accept; wired to _helpers/open_listing_by_title.yaml. |
| `place_and_release_hold` | PASS | run-489 | 183 |  |  |
| `quick_replies` | FAIL-assert | run-489 | 225 | rig — emulator died at 0% CPU idle (external load), not a flow verdict | Exception in thread "Thread-5" java.io.IOException: Command failed (shell,v2,raw:pm list packages --user 0 dev |
| `report_participant` | FAIL-assert | run-489 | 262 | flow-bug | 2026-09-05 NOT an app bug. A Report is unique per reporter+target and one from an e2e account existed at 02:48, created AFTER that pass's 02:42 seed, so the flow's FIRST submit already took the duplicate path — and ReportSheet offers "Block this user?" from inside onSuccess, making everything after it unreachable (RIG-004). reset_e2e clears reports BETWEEN passes, which cannot help one created DURING one. FIX: delete its own report row first, or target a user no other flow reports. |
| `reserve_after_accept` | FAIL-? | run-489 | 201 | flow-bug fixed | 2026-09-05 same scroll-to-title cause; wired to _helpers/open_listing_by_title.yaml. |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | run-489 | 213 | flow | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | PASS | run-489 | 376 | flow | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `scroll_to_latest` | PASS | run-489 | 404 | app | 2026-09-03 SOLVED: the meetup sheet was drawn UNDER the Android keyboard, so Time and Propose were unreachable when the sheet opened with the IME already up — the ordinary path, which no meetup flow covered. Fixed d46c896; PASS at BOTH widths after the rebuild. Its earlier 600s timeout at 360dp was a SYMPTOM of the same bug (dead waits), not a ceiling that needed raising. |
| `send_message` | PASS | run-489 | 201 |  |  |
| `send_message_double_tap` | PASS | run-489 | 204 |  |  |
| `send_message_empty` | PASS | run-489 | 197 |  |  |
| `send_message_offline` | FAIL-assert | run-489 | 222 | flow | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | run-489 | 207 |  |  |
| `send_multiple_messages` | PASS | run-489 | 241 |  |  |
| `send_photo` | PASS | run-489 | 229 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-? | run-489 | 195 | fixture | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | PASS | run-489 | 219 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `unread_badge_survives_navigation` | FAIL-assert | run-489 | 163 |  | [Failed] unread_badge_survives_navigation (2m 27s) (Element not found: Id matching regex: conversation-action- |
| `view_other_profile_from_conversation` | PASS | run-489 | 199 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

## `seller` — One-tap Mark sold from any live listing (never reserve-first) + the Sales ledger (edit/void a row, reviewed-sale refusal, outside-buyer rows, undo-after-sold)

0/18 passing · 18 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `held_quantity_refusal` | UNTESTED | — |  |  |  |
| `listing_actions_sheet` | UNTESTED | — |  |  |  |
| `listing_conversations` | UNTESTED | — |  |  |  |
| `mark_sold_all_units` | UNTESTED | — |  |  |  |
| `mark_sold_with_buyer` | UNTESTED | — |  |  |  |
| `multi_quantity_offplatform_sale` | UNTESTED | — |  |  |  |
| `multi_quantity_partial_sale` | UNTESTED | — |  | fixed | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | UNTESTED | — |  |  |  |
| `publish_success` | UNTESTED | — |  |  |  |
| `reserved_buyer` | UNTESTED | — |  |  |  |
| `sales_screen_correct_quantity` | UNTESTED | — |  |  |  |
| `sales_screen_reviewed_sale_refusal` | UNTESTED | — |  |  |  |
| `sales_screen_void_row` | UNTESTED | — |  |  |  |
| `save_draft` | UNTESTED | — |  |  |  |
| `sell_without_reserving` | UNTESTED | — |  |  |  |
| `sold_quantity_reconciliation` | UNTESTED | — |  |  |  |
| `undo_mark_sold` | UNTESTED | — |  |  |  |
| `undo_mark_sold_with_buyer` | UNTESTED | — |  |  |  |

## `rtl` — Pashto + Dari right-to-left layout across main screens

0/10 passing · 10 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | UNTESTED | — |  |  |  |
| `browse_rtl_pashto` | FAIL-assert | run-473 | 145 |  | [Failed] browse_rtl_pashto (2m 16s) (Assertion is false: "Switch to .*" is visible) |
| `buyer_picker_rtl` | UNTESTED | — |  |  |  |
| `categories_hub_rtl` | UNTESTED | — |  | flow | 2026-09-02: tapped text "Back" in a flow whose whole purpose is Pashto. The app renders no literal "Back" — BackButton has accessibilityLabel t(common.goBack) (ps شاته ځه) and testID back_button. Now targets the testID. |
| `chat_rtl` | UNTESTED | — |  | flow? | 2026-09-02: expects ps common.send "لیږل", present verbatim. Same language-revert hypothesis as profile_rtl. |
| `listing_detail_rtl` | FAIL-crash | run-474 | 146 |  | [Failed] listing_detail_rtl (2m 16s) (Assertion is false: "Switch to .*" is visible) |
| `my_listings_rtl` | UNTESTED | — |  |  |  |
| `profile_quick_actions_rtl` | UNTESTED | — |  | flow | 2026-09-02 SOLVED, flow bug, b20007e: the language-revert hypothesis was WRONG, and so was the mode-toggle one. Profile.tsx:306 renders this row as `${t('…myListings')} (${count})`, so the text is 'زما اعلانونه (0)' and Maestro's anchored regex could not match the bare label — the three sibling labels carry no suffix, which is why only this row failed. run-379's screenshot shows Profile correctly in seller mode (green tab bar, three tabs, saved-tab gone). Matched as a prefix now. NOT an app bug. |
| `profile_rtl` | UNTESTED | — |  | flow? | 2026-09-02: expects fa profile.editProfile "ویرایش پروفایل", which EXISTS verbatim in the locale file — so not a stale selector. Hypothesis: the language-revert bug (fixed 8097ab3) left the app in English after the switch, so no translated string could match. Re-running on a build with that fix. |
| `sales_ledger_rtl` | UNTESTED | — |  |  |  |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | UNTESTED | — |  |  |  |
| `save_listing` | UNTESTED | — |  |  |  |
| `save_multiple_listings` | UNTESTED | — |  |  |  |
| `saved_empty_state` | UNTESTED | — |  |  |  |
| `saved_listing_goes_sold` | UNTESTED | — |  |  |  |
| `saved_pagination` | UNTESTED | — |  |  |  |
| `unsave_from_browse_feed` | UNTESTED | — |  |  |  |
| `unsave_listing` | UNTESTED | — |  |  |  |

## `report` — Report a listing or user, block, block side-effects

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | UNTESTED | — |  |  |  |
| `block_user` | UNTESTED | — |  |  |  |
| `block_user_hides_listings` | UNTESTED | — |  |  |  |
| `report_listing` | UNTESTED | — |  | fixture | RIG-004; also gained the duplicate-rule assertion for listings, which nothing covered. |
| `report_listing_no_reason` | UNTESTED | — |  |  |  |
| `report_user` | UNTESTED | — |  | fixture | RIG-004 part 2: retargeted to ahmad (36) so it cannot collide intra-cycle. |
| `report_user_from_profile` | UNTESTED | — |  | fixture | Retargeted to omar (37); stopped using nondeterministic listing-card index 0. |
| `report_user_then_block` | UNTESTED | — |  | fixture | Retargeted to maryam (40); now unblocks, which it never did. |

## `dark_mode` — Every main screen in dark theme + theme persistence

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | s4/run-108 | 219 |  | [Failed] browse_dark (2m 57s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-assert | s4/run-108 | 167 |  | [Failed] chat_dark (2m 21s) (Element not found: Text matching regex: Dark) |
| `listing_detail_dark` | FAIL-assert | s4/run-108 | 192 |  | [Failed] listing_detail_dark (2m 19s) (Element not found: Text matching regex: Dark) |
| `my_listings_dark` | FAIL-assert | s4/run-108 | 247 | MY REGRESSION — restart helper waited for listing-card; seller mode returns to seller-listing-card. Fixed | [Failed] my_listings_dark (3m 40s) (Element not found: Text matching regex: Dark) |
| `profile_dark` | FAIL-assert | s4/run-108 | 166 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | FAIL-assert | s4/run-108 | 164 |  | [Failed] saved_tab_dark (2m 19s) (Element not found: Text matching regex: Appearance) |
| `theme_light_all_screens` | FAIL-assert | s4/run-108 | 158 |  | [Failed] theme_light_all_screens (2m 14s) (Element not found: Text matching regex: Appearance) |
| `theme_persists_after_navigate` | UNTESTED | — |  | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | s2/run-156 | 114 | candidate — one spurious 401 logged the app out; see UI_FINDINGS, needs 2nd sighting | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | FAIL-assert | s2/run-156 | 172 |  | [Failed] seller_mode_tab_bar_changes (2m 34s) (Element not found: Id matching regex: mode-switcher-banner) |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | s2/run-156 | 208 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

## `reviews` — Double-blind reviews after a sold transaction

0/3 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | UNTESTED | — |  |  |  |
| `profile_reviews_empty_state` | UNTESTED | — |  |  |  |
| `rate_buyer_after_sale` | UNTESTED | — |  |  |  |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

2/4 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | PASS | s2/run-286 | 283 | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | FAIL-assert | run-470 | 220 | flow | 2026-09-02: never scrolled to its own Save button, which adding a photo pushes below the fold — the rule this file's own header states. Now scrolls at visibilityPercentage 40. |
| `listing_gallery_no_photo` | FAIL-assert | s2/run-286 | 197 |  | [Failed] listing_gallery_no_photo (3m 6s) (Assertion is false: "No photo" is visible) |
| `listing_gallery_swipe` | PASS | s2/run-286 | 147 |  |  |

## `safety` — Safety tips on listing detail and in the meetup sheet

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | UNTESTED | — |  |  |  |
| `safety_tips_meetup_sheet` | UNTESTED | — |  |  |  |

## `share` — Deep links into a listing and a seller profile

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | UNTESTED | — |  |  |  |
| `open_seller_deep_link` | UNTESTED | — |  |  |  |

## `auth` — Sign up, login, logout, session persistence, guest gating

15/16 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | s2/run-285 | 140 |  |  |
| `guest_browse` | PASS | s2/run-285 | 102 |  |  |
| `guest_offer_redirect` | PASS | s2/run-285 | 157 |  |  |
| `guest_save_redirect` | PASS | s2/run-285 | 158 |  |  |
| `login` | FAIL-assert | run-469 | 220 |  | [Failed] login (3m 31s) (Assertion is false: "Development Build" is not visible) |
| `login_deep` | PASS | s2/run-285 | 183 |  |  |
| `login_empty_fields` | PASS | s2/run-285 | 93 |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | PASS | s2/run-285 | 89 |  |  |
| `login_wrong_password` | PASS | s2/run-285 | 100 |  | Request failed with status code |
| `logout` | PASS | s2/run-285 | 196 | rig | ENVIRONMENT, not the flow. run-241 aborted mid-feature: an openaleph-mobile Gradle build took the load average to 49 on 16 cores and this session's emulator died — the rig logged "CPU only 0% idle — refusing to boot" and "could not recover the emulator — aborting feature 'auth'". Re-run on a quiet machine before reading anything into it. logout is also the reference flow that showed sign-out lands on the Bazaar (see login_deep). |
| `logout_cancel` | PASS | s2/run-285 | 194 |  |  |
| `register_duplicate_email` | PASS | s2/run-285 | 119 | flow | APP IS CORRECT (422 + errors.full_messages surfaced) but the FLOW was wrong, and my first diagnosis blamed the wrong thing. Register.tsx renders each error as `<Text>{"• "}{msg}</Text>`, so the node reads "• Email has already been taken" and Maestro's anchored regex cannot match the bare literal. It would have failed on a quiet machine too — the `Refreshing…` banner in the first screenshot was real but incidental. Now asserts ".*Email has already been taken.*". |
| `register_navigate_to_login` | PASS | s2/run-285 | 92 |  |  |
| `session_persist` | PASS | s2/run-285 | 121 |  |  |
| `sign_up` | PASS | s2/run-285 | 150 |  |  |
| `sign_up_validation` | PASS | s2/run-285 | 132 |  |  |

## `onboarding` — First-run experience

0/1 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | FAIL-redbox | s2/run-156 | 127 |  | [Failed] first_run (1m 47s) (Assertion is false: "Buy or sell — your choice" is visible) |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

5/6 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | s2/run-156 | 151 |  |  |
| `conversations_pagination` | PASS | s2/run-156 | 138 |  |  |
| `filter_combined_pagination` | FAIL-assert | s2/run-156 | 155 | flow — assertNotVisible on dead copy (vacuous); now asserts a cross-category listing is absent | [Failed] filter_combined_pagination (2m 20s) (Element not found: Text matching regex: Electronics) |
| `my_listings_pagination` | PASS | s2/run-156 | 202 |  |  |
| `saved_pagination_deep` | PASS | s2/run-156 | 147 |  |  |
| `search_pagination` | PASS | s2/run-156 | 161 |  |  |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

7/7 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | s2/run-285 | 195 |  |  |
| `filter_map_default_kabul` | PASS | s2/run-285 | 140 |  |  |
| `filter_map_location_denied` | PASS | s2/run-285 | 159 |  |  |
| `filter_map_use_my_location` | PASS | s2/run-285 | 149 |  |  |
| `filter_map_use_my_location_granted` | PASS | s2/run-285 | 144 |  |  |
| `map_location_outside_afghanistan` | PASS | s2/run-285 | 160 |  |  |
| `zoom_controls_not_occluded` | PASS | s2/run-285 | 175 |  |  |

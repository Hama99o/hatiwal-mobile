# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**168 of 256 flows passing** · 85 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 168 | green, and no backend error underneath |
| FAIL-assert | 67 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-? | 17 | failed, cause unclear — read the log |
| (rig) | 2 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 1 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `chat` — Conversations, messages, offers, meetup arrangement, read state — mark-sold one-tap from the thread, place/release a hold with the buyer you're already talking to

29/49 passing · 16 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-299 | 200 |  |  |
| `block_from_conversation` | PASS | run-320 | 152 | flow | 2026-09-02: bare assertVisible on the composer right after opening a thread raced the thread's own fetch (host was ~3min/flow, swap full). NOT a stale block — Block.count was 0 and this flow unblocks itself. Now extendedWaitUntil. |
| `chat_older_messages_pagination` | PASS | run-299 | 185 |  |  |
| `composer_draft` | PASS | run-299 | 229 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | PASS | run-299 | 198 |  |  |
| `conversation_delete` | PASS | run-319 | 145 | flow | 2026-09-02: soft-DELETED its own fixture. Targeted the shared Xiaomi thread as "safe because SOLD"; the delete stamped buyer_deleted_at (09-01 17:54) so not_deleted_for hid it from the buyer for good and every later run failed. App was correct. Now owns "QA Disposable conversation_delete"; the seed clears delete/archive flags on disposable convos each run. |
| `conversation_read_status` | PASS | run-299 | 211 | fixture | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | run-359 | 190 |  |  |
| `conversations_empty_state` | PASS | run-299 | 135 |  |  |
| `conversations_filter` | PASS | run-302 | 156 | flow | 2026-09-02: asserted the "All caught up!" EMPTY state on the Unread tab, which 3 sibling flows mutate and the seed gives exactly ONE unread. Order-dependent. Now branches with runFlow: when (native in 2.7.0). |
| `conversations_list` | PASS | run-299 | 191 |  |  |
| `conversations_role_filter` | PASS | run-361 | 224 | flow | 2026-09-02: asserted 2 listings on screen at once; they sit at positions 10-11 of a 24-thread seller inbox (the seed adds 6 badge threads at 18-22). Positive asserts now scroll. NB the assertNotVisible ones are weak by nature — filtered-out and below-the-fold are indistinguishable to Maestro; documented in the flow. |
| `dead_end_notice_absent_when_active` | PASS | run-299 | 189 | flow — helper ran before the inbox appeared; the helper now waits (fixes 3 callers) |  |
| `dead_end_notice_sold` | FAIL-assert | run-299 | 205 | new flow (added 27-Aug) — conversation-row not visible; awaiting first triage pass | [Failed] dead_end_notice_sold (3m 12s) (Assertion is false: id: conversation-row-\d+ is visible) |
| `delete_message` | PASS | run-301 | 156 | app+flow | 2026-09-02: failed on "Delete message" with the message sent and visible. Cause was the APP — the bubble sat behind the composer bar so the long press hit the bar and no sheet opened. Fixed structurally in 61ad571 (list ends at the bar). Flow also now waits for the sheet's animation. |
| `jump_to_latest` | PASS | run-367 | 190 | new | 2026-09-02: the jump-to-latest pill — absent at the bottom, appears after scrolling up, returns to the newest message, then retires itself. |
| `lifecycle_from_chat` | PASS | run-362 | 254 | flow — toast race ("Listing marked as sold"); load-bearing wait, see audit_toasts note |  |
| `mark_read` | PASS | run-299 | 171 | fixture | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | FAIL-? | run-360 | 191 | flow | 2026-09-02: asserted an unread badge exists then tapped conversation-row index 0 — the newest thread, not necessarily the unread one. The divider only exists inside a thread with unread messages. Now taps unread-badge, which bubbles to its own row. |
| `meetup_decline` | FAIL-assert | run-299 | 414 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | FAIL-assert | run-299 | 483 | flow — both legs used index 0 (arbitrary listing, arbitrary thread); pinned to the seeded phone-case thread | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | PASS | run-299 | 229 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | PASS | run-299 | 240 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | PASS | run-299 | 419 | flow | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | PASS | run-299 | 221 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | PASS | run-299 | 261 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-? | run-299 | 196 | flow — inherited a pushed Create Listing form from the previous flow; login helpers now cold-restart | Tapped seller-only "Counter" as the buyer who sent the offer. Now switches to the seller. |
| `offer_in_existing_thread` | PASS | run-299 | 203 | flow — tap raced the composer Modal; 7 sites now wait for the sheet's contents |  |
| `offer_quantity_round_trip` | FAIL-? | run-299 | 188 |  | [Failed] offer_quantity_round_trip (2m 59s) (No visible element found: "Wool Socks Bulk Pack - 12 Pairs") |
| `offer_send_and_accept` | FAIL-? | run-299 | 190 | flow — scroll not centred and 8s timeout; centred + 20s | [Failed] offer_send_and_accept (3m 1s) (No visible element found: "Men Winter Jacket XL Black") |
| `offer_send_and_decline` | FAIL-assert | run-299 | 186 | flow | Same wrong-session bug for "Decline"; also asserted "Pending", which no offer bubble renders. |
| `place_and_release_hold` | FAIL-assert | run-266 | 329 |  | [Failed] place_and_release_hold (5m 9s) (Assertion is false: "Hold released — listing is fully back on the mar |
| `quick_replies` | (rig) ⚠slow | run-264 | 770 | rig — emulator died at 0% CPU idle (external load), not a flow verdict | Exception in thread "Thread-5" java.io.IOException: Command failed (shell,v2,raw:pm list packages --user 0 dev |
| `report_participant` | (rig) | run-264 |  | fixture | RIG-004: Report is unique per reporter+target and nothing cleared them. First submit now tolerant. |
| `reserve_after_accept` | FAIL-assert | s2/run-142 | 188 |  | [Failed] reserve_after_accept (2m 43s) (Element not found: Text matching regex: Make an Offer) |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | s2/run-142 | 202 | flow | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | FAIL-assert ⚠slow | s2/run-142 | 568 | flow | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `scroll_to_latest` | PASS | run-368 | 283 | new | 2026-09-02: covers the owner's report that the newest message could not be reached without a manual drag. NOTE: a Maestro pass here proves nothing on its own — its visibility test uses an element's own bounds and cannot see occlusion, and it passed the BROKEN build. Verify with qa/check_message_not_occluded.py. |
| `send_message` | PASS | run-283 | 171 |  |  |
| `send_message_double_tap` | PASS | s2/run-142 | 209 |  |  |
| `send_message_empty` | PASS | s2/run-142 | 202 |  |  |
| `send_message_offline` | FAIL-assert ⚠1 | s2/run-142 | 245 | flow | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | s2/run-142 | 203 |  |  |
| `send_multiple_messages` | PASS | s2/run-142 | 237 |  |  |
| `send_photo` | FAIL-assert | s2/run-142 | 221 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-assert ⟳stale | run-283 | 186 | fixture | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | FAIL-? | s2/run-142 | 5 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `unread_badge_survives_navigation` | UNTESTED | — |  |  |  |
| `view_other_profile_from_conversation` | FAIL-? | s2/run-142 | 7 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

## `listings` — Seller create/edit/delete + the 3-state lifecycle (Draft/Live/Sold) — Mark sold is always the one-tap primary, no Reserved tab

26/40 passing · 14 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-284 | 325 |  |  |
| `create_listing_all_fields` | FAIL-assert | run-284 | 269 | STALE — already retargeted off tapOn "Kabul" (comment at :85 records it); awaiting re-run | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
| `create_listing_category_search` | PASS | run-284 | 165 |  |  |
| `create_listing_currency_eur` | PASS | run-284 | 207 | flow | My Shop list is virtualised, so an unrendered card is absent; now searches. Price is one node (€250.00). |
| `create_listing_currency_usd` | PASS | run-284 | 220 | flow | Asserted "$450" — `$` is a regex end-anchor, so it could never match. |
| `create_listing_draft_discard` | FAIL-? | run-284 | 99 |  | [Failed] create_listing_draft_discard (1m 26s) |
| `create_listing_draft_restore` | FAIL-assert | run-284 | 196 | flow | "Draft saved" is a toast from toast.success; a bare assert races it. Now polls. |
| `create_listing_full_publish` | PASS | run-284 | 217 |  | AxiosError |
| `create_listing_multi_quantity` | FAIL-assert | run-284 | 188 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | run-284 | 181 |  |  |
| `create_listing_publish_blocked` | FAIL-assert | run-284 | 223 | flow | Touched the form before the location sheet closed; the helper allows 45s for it. |
| `create_listing_publish_direct` | PASS | run-284 | 240 |  |  |
| `create_listing_publish_requirements` | PASS | run-284 | 171 |  |  |
| `create_listing_quantity_edges` | FAIL-assert | run-284 | 189 | flow | Field maps empty to 1, so eraseText appends. Blur-then-focus lets selectTextOnFocus replace. |
| `create_listing_title_edges` | PASS | run-284 | 185 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS | run-284 | 156 |  |  |
| `create_listing_with_condition` | PASS | run-284 | 397 | flow | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-284 | 363 |  |  |
| `delete_listing` | PASS | run-284 | 196 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert | run-284 | 244 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | PASS | run-284 | 188 |  |  |
| `edit_listing_all_fields` | FAIL-assert | run-284 | 176 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | PASS | run-284 | 145 | STALE — run-252 executed the old route (commands.json proves it); already fixed | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | PASS | run-284 | 194 |  |  |
| `edit_listing_remove_photo` | FAIL-assert | run-284 | 219 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-assert | run-284 | 242 | flow — optional gallery tap no-opped silently; now by testID. Fixed 34e713a | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert | run-284 | 152 | flow — tab switch refires the request; nothing waited for the list. Fixed 34e713a | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | PASS | run-284 | 160 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | PASS | run-284 | 201 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | PASS | run-284 | 424 |  |  |
| `lifecycle_sold` | PASS | run-284 | 175 |  |  |
| `lifecycle_unpublish` | PASS | run-284 | 180 |  |  |
| `listing_analytics_sparkline` | PASS | run-284 | 145 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | run-284 | 132 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert | run-284 | 143 | flow — same missing wait as expired_listing_badge. Fixed 34e713a | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | PASS | run-284 | 144 | flow — swipe fix already present; tab taps now by testID (SOLD badge collided). Verdict stale | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-assert | run-284 | 145 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | PASS | run-284 | 142 | flow — same; executed step was pre-swipe scrollUntilVisible. Verdict stale | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | PASS | run-284 | 137 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-assert | run-284 | 174 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile — a reserved listing stays searchable + messageable, and a held batch shows its hold

27/41 passing · 13 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-284 | 239 |  | AxiosError |
| `browse_listings` | PASS | run-284 | 182 |  |  |
| `browse_sort_most_viewed` | PASS | run-284 | 185 |  | AxiosError AxiosError |
| `browse_sort_nearest` | PASS | run-284 | 174 |  |  |
| `categories_hub` | PASS | run-351 | 201 |  |  |
| `clear_all_filters` | PASS | run-284 | 180 |  |  |
| `filter_active_sellers` | PASS | run-284 | 179 |  |  |
| `filter_by_category` | PASS | run-348 | 196 |  |  |
| `filter_condition` | PASS | run-284 | 180 |  |  |
| `filter_price_range` | PASS | run-284 | 189 |  |  |
| `full_marketplace_cycle` | FAIL-assert ⚠slow | run-284 | 594 | flow — doubled search (missing eraseText) + inherited price filter emptied the feed; fixed | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_detail` | PASS | run-284 | 177 |  |  |
| `listing_detail_held_units_transparency` | PASS | run-284 | 415 |  |  |
| `listing_detail_multi_quantity` | FAIL-assert | run-284 | 126 | flow — scroll stopped at the clipped bottom row so the price row never showed; centred. API data verified correct | [Failed] listing_detail_multi_quantity (1m 50s) (Element not found: Id matching regex: login-email-input) |
| `listing_detail_offer` | PASS | run-284 | 235 |  |  |
| `listing_detail_offer_invalid` | PASS | run-284 | 192 |  |  |
| `listing_detail_price_drop_badge` | FAIL-? | run-284 | 195 | flow — asserted the drop badge on a listing with no drop; retargeted to the seeded Lenovo | [Failed] listing_detail_price_drop_badge (3m 1s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8G |
| `listing_detail_quantity_intent` | FAIL-assert | run-284 | 195 |  | [Failed] listing_detail_quantity_intent (2m 58s) (Assertion is false: ".*I'd like to buy.*" is visible) |
| `listing_detail_report` | FAIL-assert | run-284 | 234 | fixture | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_reserved_contactable` | PASS | run-284 | 146 |  |  |
| `listing_detail_save_unsave` | FAIL-assert | run-284 | 245 | flow — asserted a global 'No saved items yet' it does not own; now asserts this listing is gone | [Failed] listing_detail_save_unsave (3m 50s) (Assertion is false: "Wool Blanket Handmade King Size" is not vis |
| `listing_detail_saves_count` | FAIL-assert | run-284 | 208 | flow — tapped the save TOGGLE blind and unsaved it, so savesCount hit 0; now state-aware | [Failed] listing_detail_saves_count (3m 14s) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-284 | 200 |  |  |
| `listing_detail_similar` | FAIL-assert | run-284 | 216 |  | [Failed] listing_detail_similar (3m 14s) (Assertion is false: "Similar Listings" is visible) |
| `listing_detail_sold_recovery` | FAIL-? | run-284 | 163 | flow — cold-start deep link discarded by startup nav; waits for settle + re-fires. See UI_FINDINGS | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | PASS | run-284 | 133 | flow — same cold-start deep-link loss; fixed alongside sold_recovery |  |
| `listing_detail_views_count` | PASS | run-284 | 254 |  |  |
| `not_interested` | FAIL-assert | run-284 | 212 |  | [Failed] not_interested (3m 16s) (Assertion is false: "Undo" is visible) |
| `saved_search_apply` | FAIL-assert | run-284 | 206 | flow — tapped the SHEET's "Clear" after closing the sheet; now the feed's clear-filters chip | [Failed] saved_search_apply (3m 8s) (Assertion is false: "Saved search" is visible) |
| `scroll_to_top` | PASS | run-284 | 177 |  |  |
| `search_empty_state` | PASS | run-284 | 199 |  |  |
| `search_listings` | PASS | run-284 | 252 |  |  |
| `search_with_filter` | PASS | run-284 | 217 |  |  |
| `seller_profile` | PASS | run-284 | 200 |  |  |
| `seller_profile_from_listing` | PASS | run-284 | 188 |  |  |
| `seller_response_rate_badge` | FAIL-assert | run-284 | 214 | flow — anchored pattern started mid-label; badge renders "82% reply rate · Usually responds…" as one Text | [Failed] seller_response_rate_badge (3m 17s) (Assertion is false: "[0-9]+% reply rate" is visible) |
| `subcategory_drilldown` | PASS | run-284 | 208 | flow — chip reads "Subcategory: Phones & Tablets"; the two chip asserts still said "Phones" | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | FAIL-? | run-284 | 206 | flow — index 0 of a recency-ordered inbox reached Fatima (owns a listing); now targets Ahmad | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | PASS | run-284 | 186 | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | PASS | run-284 | 175 | flow — asserted a "Message" button the profile has never had (contact is per-listing by design) | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | FAIL-assert | run-284 | 156 | flow | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `seller` — One-tap Mark sold from any live listing (never reserve-first) + the Sales ledger (edit/void a row, reviewed-sale refusal, outside-buyer rows, undo-after-sold)

8/17 passing · 9 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `held_quantity_refusal` | FAIL-assert | run-285 | 216 |  | [Failed] held_quantity_refusal (3m 25s) (Assertion is false: "Winter Gloves Wholesale Box - 15 Pairs" is visib |
| `listing_actions_sheet` | FAIL-assert | run-285 | 235 |  | [Failed] listing_actions_sheet (3m 45s) (Element not found: Id matching regex: browse-tab) |
| `listing_conversations` | FAIL-? | run-285 | 391 |  | [Failed] listing_conversations (6m 20s) (No visible element found: "Men Winter Jacket XL Black") |
| `mark_sold_with_buyer` | PASS | run-285 | 171 |  |  |
| `multi_quantity_offplatform_sale` | FAIL-? | run-285 | 154 |  | [Failed] multi_quantity_offplatform_sale (2m 24s) (No visible element found: "QA Disposable offplatform_units" |
| `multi_quantity_partial_sale` | PASS | run-285 | 230 | fixed | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | FAIL-assert | run-285 | 269 |  | [Failed] publish_from_owner_detail (4m 19s) (Assertion is false: "Publish this listing?" is visible) |
| `publish_success` | FAIL-assert | run-285 | 281 |  | [Failed] publish_success (4m 30s) (Element not found: Text matching regex: Save) |
| `reserved_buyer` | PASS | run-285 | 436 |  |  |
| `sales_screen_correct_quantity` | PASS | run-285 | 293 |  |  |
| `sales_screen_reviewed_sale_refusal` | FAIL-assert | run-285 | 180 |  | [Failed] sales_screen_reviewed_sale_refusal (2m 49s) (Assertion is false: ".*3 of 10 sold.*" is visible) |
| `sales_screen_void_row` | PASS | run-285 | 298 |  |  |
| `save_draft` | FAIL-assert | run-285 | 212 |  | [Failed] save_draft (3m 21s) (Assertion is false: "Create Listing" is visible) |
| `sell_without_reserving` | PASS | run-285 | 252 |  |  |
| `sold_quantity_reconciliation` | FAIL-assert | run-285 | 333 |  | [Failed] sold_quantity_reconciliation (5m 23s) (Assertion is false: "QA SF-M7 Reconcile Batch" is visible) |
| `undo_mark_sold` | PASS | run-285 | 245 |  |  |
| `undo_mark_sold_with_buyer` | PASS | run-285 | 172 |  |  |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

16/30 passing · 9 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert | run-298 | 151 |  | [Failed] account_delete_and_restore (2m 22s) (Element not found: Text matching regex: Delete account) |
| `account_delete_cancel` | FAIL-? | run-298 | 176 |  | [Failed] account_delete_cancel (2m 47s) (No visible element found: "Delete account") |
| `away_mode` | PASS ⟳stale | run-298 | 223 | app+flow — away row was untappable (no Pressable/testID); fixed cb68fa4 (live via Metro, no rebuild) |  |
| `blocked_users` | PASS | run-298 | 188 |  |  |
| `change_language_dari` | PASS | run-327 | 487 |  |  |
| `change_language_english` | PASS | run-298 | 551 | flow — toothless restart wait; helper+nav fixed cb68fa4 |  |
| `change_language_pashto` | PASS | run-326 | 189 |  |  |
| `contact_visibility` | FAIL-assert ⟳stale | run-358 | 154 |  | [Failed] contact_visibility (2m 24s) (Assertion is false: id: edit-profile-show-phone-switch is visible) |
| `edit_profile` | PASS | run-324 | 147 | stale — toast assertion already replaced by durable name check |  |
| `edit_profile_all_fields` | FAIL-assert ⟳stale | run-363 | 178 | flow | 2026-09-02: same DOWN+centerElement defect as edit_profile_province — see that row. Screen itself was healthy (run-298 screenshot shows Profile rendering correctly in dark mode). |
| `edit_profile_avatar` | PASS | run-298 | 169 |  |  |
| `edit_profile_bio_too_long` | PASS ⟳stale | run-298 | 262 | flow — 520 chars do type; error renders above viewport; now scrolls UP cb68fa4 |  |
| `edit_profile_province` | PASS | run-357 | 209 | flow | 2026-09-02: DOWN + centerElement:true on profile-edit-button, which sits near the TOP of Profile — DOWN scrolls away from it and centring is impossible with too little content above. ORDER-DEPENDENT (siblings passed on the identical block). Now UP + visibilityPercentage 40, applied to all 8 flows carrying it. |
| `edit_profile_validation` | PASS ⟳stale | run-298 | 181 |  |  |
| `hidden_listings` | FAIL-assert | run-298 | 195 |  | [Failed] hidden_listings (3m 6s) (Assertion is false: "No hidden listings" is visible) |
| `language_persists_across_tabs` | PASS | run-298 | 248 |  |  |
| `language_switch_all_screens` | PASS | run-298 | 279 | flow — asserted Profile content while restart left app on feed; reordered cb68fa4 |  |
| `profile_stats_verify` | FAIL-assert | run-298 | 182 | rig — killed mid-flow (no failure reason, 7m45s); feature-timeout truncation, re-run | Same hardcoded year. |
| `recently_viewed` | PASS | run-298 | 133 | flow+app — row had no testID; added profile-row-recently-viewed. Fixed 34e713a |  |
| `recently_viewed_empty_state` | PASS | run-298 | 115 |  |  |
| `seller_mode_toggle` | PASS | run-298 | 174 |  |  |
| `theme_switch` | FAIL-assert | run-298 | 194 |  | [Failed] theme_switch (3m 5s) (Element not found: Id matching regex: theme-option-light) |
| `transaction_stats_hidden_when_zero` | PASS | run-298 | 107 |  |  |
| `transaction_stats_own_profile` | PASS | run-298 | 167 |  |  |
| `transaction_stats_public_profile` | PASS | run-298 | 183 | flow — vacuous assertNotVisible on the dead soldItems key; removed |  |
| `transaction_stats_seller_own_profile` | PASS | run-298 | 175 |  |  |
| `user_profile_sold_tab` | FAIL-assert | run-298 | 202 | flow | Same ${visible()} problem. |
| `view_profile` | FAIL-assert | run-298 | 196 |  | [Failed] view_profile (3m 6s) (Assertion is false: "Edit Profile" is visible) |
| `view_profile_error` | FAIL-assert | run-298 | 194 |  | AxiosError |
| `view_seller_profile_from_profile` | FAIL-assert | run-298 | 192 |  | [Failed] view_seller_profile_from_profile (3m) (Assertion is false: "Ahmad Karimi" is visible) |

## `dark_mode` — Every main screen in dark theme + theme persistence

3/8 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | run-290 | 238 |  | [Failed] browse_dark (3m 49s) (Assertion is false: id: (seller-)?listing-card is visible) |
| `chat_dark` | FAIL-assert | run-290 | 217 |  | [Failed] chat_dark (3m 28s) (Assertion is false: id: (seller-)?listing-card is visible) |
| `listing_detail_dark` | FAIL-assert | run-290 | 217 |  | [Failed] listing_detail_dark (3m 29s) (Assertion is false: id: (seller-)?listing-card is visible) |
| `my_listings_dark` | PASS | run-290 | 198 | MY REGRESSION — restart helper waited for listing-card; seller mode returns to seller-listing-card. Fixed |  |
| `profile_dark` | FAIL-assert | run-290 | 213 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | FAIL-assert | run-290 | 220 |  | [Failed] saved_tab_dark (3m 31s) (Assertion is false: id: (seller-)?listing-card is visible) |
| `theme_light_all_screens` | PASS | run-290 | 231 |  |  |
| `theme_persists_after_navigate` | PASS | run-290 | 270 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

## `report` — Report a listing or user, block, block side-effects

4/8 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | PASS | run-292 | 234 |  |  |
| `block_user` | FAIL-? | run-292 | 192 |  | [Failed] block_user (3m 2s) (No visible element found: "Wool Blanket Handmade King Size") |
| `block_user_hides_listings` | PASS | run-292 | 223 |  |  |
| `report_listing` | FAIL-? | run-292 | 180 | fixture | RIG-004; also gained the duplicate-rule assertion for listings, which nothing covered. |
| `report_listing_no_reason` | FAIL-? | run-292 | 182 |  | [Failed] report_listing_no_reason (2m 53s) (No visible element found: "Wool Blanket Handmade King Size") |
| `report_user` | PASS | run-292 | 197 | fixture | RIG-004 part 2: retargeted to ahmad (36) so it cannot collide intra-cycle. |
| `report_user_from_profile` | PASS | run-292 | 198 | fixture | Retargeted to omar (37); stopped using nondeterministic listing-card index 0. |
| `report_user_then_block` | FAIL-assert | run-292 | 220 | fixture | Retargeted to maryam (40); now unblocks, which it never did. |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

5/8 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | PASS | run-286 | 171 |  |  |
| `save_listing` | FAIL-? | run-286 | 146 |  | [Failed] save_listing (2m 17s) (No visible element found: "Wool Blanket Handmade King Size") |
| `save_multiple_listings` | PASS | run-286 | 146 |  |  |
| `saved_empty_state` | PASS | run-286 | 108 |  |  |
| `saved_listing_goes_sold` | FAIL-assert | run-286 | 385 |  | [Failed] saved_listing_goes_sold (6m 16s) (Element not found: Id matching regex: seller-card-primary-action) |
| `saved_pagination` | PASS | run-286 | 171 |  |  |
| `unsave_from_browse_feed` | FAIL-assert | run-286 | 156 |  | [Failed] unsave_from_browse_feed (2m 27s) (Assertion is false: "No saved items yet" is visible) |
| `unsave_listing` | PASS | run-286 | 134 |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

2/4 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | run-293 | 132 | candidate — one spurious 401 logged the app out; see UI_FINDINGS, needs 2nd sighting | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | PASS | run-293 | 215 |  |  |
| `seller_mode_tab_bar_changes` | PASS | run-293 | 179 |  |  |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | run-293 | 207 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

## `reviews` — Double-blind reviews after a sold transaction

1/3 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-assert | run-291 | 218 |  | [Failed] pending_reviews_nudge (3m 28s) (Element not found: Text matching regex: Mark as Sold) |
| `profile_reviews_empty_state` | PASS | run-291 | 106 |  |  |
| `rate_buyer_after_sale` | FAIL-assert | run-291 | 208 |  | [Failed] rate_buyer_after_sale (3m 20s) (Element not found: Text matching regex: Mark as Sold) |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | PASS | s2/run-286 | 283 | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | PASS | run-325 | 209 | flow | 2026-09-02: never scrolled to its own Save button, which adding a photo pushes below the fold — the rule this file's own header states. Now scrolls at visibilityPercentage 40. |
| `listing_gallery_no_photo` | FAIL-assert | s2/run-286 | 197 |  | [Failed] listing_gallery_no_photo (3m 6s) (Assertion is false: "No photo" is visible) |
| `listing_gallery_swipe` | PASS | s2/run-286 | 147 |  |  |

## `share` — Deep links into a listing and a seller profile

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | PASS | run-296 | 62 |  |  |
| `open_seller_deep_link` | FAIL-assert | run-296 | 76 |  | [Failed] open_seller_deep_link (1m 7s) (Assertion is false: id: more-options-button is visible) |

## `auth` — Sign up, login, logout, session persistence, guest gating

16/16 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | s2/run-285 | 140 |  |  |
| `guest_browse` | PASS | s2/run-285 | 102 |  |  |
| `guest_offer_redirect` | PASS | s2/run-285 | 157 |  |  |
| `guest_save_redirect` | PASS | s2/run-285 | 158 |  |  |
| `login` | PASS | s2/run-285 | 119 |  |  |
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

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | run-284 | 250 |  |  |

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

## `safety` — Safety tips on listing detail and in the meetup sheet

2/2 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | PASS | run-295 | 178 |  |  |
| `safety_tips_meetup_sheet` | PASS | run-295 | 195 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | run-294 | 178 |  |  |
| `conversations_pagination` | PASS | run-294 | 170 |  |  |
| `filter_combined_pagination` | PASS | run-294 | 183 | flow — assertNotVisible on dead copy (vacuous); now asserts a cross-category listing is absent |  |
| `my_listings_pagination` | PASS | run-294 | 182 |  |  |
| `saved_pagination_deep` | PASS | run-294 | 167 |  |  |
| `search_pagination` | PASS | run-294 | 177 |  |  |

## `rtl` — Pashto + Dari right-to-left layout across main screens

8/10 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | PASS | run-289 | 218 |  |  |
| `browse_rtl_pashto` | PASS | run-352 | 159 |  |  |
| `buyer_picker_rtl` | PASS | run-289 | 549 |  |  |
| `categories_hub_rtl` | PASS | run-354 | 156 | flow | 2026-09-02: tapped text "Back" in a flow whose whole purpose is Pashto. The app renders no literal "Back" — BackButton has accessibilityLabel t(common.goBack) (ps شاته ځه) and testID back_button. Now targets the testID. |
| `chat_rtl` | FAIL | run-365 | 478 | flow? | 2026-09-02: expects ps common.send "لیږل", present verbatim. Same language-revert hypothesis as profile_rtl. |
| `listing_detail_rtl` | PASS | run-289 | 530 |  |  |
| `my_listings_rtl` | PASS | run-289 | 218 |  |  |
| `profile_quick_actions_rtl` | FAIL-assert ⟳stale | run-364 | 175 | flow? | 2026-09-02: expects ps profile.switchToSeller, present verbatim in the locale file. Same language-revert hypothesis as profile_rtl. |
| `profile_rtl` | PASS | run-353 | 480 | flow? | 2026-09-02: expects fa profile.editProfile "ویرایش پروفایل", which EXISTS verbatim in the locale file — so not a stale selector. Hypothesis: the language-revert bug (fixed 8097ab3) left the app in English after the switch, so no translated string could match. Re-running on a build with that fix. |
| `sales_ledger_rtl` | PASS | run-289 | 547 |  |  |

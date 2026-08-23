# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**51 of 231 flows passing** · 179 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 51 | green, and no backend error underneath |
| SILENT | 1 | **assertions passed while the API errored** — the app told the user nothing |
| FAIL-assert | 133 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 24 | failed, cause unclear — read the log |
| (rig) | 1 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 20 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

6/37 passing · 31 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-135 | 187 |  |  |
| `browse_listings` | PASS | run-135 | 188 |  |  |
| `browse_sort_most_viewed` | SILENT ⚠2 | run-135 | 204 |  | AxiosError AxiosError |
| `browse_sort_nearest` | FAIL-assert | run-135 | 500 |  | [Failed] browse_sort_nearest (7m 15s) (Assertion is false: "Me" is visible) |
| `categories_hub` | PASS | run-135 | 208 |  |  |
| `clear_all_filters` | FAIL-assert | run-135 | 186 |  | [Failed] clear_all_filters (2m 45s) (Element not found: Text matching regex: Show results) |
| `filter_active_sellers` | FAIL-assert | run-135 | 518 |  | [Failed] filter_active_sellers (8m 15s) (Assertion is false: "Me" is visible) |
| `filter_by_category` | FAIL-assert | s2/run-127 | 161 |  | [Failed] filter_by_category (2m 18s) (Assertion is false: "All" is visible) |
| `filter_condition` | FAIL-assert | s2/run-127 | 191 |  | [Failed] filter_condition (2m 39s) (Element not found: Text matching regex: Filters) |
| `filter_price_range` | PASS | s2/run-127 | 251 |  |  |
| `full_marketplace_cycle` | FAIL-assert | s2/run-127 | 267 |  | [Failed] full_marketplace_cycle (3m 57s) (Assertion is false: "Cover" is visible) |
| `listing_detail` | FAIL-assert | s2/run-127 | 249 |  | [Failed] listing_detail (3m 33s) (Assertion is false: "Contact Seller" is visible) |
| `listing_detail_multi_quantity` | PASS | s2/run-127 | 291 |  |  |
| `listing_detail_offer` | FAIL-assert | s2/run-127 | 313 |  | [Failed] listing_detail_offer (4m 21s) (Assertion is false: "Contact Seller" is visible) |
| `listing_detail_offer_invalid` | FAIL-assert | s2/run-127 | 328 |  | [Failed] listing_detail_offer_invalid (4m 33s) (Assertion is false: "Enter a valid amount" is visible) |
| `listing_detail_price_drop_badge` | FAIL-assert | s2/run-127 | 327 |  | [Failed] listing_detail_price_drop_badge (4m 30s) (Assertion is false: "-\d+%" is visible) |
| `listing_detail_report` | FAIL-assert | s2/run-127 | 365 |  | [Failed] listing_detail_report (4m 53s) (Assertion is false: "Contact Seller" is visible) |
| `listing_detail_save_unsave` | FAIL-assert | s2/run-127 | 396 |  | [Failed] listing_detail_save_unsave (5m 30s) (Element not found: Text matching regex: Saved) |
| `listing_detail_saves_count` | FAIL-assert | s2/run-113 | 324 |  | [Failed] listing_detail_saves_count (5m 8s) (Assertion is false: "Me" is visible) |
| `listing_detail_share` | FAIL-assert | s2/run-113 | 325 |  | [Failed] listing_detail_share (5m 7s) (Assertion is false: "Me" is visible) |
| `listing_detail_similar` | FAIL-assert | s2/run-113 | 324 |  | [Failed] listing_detail_similar (5m 8s) (Assertion is false: "Me" is visible) |
| `listing_detail_sold_recovery` | FAIL-assert | s2/run-113 | 277 |  | [Failed] listing_detail_sold_recovery (4m 21s) (Assertion is false: id: seller-profile-link is visible) |
| `listing_detail_sold_state` | FAIL-assert | s2/run-113 | 276 |  | [Failed] listing_detail_sold_state (4m 20s) (Assertion is false: id: seller-profile-link is visible) |
| `listing_detail_views_count` | FAIL-assert | s2/run-113 | 324 |  | [Failed] listing_detail_views_count (5m 8s) (Assertion is false: "Me" is visible) |
| `not_interested` | FAIL-assert | s2/run-113 | 325 |  | [Failed] not_interested (5m 9s) (Assertion is false: "Me" is visible) |
| `saved_search_apply` | FAIL-assert | s2/run-113 | 327 |  | [Failed] saved_search_apply (5m 10s) (Assertion is false: "Me" is visible) |
| `search_empty_state` | FAIL-assert | s2/run-113 | 325 |  | [Failed] search_empty_state (5m 8s) (Assertion is false: "Me" is visible) |
| `search_listings` | FAIL-? ⚠1 | run-129 | 154 |  | [Failed] search_listings (2m 14s) (No visible element found: id: mode-toggle-button)  ||  api: AxiosError  |
| `search_with_filter` | FAIL-assert | s2/run-113 | 329 |  | [Failed] search_with_filter (5m 10s) (Assertion is false: "Me" is visible) |
| `seller_profile` | FAIL-assert | s2/run-113 | 325 |  | [Failed] seller_profile (5m 8s) (Assertion is false: "Me" is visible) |
| `seller_profile_from_listing` | PASS | s2/run-141 | 237 |  |  |
| `seller_response_rate_badge` | FAIL-assert | s2/run-113 | 327 |  | [Failed] seller_response_rate_badge (5m 10s) (Assertion is false: "Me" is visible) |
| `subcategory_drilldown` | FAIL-assert | s2/run-113 | 329 |  | [Failed] subcategory_drilldown (5m 10s) (Assertion is false: "Me" is visible) |
| `user_profile_empty_listings` | FAIL-assert | s2/run-113 | 335 |  | [Failed] user_profile_empty_listings (5m 17s) (Assertion is false: "Me" is visible) |
| `user_profile_listing_grid` | FAIL-assert | s2/run-113 | 326 |  | [Failed] user_profile_listing_grid (5m 9s) (Assertion is false: "Me" is visible) |
| `user_profile_stats` | FAIL-assert | s2/run-113 | 326 |  | [Failed] user_profile_stats (5m 9s) (Assertion is false: "Me" is visible) |
| `view_mode_toggle` | FAIL-assert | s2/run-113 | 330 |  | [Failed] view_mode_toggle (5m 11s) (Assertion is false: "Me" is visible) |

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

9/40 passing · 30 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | s2/run-151 | 310 |  |  |
| `create_listing_all_fields` | FAIL-assert | s2/run-151 | 260 |  | [Failed] create_listing_all_fields (3m 59s) (Assertion is false: "Cover" is visible) |
| `create_listing_category_search` | PASS | s2/run-151 | 271 |  |  |
| `create_listing_currency_eur` | FAIL-assert | s2/run-151 | 314 |  | [Failed] create_listing_currency_eur (4m 50s) (Assertion is false: "Listing saved" is visible) |
| `create_listing_currency_usd` | (rig) | s2/run-151 | 852 |  |  |
| `create_listing_draft_discard` | PASS | s2/run-151 | 243 |  |  |
| `create_listing_draft_restore` | FAIL-assert | s2/run-151 | 259 |  | [Failed] create_listing_draft_restore (3m 56s) (Element not found: Text matching regex: Description) |
| `create_listing_full_publish` | PASS | s2/run-151 | 363 |  |  |
| `create_listing_multi_quantity` | PASS | s2/run-151 | 252 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | s2/run-151 | 305 |  |  |
| `create_listing_publish_blocked` | FAIL-assert | s2/run-151 | 264 |  | [Failed] create_listing_publish_blocked (4m 3s) (Element not found: Text matching regex: Tap to set exact loca |
| `create_listing_publish_direct` | FAIL-assert | s2/run-151 | 235 |  | [Failed] create_listing_publish_direct (3m 37s) (Assertion is false: "Cover" is visible) |
| `create_listing_publish_requirements` | FAIL-assert | s2/run-151 | 276 |  | [Failed] create_listing_publish_requirements (4m 16s) (Assertion is false: "A live listing needs at least one  |
| `create_listing_quantity_edges` | FAIL-assert | s2/run-151 | 255 |  | [Failed] create_listing_quantity_edges (3m 58s) (Assertion is false: "999" is visible) |
| `create_listing_title_edges` | PASS | s2/run-151 | 271 |  |  |
| `create_listing_validation` | PASS | s2/run-151 | 233 |  |  |
| `create_listing_with_condition` | FAIL-assert | s2/run-151 | 231 |  | [Failed] create_listing_with_condition (3m 32s) (Assertion is false: "Cover" is visible) |
| `create_listing_with_photos` | FAIL-assert | s2/run-151 | 219 |  | [Failed] create_listing_with_photos (3m 21s) (Assertion is false: "Cover" is visible) |
| `delete_listing` | FAIL-assert | s2/run-151 | 211 |  | [Failed] delete_listing (3m 15s) (Element not found: Text matching regex: Delete Listing) |
| `draft_lifecycle` | FAIL-assert | s2/run-151 | 260 |  | [Failed] draft_lifecycle (4m 4s) (Element not found: Text matching regex: Publish) |
| `edit_listing` | FAIL-? | s2/run-151 | 224 |  | [Failed] edit_listing (3m 29s) (No visible element found: "Edit") |
| `edit_listing_all_fields` | FAIL-? | s2/run-151 | 221 |  | [Failed] edit_listing_all_fields (3m 25s) (No visible element found: "Edit") |
| `edit_listing_discard` | FAIL-? | s2/run-151 | 220 |  | [Failed] edit_listing_discard (3m 23s) (No visible element found: "Edit") |
| `edit_listing_quantity` | FAIL-assert | s2/run-151 | 197 |  | [Failed] edit_listing_quantity (3m) (Assertion is false: "QA Phone Cases Bulk 15" is visible) |
| `edit_listing_remove_photo` | FAIL-? | s2/run-151 | 220 |  | [Failed] edit_listing_remove_photo (3m 22s) (No visible element found: id: lifecycle-more-action) |
| `edit_listing_reorder_photos` | FAIL-? | s2/run-151 | 211 |  | [Failed] edit_listing_reorder_photos (3m 14s) (No visible element found: id: lifecycle-more-action) |
| `expired_listing_badge` | FAIL-assert | s2/run-151 | 216 |  | [Failed] expired_listing_badge (3m 20s) (Assertion is false: "Renew" is visible) |
| `lifecycle_publish` | FAIL-assert | s2/run-151 | 161 |  | [Failed] lifecycle_publish (2m 24s) (Assertion is false: "Switch to .*" is visible) |
| `lifecycle_reactivate` | FAIL-? | s2/run-151 | 470 |  | [Failed] lifecycle_reactivate (7m 33s) (No visible element found: id: lifecycle-more-action) |
| `lifecycle_reserve` | FAIL-assert | s2/run-151 | 222 |  | [Failed] lifecycle_reserve (3m 24s) (Element not found: Text matching regex: Mark as Reserved) |
| `lifecycle_sold` | FAIL-? | s2/run-151 | 498 |  | [Failed] lifecycle_sold (8m) (No visible element found: id: lifecycle-primary-action) |
| `lifecycle_unpublish` | FAIL-? | s2/run-151 | 232 |  | [Failed] lifecycle_unpublish (3m 34s) (No visible element found: id: lifecycle-more-action) |
| `listing_analytics_sparkline` | FAIL-assert | s2/run-151 | 213 |  | [Failed] listing_analytics_sparkline (3m 16s) (Assertion is false: id: my-listing-detail-scroll is visible) |
| `listing_conversations_list` | PASS | s2/run-151 | 213 |  |  |
| `listing_renew_flow` | FAIL-assert | s2/run-151 | 223 |  | [Failed] listing_renew_flow (3m 25s) (Assertion is false: "Renew" is visible) |
| `listing_status_counts` | FAIL-assert | s2/run-151 | 230 |  | [Failed] listing_status_counts (3m 33s) (Element not found: Text matching regex: Sold) |
| `my_listing_detail_view` | FAIL-assert | s2/run-151 | 209 |  | [Failed] my_listing_detail_view (3m 12s) (Assertion is false: id: lifecycle-primary-action is visible) |
| `my_listings_filter_tabs` | FAIL-assert | s2/run-151 | 211 |  | [Failed] my_listings_filter_tabs (3m 16s) (Element not found: Text matching regex: Sold) |
| `my_listings_search` | FAIL-assert | s2/run-151 | 220 |  | [Failed] my_listings_search (3m 23s) (Assertion is false: "No" is visible) |
| `price_drop_after_edit` | FAIL-? | s2/run-151 | 212 |  | [Failed] price_drop_after_edit (3m 17s) (No visible element found: id: lifecycle-more-action) |

## `chat` — Conversations, messages, offers, meetup arrangement, read state

16/42 passing · 26 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | s2/run-142 | 227 |  |  |
| `block_from_conversation` | FAIL-assert | s2/run-142 | 210 |  | [Failed] block_from_conversation (3m 6s) (Assertion is false: "Blocked users cannot contact you" is visible) |
| `chat_older_messages_pagination` | FAIL-? | s2/run-142 | 193 |  | [Failed] chat_older_messages_pagination (2m 46s) (No visible element found: id: messages-list-top) |
| `composer_draft` | PASS | s2/run-142 | 228 |  |  |
| `conversation_archive` | PASS | s2/run-142 | 224 |  |  |
| `conversation_delete` | PASS | s2/run-142 | 215 |  |  |
| `conversation_read_status` | FAIL-assert | s2/run-142 | 226 |  | [Failed] conversation_read_status (3m 20s) (Assertion is false: id: unread-badge-\d+ is visible) |
| `conversations-search` | PASS | s2/run-142 | 305 |  |  |
| `conversations_empty_state` | FAIL-assert | s2/run-142 | 290 |  | [Failed] conversations_empty_state (4m 27s) (Assertion is false: "Bazaar" is visible) |
| `conversations_filter` | FAIL-? | s2/run-142 | 208 |  | [Failed] conversations_filter (3m 3s) |
| `conversations_list` | PASS | s2/run-142 | 198 |  |  |
| `conversations_role_filter` | PASS | s2/run-142 | 307 |  |  |
| `delete_message` | PASS | s2/run-142 | 195 |  |  |
| `lifecycle_from_chat` | FAIL-assert | s2/run-142 | 315 |  | [Failed] lifecycle_from_chat (4m 54s) (Assertion is false: "Reserve" is visible) |
| `mark_read` | FAIL-assert | s2/run-142 | 242 |  | [Failed] Mark conversation read/unread from conversations list (3m 36s) (Assertion is false: id: unread-badge- |
| `mark_read_end_to_end` | FAIL-assert | s2/run-142 | 181 |  | [Failed] mark_read_end_to_end (2m 40s) (Assertion is false: id: unread-badge-\d+ is visible) |
| `meetup_decline` | FAIL-assert | s2/run-142 | 196 |  | [Failed] meetup_decline (2m 54s) (Element not found: Text matching regex: Decline) |
| `meetup_full_cycle` | FAIL-assert | s2/run-142 | 192 |  | [Failed] meetup_full_cycle (2m 51s) (Element not found: Text matching regex: More actions) |
| `meetup_proposal` | PASS | s2/run-142 | 213 |  |  |
| `meetup_proposed_bubble_ui` | FAIL-assert | s2/run-142 | 208 |  | [Failed] meetup_proposed_bubble_ui (3m 5s) (Element not found: Text matching regex: More actions) |
| `meetup_respond` | FAIL-assert | s2/run-142 | 192 |  | [Failed] meetup_respond (2m 49s) (Element not found: Text matching regex: Accept) |
| `meetup_validation` | FAIL-assert | s2/run-142 | 156 |  | [Failed] meetup_validation (2m 16s) (Assertion is false: "Switch to .*" is visible) |
| `message_long_text` | FAIL-assert | s2/run-142 | 471 |  | [Failed] message_long_text (7m 31s) (Element not found: Text matching regex: Type a message...) |
| `offer_counter_flow` | FAIL-assert | s2/run-142 | 182 |  | [Failed] offer_counter_flow (2m 44s) (Element not found: Text matching regex: Make an Offer) |
| `offer_in_existing_thread` | PASS | s2/run-142 | 181 |  |  |
| `offer_send_and_accept` | PASS | s2/run-142 | 400 |  |  |
| `offer_send_and_decline` | FAIL-assert | s2/run-142 | 196 |  | [Failed] offer_send_and_decline (2m 52s) (Element not found: Text matching regex: Make an Offer) |
| `quick_replies` | FAIL-assert | s2/run-142 | 197 |  | [Failed] quick_replies (2m 56s) (Element not found: Text matching regex: Is this still available?) |
| `report_participant` | FAIL-assert | s2/run-142 | 223 |  | [Failed] report_participant (3m 17s) (Assertion is false: "Report submitted.*" is visible) |
| `reserve_after_accept` | FAIL-assert | s2/run-142 | 188 |  | [Failed] reserve_after_accept (2m 43s) (Element not found: Text matching regex: Make an Offer) |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | s2/run-142 | 202 |  | [Failed] reserve_after_buyer_accepts_counter (2m 59s) (Element not found: Text matching regex: Make an Offer) |
| `reserved_sold_dead_end_notice` | FAIL-assert | s2/run-142 | 568 |  | [Failed] reserved_sold_dead_end_notice (9m) (Assertion is false: id: listing-unavailable-notice is visible) |
| `send_message` | PASS | s2/run-142 | 189 |  |  |
| `send_message_double_tap` | PASS | s2/run-142 | 209 |  |  |
| `send_message_empty` | PASS | s2/run-142 | 202 |  |  |
| `send_message_offline` | FAIL-assert ⚠1 | s2/run-142 | 245 |  | [Failed] send_message_offline (3m 40s) (Element not found: Text matching regex: Send)  ||  api: AxiosError  |
| `send_message_whitespace` | PASS | s2/run-142 | 203 |  |  |
| `send_multiple_messages` | PASS | s2/run-142 | 237 |  |  |
| `send_photo` | FAIL-assert | s2/run-142 | 221 |  | [Failed] send_photo (3m 19s) (Assertion is false: "View photo fullscreen" is visible) |
| `start_conversation` | FAIL-? | s2/run-142 | 6 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `start_conversation_and_reply` | FAIL-? | s2/run-142 | 5 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `view_other_profile_from_conversation` | FAIL-? | s2/run-142 | 7 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

3/29 passing · 26 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert | s2/run-156 | 207 |  | [Failed] account_delete_and_restore (3m 8s) (Assertion is false: "Bazaar" is visible) |
| `account_delete_cancel` | FAIL-assert | s2/run-156 | 460 |  | [Failed] account_delete_cancel (7m 19s) (Assertion is false: "Me" is visible) |
| `away_mode` | FAIL-assert | s2/run-156 | 466 |  | [Failed] away_mode (7m 27s) (Assertion is false: "Me" is visible) |
| `blocked_users` | FAIL-assert | s2/run-156 | 457 |  | [Failed] blocked_users (7m 18s) (Assertion is false: "Me" is visible) |
| `change_language_dari` | FAIL-assert | s2/run-156 | 458 |  | [Failed] change_language_dari (7m 18s) (Assertion is false: "Me" is visible) |
| `change_language_english` | FAIL-assert | s2/run-156 | 455 |  | [Failed] change_language_english (7m 17s) (Assertion is false: "Me" is visible) |
| `change_language_pashto` | FAIL-assert | s2/run-156 | 453 |  | [Failed] change_language_pashto (7m 15s) (Assertion is false: "Me" is visible) |
| `edit_profile` | FAIL-assert | s2/run-156 | 460 |  | [Failed] edit_profile (7m 21s) (Assertion is false: "Me" is visible) |
| `edit_profile_all_fields` | FAIL-assert | s2/run-156 | 463 |  | [Failed] edit_profile_all_fields (7m 23s) (Assertion is false: "Me" is visible) |
| `edit_profile_avatar` | FAIL-assert | s2/run-156 | 467 |  | [Failed] edit_profile_avatar (7m 20s) (Assertion is false: "Me" is visible) |
| `edit_profile_bio_too_long` | FAIL-assert | s2/run-156 | 464 |  | [Failed] edit_profile_bio_too_long (7m 20s) (Assertion is false: "Me" is visible) |
| `edit_profile_province` | FAIL-assert | s2/run-156 | 468 |  | [Failed] edit_profile_province (7m 23s) (Assertion is false: "Me" is visible) |
| `edit_profile_validation` | FAIL-assert | s2/run-156 | 468 |  | [Failed] edit_profile_validation (7m 25s) (Assertion is false: "Me" is visible) |
| `hidden_listings` | FAIL-assert | s2/run-156 | 463 |  | [Failed] hidden_listings (7m 19s) (Assertion is false: "Me" is visible) |
| `language_persists_across_tabs` | FAIL-assert | s2/run-156 | 463 |  | [Failed] language_persists_across_tabs (7m 20s) (Assertion is false: "Me" is visible) |
| `language_switch_all_screens` | FAIL-assert | s2/run-156 | 454 |  | [Failed] language_switch_all_screens (7m 16s) (Assertion is false: "Me" is visible) |
| `profile_stats_verify` | FAIL-assert | s2/run-156 | 463 |  | [Failed] profile_stats_verify (7m 18s) (Assertion is false: "Me" is visible) |
| `recently_viewed` | FAIL-assert | s2/run-156 | 157 |  | [Failed] recently_viewed (2m 18s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `recently_viewed_empty_state` | FAIL-assert | s2/run-156 | 160 |  | [Failed] recently_viewed_empty_state (2m 20s) (Assertion is false: "Buy and sell locally in Afghanistan" is vi |
| `seller_mode_toggle` | PASS | s2/run-156 | 187 |  |  |
| `theme_switch` | FAIL-assert | s2/run-156 | 168 |  | [Failed] theme_switch (2m 28s) (Element not found: Id matching regex: theme-option-light) |
| `transaction_stats_hidden_when_zero` | FAIL-assert | s2/run-156 | 157 |  | [Failed] transaction_stats_hidden_when_zero (2m 16s) (Assertion is false: "Buy and sell locally in Afghanistan |
| `transaction_stats_own_profile` | FAIL-assert | s2/run-156 | 183 |  | [Failed] transaction_stats_own_profile (2m 41s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | s2/run-156 | 170 |  | [Failed] transaction_stats_public_profile (2m 30s) (Assertion is false: id: transaction-stats-badge is visible |
| `transaction_stats_seller_own_profile` | PASS | s2/run-156 | 205 |  |  |
| `user_profile_sold_tab` | FAIL-? | s2/run-156 | 168 |  | [Failed] user_profile_sold_tab (2m 29s) |
| `view_profile` | FAIL-assert | s2/run-156 | 178 |  | [Failed] view_profile (2m 38s) (Assertion is false: "Edit Profile" is visible) |
| `view_profile_error` | PASS | s2/run-156 | 188 |  |  |
| `view_seller_profile_from_profile` | FAIL-assert | s2/run-156 | 177 |  | [Failed] view_seller_profile_from_profile (2m 37s) (Assertion is false: "Switch to .*" is visible) |

## `auth` — Sign up, login, logout, session persistence, guest gating

0/15 passing · 15 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `guest_browse` | FAIL-assert | s2/run-136 | 183 |  | [Failed] guest_browse (2m 40s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `guest_offer_redirect` | FAIL-assert | s2/run-136 | 348 |  | [Failed] guest_offer_redirect (5m 20s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `guest_save_redirect` | FAIL-assert | s2/run-136 | 371 |  | [Failed] guest_save_redirect (5m 36s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `login` | FAIL-assert | s2/run-136 | 341 |  | [Failed] login (5m 15s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `login_deep` | FAIL-assert | s2/run-136 | 479 |  | [Failed] login_deep (7m 37s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `login_empty_fields` | FAIL-assert | s2/run-136 | 314 |  | [Failed] login_empty_fields (4m 54s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `login_navigate_to_register` | UNTESTED | — |  |  |  |
| `login_wrong_password` | UNTESTED | — |  |  |  |
| `logout` | UNTESTED | — |  |  |  |
| `logout_cancel` | UNTESTED | — |  |  |  |
| `register_duplicate_email` | UNTESTED | — |  |  |  |
| `register_navigate_to_login` | UNTESTED | — |  |  |  |
| `session_persist` | UNTESTED | — |  |  |  |
| `sign_up` | FAIL-assert | s3/run-111 | 174 |  | [Failed] sign_up (2m 35s) (Assertion is false: "Bazaar" is visible) |
| `sign_up_validation` | UNTESTED | — |  |  |  |

## `seller` — Seller action sheet, publish, mark reserved/sold with buyer

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_actions_sheet` | UNTESTED | — |  |  |  |
| `listing_conversations` | UNTESTED | — |  |  |  |
| `mark_sold_with_buyer` | UNTESTED | — |  |  |  |
| `multi_quantity_partial_sale` | UNTESTED | — |  | fixed | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | UNTESTED | — |  |  |  |
| `publish_success` | UNTESTED | — |  |  |  |
| `reserved_buyer` | UNTESTED | — |  |  |  |
| `save_draft` | UNTESTED | — |  |  |  |

## `report` — Report a listing or user, block, block side-effects

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | FAIL-assert | run-163 | 168 |  | [Failed] block_prevents_message (2m 30s) (Element not found: Text matching regex: Seller Name) |
| `block_user` | FAIL-assert | run-163 | 164 |  | [Failed] block_user (2m 27s) (Element not found: Text matching regex: Seller) |
| `block_user_hides_listings` | FAIL-assert | run-163 | 174 |  | [Failed] block_user_hides_listings (2m 37s) (Element not found: Text matching regex: Seller Name) |
| `report_listing` | FAIL-assert | run-163 | 169 |  | [Failed] report_listing (2m 32s) (Element not found: Text matching regex: Report) |
| `report_listing_no_reason` | FAIL-assert | run-163 | 163 |  | [Failed] report_listing_no_reason (2m 27s) (Element not found: Text matching regex: Report) |
| `report_user` | FAIL-assert | run-163 | 174 |  | [Failed] report_user (2m 37s) (Element not found: Text matching regex: Report User) |
| `report_user_from_profile` | FAIL-assert | run-163 | 192 |  | [Failed] report_user_from_profile (2m 55s) (Assertion is false: "Report submitted. Thank you." is visible) |
| `report_user_then_block` | FAIL-assert | run-163 | 176 |  | [Failed] report_user_then_block (2m 40s) (Element not found: Text matching regex: Report User) |

## `dark_mode` — Every main screen in dark theme + theme persistence

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | run-160 | 191 |  | [Failed] browse_dark (2m 46s) (Assertion is false: "Appearance" is visible) |
| `chat_dark` | FAIL-? | run-160 | 189 |  | [Failed] chat_dark (2m 48s) (No visible element found: "Dark") |
| `listing_detail_dark` | FAIL-? | run-160 | 189 |  | [Failed] listing_detail_dark (2m 45s) (No visible element found: "Dark") |
| `my_listings_dark` | FAIL-? | run-160 | 249 |  | [Failed] my_listings_dark (3m 47s) (No visible element found: "Dark") |
| `profile_dark` | FAIL-? | run-160 | 178 |  | [Failed] profile_dark (2m 41s) (No visible element found: "Dark") |
| `saved_tab_dark` | FAIL-? | run-160 | 186 |  | [Failed] saved_tab_dark (2m 47s) (No visible element found: "Dark") |
| `theme_light_all_screens` | FAIL-assert | run-160 | 185 |  | [Failed] theme_light_all_screens (2m 47s) (Element not found: Text matching regex: Light) |
| `theme_persists_after_navigate` | FAIL-? | run-160 | 187 |  | [Failed] theme_persists_after_navigate (2m 49s) (No visible element found: "Dark") |

## `rtl` — Pashto + Dari right-to-left layout across main screens

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | FAIL-assert | run-161 | 180 |  | [Failed] browse_rtl_dari (2m 39s) (Element not found: Text matching regex: .*دری.*) |
| `browse_rtl_pashto` | FAIL-assert | run-161 | 179 |  | [Failed] browse_rtl_pashto (2m 39s) (Element not found: Text matching regex: .*پښتو.*) |
| `categories_hub_rtl` | FAIL-assert | run-161 | 174 |  | [Failed] categories_hub_rtl (2m 34s) (Element not found: Text matching regex: Language) |
| `chat_rtl` | FAIL-assert | run-161 | 175 |  | [Failed] chat_rtl (2m 36s) (Element not found: Text matching regex: .*پښتو.*) |
| `listing_detail_rtl` | FAIL-assert | run-161 | 172 |  | [Failed] listing_detail_rtl (2m 33s) (Element not found: Text matching regex: .*پښتو.*) |
| `my_listings_rtl` | FAIL-assert | run-161 | 233 |  | [Failed] my_listings_rtl (3m 33s) (Element not found: Text matching regex: .*پښتو.*) |
| `profile_quick_actions_rtl` | FAIL-assert | run-161 | 179 |  | [Failed] profile_quick_actions_rtl (2m 39s) (Element not found: Text matching regex: .*پښتو.*) |
| `profile_rtl` | FAIL-assert | run-161 | 174 |  | [Failed] profile_rtl (2m 34s) (Element not found: Text matching regex: .*دری.*) |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-144 | 280 |  | [Failed] listing_create_multi_photos (4m 11s) (Assertion is false: "Photos" is visible) |
| `listing_edit_add_photos` | UNTESTED | — |  |  |  |
| `listing_gallery_no_photo` | UNTESTED | — |  |  |  |
| `listing_gallery_swipe` | UNTESTED | — |  |  |  |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

4/8 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | PASS | run-162 | 172 |  |  |
| `save_listing` | PASS | run-162 | 178 |  |  |
| `save_multiple_listings` | FAIL-assert | run-162 | 198 |  | [Failed] save_multiple_listings (2m 57s) (Assertion is false: id: listing-card, Index: 2 is visible) |
| `saved_empty_state` | FAIL-assert | run-162 | 163 |  | [Failed] saved_empty_state (2m 23s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `saved_listing_goes_sold` | FAIL-assert | run-162 | 205 |  | [Failed] saved_listing_goes_sold (3m 5s) (Element not found: Id matching regex: browse-tab) |
| `saved_pagination` | PASS | run-162 | 176 |  |  |
| `unsave_from_browse_feed` | FAIL-assert | run-162 | 190 |  | [Failed] unsave_from_browse_feed (2m 50s) (Assertion is false: "No saved items yet" is visible) |
| `unsave_listing` | PASS | run-162 | 159 |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | run-159 | 125 |  | [Failed] seller_mode_my_listings_empty (1m 43s) (Element not found: Text matching regex: Sign In) |
| `seller_mode_persists` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | FAIL-assert | run-159 | 191 |  | [Failed] seller_mode_tab_bar_changes (2m 51s) (Element not found: Id matching regex: mode-switcher-banner) |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | run-159 | 250 |  | [Failed] seller_views_own_listing_buyer_mode (3m 51s) (Assertion is false: "Buyer Mode" is visible) |

## `reviews` — Double-blind reviews after a sold transaction

0/3 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-? | run-158 | 260 |  | [Failed] pending_reviews_nudge (3m 56s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |
| `profile_reviews_empty_state` | FAIL-assert | run-158 | 166 |  | [Failed] profile_reviews_empty_state (2m 25s) (Assertion is false: "Buy and sell locally in Afghanistan" is vi |
| `rate_buyer_after_sale` | FAIL-? | run-158 | 210 |  | [Failed] rate_buyer_after_sale (3m 8s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |

## `onboarding` — First-run experience

0/1 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | FAIL-redbox | s2/run-156 | 127 |  | [Failed] first_run (1m 47s) (Assertion is false: "Buy or sell — your choice" is visible) |

## `safety` — Safety tips on listing detail and in the meetup sheet

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | FAIL-assert | run-157 | 186 |  | [Failed] safety_tips_listing_detail (2m 42s) (Element not found: Text matching regex: Meetup safety tips) |
| `safety_tips_meetup_sheet` | PASS | run-157 | 211 |  |  |

## `share` — Deep links into a listing and a seller profile

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | FAIL-assert | run-156 | 122 |  | [Failed] open_listing_deep_link (1m 38s) (Assertion is false: id: seller-profile-link is visible) |
| `open_seller_deep_link` | PASS | run-156 | 119 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

5/6 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | s2/run-156 | 151 |  |  |
| `conversations_pagination` | PASS | s2/run-156 | 138 |  |  |
| `filter_combined_pagination` | FAIL-assert | s2/run-156 | 155 |  | [Failed] filter_combined_pagination (2m 20s) (Element not found: Text matching regex: Electronics) |
| `my_listings_pagination` | PASS | s2/run-156 | 202 |  |  |
| `saved_pagination_deep` | PASS | s2/run-156 | 147 |  |  |
| `search_pagination` | PASS | s2/run-156 | 161 |  |  |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | s2/run-156 | 254 |  |  |
| `filter_map_default_kabul` | PASS | s2/run-156 | 164 |  |  |
| `filter_map_location_denied` | PASS | s2/run-156 | 183 |  |  |
| `filter_map_use_my_location` | PASS | s2/run-156 | 169 |  |  |
| `filter_map_use_my_location_granted` | PASS | s2/run-156 | 153 |  |  |
| `map_location_outside_afghanistan` | PASS | s2/run-156 | 191 |  |  |

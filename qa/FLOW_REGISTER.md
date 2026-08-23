# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**27 of 234 flows passing** · 207 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 27 | green, and no backend error underneath |
| SILENT | 1 | **assertions passed while the API errored** — the app told the user nothing |
| FAIL-assert | 164 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 13 | failed, cause unclear — read the log |
| UNTESTED | 28 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

3/42 passing · 39 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-122 | 246 |  |  |
| `create_listing_all_fields` | FAIL-assert | s2/run-116 | 327 |  | [Failed] create_listing_all_fields (5m 10s) (Assertion is false: "Me" is visible) |
| `create_listing_category_search` | FAIL-assert | s2/run-116 | 329 |  | [Failed] create_listing_category_search (5m 11s) (Assertion is false: "Me" is visible) |
| `create_listing_currency_eur` | FAIL-assert | s2/run-116 | 330 |  | [Failed] create_listing_currency_eur (5m 13s) (Assertion is false: "Me" is visible) |
| `create_listing_currency_usd` | FAIL-assert | s2/run-116 | 327 |  | [Failed] create_listing_currency_usd (5m 10s) (Assertion is false: "Me" is visible) |
| `create_listing_draft_discard` | FAIL-assert | s2/run-116 | 329 |  | [Failed] create_listing_draft_discard (5m 10s) (Assertion is false: "Me" is visible) |
| `create_listing_draft_restore` | FAIL-assert | s2/run-116 | 332 |  | [Failed] create_listing_draft_restore (5m 12s) (Assertion is false: "Me" is visible) |
| `create_listing_full_publish` | PASS | run-142 | 377 |  |  |
| `create_listing_location_picker` | FAIL-assert | s2/run-116 | 331 |  | [Failed] create_listing_location_picker (5m 13s) (Assertion is false: "Me" is visible) |
| `create_listing_multi_quantity` | FAIL-assert | s2/run-116 | 284 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | FAIL-assert | s2/run-116 | 327 |  | [Failed] create_listing_price_edges (5m 9s) (Assertion is false: "Me" is visible) |
| `create_listing_province_picker` | FAIL-assert | s2/run-116 | 329 |  | [Failed] create_listing_province_picker (5m 11s) (Assertion is false: "Me" is visible) |
| `create_listing_publish_blocked` | FAIL-assert | s2/run-116 | 331 |  | [Failed] create_listing_publish_blocked (5m 12s) (Assertion is false: "Me" is visible) |
| `create_listing_publish_direct` | FAIL-assert | s2/run-116 | 331 |  | [Failed] create_listing_publish_direct (5m 11s) (Assertion is false: "Me" is visible) |
| `create_listing_publish_requirements` | FAIL-assert | s2/run-116 | 328 |  | [Failed] create_listing_publish_requirements (5m 11s) (Assertion is false: "Me" is visible) |
| `create_listing_quantity_edges` | FAIL-assert | s2/run-116 | 328 |  | [Failed] create_listing_quantity_edges (5m 10s) (Assertion is false: "Me" is visible) |
| `create_listing_title_edges` | FAIL-assert | s2/run-116 | 329 |  | [Failed] create_listing_title_edges (5m 11s) (Assertion is false: "Me" is visible) |
| `create_listing_validation` | FAIL-assert | s2/run-116 | 326 |  | [Failed] create_listing_validation (5m 9s) (Assertion is false: "Me" is visible) |
| `create_listing_with_condition` | FAIL-assert | s2/run-116 | 327 |  | [Failed] create_listing_with_condition (5m 10s) (Assertion is false: "Me" is visible) |
| `create_listing_with_photos` | FAIL-assert | s2/run-116 | 329 |  | [Failed] create_listing_with_photos (5m 11s) (Assertion is false: "Me" is visible) |
| `delete_listing` | FAIL-assert | s2/run-116 | 327 |  | [Failed] delete_listing (5m 10s) (Assertion is false: "Me" is visible) |
| `draft_lifecycle` | FAIL-assert | s2/run-116 | 327 |  | [Failed] draft_lifecycle (5m 10s) (Assertion is false: "Me" is visible) |
| `edit_listing` | FAIL-assert | s2/run-116 | 327 |  | [Failed] edit_listing (5m 9s) (Assertion is false: "Me" is visible) |
| `edit_listing_all_fields` | FAIL-assert | run-106 | 190 |  | [Failed] edit_listing_all_fields (2m 53s) (Element not found: Text matching regex: Edit) |
| `edit_listing_discard` | FAIL-assert | run-106 | 204 |  | [Failed] edit_listing_discard (3m 1s) (Element not found: Text matching regex: Edit) |
| `edit_listing_quantity` | FAIL-? | run-106 | 165 |  | [Failed] edit_listing_quantity (2m 25s) (No visible element found: "QA Phone Cases Bulk 15") |
| `edit_listing_remove_photo` | FAIL-assert | run-106 | 197 |  | [Failed] edit_listing_remove_photo (2m 56s) (Element not found: Text matching regex: Edit) |
| `edit_listing_reorder_photos` | FAIL-assert | run-106 | 195 |  | [Failed] edit_listing_reorder_photos (2m 59s) (Element not found: Text matching regex: Edit) |
| `expired_listing_badge` | FAIL-assert | run-106 | 210 |  | [Failed] expired_listing_badge (3m 6s) (Assertion is false: "Renew Listing" is visible) |
| `lifecycle_publish` | FAIL-assert | run-106 | 204 |  | [Failed] lifecycle_publish (3m 2s) (Element not found: Text matching regex: Publish) |
| `lifecycle_reactivate` | FAIL-assert | run-106 | 228 |  | [Failed] lifecycle_reactivate (3m 20s) (Element not found: Text matching regex: More) |
| `lifecycle_reserve` | FAIL-assert | run-106 | 236 |  | [Failed] lifecycle_reserve (3m 29s) (Element not found: Text matching regex: Mark as Reserved) |
| `lifecycle_sold` | FAIL-assert | run-106 | 222 |  | [Failed] lifecycle_sold (3m 16s) (Element not found: Text matching regex: Mark as Sold) |
| `lifecycle_unpublish` | FAIL-assert | run-106 | 223 |  | [Failed] lifecycle_unpublish (3m 17s) (Element not found: Text matching regex: More) |
| `listing_analytics_sparkline` | FAIL-assert | run-106 | 219 |  | [Failed] listing_analytics_sparkline (3m 10s) (Assertion is false: "My Listings" is visible) |
| `listing_conversations_list` | FAIL-assert | run-106 | 229 |  | [Failed] listing_conversations_list (3m 19s) (Assertion is false: "My Listings" is visible) |
| `listing_renew_flow` | FAIL-assert | run-106 | 243 |  | [Failed] listing_renew_flow (3m 13s) (Assertion is false: "Renew Listing" is visible) |
| `listing_status_counts` | PASS | run-106 | 215 |  |  |
| `my_listing_detail_view` | FAIL-assert | run-106 | 188 |  | [Failed] my_listing_detail_view (2m 51s) (Assertion is false: "My Listings" is visible) |
| `my_listings_filter_tabs` | FAIL-assert | run-106 | 182 |  | [Failed] my_listings_filter_tabs (2m 47s) (Assertion is false: "My Listings" is visible) |
| `my_listings_search` | FAIL-assert | run-106 | 179 |  | [Failed] my_listings_search (2m 45s) (Assertion is false: "My Listings" is visible) |
| `price_drop_after_edit` | FAIL-assert | run-106 | 206 |  | [Failed] price_drop_after_edit (3m 8s) (Element not found: Text matching regex: Edit) |

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

## `chat` — Conversations, messages, offers, meetup arrangement, read state

12/42 passing · 30 open

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
| `meetup_validation` | FAIL-assert | run-113 | 162 |  | [Failed] meetup_validation (2m 26s) (Element not found: Id matching regex: meetup-propose-submit) |
| `message_long_text` | FAIL-assert | run-113 | 138 |  | [Failed] message_long_text (2m 2s) (Element not found: Text matching regex: Type a message...) |
| `offer_counter_flow` | FAIL-assert | run-113 | 137 |  | [Failed] offer_counter_flow (2m 1s) (Element not found: Text matching regex: Make an Offer) |
| `offer_in_existing_thread` | PASS | run-113 | 148 |  |  |
| `offer_send_and_accept` | PASS | run-113 | 315 |  |  |
| `offer_send_and_decline` | FAIL-assert | run-113 | 116 |  | [Failed] offer_send_and_decline (1m 39s) (Element not found: Text matching regex: Bazaar) |
| `quick_replies` | FAIL-assert | run-113 | 126 |  | [Failed] quick_replies (1m 50s) (Element not found: Text matching regex: Is this still available?) |
| `report_participant` | FAIL-assert | run-113 | 145 |  | [Failed] report_participant (2m 10s) (Assertion is false: "Report submitted" is visible) |
| `reserve_after_accept` | FAIL-assert | run-113 | 114 |  | [Failed] reserve_after_accept (1m 38s) (Element not found: Text matching regex: Bazaar) |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | run-113 | 115 |  | [Failed] reserve_after_buyer_accepts_counter (1m 39s) (Element not found: Text matching regex: Bazaar) |
| `reserved_sold_dead_end_notice` | FAIL-assert | run-113 | 304 |  | [Failed] reserved_sold_dead_end_notice (4m 46s) (Element not found: Text matching regex: Sold to someone not o |
| `send_message` | FAIL-assert | run-113 | 145 |  | [Failed] send_message (2m 8s) (Assertion is false: "Is the price negotiable?" is visible) |
| `send_message_double_tap` | FAIL-assert | run-113 | 143 |  | [Failed] send_message_double_tap (2m 8s) (Assertion is false: "Double tap probe" is visible) |
| `send_message_empty` | PASS | run-113 | 121 |  |  |
| `send_message_offline` | FAIL-assert | run-113 | 146 |  | [Failed] send_message_offline (2m 10s) (Assertion is false: "QA offline send — this must not appear to succeed |
| `send_message_whitespace` | FAIL-assert | run-113 | 139 |  | [Failed] send_message_whitespace (2m 2s) (Assertion is false: "Type a message..." is visible) |
| `send_multiple_messages` | FAIL-assert | run-113 | 115 |  | [Failed] send_multiple_messages (1m 38s) (Element not found: Text matching regex: Bazaar) |
| `send_photo` | FAIL-assert | run-113 | 161 |  | [Failed] send_photo (2m 25s) (Assertion is false: "View photo fullscreen" is visible) |
| `start_conversation` | FAIL-? | run-130 | 113 |  |  |
| `start_conversation_and_reply` | FAIL-assert | run-113 | 115 |  | [Failed] start_conversation_and_reply (1m 38s) (Element not found: Text matching regex: Bazaar) |
| `view_other_profile_from_conversation` | FAIL-assert | run-113 | 127 |  | [Failed] view_other_profile_from_conversation (1m 50s) (Element not found: Id matching regex: other-participan |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

0/29 passing · 29 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert | run-120 | 162 |  | [Failed] account_delete_and_restore (2m 22s) (Element not found: Text matching regex: Confirm Password) |
| `account_delete_cancel` | FAIL-assert | run-120 | 153 |  | [Failed] account_delete_cancel (2m 17s) (Assertion is false: "restore it by logging back in" is visible) |
| `away_mode` | FAIL-? | run-120 | 45 |  | [Failed] away_mode (4s) (Package com.hatiwal.mobile is not installed) |
| `blocked_users` | FAIL-assert | run-120 | 125 |  | [Failed] blocked_users (1m 48s) (Assertion is false: "Profile" is visible) |
| `change_language_dari` | FAIL-assert | run-120 | 127 |  | [Failed] change_language_dari (1m 50s) (Element not found: Text matching regex: Dari (دری)) |
| `change_language_english` | FAIL-assert | run-120 | 133 |  | [Failed] change_language_english (1m 56s) (Element not found: Text matching regex: Pashto (پښتو)) |
| `change_language_pashto` | FAIL-assert | run-120 | 123 |  | [Failed] change_language_pashto (1m 47s) (Element not found: Text matching regex: Pashto (پښتو)) |
| `edit_profile` | FAIL-assert | run-120 | 124 |  | [Failed] edit_profile (1m 47s) (Element not found: Text matching regex: Edit) |
| `edit_profile_all_fields` | FAIL-assert | run-120 | 133 |  | [Failed] edit_profile_all_fields (1m 56s) (Assertion is false: "Edit Profile" is visible) |
| `edit_profile_avatar` | FAIL-assert | run-120 | 128 |  | [Failed] edit_profile_avatar (1m 52s) (Assertion is false: "Edit Profile" is visible) |
| `edit_profile_bio_too_long` | FAIL-assert | run-120 | 129 |  | [Failed] edit_profile_bio_too_long (1m 53s) (Element not found: Text matching regex: Bio) |
| `edit_profile_province_picker_deep` | FAIL-assert | run-120 | 126 |  | [Failed] edit_profile_province_picker_deep (1m 50s) (Element not found: Text matching regex: Province) |
| `edit_profile_validation` | FAIL-assert | run-120 | 121 |  | [Failed] edit_profile_validation (1m 44s) (Element not found: Text matching regex: Edit) |
| `hidden_listings` | FAIL-assert | run-120 | 127 |  | [Failed] hidden_listings (1m 49s) (Element not found: Text matching regex: Hidden Listings) |
| `language_persists_across_tabs` | FAIL-assert | run-120 | 118 |  | [Failed] language_persists_across_tabs (1m 42s) (Element not found: Text matching regex: Language) |
| `language_switch_all_screens` | FAIL-assert | run-120 | 124 |  | [Failed] language_switch_all_screens (1m 48s) (Element not found: Text matching regex: Language) |
| `profile_stats_verify` | FAIL-assert | run-120 | 122 |  | [Failed] profile_stats_verify (1m 45s) (Assertion is false: "Active Listings" is visible) |
| `recently_viewed` | FAIL-assert | run-120 | 109 |  | [Failed] recently_viewed (1m 33s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `recently_viewed_empty_state` | FAIL-assert | run-120 | 116 |  | [Failed] recently_viewed_empty_state (1m 40s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `seller_mode_toggle` | FAIL-assert | run-120 | 134 |  | [Failed] seller_mode_toggle (1m 59s) (Assertion is false: "Profile" is visible) |
| `theme_switch` | FAIL-assert | run-120 | 122 |  | [Failed] theme_switch (1m 46s) (Assertion is false: "Profile" is visible) |
| `transaction_stats_hidden_when_zero` | FAIL-assert | run-120 | 116 |  | [Failed] transaction_stats_hidden_when_zero (1m 37s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `transaction_stats_own_profile` | FAIL-assert | run-120 | 133 |  | [Failed] transaction_stats_own_profile (1m 57s) (Assertion is false: "Profile" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | run-120 | 116 |  | [Failed] transaction_stats_public_profile (1m 40s) (Assertion is false: "Bazaar" is visible) |
| `transaction_stats_seller_own_profile` | FAIL-assert | run-120 | 191 |  | [Failed] transaction_stats_seller_own_profile (2m 55s) (Assertion is false: "Profile" is visible) |
| `user_profile_sold_tab` | FAIL-assert | run-120 | 116 |  | [Failed] user_profile_sold_tab (1m 40s) (Element not found: Text matching regex: Bazaar) |
| `view_profile` | FAIL-assert | run-120 | 120 |  | [Failed] view_profile (1m 43s) (Assertion is false: "Profile" is visible) |
| `view_profile_error` | FAIL-assert | run-120 | 135 |  | [Failed] view_profile_error (1m 59s) (Assertion is false: "Profile" is visible) |
| `view_seller_profile_from_profile` | FAIL-assert | run-120 | 129 |  | [Failed] view_seller_profile_from_profile (1m 53s) (Assertion is false: "Profile" is visible) |

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
| `login_navigate_to_register` | FAIL-assert | run-126 | 136 |  | [Failed] login_navigate_to_register (1m 57s) (Element not found: Text matching regex: Create account) |
| `login_wrong_password` | FAIL-assert | run-126 | 154 |  | [Failed] login_wrong_password (2m 14s) (Assertion is false: "Invalid login credentials" is visible) |
| `logout` | FAIL-assert | run-126 | 165 |  | [Failed] logout (2m 25s) (Assertion is false: "Sign Out" is visible) |
| `logout_cancel` | FAIL-assert | run-126 | 146 |  | [Failed] logout_cancel (2m 11s) (Element not found: Text matching regex: Sign Out) |
| `register_duplicate_email` | FAIL-assert | run-126 | 184 |  | [Failed] register_duplicate_email (2m 39s) (Element not found: Text matching regex: Confirm Password) |
| `register_navigate_to_login` | FAIL-assert | run-126 | 170 |  | [Failed] register_navigate_to_login (2m 24s) (Element not found: Text matching regex: Already have an account? |
| `session_persist` | FAIL-assert | run-126 | 207 |  | [Failed] session_persist (2m 57s) (Assertion is false: "Bazaar" is visible) |
| `sign_up` | FAIL-assert | run-126 | 203 |  | [Failed] sign_up (2m 53s) (Element not found: Id matching regex: register-submit) |
| `sign_up_validation` | FAIL-assert | run-126 | 149 |  | [Failed] sign_up_validation (2m 7s) (Assertion is false: "is required" is visible) |

## `report` — Report a listing or user, block, block side-effects

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | FAIL-assert | run-121 | 116 |  | [Failed] block_prevents_message (1m 39s) (Element not found: Text matching regex: Bazaar) |
| `block_user` | FAIL-assert | run-121 | 118 |  | [Failed] block_user (1m 42s) (Assertion is false: "Bazaar" is visible) |
| `block_user_hides_listings` | UNTESTED | — |  |  |  |
| `report_listing` | FAIL-assert | run-046 | 113 |  | [Failed] report_listing (1m 40s) (Assertion is false: "Bazaar" is visible) |
| `report_listing_no_reason` | UNTESTED | — |  |  |  |
| `report_user` | UNTESTED | — |  |  |  |
| `report_user_from_profile` | UNTESTED | — |  |  |  |
| `report_user_then_block` | UNTESTED | — |  |  |  |

## `dark_mode` — Every main screen in dark theme + theme persistence

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | run-143 | 198 |  | [Failed] browse_dark (2m 52s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-? | run-143 | 214 |  | [Failed] chat_dark (3m 11s) (No visible element found: "Dark") |
| `listing_detail_dark` | FAIL-? | run-143 | 198 |  | [Failed] listing_detail_dark (2m 53s) (No visible element found: "Dark") |
| `my_listings_dark` | FAIL-? | run-143 | 261 |  | [Failed] my_listings_dark (3m 58s) (No visible element found: "Dark") |
| `profile_dark` | FAIL-? | run-143 | 187 |  | [Failed] profile_dark (2m 47s) (No visible element found: "Dark") |
| `saved_tab_dark` | FAIL-? | run-143 | 216 |  | [Failed] saved_tab_dark (3m 13s) (No visible element found: "Dark") |
| `theme_light_all_screens` | FAIL-assert | run-143 | 216 |  | [Failed] theme_light_all_screens (3m 12s) (Element not found: Text matching regex: Light) |
| `theme_persists_after_navigate` | FAIL-? | run-143 | 213 |  | [Failed] theme_persists_after_navigate (3m 11s) (No visible element found: "Dark") |

## `rtl` — Pashto + Dari right-to-left layout across main screens

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | UNTESTED | — |  |  |  |
| `browse_rtl_pashto` | UNTESTED | — |  |  |  |
| `categories_hub_rtl` | UNTESTED | — |  |  |  |
| `chat_rtl` | UNTESTED | — |  |  |  |
| `listing_detail_rtl` | UNTESTED | — |  |  |  |
| `my_listings_rtl` | UNTESTED | — |  |  |  |
| `profile_quick_actions_rtl` | UNTESTED | — |  |  |  |
| `profile_rtl` | UNTESTED | — |  |  |  |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

1/8 passing · 7 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | UNTESTED | — |  |  |  |
| `save_listing` | PASS | run-046 | 119 |  |  |
| `save_multiple_listings` | UNTESTED | — |  |  |  |
| `saved_empty_state` | FAIL-assert | run-046 | 116 |  | [Failed] saved_empty_state (1m 42s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `saved_listing_goes_sold` | UNTESTED | — |  |  |  |
| `saved_pagination` | UNTESTED | — |  |  |  |
| `unsave_from_browse_feed` | UNTESTED | — |  |  |  |
| `unsave_listing` | UNTESTED | — |  |  |  |

## `seller` — Seller action sheet, publish, mark reserved/sold with buyer

1/8 passing · 7 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_actions_sheet` | FAIL-assert | run-046 | 196 |  | [Failed] listing_actions_sheet (3m 3s) (Element not found: Text matching regex: Save Draft) |
| `listing_conversations` | UNTESTED | — |  |  |  |
| `mark_sold_with_buyer` | UNTESTED | — |  |  |  |
| `multi_quantity_partial_sale` | PASS | run-020 | 195 | fixed | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | UNTESTED | — |  |  |  |
| `publish_success` | FAIL-assert | run-046 | 154 |  | [Failed] publish_success (2m 21s) (Assertion is false: "Cover" is visible) |
| `reserved_buyer` | UNTESTED | — |  |  |  |
| `save_draft` | UNTESTED | — |  |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/5 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `mode_switcher` | FAIL-assert | run-117 | 122 |  | [Failed] mode_switcher (1m 45s) (Assertion is false: "Bazaar" is visible) |
| `seller_mode_banner_persists` | FAIL-assert | run-117 | 116 |  | [Failed] seller_mode_banner_persists (1m 39s) (Element not found: Id matching regex: mode-switcher-banner) |
| `seller_mode_my_listings_empty` | FAIL-assert | run-117 | 121 |  | [Failed] seller_mode_my_listings_empty (1m 45s) (Element not found: Text matching regex: Sign In) |
| `seller_mode_tab_bar_changes` | FAIL-assert | run-117 | 139 |  | [Failed] seller_mode_tab_bar_changes (2m) (Assertion is false: "Bazaar" is visible) |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | run-117 | 186 |  | [Failed] seller_views_own_listing_buyer_mode (2m 49s) (Element not found: Text matching regex: Switch to Buyer |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

2/6 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | FAIL-assert | run-145 | 327 |  | [Failed] create_listing_map_pin (5m 1s) (Element not found: Id matching regex: location-confirm) |
| `filter_map_default_kabul` | PASS | run-145 | 239 |  |  |
| `filter_map_location_denied` | FAIL-assert | run-145 | 280 |  | [Failed] filter_map_location_denied (4m 19s) (Assertion is false: "While using the app" is visible) |
| `filter_map_use_my_location` | FAIL-assert | run-145 | 279 |  | [Failed] filter_map_use_my_location (4m 16s) (Assertion is false: "While using the app" is visible) |
| `filter_map_use_my_location_granted` | PASS | run-145 | 241 |  |  |
| `map_location_outside_afghanistan` | FAIL-assert | run-145 | 243 |  | [Failed] map_location_outside_afghanistan (3m 42s) (Assertion is false: "Abroad Location Item" is visible) |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-144 | 280 |  | [Failed] listing_create_multi_photos (4m 11s) (Assertion is false: "Photos" is visible) |
| `listing_edit_add_photos` | FAIL-assert | run-115 | 197 |  | [Failed] listing_edit_add_photos (2m 59s) (Element not found: Text matching regex: Edit) |
| `listing_gallery_no_photo` | FAIL-assert | run-115 | 115 |  | [Failed] listing_gallery_no_photo (1m 39s) (Assertion is false: "Bazaar" is visible) |
| `listing_gallery_swipe` | FAIL-assert | run-115 | 119 |  | [Failed] listing_gallery_swipe (1m 43s) (Assertion is false: "Bazaar" is visible) |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

2/6 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | FAIL-assert | run-119 | 123 |  | [Failed] browse_pagination (1m 45s) (Assertion is false: "Bazaar" is visible) |
| `conversations_pagination` | PASS | run-119 | 113 |  |  |
| `filter_combined_pagination` | FAIL-assert | run-119 | 114 |  | [Failed] filter_combined_pagination (1m 37s) (Element not found: Text matching regex: Bazaar) |
| `my_listings_pagination` | PASS | run-119 | 191 |  |  |
| `saved_pagination_deep` | FAIL-assert | run-119 | 115 |  | [Failed] saved_pagination_deep (1m 39s) (Element not found: Text matching regex: Saved) |
| `search_pagination` | FAIL-assert | run-119 | 116 |  | [Failed] search_pagination (1m 40s) (Assertion is false: "Bazaar" is visible) |

## `reviews` — Double-blind reviews after a sold transaction

0/3 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | UNTESTED | — |  |  |  |
| `profile_reviews_empty_state` | FAIL-assert | run-045 | 122 |  | [Failed] profile_reviews_empty_state (1m 44s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `rate_buyer_after_sale` | UNTESTED | — |  |  |  |

## `safety` — Safety tips on listing detail and in the meetup sheet

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | FAIL-assert | run-045 | 142 |  | [Failed] safety_tips_listing_detail (2m 5s) (Assertion is false: "Message Seller" is visible) |
| `safety_tips_meetup_sheet` | UNTESTED | — |  |  |  |

## `share` — Deep links into a listing and a seller profile

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | FAIL-? | run-045 | 91 |  | [Failed] open_listing_deep_link (1m 14s) |
| `open_seller_deep_link` | UNTESTED | — |  |  |  |

## `onboarding` — First-run experience

0/1 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | FAIL-redbox | run-118 | 128 |  | [Failed] first_run (1m 48s) (Assertion is false: "Buy or sell — your choice" is visible) |

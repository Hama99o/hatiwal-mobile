# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**40 of 233 flows passing** · 189 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 40 | green, and no backend error underneath |
| FAIL-assert | 97 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 21 | failed, cause unclear — read the log |
| (rig) | 4 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 70 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

4/41 passing · 34 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-110 | 236 |  |  |
| `create_listing_all_fields` | FAIL-assert | run-110 | 206 |  | [Failed] create_listing_all_fields (3m 9s) (Assertion is false: "Cover" is visible) |
| `create_listing_category_search` | PASS | run-110 | 218 |  |  |
| `create_listing_currency_eur` | FAIL-assert | run-110 | 244 |  | [Failed] create_listing_currency_eur (3m 45s) (Element not found: Text matching regex: Save as Draft) |
| `create_listing_currency_usd` | FAIL-assert | run-110 | 244 |  | [Failed] create_listing_currency_usd (3m 46s) (Element not found: Text matching regex: Post Listing) |
| `create_listing_draft_discard` | FAIL-assert | run-110 | 212 |  | [Failed] create_listing_draft_discard (3m 15s) (Assertion is false: "My Listings" is visible) |
| `create_listing_draft_restore` | FAIL-assert | run-110 | 221 |  | [Failed] create_listing_draft_restore (3m 21s) (Element not found: Text matching regex: Description) |
| `create_listing_location_picker` | FAIL-assert | run-110 | 227 |  | [Failed] create_listing_location_picker (3m 26s) (Element not found: Text matching regex: Tap to select catego |
| `create_listing_multi_quantity` | FAIL-assert | run-110 | 447 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | (rig) | run-110 | 481 |  |  |
| `create_listing_province_picker` | (rig) | run-110 | 481 |  |  |
| `create_listing_publish_blocked` | (rig) | run-110 | 481 |  |  |
| `create_listing_publish_direct` | FAIL-assert | run-106 | 208 |  | [Failed] create_listing_publish_direct (3m 3s) (Assertion is false: "Cover" is visible) |
| `create_listing_publish_requirements` | UNTESTED | — |  |  |  |
| `create_listing_quantity_edges` | UNTESTED | — |  |  |  |
| `create_listing_title_edges` | UNTESTED | — |  |  |  |
| `create_listing_validation` | PASS | run-106 | 209 |  |  |
| `create_listing_with_condition` | FAIL-assert | run-106 | 209 |  | [Failed] create_listing_with_condition (3m 11s) (Assertion is false: "Cover" is visible) |
| `create_listing_with_photos` | FAIL-assert | run-106 | 215 |  | [Failed] create_listing_with_photos (3m 9s) (Assertion is false: "Cover" is visible) |
| `delete_listing` | FAIL-assert | run-106 | 202 |  | [Failed] delete_listing (2m 56s) (Element not found: Text matching regex: Delete Listing) |
| `draft_lifecycle` | FAIL-assert | run-106 | 219 |  | [Failed] draft_lifecycle (3m 15s) (Element not found: Text matching regex: Tap to select category) |
| `edit_listing` | FAIL-assert | run-106 | 204 |  | [Failed] edit_listing (3m 3s) (Element not found: Text matching regex: Edit) |
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

## `chat` — Conversations, messages, offers, meetup arrangement, read state

10/42 passing · 31 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | (rig) | s2/run-108 | 482 |  |  |
| `block_from_conversation` | FAIL-assert | s2/run-108 | 187 |  | [Failed] block_from_conversation (2m 39s) (Assertion is false: "Blocked users cannot contact you" is visible) |
| `chat_older_messages_pagination` | FAIL-? | s2/run-108 | 161 |  | [Failed] chat_older_messages_pagination (2m 15s) (No visible element found: id: messages-list-top) |
| `composer_draft` | PASS | s2/run-108 | 209 |  |  |
| `conversation_archive` | PASS | s2/run-108 | 195 |  |  |
| `conversation_delete` | PASS | s2/run-106 | 110 |  |  |
| `conversation_read_status` | FAIL-assert | s2/run-106 | 137 |  | [Failed] conversation_read_status (2m 1s) (Assertion is false: id: unread-badge-\d+ is visible) |
| `conversations-search` | PASS | s2/run-106 | 163 |  |  |
| `conversations_empty_state` | FAIL-assert | s2/run-106 | 194 |  | [Failed] conversations_empty_state (2m 57s) (Assertion is false: "Bazaar" is visible) |
| `conversations_filter` | FAIL-? | s2/run-106 | 117 |  | [Failed] conversations_filter (1m 41s) |
| `conversations_list` | FAIL-assert | s2/run-106 | 128 |  | [Failed] conversations_list (1m 50s) (Element not found: Text matching regex: Unread) |
| `conversations_role_filter` | PASS | s2/run-106 | 243 |  |  |
| `delete_message` | FAIL-assert | s2/run-106 | 154 |  | [Failed] delete_message (2m 9s) (Assertion is false: "Delete message" is visible) |
| `lifecycle_from_chat` | FAIL-assert | s2/run-106 | 207 |  | [Failed] lifecycle_from_chat (3m 5s) (Assertion is false: "Type a message..." is not visible) |
| `mark_read` | FAIL-assert | s2/run-106 | 179 |  | [Failed] Mark conversation read/unread from conversations list (2m 36s) (Assertion is false: id: unread-badge- |
| `mark_read_end_to_end` | FAIL-assert | s2/run-106 | 123 |  | [Failed] mark_read_end_to_end (1m 39s) (Assertion is false: id: unread-badge-\d+ is visible) |
| `meetup_decline` | FAIL-? | s2/run-106 | 131 |  | [Failed] meetup_decline (1m 46s) (No visible element found: "Phone Case.*") |
| `meetup_full_cycle` | FAIL-assert | s2/run-106 | 133 |  | [Failed] meetup_full_cycle (1m 49s) (Element not found: Text matching regex: More actions) |
| `meetup_proposal` | FAIL-? | s2/run-106 | 123 |  | [Failed] meetup_proposal (1m 46s) (No visible element found: "Phone Case.*") |
| `meetup_proposed_bubble_ui` | FAIL-assert | s2/run-106 | 134 |  | [Failed] meetup_proposed_bubble_ui (1m 53s) (Element not found: Text matching regex: More actions) |
| `meetup_respond` | FAIL-? | s2/run-106 | 128 |  | [Failed] meetup_respond (1m 48s) (No visible element found: "Phone Case.*") |
| `meetup_validation` | FAIL-? | s2/run-106 | 124 |  | [Failed] meetup_validation (1m 45s) (No visible element found: "Phone Case.*") |
| `message_long_text` | FAIL-assert | s2/run-106 | 124 |  | [Failed] message_long_text (1m 48s) (Element not found: Text matching regex: Type a message...) |
| `offer_counter_flow` | FAIL-assert | s2/run-106 | 134 |  | [Failed] offer_counter_flow (1m 49s) (Element not found: Text matching regex: Make an Offer) |
| `offer_in_existing_thread` | FAIL-? | s2/run-106 | 133 |  | [Failed] offer_in_existing_thread (1m 50s) (No visible element found: "Phone Case.*") |
| `offer_send_and_accept` | FAIL-assert | s2/run-106 | 139 |  | [Failed] offer_send_and_accept (2m 1s) (Assertion is false: "3,000" is visible) |
| `offer_send_and_decline` | FAIL-assert | s2/run-106 | 126 |  | [Failed] offer_send_and_decline (1m 48s) (Element not found: Text matching regex: Make an Offer) |
| `quick_replies` | PASS | s2/run-106 | 144 |  |  |
| `report_participant` | FAIL-assert | s2/run-106 | 143 |  | [Failed] report_participant (1m 57s) (Assertion is false: "Fraud" is visible) |
| `reserve_after_accept` | FAIL-? | s2/run-106 | 112 |  | [Failed] reserve_after_accept (1m 35s) (No visible element found: "Traditional Kandahari Carpet 3x4") |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | s2/run-106 | 390 |  | [Failed] reserve_after_buyer_accepts_counter (6m 13s) (Assertion is false: "Accept offer" is visible) |
| `reserved_sold_dead_end_notice` | FAIL-assert | s2/run-106 | 384 |  | [Failed] reserved_sold_dead_end_notice (5m 55s) (Assertion is false: id: listing-unavailable-notice is visible |
| `send_message` | PASS | s2/run-106 | 136 |  |  |
| `send_message_double_tap` | PASS | s2/run-106 | 132 |  |  |
| `send_message_empty` | PASS | s2/run-106 | 126 |  |  |
| `send_message_offline` | FAIL-assert ⚠1 | s2/run-106 | 160 |  | [Failed] send_message_offline (2m 13s) (Element not found: Text matching regex: Send)  ||  api: AxiosError  |
| `send_message_whitespace` | PASS | s2/run-106 | 137 |  |  |
| `send_multiple_messages` | FAIL-assert | s2/run-106 | 128 |  | [Failed] send_multiple_messages (1m 38s) (Element not found: Text matching regex: Bazaar) |
| `send_photo` | FAIL-assert | s2/run-106 | 172 |  | [Failed] send_photo (2m 24s) (Assertion is false: "View photo fullscreen" is visible) |
| `start_conversation` | FAIL-assert | s2/run-106 | 129 |  | [Failed] start_conversation (1m 41s) (Assertion is false: "Bazaar" is visible) |
| `start_conversation_and_reply` | FAIL-assert | s2/run-106 | 135 |  | [Failed] start_conversation_and_reply (1m 44s) (Element not found: Text matching regex: Bazaar) |
| `view_other_profile_from_conversation` | FAIL-assert | s2/run-106 | 139 |  | [Failed] view_other_profile_from_conversation (1m 54s) (Element not found: Id matching regex: other-participan |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

0/29 passing · 29 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | UNTESTED | — |  |  |  |
| `account_delete_cancel` | UNTESTED | — |  |  |  |
| `away_mode` | UNTESTED | — |  |  |  |
| `blocked_users` | UNTESTED | — |  |  |  |
| `change_language_dari` | UNTESTED | — |  |  |  |
| `change_language_english` | UNTESTED | — |  |  |  |
| `change_language_pashto` | UNTESTED | — |  |  |  |
| `edit_profile` | FAIL-assert | run-046 | 136 |  | [Failed] edit_profile (2m 3s) (Assertion is false: "Ahmad Updated" is visible) |
| `edit_profile_all_fields` | UNTESTED | — |  |  |  |
| `edit_profile_avatar` | UNTESTED | — |  |  |  |
| `edit_profile_bio_too_long` | UNTESTED | — |  |  |  |
| `edit_profile_province_picker_deep` | UNTESTED | — |  |  |  |
| `edit_profile_validation` | UNTESTED | — |  |  |  |
| `hidden_listings` | UNTESTED | — |  |  |  |
| `language_persists_across_tabs` | UNTESTED | — |  |  |  |
| `language_switch_all_screens` | UNTESTED | — |  |  |  |
| `profile_stats_verify` | FAIL-assert | run-046 | 118 |  | [Failed] profile_stats_verify (1m 45s) (Assertion is false: "Listings" is visible) |
| `recently_viewed` | UNTESTED | — |  |  |  |
| `recently_viewed_empty_state` | UNTESTED | — |  |  |  |
| `seller_mode_toggle` | UNTESTED | — |  |  |  |
| `theme_switch` | UNTESTED | — |  |  |  |
| `transaction_stats_hidden_when_zero` | UNTESTED | — |  |  |  |
| `transaction_stats_own_profile` | UNTESTED | — |  |  |  |
| `transaction_stats_public_profile` | UNTESTED | — |  |  |  |
| `transaction_stats_seller_own_profile` | UNTESTED | — |  |  |  |
| `user_profile_sold_tab` | UNTESTED | — |  |  |  |
| `view_profile` | UNTESTED | — |  |  |  |
| `view_profile_error` | UNTESTED | — |  |  |  |
| `view_seller_profile_from_profile` | UNTESTED | — |  |  |  |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

14/37 passing · 23 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | s2/run-108 | 158 |  |  |
| `browse_listings` | PASS | s2/run-108 | 140 |  |  |
| `browse_sort_most_viewed` | FAIL-? | s2/run-108 | 148 |  | [Failed] browse_sort_most_viewed (2m 8s) (No visible element found: "Most viewed") |
| `browse_sort_nearest` | FAIL-? | s2/run-108 | 151 |  | [Failed] browse_sort_nearest (2m 8s) (No visible element found: "Nearest first") |
| `categories_hub` | PASS | s2/run-108 | 191 |  |  |
| `categories_hub_empty` | FAIL-assert | s2/run-108 | 146 |  | [Failed] categories_hub_empty (2m 7s) (Assertion is false: "No categories yet" is visible) |
| `clear_all_filters` | FAIL-assert | s2/run-108 | 142 |  | [Failed] clear_all_filters (2m 1s) (Element not found: Text matching regex: Show results) |
| `filter_active_sellers` | PASS | s2/run-108 | 197 |  |  |
| `filter_by_category` | PASS | s2/run-108 | 145 |  |  |
| `filter_condition` | PASS | run-062 | 128 |  |  |
| `filter_price_range` | PASS | run-062 | 131 |  |  |
| `full_marketplace_cycle` | FAIL-assert | run-062 | 208 |  | [Failed] full_marketplace_cycle (3m 11s) (Assertion is false: "Cover" is visible) |
| `listing_detail` | FAIL-assert | run-062 | 117 |  | [Failed] listing_detail (1m 38s) (Assertion is false: "Bazaar" is visible) |
| `listing_detail_multi_quantity` | FAIL-assert | run-062 | 287 |  | [Failed] listing_detail_multi_quantity (4m 28s) (Element not found: Text matching regex: Email) |
| `listing_detail_offer` | FAIL-? | run-062 | 139 |  | [Failed] listing_detail_offer (2m 2s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_offer_invalid` | FAIL-assert | run-062 | 138 |  | [Failed] listing_detail_offer_invalid (2m 1s) (Assertion is false: "Enter a valid amount" is visible) |
| `listing_detail_price_drop_badge` | FAIL-assert | run-062 | 137 |  | [Failed] listing_detail_price_drop_badge (1m 58s) (Assertion is false: "-\d+%" is visible) |
| `listing_detail_report` | FAIL-assert | run-062 | 148 |  | [Failed] listing_detail_report (2m 9s) (Element not found: Text matching regex: More options) |
| `listing_detail_save_unsave` | FAIL-assert | run-062 | 152 |  | [Failed] listing_detail_save_unsave (2m 12s) (Element not found: Id matching regex: save-toggle-button) |
| `listing_detail_saves_count` | PASS | run-080 | 136 |  |  |
| `listing_detail_share` | PASS | run-073 | 130 |  |  |
| `listing_detail_similar` | PASS | run-103 | 133 |  |  |
| `listing_detail_sold_recovery` | FAIL-? | run-062 | 92 |  | [Failed] listing_detail_sold_recovery (1m 16s) |
| `listing_detail_sold_state` | FAIL-? | run-062 | 95 |  | [Failed] listing_detail_sold_state (1m 17s) |
| `listing_detail_views_count` | FAIL-assert | run-062 | 158 |  | [Failed] listing_detail_views_count (2m 20s) (Assertion is false: "view" is visible) |
| `not_interested` | PASS | run-062 | 131 |  |  |
| `saved_search_apply` | FAIL-assert | run-062 | 130 |  | [Failed] saved_search_apply (1m 52s) (Element not found: Text matching regex: Filter) |
| `search_empty_state` | PASS | run-062 | 134 |  |  |
| `search_listings` | PASS | run-062 | 150 |  |  |
| `search_with_filter` | FAIL-assert | run-062 | 148 |  | [Failed] search_with_filter (2m 10s) (Element not found: Text matching regex: Filter) |
| `seller_profile` | FAIL-assert | run-102 | 131 |  | [Failed] seller_profile (1m 54s) (Assertion is false: "Items Sold" is visible) |
| `seller_response_rate_badge` | FAIL-? | run-104 | 138 |  | [Failed] seller_response_rate_badge (1m 56s) (No visible element found: "Usually responds.*") |
| `subcategory_drilldown` | FAIL-assert | run-062 | 133 |  | [Failed] subcategory_drilldown (1m 56s) (Element not found: Text matching regex: Browse categories) |
| `user_profile_empty_listings` | FAIL-assert | run-105 | 139 |  | [Failed] user_profile_empty_listings (2m 3s) (Assertion is false: "No listings yet" is visible) |
| `user_profile_listing_grid` | FAIL-assert | run-101 | 143 |  | [Failed] user_profile_listing_grid (2m 5s) (Assertion is false: "Listings" is visible) |
| `user_profile_stats` | FAIL-assert | run-100 | 134 |  | [Failed] user_profile_stats (1m 59s) (Assertion is false: "Items Sold" is visible) |
| `view_mode_toggle` | PASS | run-062 | 187 |  |  |

## `auth` — Sign up, login, logout, session persistence, guest gating

4/15 passing · 11 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `guest_browse` | PASS | run-107 | 171 |  |  |
| `guest_offer_redirect` | FAIL-assert | run-107 | 169 |  | [Failed] guest_offer_redirect (2m 23s) (Element not found: Text matching regex: Make an Offer) |
| `guest_save_redirect` | FAIL-assert | run-107 | 176 |  | [Failed] guest_save_redirect (2m 30s) (Element not found: Id matching regex: save-button) |
| `login` | PASS | run-107 | 183 |  |  |
| `login_deep` | FAIL-assert | run-107 | 193 |  | [Failed] login_deep (2m 44s) (Assertion is false: "Bazaar" is visible) |
| `login_empty_fields` | PASS | run-107 | 150 |  |  |
| `login_navigate_to_register` | FAIL-assert | run-107 | 161 |  | [Failed] login_navigate_to_register (2m 10s) (Element not found: Text matching regex: Create account) |
| `login_wrong_password` | FAIL-assert | run-107 | 179 |  | [Failed] login_wrong_password (2m 33s) (Assertion is false: "Invalid login credentials" is visible) |
| `logout` | FAIL-? | run-013 | 13 |  | [Failed] logout (0s) |
| `logout_cancel` | FAIL-? | run-013 | 13 |  | [Failed] logout_cancel (0s) |
| `register_duplicate_email` | FAIL-? | run-013 | 17 |  | [Failed] register_duplicate_email (0s) |
| `register_navigate_to_login` | FAIL-? | run-013 | 16 |  | [Failed] register_navigate_to_login (0s) |
| `session_persist` | PASS | run-046 | 177 |  |  |
| `sign_up` | FAIL-assert | s3/run-111 | 174 |  | [Failed] sign_up (2m 35s) (Assertion is false: "Bazaar" is visible) |
| `sign_up_validation` | FAIL-? | run-013 | 21 |  | [Failed] sign_up_validation (0s) |

## `report` — Report a listing or user, block, block side-effects

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | UNTESTED | — |  |  |  |
| `block_user` | FAIL-assert | run-046 | 115 |  | [Failed] block_user (1m 40s) (Assertion is false: "Bazaar" is visible) |
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
| `browse_dark` | FAIL-assert | run-108 | 180 |  | [Failed] browse_dark (2m 28s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-assert | run-108 | 156 |  | [Failed] chat_dark (2m 12s) (Element not found: Text matching regex: Dark) |
| `listing_detail_dark` | FAIL-assert | run-108 | 157 |  | [Failed] listing_detail_dark (2m 11s) (Element not found: Text matching regex: Dark) |
| `my_listings_dark` | FAIL-assert | run-108 | 239 |  | [Failed] my_listings_dark (3m 38s) (Element not found: Text matching regex: Dark) |
| `profile_dark` | FAIL-assert | run-108 | 140 |  | [Failed] profile_dark (2m) (Element not found: Text matching regex: Dark) |
| `saved_tab_dark` | FAIL-assert | run-108 | 145 |  | [Failed] saved_tab_dark (2m 1s) (Element not found: Text matching regex: Appearance) |
| `theme_light_all_screens` | FAIL-assert | run-108 | 132 |  | [Failed] theme_light_all_screens (1m 53s) (Element not found: Text matching regex: Appearance) |
| `theme_persists_after_navigate` | FAIL-assert | run-108 | 137 |  | [Failed] theme_persists_after_navigate (1m 56s) (Element not found: Text matching regex: Appearance) |

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
| `mode_switcher` | FAIL-assert | run-046 | 112 |  | [Failed] mode_switcher (1m 39s) (Assertion is false: "Bazaar" is visible) |
| `seller_mode_banner_persists` | UNTESTED | — |  |  |  |
| `seller_mode_my_listings_empty` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | UNTESTED | — |  |  |  |
| `seller_views_own_listing_buyer_mode` | UNTESTED | — |  |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

1/6 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | run-045 | 132 |  |  |
| `conversations_pagination` | UNTESTED | — |  |  |  |
| `filter_combined_pagination` | UNTESTED | — |  |  |  |
| `my_listings_pagination` | UNTESTED | — |  |  |  |
| `saved_pagination_deep` | UNTESTED | — |  |  |  |
| `search_pagination` | UNTESTED | — |  |  |  |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-109 | 220 |  | [Failed] listing_create_multi_photos (3m 17s) (Assertion is false: "Photos" is visible) |
| `listing_edit_add_photos` | UNTESTED | — |  |  |  |
| `listing_gallery_no_photo` | UNTESTED | — |  |  |  |
| `listing_gallery_swipe` | FAIL-assert | run-046 | 151 |  | [Failed] listing_gallery_swipe (2m 17s) (Element not found: Text matching regex: Contact Seller) |

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
| `first_run` | FAIL-redbox | run-046 | 139 |  | [Failed] first_run (2m 1s) (Assertion is false: "Buy or sell — your choice" is visible) |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

5/6 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | s3/run-110 | 257 |  |  |
| `filter_map_default_kabul` | PASS | s3/run-111 | 184 |  |  |
| `filter_map_location_denied` | FAIL-assert | s3/run-111 | 211 |  | [Failed] filter_map_location_denied (3m 12s) (Assertion is false: "Location access is blocked. Allow location  |
| `filter_map_use_my_location` | PASS | s3/run-111 | 179 |  |  |
| `filter_map_use_my_location_granted` | PASS | s3/run-110 | 144 |  |  |
| `map_location_outside_afghanistan` | PASS | s3/run-111 | 205 |  |  |

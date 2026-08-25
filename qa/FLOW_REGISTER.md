# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**39 of 232 flows passing** · 193 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 39 | green, and no backend error underneath |
| SILENT | 1 | **assertions passed while the API errored** — the app told the user nothing |
| FAIL-assert | 102 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-? | 25 | failed, cause unclear — read the log |
| UNTESTED | 65 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

1/37 passing · 36 open

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
| `full_marketplace_cycle` | UNTESTED | — |  |  |  |
| `listing_detail` | UNTESTED | — |  |  |  |
| `listing_detail_multi_quantity` | UNTESTED | — |  |  |  |
| `listing_detail_offer` | UNTESTED | — |  |  |  |
| `listing_detail_offer_invalid` | UNTESTED | — |  |  |  |
| `listing_detail_price_drop_badge` | UNTESTED | — |  |  |  |
| `listing_detail_report` | UNTESTED | — |  |  |  |
| `listing_detail_save_unsave` | UNTESTED | — |  |  |  |
| `listing_detail_saves_count` | UNTESTED | — |  |  |  |
| `listing_detail_share` | UNTESTED | — |  |  |  |
| `listing_detail_similar` | UNTESTED | — |  |  |  |
| `listing_detail_sold_recovery` | UNTESTED | — |  |  |  |
| `listing_detail_sold_state` | UNTESTED | — |  |  |  |
| `listing_detail_views_count` | UNTESTED | — |  |  |  |
| `not_interested` | UNTESTED | — |  |  |  |
| `saved_search_apply` | UNTESTED | — |  |  |  |
| `search_empty_state` | UNTESTED | — |  |  |  |
| `search_listings` | UNTESTED | — |  |  |  |
| `search_with_filter` | UNTESTED | — |  |  |  |
| `seller_profile` | UNTESTED | — |  |  |  |
| `seller_profile_from_listing` | PASS | s2/run-141 | 237 |  |  |
| `seller_response_rate_badge` | UNTESTED | — |  |  |  |
| `subcategory_drilldown` | UNTESTED | — |  |  |  |
| `user_profile_empty_listings` | UNTESTED | — |  |  |  |
| `user_profile_listing_grid` | UNTESTED | — |  |  |  |
| `user_profile_stats` | UNTESTED | — |  |  |  |
| `view_mode_toggle` | UNTESTED | — |  |  |  |

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

5/40 passing · 34 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | FAIL-assert | run-216 | 194 |  | [Failed] create_listing (2m 57s) (Assertion is false: "Switch to .*" is visible) |
| `create_listing_all_fields` | FAIL-assert | run-216 | 277 |  | [Failed] create_listing_all_fields (4m 21s) (Element not found: Id matching regex: listing-form-description-in |
| `create_listing_category_search` | PASS | run-216 | 269 |  |  |
| `create_listing_currency_eur` | FAIL-assert | run-216 | 294 |  | [Failed] create_listing_currency_eur (4m 34s) (Element not found: Id matching regex: browse-tab) |
| `create_listing_currency_usd` | FAIL-assert | run-216 | 286 |  | [Failed] create_listing_currency_usd (4m 27s) (Assertion is false: "Your listing is live!" is visible) |
| `create_listing_draft_discard` | PASS | run-216 | 249 |  |  |
| `create_listing_draft_restore` | FAIL-assert | run-216 | 247 |  | [Failed] create_listing_draft_restore (3m 47s) (Element not found: Id matching regex: listing-form-description |
| `create_listing_full_publish` | SILENT ⚠1 | run-216 | 302 |  | AxiosError |
| `create_listing_multi_quantity` | FAIL-assert ⟳stale | run-216 | 281 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | FAIL-? | run-216 | 338 |  | [Failed] create_listing_price_edges (5m 21s) |
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
| `listing_renew_flow` | FAIL-assert | s2/run-151 | 223 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/login_seller.yaml:53:31 |
| `listing_status_counts` | FAIL-assert | s2/run-151 | 230 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/login_seller.yaml:53:31 |
| `my_listing_detail_view` | FAIL-assert | s2/run-151 | 209 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/login_seller.yaml:53:31 |
| `my_listings_filter_tabs` | FAIL-assert | s2/run-151 | 211 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/login_seller.yaml:53:31 |
| `my_listings_search` | FAIL-assert | s2/run-151 | 220 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/login_seller.yaml:53:31 |
| `price_drop_after_edit` | FAIL-? | s2/run-151 | 212 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/login_seller.yaml:53:31 |

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
| `view_profile_error` | PASS | s2/run-156 | 188 |  | AxiosError |
| `view_seller_profile_from_profile` | FAIL-assert | s2/run-156 | 177 |  | [Failed] view_seller_profile_from_profile (2m 37s) (Assertion is false: "Switch to .*" is visible) |

## `chat` — Conversations, messages, offers, meetup arrangement, read state

16/42 passing · 25 open

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
| `reserved_sold_dead_end_notice` | FAIL-assert ⚠slow | s2/run-142 | 568 |  | [Failed] reserved_sold_dead_end_notice (9m) (Assertion is false: id: listing-unavailable-notice is visible) |
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

## `auth` — Sign up, login, logout, session persistence, guest gating

0/16 passing · 16 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | UNTESTED | — |  |  |  |
| `guest_browse` | FAIL-? | s5/run-124 | 57 |  | [Failed] guest_browse (14s) |
| `guest_offer_redirect` | FAIL-? | s5/run-124 | 48 |  | [Failed] guest_offer_redirect (9s) |
| `guest_save_redirect` | FAIL-? | s5/run-124 | 46 |  | [Failed] guest_save_redirect (5s) |
| `login` | FAIL-? | s5/run-124 | 82 |  | [Failed] login (44s) |
| `login_deep` | FAIL-? | s5/run-124 | 31 |  | [Failed] login_deep (5s) |
| `login_empty_fields` | UNTESTED | — |  |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | UNTESTED | — |  |  |  |
| `login_wrong_password` | UNTESTED | — |  |  | Request failed with status code |
| `logout` | UNTESTED | — |  |  |  |
| `logout_cancel` | UNTESTED | — |  |  |  |
| `register_duplicate_email` | UNTESTED | — |  |  |  |
| `register_navigate_to_login` | UNTESTED | — |  |  |  |
| `session_persist` | UNTESTED | — |  |  |  |
| `sign_up` | FAIL-assert | s3/run-111 | 174 |  | [Failed] sign_up (2m 35s) (Assertion is false: "Bazaar" is visible) |
| `sign_up_validation` | UNTESTED | — |  |  |  |

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

## `seller` — Seller action sheet, publish, mark reserved/sold with buyer

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_actions_sheet` | FAIL-assert | run-223 | 273 |  | [Failed] listing_actions_sheet (4m 12s) (Assertion is false: "Listing published!" is visible) |
| `listing_conversations` | FAIL-assert | run-219 | 259 |  | [Failed] listing_conversations (4m 1s) (Element not found: Text matching regex: Make an Offer) |
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
| `block_prevents_message` | UNTESTED | — |  |  |  |
| `block_user` | UNTESTED | — |  |  |  |
| `block_user_hides_listings` | UNTESTED | — |  |  |  |
| `report_listing` | UNTESTED | — |  |  |  |
| `report_listing_no_reason` | UNTESTED | — |  |  |  |
| `report_user` | UNTESTED | — |  |  |  |
| `report_user_from_profile` | UNTESTED | — |  |  |  |
| `report_user_then_block` | UNTESTED | — |  |  |  |

## `dark_mode` — Every main screen in dark theme + theme persistence

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | s4/run-108 | 219 |  | [Failed] browse_dark (2m 57s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-assert | s4/run-108 | 167 |  | [Failed] chat_dark (2m 21s) (Element not found: Text matching regex: Dark) |
| `listing_detail_dark` | FAIL-assert | s4/run-108 | 192 |  | [Failed] listing_detail_dark (2m 19s) (Element not found: Text matching regex: Dark) |
| `my_listings_dark` | FAIL-assert | s4/run-108 | 247 |  | [Failed] my_listings_dark (3m 40s) (Element not found: Text matching regex: Dark) |
| `profile_dark` | FAIL-assert | s4/run-108 | 166 |  | [Failed] profile_dark (2m 20s) (Element not found: Text matching regex: Dark) |
| `saved_tab_dark` | FAIL-assert | s4/run-108 | 164 |  | [Failed] saved_tab_dark (2m 19s) (Element not found: Text matching regex: Appearance) |
| `theme_light_all_screens` | FAIL-assert | s4/run-108 | 158 |  | [Failed] theme_light_all_screens (2m 14s) (Element not found: Text matching regex: Appearance) |
| `theme_persists_after_navigate` | UNTESTED | — |  |  |  |

## `rtl` — Pashto + Dari right-to-left layout across main screens

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | FAIL-assert | run-212 | 224 |  | [Failed] browse_rtl_dari (3m 28s) (Assertion is false: "دری" is visible) |
| `browse_rtl_pashto` | FAIL-assert | run-212 | 474 |  | [Failed] browse_rtl_pashto (7m 39s) (Assertion is false: id: profile-tab is visible) |
| `categories_hub_rtl` | FAIL-assert | run-212 | 472 |  | [Failed] categories_hub_rtl (7m 37s) (Assertion is false: id: profile-tab is visible) |
| `chat_rtl` | FAIL-assert | run-212 | 472 |  | [Failed] chat_rtl (7m 37s) (Assertion is false: id: profile-tab is visible) |
| `listing_detail_rtl` | FAIL-assert | run-212 | 472 |  | [Failed] listing_detail_rtl (7m 37s) (Assertion is false: id: profile-tab is visible) |
| `my_listings_rtl` | FAIL-assert | run-212 | 485 |  | [Failed] my_listings_rtl (7m 49s) (Assertion is false: id: profile-tab is visible) |
| `profile_quick_actions_rtl` | FAIL-assert | run-212 | 473 |  | [Failed] profile_quick_actions_rtl (7m 38s) (Assertion is false: id: profile-tab is visible) |
| `profile_rtl` | FAIL-assert | run-212 | 472 |  | [Failed] profile_rtl (7m 38s) (Assertion is false: id: profile-tab is visible) |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | s2/run-156 | 114 |  | [Failed] seller_mode_my_listings_empty (1m 39s) (Element not found: Text matching regex: Sign In) |
| `seller_mode_persists` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | FAIL-assert | s2/run-156 | 172 |  | [Failed] seller_mode_tab_bar_changes (2m 34s) (Element not found: Id matching regex: mode-switcher-banner) |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | s2/run-156 | 208 |  | [Failed] seller_views_own_listing_buyer_mode (3m 11s) (Assertion is false: "Buyer Mode" is visible) |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

1/4 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-210 | 215 |  | [Failed] listing_create_multi_photos (3m 19s) (Assertion is false: "Photos" is visible) |
| `listing_edit_add_photos` | FAIL-? | run-210 | 212 |  | [Failed] listing_edit_add_photos (3m 16s) (No visible element found: "Edit") |
| `listing_gallery_no_photo` | PASS | run-210 | 189 |  |  |
| `listing_gallery_swipe` | FAIL-assert | run-210 | 201 |  | [Failed] listing_gallery_swipe (3m 7s) (Assertion is false: "Contact Seller" is visible) |

## `safety` — Safety tips on listing detail and in the meetup sheet

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | FAIL-assert | run-213 | 475 |  | [Failed] safety_tips_listing_detail (7m 39s) (Assertion is false: id: profile-tab is visible) |
| `safety_tips_meetup_sheet` | FAIL-assert | run-213 | 485 |  | [Failed] safety_tips_meetup_sheet (7m 48s) (Assertion is false: id: profile-tab is visible) |

## `reviews` — Double-blind reviews after a sold transaction

0/3 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-? ⟳stale | run-211 | 212 |  | [Failed] pending_reviews_nudge (3m 16s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |
| `profile_reviews_empty_state` | FAIL-assert ⟳stale | run-211 | 151 |  | [Failed] profile_reviews_empty_state (2m 17s) (Assertion is false: "Buy and sell locally in Afghanistan" is vi |
| `rate_buyer_after_sale` | FAIL-? | run-211 | 185 |  | [Failed] rate_buyer_after_sale (2m 50s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |

## `share` — Deep links into a listing and a seller profile

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | FAIL-? | run-214 | 392 |  | [Failed] open_listing_deep_link (6m 8s) (No visible element found: id: seller-profile-link) |
| `open_seller_deep_link` | PASS | run-214 | 380 |  |  |

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

## `onboarding` — First-run experience

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | run-215 | 244 |  |  |

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

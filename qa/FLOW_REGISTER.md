# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**16 of 223 flows passing** · 201 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 16 | green, and no backend error underneath |
| FAIL-assert | 33 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 13 | failed, cause unclear — read the log |
| (rig) | 6 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 154 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

3/37 passing · 34 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | UNTESTED | — |  |  |  |
| `browse_listings` | PASS | run-046 | 135 |  |  |
| `browse_sort_most_viewed` | UNTESTED | — |  |  |  |
| `browse_sort_nearest` | UNTESTED | — |  |  |  |
| `categories_hub` | UNTESTED | — |  |  |  |
| `categories_hub_empty` | UNTESTED | — |  |  |  |
| `clear_all_filters` | UNTESTED | — |  |  |  |
| `filter_active_sellers` | UNTESTED | — |  |  |  |
| `filter_by_category` | UNTESTED | — |  |  |  |
| `filter_condition` | UNTESTED | — |  |  |  |
| `filter_price_range` | UNTESTED | — |  |  |  |
| `full_marketplace_cycle` | UNTESTED | — |  |  |  |
| `listing_detail` | FAIL-assert | run-046 | 137 |  | [Failed] listing_detail (2m) (Assertion is false: "Description" is visible) |
| `listing_detail_multi_quantity` | PASS | s2/run-062 | 149 |  |  |
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
| `search_listings` | PASS | run-046 | 149 |  |  |
| `search_with_filter` | UNTESTED | — |  |  |  |
| `seller_profile` | UNTESTED | — |  |  |  |
| `seller_response_rate_badge` | UNTESTED | — |  |  |  |
| `subcategory_drilldown` | UNTESTED | — |  |  |  |
| `user_profile_empty_listings` | UNTESTED | — |  |  |  |
| `user_profile_listing_grid` | UNTESTED | — |  |  |  |
| `user_profile_stats` | UNTESTED | — |  |  |  |
| `view_mode_toggle` | UNTESTED | — |  |  |  |

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

3/37 passing · 34 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-051 | 226 |  |  |
| `create_listing_all_fields` | FAIL-assert | run-051 | 208 |  | [Failed] create_listing_all_fields (3m 11s) (Assertion is false: "Cover" is visible) |
| `create_listing_category_search` | PASS | run-051 | 211 |  |  |
| `create_listing_currency_eur` | FAIL-assert | run-051 | 213 |  | [Failed] create_listing_currency_eur (3m 16s) (Assertion is false: "EUR" is visible) |
| `create_listing_currency_usd` | FAIL-assert | run-051 | 206 |  | [Failed] create_listing_currency_usd (3m 8s) (Element not found: Text matching regex: USD) |
| `create_listing_draft_discard` | FAIL-assert | run-051 | 199 |  | [Failed] create_listing_draft_discard (3m 3s) (Assertion is false: "Discard listing?" is visible) |
| `create_listing_draft_restore` | FAIL-assert | run-051 | 203 |  | [Failed] create_listing_draft_restore (3m 7s) (Element not found: Text matching regex: Description) |
| `create_listing_location_picker` | FAIL-assert | run-051 | 207 |  | [Failed] create_listing_location_picker (3m 11s) (Element not found: Text matching regex: Category) |
| `create_listing_multi_quantity` | PASS | run-051 | 199 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_province_picker` | FAIL-assert | run-051 | 184 |  | [Failed] create_listing_province_picker (2m 51s) (Element not found: Text matching regex: Select Province) |
| `create_listing_publish_blocked` | FAIL-? | run-051 | 58 |  |  |
| `create_listing_publish_direct` | FAIL-? | run-051 | 42 |  |  |
| `create_listing_validation` | FAIL-? | run-051 | 14 |  |  |
| `create_listing_with_condition` | UNTESTED | — |  |  |  |
| `create_listing_with_photos` | UNTESTED | — |  |  |  |
| `delete_listing` | UNTESTED | — |  |  |  |
| `draft_lifecycle` | UNTESTED | — |  |  |  |
| `edit_listing` | UNTESTED | — |  |  |  |
| `edit_listing_all_fields` | UNTESTED | — |  |  |  |
| `edit_listing_discard` | UNTESTED | — |  |  |  |
| `edit_listing_quantity` | UNTESTED | — |  |  |  |
| `edit_listing_remove_photo` | UNTESTED | — |  |  |  |
| `edit_listing_reorder_photos` | UNTESTED | — |  |  |  |
| `expired_listing_badge` | UNTESTED | — |  |  |  |
| `lifecycle_publish` | FAIL-assert | run-046 | 39 |  | [Failed] lifecycle_publish (25s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `lifecycle_reactivate` | UNTESTED | — |  |  |  |
| `lifecycle_reserve` | UNTESTED | — |  |  |  |
| `lifecycle_sold` | UNTESTED | — |  |  |  |
| `lifecycle_unpublish` | UNTESTED | — |  |  |  |
| `listing_analytics_sparkline` | UNTESTED | — |  |  |  |
| `listing_conversations_list` | UNTESTED | — |  |  |  |
| `listing_renew_flow` | UNTESTED | — |  |  |  |
| `listing_status_counts` | UNTESTED | — |  |  |  |
| `my_listing_detail_view` | UNTESTED | — |  |  |  |
| `my_listings_filter_tabs` | FAIL-assert | run-046 | 39 |  | [Failed] my_listings_filter_tabs (25s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `my_listings_search` | UNTESTED | — |  |  |  |
| `price_drop_after_edit` | UNTESTED | — |  |  |  |

## `chat` — Conversations, messages, offers, meetup arrangement, read state

3/42 passing · 33 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | s2/run-055 | 152 |  |  |
| `block_from_conversation` | FAIL-assert | s2/run-055 | 133 |  | [Failed] block_from_conversation (1m 52s) (Element not found: Text matching regex: Chat) |
| `chat_older_messages_pagination` | FAIL-assert | s2/run-055 | 142 |  | [Failed] chat_older_messages_pagination (2m 1s) (Element not found: Text matching regex: Chat) |
| `composer_draft` | FAIL-assert | s2/run-055 | 215 |  | [Failed] composer_draft (3m) (Assertion is false: "Draft that must survive navigation" is not visible) |
| `conversation_archive` | PASS | s2/run-055 | 184 |  |  |
| `conversation_delete` | FAIL-assert | s2/run-055 | 170 |  | [Failed] conversation_delete (2m 14s) (Element not found: Text matching regex: Delete Conversation) |
| `conversation_read_status` | FAIL-assert | s2/run-055 | 168 |  | [Failed] conversation_read_status (2m 21s) (Assertion is false: id: unread-badge-\d+ is visible) |
| `conversations-search` | (rig) | s2/run-055 | 243 |  |  |
| `conversations_empty_state` | FAIL-assert | s2/run-055 | 173 |  | [Failed] conversations_empty_state (2m 18s) (Assertion is false: "No conversations" is visible) |
| `conversations_filter` | FAIL-? | s2/run-055 | 161 |  | [Failed] conversations_filter (2m 2s) |
| `conversations_list` | (rig) | s2/run-055 | 242 |  |  |
| `conversations_role_filter` | (rig) | s2/run-055 | 241 |  |  |
| `delete_message` | (rig) | s2/run-055 | 243 |  |  |
| `lifecycle_from_chat` | (rig) | s2/run-055 | 244 |  |  |
| `mark_read` | FAIL-assert | s2/run-055 | 189 |  | [Failed] Mark conversation read/unread from conversations list (2m 22s) (Assertion is false: "Buy and sell loc |
| `mark_read_end_to_end` | (rig) | s2/run-055 | 245 |  |  |
| `meetup_decline` | UNTESTED | — |  |  |  |
| `meetup_full_cycle` | UNTESTED | — |  |  |  |
| `meetup_proposal` | UNTESTED | — |  |  |  |
| `meetup_proposed_bubble_ui` | UNTESTED | — |  |  |  |
| `meetup_respond` | UNTESTED | — |  |  |  |
| `meetup_validation` | UNTESTED | — |  |  |  |
| `message_long_text` | UNTESTED | — |  |  |  |
| `offer_counter_flow` | UNTESTED | — |  |  |  |
| `offer_in_existing_thread` | UNTESTED | — |  |  |  |
| `offer_send_and_accept` | UNTESTED | — |  |  |  |
| `offer_send_and_decline` | UNTESTED | — |  |  |  |
| `quick_replies` | UNTESTED | — |  |  |  |
| `report_participant` | UNTESTED | — |  |  |  |
| `reserve_after_accept` | UNTESTED | — |  |  |  |
| `reserve_after_buyer_accepts_counter` | UNTESTED | — |  |  |  |
| `reserved_sold_dead_end_notice` | UNTESTED | — |  |  |  |
| `send_message` | PASS | run-046 | 121 |  |  |
| `send_message_double_tap` | UNTESTED | — |  |  |  |
| `send_message_empty` | FAIL-assert | run-036 | 167 |  | [Failed] send_message_empty (2m 33s) (Assertion is false: "Me" is visible) |
| `send_message_offline` | UNTESTED | — |  |  |  |
| `send_message_whitespace` | UNTESTED | — |  |  |  |
| `send_multiple_messages` | UNTESTED | — |  |  |  |
| `send_photo` | UNTESTED | — |  |  |  |
| `start_conversation` | FAIL-assert | run-046 | 133 |  | [Failed] start_conversation (1m 58s) (Assertion is false: "Ask about this item..." is visible) |
| `start_conversation_and_reply` | UNTESTED | — |  |  |  |
| `view_other_profile_from_conversation` | UNTESTED | — |  |  |  |

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

## `auth` — Sign up, login, logout, session persistence, guest gating

4/15 passing · 11 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `guest_browse` | PASS | run-013 | 111 |  |  |
| `guest_offer_redirect` | FAIL-assert | run-013 | 129 |  | [Failed] guest_offer_redirect (1m 56s) (Element not found: Text matching regex: Make an Offer) |
| `guest_save_redirect` | FAIL-assert | run-013 | 129 |  | [Failed] guest_save_redirect (1m 56s) (Element not found: Id matching regex: save-button) |
| `login` | PASS | run-046 | 153 |  |  |
| `login_deep` | FAIL-assert | run-013 | 147 |  | [Failed] login_deep (2m 15s) (Assertion is false: "Profile" is visible) |
| `login_empty_fields` | PASS | run-013 | 109 |  |  |
| `login_navigate_to_register` | FAIL-? | run-013 | 4 |  |  |
| `login_wrong_password` | FAIL-? | run-013 | 13 |  | [Failed] login_wrong_password (0s) |
| `logout` | FAIL-? | run-013 | 13 |  | [Failed] logout (0s) |
| `logout_cancel` | FAIL-? | run-013 | 13 |  | [Failed] logout_cancel (0s) |
| `register_duplicate_email` | FAIL-? | run-013 | 17 |  | [Failed] register_duplicate_email (0s) |
| `register_navigate_to_login` | FAIL-? | run-013 | 16 |  | [Failed] register_navigate_to_login (0s) |
| `session_persist` | PASS | run-046 | 177 |  |  |
| `sign_up` | FAIL-? | run-013 | 15 |  | [Failed] sign_up (0s) |
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
| `browse_dark` | UNTESTED | — |  |  |  |
| `chat_dark` | UNTESTED | — |  |  |  |
| `listing_detail_dark` | UNTESTED | — |  |  |  |
| `my_listings_dark` | UNTESTED | — |  |  |  |
| `profile_dark` | UNTESTED | — |  |  |  |
| `saved_tab_dark` | UNTESTED | — |  |  |  |
| `theme_light_all_screens` | UNTESTED | — |  |  |  |
| `theme_persists_after_navigate` | UNTESTED | — |  |  |  |

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
| `listing_create_multi_photos` | UNTESTED | — |  |  |  |
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

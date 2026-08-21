# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**7 of 218 flows passing** · 211 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 7 | green, and no backend error underneath |
| FAIL-assert | 4 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 9 | failed, cause unclear — read the log |
| UNTESTED | 197 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `chat` — Conversations, messages, offers, meetup arrangement, read state

1/41 passing · 40 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | UNTESTED | — |  |  |  |
| `block_from_conversation` | UNTESTED | — |  |  |  |
| `chat_older_messages_pagination` | UNTESTED | — |  |  |  |
| `composer_draft` | UNTESTED | — |  |  |  |
| `conversation_archive` | UNTESTED | — |  |  |  |
| `conversation_delete` | UNTESTED | — |  |  |  |
| `conversation_read_status` | UNTESTED | — |  |  |  |
| `conversations-search` | UNTESTED | — |  |  |  |
| `conversations_empty_state` | UNTESTED | — |  |  |  |
| `conversations_filter` | UNTESTED | — |  |  |  |
| `conversations_list` | UNTESTED | — |  |  |  |
| `conversations_role_filter` | UNTESTED | — |  |  |  |
| `delete_message` | UNTESTED | — |  |  |  |
| `lifecycle_from_chat` | UNTESTED | — |  |  |  |
| `mark_read` | UNTESTED | — |  |  |  |
| `mark_read_end_to_end` | UNTESTED | — |  |  |  |
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
| `send_message` | PASS | run-033 | 147 |  | [Failed] send_message (0s) |
| `send_message_double_tap` | UNTESTED | — |  |  |  |
| `send_message_empty` | FAIL-assert | run-036 | 167 |  | [Failed] send_message_empty (2m 33s) (Assertion is false: "Me" is visible) |
| `send_message_whitespace` | UNTESTED | — |  |  |  |
| `send_multiple_messages` | UNTESTED | — |  |  |  |
| `send_photo` | UNTESTED | — |  |  |  |
| `start_conversation` | UNTESTED | — |  |  |  |
| `start_conversation_and_reply` | UNTESTED | — |  |  |  |
| `view_other_profile_from_conversation` | UNTESTED | — |  |  |  |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

1/36 passing · 35 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | UNTESTED | — |  |  |  |
| `browse_listings` | PASS | run-012 | 126 |  | [Failed] browse_listings (2m 33s) (Assertion is false: "Bazaar" is visible) |
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
| `listing_detail` | UNTESTED | — |  |  |  |
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
| `seller_response_rate_badge` | UNTESTED | — |  |  |  |
| `subcategory_drilldown` | UNTESTED | — |  |  |  |
| `user_profile_empty_listings` | UNTESTED | — |  |  |  |
| `user_profile_listing_grid` | UNTESTED | — |  |  |  |
| `user_profile_stats` | UNTESTED | — |  |  |  |
| `view_mode_toggle` | UNTESTED | — |  |  |  |

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

1/36 passing · 35 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | UNTESTED | — |  |  |  |
| `create_listing_all_fields` | UNTESTED | — |  |  |  |
| `create_listing_category_search` | UNTESTED | — |  |  |  |
| `create_listing_currency_eur` | UNTESTED | — |  |  |  |
| `create_listing_currency_usd` | UNTESTED | — |  |  |  |
| `create_listing_draft_discard` | UNTESTED | — |  |  |  |
| `create_listing_draft_restore` | UNTESTED | — |  |  |  |
| `create_listing_location_picker` | UNTESTED | — |  |  |  |
| `create_listing_multi_quantity` | PASS | run-042 | 234 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_province_picker` | UNTESTED | — |  |  |  |
| `create_listing_publish_blocked` | UNTESTED | — |  |  |  |
| `create_listing_publish_direct` | UNTESTED | — |  |  |  |
| `create_listing_validation` | UNTESTED | — |  |  |  |
| `create_listing_with_condition` | UNTESTED | — |  |  |  |
| `create_listing_with_photos` | UNTESTED | — |  |  |  |
| `delete_listing` | UNTESTED | — |  |  |  |
| `draft_lifecycle` | UNTESTED | — |  |  |  |
| `edit_listing` | UNTESTED | — |  |  |  |
| `edit_listing_all_fields` | UNTESTED | — |  |  |  |
| `edit_listing_discard` | UNTESTED | — |  |  |  |
| `edit_listing_remove_photo` | UNTESTED | — |  |  |  |
| `edit_listing_reorder_photos` | UNTESTED | — |  |  |  |
| `expired_listing_badge` | UNTESTED | — |  |  |  |
| `lifecycle_publish` | UNTESTED | — |  |  |  |
| `lifecycle_reactivate` | UNTESTED | — |  |  |  |
| `lifecycle_reserve` | UNTESTED | — |  |  |  |
| `lifecycle_sold` | UNTESTED | — |  |  |  |
| `lifecycle_unpublish` | UNTESTED | — |  |  |  |
| `listing_analytics_sparkline` | UNTESTED | — |  |  |  |
| `listing_conversations_list` | UNTESTED | — |  |  |  |
| `listing_renew_flow` | UNTESTED | — |  |  |  |
| `listing_status_counts` | UNTESTED | — |  |  |  |
| `my_listing_detail_view` | UNTESTED | — |  |  |  |
| `my_listings_filter_tabs` | UNTESTED | — |  |  |  |
| `my_listings_search` | UNTESTED | — |  |  |  |
| `price_drop_after_edit` | UNTESTED | — |  |  |  |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

0/27 passing · 27 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `away_mode` | UNTESTED | — |  |  |  |
| `blocked_users` | UNTESTED | — |  |  |  |
| `change_language_dari` | UNTESTED | — |  |  |  |
| `change_language_english` | UNTESTED | — |  |  |  |
| `change_language_pashto` | UNTESTED | — |  |  |  |
| `edit_profile` | UNTESTED | — |  |  |  |
| `edit_profile_all_fields` | UNTESTED | — |  |  |  |
| `edit_profile_avatar` | UNTESTED | — |  |  |  |
| `edit_profile_bio_too_long` | UNTESTED | — |  |  |  |
| `edit_profile_province_picker_deep` | UNTESTED | — |  |  |  |
| `edit_profile_validation` | UNTESTED | — |  |  |  |
| `hidden_listings` | UNTESTED | — |  |  |  |
| `language_persists_across_tabs` | UNTESTED | — |  |  |  |
| `language_switch_all_screens` | UNTESTED | — |  |  |  |
| `profile_stats_verify` | UNTESTED | — |  |  |  |
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

3/15 passing · 12 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `guest_browse` | PASS | run-013 | 111 |  | [Failed] guest_browse (1m 32s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `guest_offer_redirect` | FAIL-assert | run-013 | 129 |  | [Failed] guest_offer_redirect (1m 31s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `guest_save_redirect` | FAIL-assert | run-013 | 129 |  | [Failed] guest_save_redirect (1m 34s) (Element not found: Text matching regex: Continue browsing) |
| `login` | PASS | run-013 | 128 |  | [Failed] login (44s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `login_deep` | FAIL-assert | run-013 | 147 |  | [Failed] login_deep (1m 40s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `login_empty_fields` | PASS | run-013 | 109 |  | [Failed] login_empty_fields (1m 40s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `login_navigate_to_register` | FAIL-? | run-013 | 4 |  | [Failed] login_navigate_to_register (1m 40s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `login_wrong_password` | FAIL-? | run-013 | 13 |  | [Failed] login_wrong_password (0s) |
| `logout` | FAIL-? | run-013 | 13 |  | [Failed] logout (1m 57s) (Assertion is false: "Sign Out" is visible) |
| `logout_cancel` | FAIL-? | run-013 | 13 |  | [Failed] logout_cancel (11s) |
| `register_duplicate_email` | FAIL-? | run-013 | 17 |  | [Failed] register_duplicate_email (0s) |
| `register_navigate_to_login` | FAIL-? | run-013 | 16 |  | [Failed] register_navigate_to_login (0s) |
| `session_persist` | FAIL-? | run-013 | 14 |  | [Failed] session_persist (1m 37s) (Assertion is false: "Welcome to Hatiwal" is visible) |
| `sign_up` | FAIL-? | run-013 | 15 |  | [Failed] sign_up (0s) |
| `sign_up_validation` | FAIL-? | run-013 | 21 |  | [Failed] sign_up_validation (0s) |

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
| `report_listing` | UNTESTED | — |  |  |  |
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

## `seller` — Seller action sheet, publish, mark reserved/sold with buyer

1/8 passing · 7 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_actions_sheet` | UNTESTED | — |  |  |  |
| `listing_conversations` | UNTESTED | — |  |  |  |
| `mark_sold_with_buyer` | UNTESTED | — |  |  |  |
| `multi_quantity_partial_sale` | PASS | run-020 | 195 | fixed | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | UNTESTED | — |  |  |  |
| `publish_success` | UNTESTED | — |  |  |  |
| `reserved_buyer` | UNTESTED | — |  |  |  |
| `save_draft` | UNTESTED | — |  |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

0/6 passing · 6 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | UNTESTED | — |  |  |  |
| `conversations_pagination` | UNTESTED | — |  |  |  |
| `filter_combined_pagination` | UNTESTED | — |  |  |  |
| `my_listings_pagination` | UNTESTED | — |  |  |  |
| `saved_pagination_deep` | UNTESTED | — |  |  |  |
| `search_pagination` | UNTESTED | — |  |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/5 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `mode_switcher` | UNTESTED | — |  |  |  |
| `seller_mode_banner_persists` | UNTESTED | — |  |  |  |
| `seller_mode_my_listings_empty` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | UNTESTED | — |  |  |  |
| `seller_views_own_listing_buyer_mode` | UNTESTED | — |  |  |  |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | UNTESTED | — |  |  |  |
| `listing_edit_add_photos` | UNTESTED | — |  |  |  |
| `listing_gallery_no_photo` | UNTESTED | — |  |  |  |
| `listing_gallery_swipe` | UNTESTED | — |  |  |  |

## `reviews` — Double-blind reviews after a sold transaction

0/3 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | UNTESTED | — |  |  |  |
| `profile_reviews_empty_state` | UNTESTED | — |  |  |  |
| `rate_buyer_after_sale` | UNTESTED | — |  |  |  |

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

## `onboarding` — First-run experience

0/1 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | FAIL-redbox | run-010 | 114 |  | [Failed] first_run (1m 39s) (Assertion is false: "Buy or sell — your choice" is visible) |

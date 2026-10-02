# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**179 of 274 flows passing** · 92 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 179 | green, and no backend error underneath |
| FAIL-assert | 85 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 4 | a red box / JS console error appeared — real app error |
| FAIL-crash | 1 | the app crashed (FATAL EXCEPTION in logcat) |
| (rig) | 3 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 2 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile — a reserved listing stays searchable + messageable, and a held batch shows its hold

29/42 passing · 12 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-561 | 174 |  |  |
| `browse_listings` | PASS | run-598 | 182 |  |  |
| `browse_sort_most_viewed` | PASS | run-561 | 134 |  |  |
| `browse_sort_nearest` | PASS | run-561 | 146 |  |  |
| `categories_hub` | PASS | run-561 | 141 |  |  |
| `clear_all_filters` | PASS | run-561 | 135 |  |  |
| `filter_active_sellers` | PASS | run-561 | 134 |  |  |
| `filter_by_category` | PASS | run-561 | 128 |  |  |
| `filter_condition` | PASS | run-561 | 130 |  |  |
| `filter_price_range` | PASS | run-561 | 134 |  |  |
| `full_marketplace_cycle` | FAIL-assert | run-561 | 246 |  | [Failed] full_marketplace_cycle (3m 57s) (Assertion is false: "Pick location on map" is visible) |
| `listing_contact_whatsapp` | PASS | run-561 | 171 |  |  |
| `listing_detail` | PASS | run-561 | 179 |  |  |
| `listing_detail_held_units_transparency` | FAIL-assert | run-561 | 150 |  | [Failed] listing_detail_held_units_transparency (2m 22s) (Assertion is false: id: stock-badge-detail is visibl |
| `listing_detail_multi_quantity` | FAIL-assert | run-561 | 204 |  | [Failed] listing_detail_multi_quantity (3m 16s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_offer` | PASS | run-561 | 159 |  |  |
| `listing_detail_offer_invalid` | PASS | run-561 | 163 |  |  |
| `listing_detail_price_drop_badge` | FAIL-assert | run-561 | 145 |  | [Failed] listing_detail_price_drop_badge (2m 16s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8 |
| `listing_detail_quantity_intent` | FAIL-assert | run-561 | 182 |  | [Failed] listing_detail_quantity_intent (2m 54s) (Assertion is false: "Phone Case Silicone Clear - Wholesale"  |
| `listing_detail_report` | PASS | run-561 | 156 |  |  |
| `listing_detail_reserved_contactable` | PASS | run-561 | 135 |  |  |
| `listing_detail_save_unsave` | FAIL-assert | run-561 | 203 |  | [Failed] listing_detail_save_unsave (3m 15s) (Assertion is false: id: listing-card is visible) |
| `listing_detail_saves_count` | FAIL-assert | run-561 | 150 |  | [Failed] listing_detail_saves_count (2m 21s) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-561 | 127 |  |  |
| `listing_detail_similar` | PASS | run-561 | 146 |  |  |
| `listing_detail_sold_recovery` | FAIL-assert | run-561 | 142 |  | [Failed] listing_detail_sold_recovery (2m 14s) (No visible element found: id: seller-profile-link) |
| `listing_detail_sold_state` | PASS | run-561 | 121 |  |  |
| `listing_detail_views_count` | PASS | run-561 | 176 |  |  |
| `not_interested` | PASS | run-561 | 127 |  |  |
| `saved_search_apply` | FAIL-assert | run-561 | 147 |  | [Failed] saved_search_apply (2m 20s) (Assertion is false: "Saved search" is visible) |
| `scroll_to_top` | PASS | run-561 | 127 |  |  |
| `search_empty_state` | FAIL-assert | run-561 | 157 |  | [Failed] search_empty_state (2m 29s) (Assertion is false: "Bazaar" is visible) |
| `search_listings` | FAIL-assert | run-561 | 186 |  | [Failed] search_listings (2m 58s) (Element not found: Text matching regex: Reset filters) |
| `search_with_filter` | PASS | run-561 | 144 |  |  |
| `seller_profile` | PASS | run-561 | 159 |  |  |
| `seller_profile_from_listing` | PASS | run-561 | 135 |  |  |
| `seller_response_rate_badge` | FAIL-assert ⟳stale | run-561 | 171 |  | [Failed] seller_response_rate_badge (2m 42s) (Assertion is false: "[0-9]+% reply rate" is visible) |
| `subcategory_drilldown` | PASS | run-561 | 139 |  |  |
| `user_profile_empty_listings` | FAIL-assert | run-561 | 138 |  | [Failed] user_profile_empty_listings (2m 10s) (No visible element found: ".*Ahmad Karimi.*") |
| `user_profile_listing_grid` | PASS | run-561 | 134 |  |  |
| `user_profile_stats` | PASS | run-561 | 127 |  |  |
| `view_mode_toggle` | PASS | run-599 | 266 |  |  |

## `chat` — Conversations, messages, offers, meetup arrangement, read state — mark-sold one-tap from the thread, place/release a hold with the buyer you're already talking to

36/51 passing · 12 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-575 | 245 |  |  |
| `block_from_conversation` | PASS | run-575 | 172 |  |  |
| `chat_older_messages_pagination` | PASS | run-575 | 158 |  |  |
| `composer_draft` | PASS | run-575 | 201 |  |  |
| `conversation_archive` | PASS | run-575 | 176 |  |  |
| `conversation_delete` | PASS | run-575 | 165 |  |  |
| `conversation_read_status` | PASS | run-575 | 190 |  |  |
| `conversations-search` | PASS | run-575 | 205 |  |  |
| `conversations_empty_state` | FAIL-assert ⟳stale | run-575 | 164 |  | [Failed] conversations_empty_state (2m 31s) (Element not found: Id matching regex: register-email-input) |
| `conversations_filter` | PASS | run-608 | 182 |  |  |
| `conversations_list` | PASS | run-607 | 193 |  |  |
| `conversations_role_filter` | PASS | run-609 | 270 |  |  |
| `dead_end_notice_absent_when_active` | PASS | run-575 | 252 |  |  |
| `dead_end_notice_sold` | FAIL-assert | run-575 | 251 |  | [Failed] dead_end_notice_sold (3m 53s) (Assertion is false: id: listing-unavailable-notice is visible) |
| `delete_message` | PASS | run-575 | 256 |  |  |
| `focus_refetch_silent` | PASS | run-590 | 203 |  |  |
| `jump_to_latest` | PASS | run-575 | 320 |  |  |
| `lifecycle_from_chat` | PASS | run-575 | 406 |  |  |
| `mark_read` | PASS | run-575 | 243 |  |  |
| `mark_read_end_to_end` | PASS | run-575 | 217 |  |  |
| `meetup_decline` | PASS | run-575 | 401 |  |  |
| `meetup_full_cycle` | FAIL-assert | run-575 | 283 |  | [Failed] meetup_full_cycle (4m 21s) (Assertion is false: "Contact Seller" is visible) |
| `meetup_proposal` | PASS | run-575 | 250 |  |  |
| `meetup_proposed_bubble_ui` | PASS | run-575 | 317 |  |  |
| `meetup_respond` | FAIL-assert | run-575 | 435 |  | [Failed] meetup_respond (6m 47s) (Element not found: Text matching regex: .*Accept.*) |
| `meetup_validation` | PASS | run-575 | 251 |  |  |
| `message_long_text` | PASS | run-575 | 277 |  |  |
| `offer_counter_flow` | FAIL-assert | run-575 | 251 |  | [Failed] offer_counter_flow (3m 57s) (Assertion is false: "Make an Offer" is visible) |
| `offer_in_existing_thread` | FAIL-assert ⟳stale | run-575 | 236 |  | [Failed] offer_in_existing_thread (3m 39s) (Assertion is false: "Send Offer" is visible) |
| `offer_quantity_round_trip` | FAIL-assert | run-575 | 293 |  | [Failed] offer_quantity_round_trip (4m 34s) (Assertion is false: "Make an Offer" is visible) |
| `offer_send_and_accept` | FAIL-assert | run-575 | 329 |  | [Failed] offer_send_and_accept (4m 54s) (Assertion is false: "Make an Offer" is visible) |
| `offer_send_and_decline` | FAIL-assert | run-575 | 271 |  | [Failed] offer_send_and_decline (4m 13s) (Assertion is false: "Make an Offer" is visible) |
| `place_and_release_hold` | PASS | run-575 | 214 |  |  |
| `quick_replies` | FAIL-assert ⟳stale | run-575 | 275 |  | [Failed] quick_replies (4m 13s) (Assertion is false: "Is this still available? Please let me know." is visible |
| `report_participant` | FAIL-assert | run-575 | 325 |  | [Failed] report_participant (4m 56s) (Assertion is false: ".*already reported.*" is visible) |
| `reserve_after_accept` | FAIL-assert | run-575 | 260 |  | [Failed] reserve_after_accept (4m 3s) (Assertion is false: "Make an Offer" is visible) |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | run-575 | 270 |  | [Failed] reserve_after_buyer_accepts_counter (4m 13s) (Assertion is false: "Make an Offer" is visible) |
| `reserved_sold_dead_end_notice` | PASS | run-575 | 428 |  |  |
| `scroll_to_latest` | PASS | run-575 | 579 |  |  |
| `send_message` | PASS | run-581 | 192 |  |  |
| `send_message_double_tap` | PASS | run-575 | 260 |  |  |
| `send_message_empty` | PASS | run-575 | 230 |  |  |
| `send_message_offline` | PASS | run-575 | 308 |  |  |
| `send_message_whitespace` | PASS | run-575 | 359 |  |  |
| `send_multiple_messages` | PASS | run-575 | 373 |  |  |
| `send_photo` | PASS | run-575 | 325 |  |  |
| `start_conversation` | FAIL-assert | run-575 | 330 |  | [Failed] start_conversation (5m 5s) (Assertion is false: "Contact Seller" is visible) |
| `start_conversation_and_reply` | PASS | run-594 | 547 |  |  |
| `support_entry_row` | PASS | run-597 | 185 |  |  |
| `unread_badge_survives_navigation` | FAIL-assert | run-575 | 444 |  | [Failed] unread_badge_survives_navigation (6m 50s) (Assertion is false: id: chat-unread-badge is not visible) |
| `view_other_profile_from_conversation` | PASS | run-575 | 248 |  |  |

## `listings` — Seller create/edit/delete + the 3-state lifecycle (Draft/Live/Sold) — Mark sold is always the one-tap primary, no Reserved tab

24/41 passing · 10 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-577 | 237 |  |  |
| `create_listing_all_fields` | FAIL-assert | run-577 | 264 |  | [Failed] create_listing_all_fields (4m 8s) (Element not found: Text matching regex: Good) |
| `create_listing_category_search` | PASS | run-577 | 179 |  |  |
| `create_listing_currency_eur` | PASS | run-559 | 169 |  |  |
| `create_listing_currency_pkr` | PASS | run-559 | 127 |  |  |
| `create_listing_currency_usd` | PASS | run-559 | 190 |  |  |
| `create_listing_draft_discard` | FAIL-assert | run-559 | 147 |  | [Failed] create_listing_draft_discard (2m 18s) (Assertion is false: "Discard changes?" is visible) |
| `create_listing_draft_restore` | FAIL-redbox | run-559 | 207 |  | [Failed] create_listing_draft_restore (3m 19s) (Element not found: Text matching regex: Save Draft) |
| `create_listing_full_publish` | PASS | run-559 | 202 |  |  |
| `create_listing_multi_quantity` | PASS | run-559 | 210 |  |  |
| `create_listing_price_edges` | PASS | run-559 | 161 |  |  |
| `create_listing_publish_blocked` | FAIL-assert ⟳stale | run-559 | 232 |  | [Failed] create_listing_publish_blocked (3m 44s) (Element not found: Id matching regex: browse-tab) |
| `create_listing_publish_direct` | PASS | run-559 | 215 |  |  |
| `create_listing_publish_requirements` | PASS | run-559 | 157 |  |  |
| `create_listing_quantity_edges` | FAIL-assert ⟳stale | run-559 | 182 |  | [Failed] create_listing_quantity_edges (2m 53s) (Assertion is false: "Enter a number between 1 and 999." is vi |
| `create_listing_title_edges` | PASS | run-559 | 175 |  |  |
| `create_listing_validation` | PASS | run-559 | 148 |  |  |
| `create_listing_with_condition` | PASS | run-559 | 359 |  |  |
| `create_listing_with_photos` | PASS | run-559 | 223 |  |  |
| `delete_listing` | PASS | run-559 | 166 |  |  |
| `draft_lifecycle` | FAIL-assert ⟳stale | run-559 | 217 |  | [Failed] draft_lifecycle (3m 29s) (Assertion is false: "Your listing is live!" is visible) |
| `edit_listing` | PASS | run-559 | 182 |  |  |
| `edit_listing_all_fields` | FAIL-assert ⟳stale | run-559 | 168 |  | [Failed] edit_listing_all_fields (2m 39s) (Element not found: Id matching regex: listing-form-price-input) |
| `edit_listing_discard` | FAIL-assert | run-559 | 152 |  | [Failed] edit_listing_discard (2m 24s) (Assertion is false: "Discard changes?" is visible) |
| `edit_listing_quantity` | FAIL-assert | run-559 | 171 |  | [Failed] edit_listing_quantity (2m 43s) (Element not found: Id matching regex: listing-form-price-input) |
| `edit_listing_remove_photo` | FAIL-assert | run-559 | 153 |  | [Failed] edit_listing_remove_photo (2m 25s) (Element not found: Id matching regex: seller-card-more-action) |
| `edit_listing_reorder_photos` | FAIL-assert | run-559 | 152 |  | [Failed] edit_listing_reorder_photos (2m 24s) (Element not found: Id matching regex: seller-card-more-action) |
| `expired_listing_badge` | PASS | run-559 | 136 |  |  |
| `lifecycle_publish` | FAIL-assert | run-559 | 158 |  | [Failed] lifecycle_publish (2m 30s) (Assertion is false: "Publish this listing?" is visible) |
| `lifecycle_reactivate` | PASS | run-559 | 179 |  |  |
| `lifecycle_reserve` | FAIL-assert | run-559 | 195 |  | [Failed] lifecycle_reserve (3m 7s) (Assertion is false: "Contact Seller" is visible) |
| `lifecycle_sold` | PASS | run-559 | 146 |  |  |
| `lifecycle_unpublish` | PASS | run-559 | 147 |  |  |
| `listing_analytics_sparkline` | FAIL-assert | run-559 | 142 |  | [Failed] listing_analytics_sparkline (2m 14s) (Assertion is false: "No views yet in the last 7 days" is visibl |
| `listing_conversations_list` | PASS | run-559 | 127 |  |  |
| `listing_renew_flow` | FAIL-assert ⟳stale | run-559 | 141 |  | [Failed] listing_renew_flow (2m 13s) (Assertion is false: "Renew" is visible) |
| `listing_status_counts` | PASS | run-559 | 137 |  |  |
| `my_listing_detail_view` | FAIL-assert ⟳stale | run-559 | 143 |  | [Failed] my_listing_detail_view (2m 16s) (Assertion is false: id: lifecycle-primary-action is visible) |
| `my_listings_filter_tabs` | PASS | run-559 | 134 |  |  |
| `my_listings_search` | PASS | run-559 | 136 |  |  |
| `price_drop_after_edit` | FAIL-assert ⟳stale | run-559 | 169 |  | [Failed] price_drop_after_edit (2m 41s) (Assertion is false: "Active" is visible) |

## `rtl` — Pashto + Dari right-to-left layout across main screens

3/14 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `_support_rtl` | UNTESTED | — |  |  |  |
| `browse_rtl_dari` | FAIL-redbox | run-586 | 527 |  | [Failed] browse_rtl_dari (8m 31s) (Element not found: Id matching regex: profile-tab) |
| `browse_rtl_pashto` | PASS | run-611 | 526 |  | Network request failed |
| `buyer_picker_rtl` | (rig) | s2/run-536 | 601 |  |  |
| `categories_hub_rtl` | PASS | s2/run-536 | 297 |  |  |
| `chat_rtl` | FAIL-redbox | run-583 | 232 |  | [Failed] chat_rtl (3m 33s) (Assertion is false: id: conversation-row-\d+ is visible) |
| `listing_detail_rtl` | FAIL-assert | s2/run-536 | 512 |  | [Failed] listing_detail_rtl (8m 18s) (Assertion is false: id: profile-tab is visible) |
| `my_listings_rtl` | (rig) | s2/run-536 | 600 |  |  |
| `profile_quick_actions_rtl` | FAIL-crash | s2/run-536 | 601 |  |  |
| `profile_rtl` | FAIL-redbox | run-584 | 477 |  | [Failed] profile_rtl (7m 40s) (Element not found: Id matching regex: profile-tab) |
| `sales_ledger_rtl` | PASS | s2/run-536 | 344 |  |  |
| `support_rtl_fa` | FAIL-assert | run-592 | 547 |  | [Failed] support_rtl_fa (8m 53s) (Assertion is false: id: support-entry-row is visible) |
| `support_rtl_ps` | FAIL-assert | run-591 | 215 |  | [Failed] support_rtl_ps (3m 17s) (Assertion is false: id: support-entry-row is visible) |
| `support_rtl_ur` | (rig) | run-593 | 601 |  |  |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

22/33 passing · 7 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert ⟳stale | run-560 | 147 |  | [Failed] account_delete_and_restore (2m 19s) (Element not found: Id matching regex: register-email-input) |
| `account_delete_cancel` | PASS | run-560 | 187 |  |  |
| `away_mode` | PASS | run-560 | 176 |  |  |
| `blocked_users` | PASS | run-560 | 142 |  |  |
| `change_language_dari` | PASS | run-617 | 186 |  |  |
| `change_language_english` | PASS | run-618 | 574 |  |  |
| `change_language_pashto` | PASS | run-603 | 205 |  |  |
| `change_language_urdu` | UNTESTED | — |  |  |  |
| `contact_support_profile` | PASS | run-589 | 178 |  |  |
| `contact_visibility` | FAIL-assert | run-560 | 483 |  | [Failed] contact_visibility (7m 55s) (Assertion is false: id: edit-profile-whatsapp-same-as-phone is not visib |
| `edit_profile` | PASS | run-560 | 139 |  |  |
| `edit_profile_all_fields` | PASS | run-560 | 220 |  |  |
| `edit_profile_avatar` | PASS | run-560 | 151 |  |  |
| `edit_profile_bio_too_long` | PASS | run-560 | 234 |  |  |
| `edit_profile_province` | PASS | run-560 | 224 |  |  |
| `edit_profile_validation` | PASS | run-560 | 165 |  |  |
| `hidden_listings` | PASS | run-560 | 162 |  |  |
| `language_persists_across_tabs` | PASS | run-560 | 229 |  |  |
| `language_switch_all_screens` | PASS | run-560 | 268 |  |  |
| `profile_stats_verify` | FAIL-assert ⟳stale | run-560 | 169 |  | [Failed] profile_stats_verify (2m 41s) (No visible element found: "Active Listings") |
| `recently_viewed` | PASS | run-560 | 151 |  |  |
| `recently_viewed_empty_state` | PASS | run-560 | 143 |  |  |
| `seller_mode_toggle` | PASS | run-560 | 155 |  |  |
| `theme_switch` | PASS | run-616 | 220 |  |  |
| `theme_switch_light` | PASS | run-615 | 207 |  |  |
| `transaction_stats_hidden_when_zero` | PASS | run-560 | 132 |  |  |
| `transaction_stats_own_profile` | FAIL-assert | run-560 | 165 |  | [Failed] transaction_stats_own_profile (2m 37s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | run-560 | 172 |  | [Failed] transaction_stats_public_profile (2m 44s) (Assertion is false: id: transaction-stats-badge is visible |
| `transaction_stats_seller_own_profile` | FAIL-assert | run-560 | 184 |  | [Failed] transaction_stats_seller_own_profile (2m 55s) (Assertion is false: "Sold" is visible) |
| `user_profile_sold_tab` | FAIL-assert ⟳stale | run-560 | 185 |  | [Failed] user_profile_sold_tab (2m 57s) (Assertion is false: "Active" is visible) |
| `view_profile` | FAIL-assert ⟳stale | run-560 | 186 |  | [Failed] view_profile (2m 58s) (Assertion is false: "Edit Profile" is visible) |
| `view_profile_error` | FAIL-assert ⚠2 | run-560 | 168 |  | [Failed] view_profile_error (2m 39s) (Assertion is false: "Switch to .*" is visible)  ||  api: AxiosError Axio |
| `view_seller_profile_from_profile` | FAIL-assert | run-560 | 164 |  | [Failed] view_seller_profile_from_profile (2m 36s) (Assertion is false: "Ahmad Karimi" is visible) |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

5/8 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | PASS | run-565 | 171 |  |  |
| `save_listing` | FAIL-assert | run-565 | 130 |  | [Failed] save_listing (2m 2s) (No visible element found: "Wool Blanket Handmade King Size") |
| `save_multiple_listings` | PASS | run-565 | 126 |  |  |
| `saved_empty_state` | PASS | run-565 | 135 |  |  |
| `saved_listing_goes_sold` | FAIL-assert | run-565 | 356 |  | [Failed] saved_listing_goes_sold (5m 48s) (Element not found: Id matching regex: seller-card-primary-action) |
| `saved_pagination` | PASS | run-565 | 159 |  |  |
| `unsave_from_browse_feed` | FAIL-assert | run-565 | 139 |  | [Failed] unsave_from_browse_feed (2m 11s) (Assertion is false: "No saved items yet" is visible) |
| `unsave_listing` | PASS | run-565 | 121 |  |  |

## `seller` — One-tap Mark sold from any live listing (never reserve-first) + the Sales ledger (edit/void a row, reviewed-sale refusal, outside-buyer rows, undo-after-sold)

6/18 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `held_quantity_refusal` | FAIL-assert ⟳stale | run-576 | 284 |  | [Failed] held_quantity_refusal (4m 28s) (Assertion is false: id: stock-badge-owner is visible) |
| `listing_actions_sheet` | FAIL-assert ⟳stale | run-576 | 303 |  | [Failed] listing_actions_sheet (4m 44s) (Element not found: Text matching regex: Electronics) |
| `listing_conversations` | FAIL-assert | run-576 | 268 |  | [Failed] listing_conversations (4m 10s) (Assertion is false: "Make an Offer" is visible) |
| `mark_sold_all_units` | PASS | run-576 | 256 |  |  |
| `mark_sold_with_buyer` | FAIL-assert | run-576 | 303 |  | [Failed] mark_sold_with_buyer (4m 30s) (Assertion is false: "How was Ahmad Karimi as a buyer?" is visible) |
| `multi_quantity_offplatform_sale` | PASS | run-576 | 249 |  |  |
| `multi_quantity_partial_sale` | FAIL-assert ⟳stale | run-576 | 251 |  | [Failed] multi_quantity_partial_sale (3m 53s) (Assertion is false: "The price for one item" is visible) |
| `publish_from_owner_detail` | FAIL-assert ⟳stale | run-576 | 324 |  | [Failed] publish_from_owner_detail (5m 5s) (Assertion is false: "Active" is visible) |
| `publish_success` | PASS | run-576 | 312 |  |  |
| `reserved_buyer` | FAIL-assert | run-576 | 245 |  | [Failed] reserved_buyer (3m 49s) (Element not found: Text matching regex: Make an Offer) |
| `sales_screen_correct_quantity` | FAIL-assert ⟳stale | run-576 | 386 |  | [Failed] sales_screen_correct_quantity (6m 3s) (Assertion is false: id: sales-tally is not visible) |
| `sales_screen_reviewed_sale_refusal` | FAIL-assert ⟳stale | run-576 | 295 |  | [Failed] sales_screen_reviewed_sale_refusal (4m 33s) (Assertion is false: ".*3 of 10 sold.*" is visible) |
| `sales_screen_void_row` | FAIL-assert ⟳stale | run-576 | 500 |  | [Failed] sales_screen_void_row (7m 11s) (Assertion is false: id: sales-tally is not visible) |
| `save_draft` | FAIL-assert ⟳stale | run-576 | 263 |  | [Failed] save_draft (4m 6s) (Element not found: Id matching regex: browse-tab) |
| `sell_without_reserving` | PASS | run-576 | 292 |  |  |
| `sold_quantity_reconciliation` | FAIL-assert ⟳stale | run-576 | 412 |  | [Failed] sold_quantity_reconciliation (6m 34s) (Assertion is false: "QA SF-M7 Reconcile Batch" is visible) |
| `undo_mark_sold` | PASS | run-576 | 307 |  |  |
| `undo_mark_sold_with_buyer` | PASS | run-576 | 210 |  |  |

## `report` — Report a listing or user, block, block side-effects

5/8 passing · 3 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | PASS | run-563 | 228 |  |  |
| `block_user` | PASS | run-563 | 186 |  |  |
| `block_user_hides_listings` | PASS | run-563 | 172 |  |  |
| `report_listing` | FAIL-assert | run-563 | 167 |  | [Failed] report_listing (2m 39s) (Element not found: Id matching regex: more-options-button) |
| `report_listing_no_reason` | FAIL-assert | run-563 | 172 |  | [Failed] report_listing_no_reason (2m 44s) (Assertion is false: "Please select a reason." is visible) |
| `report_user` | PASS | run-563 | 148 |  |  |
| `report_user_from_profile` | PASS | run-563 | 146 |  |  |
| `report_user_then_block` | FAIL-assert | run-563 | 168 |  | [Failed] report_user_then_block (2m 40s) (Assertion is false: "Unblock User" is visible) |

## `reviews` — Double-blind reviews after a sold transaction

1/3 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-assert | run-564 | 228 |  | [Failed] pending_reviews_nudge (3m 40s) (Element not found: Text matching regex: Submit review) |
| `profile_reviews_empty_state` | PASS | run-564 | 135 |  |  |
| `rate_buyer_after_sale` | FAIL-assert | run-564 | 209 |  | [Failed] rate_buyer_after_sale (3m 21s) (Assertion is false: id: seller-listing-card is visible) |

## `auth` — Sign up, login, logout, session persistence, guest gating

12/16 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | run-567 | 158 |  |  |
| `guest_browse` | PASS | run-567 | 131 |  |  |
| `guest_offer_redirect` | PASS | run-567 | 194 |  |  |
| `guest_save_redirect` | FAIL-assert | run-567 | 200 |  | [Failed] guest_save_redirect (3m 12s) (Assertion is false: "Wool Blanket Handmade King Size" is visible) |
| `login` | PASS | run-567 | 144 |  |  |
| `login_deep` | PASS | run-567 | 195 |  |  |
| `login_empty_fields` | PASS | run-567 | 118 |  |  |
| `login_navigate_to_register` | PASS | run-567 | 118 |  |  |
| `login_wrong_password` | PASS | run-567 | 126 |  |  |
| `logout` | PASS | run-567 | 187 |  |  |
| `logout_cancel` | PASS | run-567 | 182 |  |  |
| `register_duplicate_email` | FAIL-assert ⟳stale | run-567 | 144 |  | [Failed] register_duplicate_email (2m 15s) (Element not found: Id matching regex: register-email-input) |
| `register_navigate_to_login` | PASS | run-567 | 118 |  |  |
| `session_persist` | PASS | run-567 | 148 |  |  |
| `sign_up` | FAIL-assert ⟳stale | run-567 | 145 |  | [Failed] sign_up (2m 17s) (Element not found: Id matching regex: register-email-input) |
| `sign_up_validation` | FAIL-assert ⟳stale | run-567 | 177 |  | [Failed] sign_up_validation (2m 49s) (Element not found: Text matching regex: Buy and sell locally.*) |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

6/7 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | run-568 | 198 |  |  |
| `filter_map_default_kabul` | PASS | run-568 | 163 |  |  |
| `filter_map_location_denied` | PASS | run-568 | 179 |  |  |
| `filter_map_use_my_location` | PASS | run-568 | 170 |  |  |
| `filter_map_use_my_location_granted` | PASS | run-568 | 162 |  |  |
| `map_location_outside_afghanistan` | PASS | run-568 | 190 |  |  |
| `zoom_controls_not_occluded` | FAIL-assert | run-568 | 147 |  | [Failed] zoom_controls_not_occluded (2m 18s) (No visible element found: "Toyota Corolla 2016 Automatic") |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-562 | 254 |  | [Failed] listing_create_multi_photos (4m 6s) (Assertion is false: "Add Photos" is visible) |
| `listing_edit_add_photos` | PASS | run-562 | 157 |  |  |
| `listing_gallery_no_photo` | PASS | run-562 | 154 |  |  |
| `listing_gallery_swipe` | PASS | run-562 | 124 |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | run-566 | 156 |  | [Failed] seller_mode_my_listings_empty (2m 29s) (Assertion is false: "You haven't posted anything yet" is visi |
| `seller_mode_persists` | PASS | run-566 | 197 |  |  |
| `seller_mode_tab_bar_changes` | PASS | run-566 | 128 |  |  |
| `seller_views_own_listing_buyer_mode` | PASS | run-566 | 186 |  |  |

## `safety` — Safety tips on listing detail and in the meetup sheet

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | PASS | run-569 | 181 |  |  |
| `safety_tips_meetup_sheet` | FAIL-assert | run-569 | 157 |  | [Failed] safety_tips_meetup_sheet (2m 29s) (Element not found: Text matching regex: Safety tips) |

## `newfeatures` — Pakistan expansion — category search, PKR, Urdu (the CURRENT work)

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `_open_category_picker` | PASS | s2/run-550 | 311 |  |  |
| `category_search_clear_restores` | PASS | s2/run-550 | 254 |  |  |
| `category_search_empty_state` | PASS | s2/run-550 | 256 |  |  |
| `category_search_finds_subcategory` | PASS | s2/run-550 | 270 |  |  |
| `category_search_parent_still_drills` | PASS | s2/run-550 | 254 |  |  |
| `category_search_urdu_name` | PASS | s2/run-550 | 282 |  |  |

## `onboarding` — First-run experience

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | run-572 | 236 |  |  |

## `share` — Deep links into a listing and a seller profile

2/2 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | PASS | run-570 | 60 |  |  |
| `open_seller_deep_link` | PASS | run-570 | 57 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | run-600 | 187 |  |  |
| `conversations_pagination` | PASS | run-596 | 164 |  |  |
| `filter_combined_pagination` | PASS | run-571 | 130 |  |  |
| `my_listings_pagination` | PASS | run-571 | 173 |  |  |
| `saved_pagination_deep` | PASS | run-571 | 164 |  |  |
| `search_pagination` | PASS | run-571 | 178 |  |  |

## `dark_mode` — Every main screen in dark theme + theme persistence

8/8 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | PASS | run-613 | 194 |  |  |
| `chat_dark` | PASS | run-558 | 175 |  |  |
| `listing_detail_dark` | PASS | run-558 | 170 |  |  |
| `my_listings_dark` | PASS | run-558 | 200 |  |  |
| `profile_dark` | PASS | run-558 | 179 |  |  |
| `saved_tab_dark` | PASS | run-558 | 164 |  |  |
| `theme_light_all_screens` | PASS | run-558 | 186 |  |  |
| `theme_persists_after_navigate` | PASS | run-558 | 217 |  |  |

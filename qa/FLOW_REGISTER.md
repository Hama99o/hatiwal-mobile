# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**49 of 232 flows passing** · 182 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 49 | green, and no backend error underneath |
| FAIL-assert | 94 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-? | 29 | failed, cause unclear — read the log |
| (rig) | 1 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 59 | never executed |

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

12/40 passing · 20 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | FAIL-assert | run-225 | 230 |  | [Failed] create_listing (3m 32s) (Assertion is false: id: profile-tab is visible) |
| `create_listing_all_fields` | FAIL-assert ⟳stale | run-225 | 284 |  | [Failed] create_listing_all_fields (4m 23s) (Element not found: Text matching regex: USD) |
| `create_listing_category_search` | PASS | run-225 | 188 |  |  |
| `create_listing_currency_eur` | FAIL-assert ⟳stale | run-225 | 245 |  | [Failed] create_listing_currency_eur (3m 47s) (Element not found: Id matching regex: browse-tab) |
| `create_listing_currency_usd` | FAIL-assert ⟳stale | run-225 | 257 |  | [Failed] create_listing_currency_usd (3m 59s) (Assertion is false: "Your listing is live!" is visible) |
| `create_listing_draft_discard` | PASS | run-225 | 167 |  |  |
| `create_listing_draft_restore` | FAIL-assert ⟳stale | run-225 | 214 |  | [Failed] create_listing_draft_restore (3m 18s) (Element not found: Id matching regex: listing-form-description |
| `create_listing_full_publish` | PASS | run-225 | 287 |  | AxiosError |
| `create_listing_multi_quantity` | PASS | run-225 | 254 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | run-225 | 220 |  |  |
| `create_listing_publish_blocked` | FAIL-? ⟳stale | run-225 | 271 |  | [Failed] create_listing_publish_blocked (4m 12s) (No visible element found: "Tap to set exact location on map" |
| `create_listing_publish_direct` | FAIL-? | run-225 | 314 |  | [Failed] create_listing_publish_direct (4m 57s) (No visible element found: "Tap to set exact location on map") |
| `create_listing_publish_requirements` | PASS | run-225 | 209 |  |  |
| `create_listing_quantity_edges` | FAIL-assert ⟳stale | run-225 | 212 |  | [Failed] create_listing_quantity_edges (3m 16s) (Assertion is false: "1000" is visible) |
| `create_listing_title_edges` | PASS | run-225 | 245 |  |  |
| `create_listing_validation` | PASS | run-225 | 201 |  |  |
| `create_listing_with_condition` | FAIL-assert ⟳stale | run-225 | 487 |  | [Failed] create_listing_with_condition (7m 49s) (Assertion is false: "Like new" is visible) |
| `create_listing_with_photos` | PASS | run-225 | 236 |  |  |
| `delete_listing` | PASS | run-225 | 230 |  |  |
| `draft_lifecycle` | FAIL-assert ⟳stale | run-225 | 219 |  | [Failed] draft_lifecycle (3m 23s) (Assertion is false: "Your listing is live!" is visible) |
| `edit_listing` | PASS | run-225 | 232 |  |  |
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

## `chat` — Conversations, messages, offers, meetup arrangement, read state

15/42 passing · 19 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-232 | 189 |  |  |
| `block_from_conversation` | FAIL-assert ⟳stale | run-232 | 175 |  | [Failed] block_from_conversation (2m 41s) (Assertion is false: "Blocked users cannot contact you.*" is visible |
| `chat_older_messages_pagination` | PASS | run-232 | 156 |  |  |
| `composer_draft` | PASS | run-232 | 185 |  |  |
| `conversation_archive` | PASS | run-232 | 185 |  |  |
| `conversation_delete` | PASS | run-232 | 173 |  |  |
| `conversation_read_status` | FAIL-assert | run-232 | 207 |  | [Failed] conversation_read_status (3m 12s) (Assertion is false: id: unread-badge-\d+ is not visible) |
| `conversations-search` | PASS | run-232 | 246 |  |  |
| `conversations_empty_state` | FAIL-? | run-232 | 203 |  | [Failed] conversations_empty_state (3m 6s) |
| `conversations_filter` | FAIL-? | run-232 | 225 |  | [Failed] conversations_filter (3m 27s) |
| `conversations_list` | PASS | run-232 | 175 |  |  |
| `conversations_role_filter` | FAIL-assert | run-232 | 175 |  | [Failed] conversations_role_filter (2m 36s) (Assertion is false: "Mountain Bike 26-inch Steel Frame" is visibl |
| `delete_message` | PASS | run-232 | 195 |  |  |
| `lifecycle_from_chat` | FAIL-assert | run-232 | 184 |  | [Failed] lifecycle_from_chat (2m 46s) (Assertion is false: "Reserve" is visible) |
| `mark_read` | (rig) ⚠slow | run-232 | 745 |  | Exception in thread "Thread-5" java.io.IOException: Command failed (host:transport:emulator-5580): device offl |
| `mark_read_end_to_end` | FAIL-assert | run-232 | 254 |  | [Failed] mark_read_end_to_end (3m 36s) (Assertion is false: "Development Build" is not visible) |
| `meetup_decline` | FAIL-assert ⟳stale | run-232 | 238 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | FAIL-assert ⟳stale | run-232 | 204 | flow | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | FAIL-assert ⟳stale | run-232 | 222 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | FAIL-assert ⟳stale | run-232 | 210 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | FAIL-assert ⟳stale | run-232 | 176 | flow | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | FAIL-assert | run-234 | 202 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
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

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

5/29 passing · 10 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert | run-224 | 232 |  | [Failed] account_delete_and_restore (3m 32s) (Assertion is false: "Bazaar" is visible) |
| `account_delete_cancel` | PASS | run-224 | 460 |  |  |
| `away_mode` | FAIL-? ⟳stale | run-224 | 172 |  | [Failed] away_mode (2m 36s) (No visible element found: "I'm away (temporarily unavailable)") |
| `blocked_users` | PASS | run-224 | 164 |  |  |
| `change_language_dari` | FAIL-assert ⟳stale | run-224 | 188 |  | [Failed] change_language_dari (2m 53s) (Assertion is false: "دری" is visible) |
| `change_language_english` | FAIL-? ⟳stale | run-224 | 514 |  | [Failed] change_language_english (8m 19s) (No visible element found: id: language-row) |
| `change_language_pashto` | FAIL-assert ⟳stale | run-224 | 505 |  | [Failed] change_language_pashto (8m 9s) (Assertion is false: "پښتو" is visible) |
| `edit_profile` | FAIL-assert ⟳stale | run-224 | 492 |  | [Failed] edit_profile (7m 55s) (Assertion is false: "Ahmad Updated" is visible) |
| `edit_profile_all_fields` | FAIL-assert ⟳stale | run-224 | 173 |  | [Failed] edit_profile_all_fields (2m 37s) (Assertion is false: "Edit Profile" is visible) |
| `edit_profile_avatar` | FAIL-assert ⟳stale | run-224 | 237 |  | [Failed] edit_profile_avatar (3m 40s) (Assertion is false: "Gallery" is visible) |
| `edit_profile_bio_too_long` | FAIL-assert ⟳stale | run-224 | 174 |  | [Failed] edit_profile_bio_too_long (2m 38s) (Element not found: Text matching regex: Bio) |
| `edit_profile_province` | FAIL-? ⟳stale | run-224 | 181 |  | [Failed] edit_profile_province (2m 46s) (No visible element found: id: edit-profile-province-input) |
| `edit_profile_validation` | FAIL-assert ⟳stale | run-224 | 189 |  | [Failed] edit_profile_validation (2m 52s) (Assertion is false: id: profile-tab is visible) |
| `hidden_listings` | FAIL-assert ⟳stale | run-224 | 170 |  | [Failed] hidden_listings (2m 34s) (Element not found: Text matching regex: Hidden Listings) |
| `language_persists_across_tabs` | FAIL-assert ⟳stale | run-224 | 258 |  | [Failed] language_persists_across_tabs (4m 2s) (Element not found: Text matching regex: ژبه) |
| `language_switch_all_screens` | FAIL-assert ⟳stale | run-224 | 542 |  | [Failed] language_switch_all_screens (8m 44s) (Assertion is false: "پروفایل" is visible) |
| `profile_stats_verify` | FAIL-assert | run-224 | 494 |  | [Failed] profile_stats_verify (7m 57s) (Assertion is false: "Active Listings" is visible) |
| `recently_viewed` | FAIL-assert ⟳stale | run-224 | 171 |  | [Failed] recently_viewed (2m 30s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
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
| `browse_dark` | FAIL-assert | s4/run-108 | 219 |  | [Failed] browse_dark (2m 57s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-assert | s4/run-108 | 167 |  | [Failed] chat_dark (2m 21s) (Element not found: Text matching regex: Dark) |
| `listing_detail_dark` | FAIL-assert | s4/run-108 | 192 |  | [Failed] listing_detail_dark (2m 19s) (Element not found: Text matching regex: Dark) |
| `my_listings_dark` | FAIL-assert | s4/run-108 | 247 |  | [Failed] my_listings_dark (3m 40s) (Element not found: Text matching regex: Dark) |
| `profile_dark` | FAIL-assert | s4/run-108 | 166 |  | [Failed] profile_dark (2m 20s) (Element not found: Text matching regex: Dark) |
| `saved_tab_dark` | FAIL-assert | s4/run-108 | 164 |  | [Failed] saved_tab_dark (2m 19s) (Element not found: Text matching regex: Appearance) |
| `theme_light_all_screens` | FAIL-assert | s4/run-108 | 158 |  | [Failed] theme_light_all_screens (2m 14s) (Element not found: Text matching regex: Appearance) |
| `theme_persists_after_navigate` | UNTESTED | — |  |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | s2/run-156 | 114 |  | [Failed] seller_mode_my_listings_empty (1m 39s) (Element not found: Text matching regex: Sign In) |
| `seller_mode_persists` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | FAIL-assert | s2/run-156 | 172 |  | [Failed] seller_mode_tab_bar_changes (2m 34s) (Element not found: Id matching regex: mode-switcher-banner) |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | s2/run-156 | 208 |  | [Failed] seller_views_own_listing_buyer_mode (3m 11s) (Assertion is false: "Buyer Mode" is visible) |

## `seller` — Seller action sheet, publish, mark reserved/sold with buyer

0/8 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_actions_sheet` | FAIL-assert ⟳stale | run-226 | 253 |  | [Failed] listing_actions_sheet (3m 58s) (Assertion is false: "Publish" is visible) |
| `listing_conversations` | FAIL-assert ⟳stale | run-226 | 188 |  | [Failed] listing_conversations (2m 53s) (Element not found: Text matching regex: Men Winter Jacket XL Black) |
| `mark_sold_with_buyer` | FAIL-assert ⟳stale | run-226 | 206 |  | [Failed] mark_sold_with_buyer (3m 12s) (Assertion is false: "Hi, is this laptop still available?" is visible) |
| `multi_quantity_partial_sale` | FAIL-? ⟳stale | run-226 | 153 | fixed | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | FAIL-assert ⟳stale | run-226 | 235 |  | [Failed] publish_from_owner_detail (3m 40s) (Element not found: Text matching regex: More) |
| `publish_success` | FAIL-assert ⟳stale | run-226 | 310 |  | [Failed] publish_success (4m 54s) (Element not found: Text matching regex: More) |
| `reserved_buyer` | FAIL-assert | run-226 | 194 |  | [Failed] reserved_buyer (2m 56s) (Assertion is false: "Who's buying this item?" is visible) |
| `save_draft` | FAIL-assert ⟳stale | run-226 | 213 |  | [Failed] save_draft (3m 16s) (Assertion is false: "Tap to set exact location on map" is visible) |

## `reviews` — Double-blind reviews after a sold transaction

1/3 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-? | run-228 | 466 |  | [Failed] pending_reviews_nudge (7m 30s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |
| `profile_reviews_empty_state` | PASS | run-228 | 127 |  |  |
| `rate_buyer_after_sale` | FAIL-assert ⟳stale | run-228 | 242 |  | [Failed] rate_buyer_after_sale (3m 47s) (Assertion is false: "Lenovo ThinkPad Laptop Core i5 8GB" is visible) |

## `safety` — Safety tips on listing detail and in the meetup sheet

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | FAIL-assert | run-229 | 171 |  | [Failed] safety_tips_listing_detail (2m 36s) (Assertion is false: "Contact Seller" is visible) |
| `safety_tips_meetup_sheet` | PASS | run-229 | 187 |  |  |

## `share` — Deep links into a listing and a seller profile

0/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | FAIL-? | run-231 | 100 |  | [Failed] open_listing_deep_link (1m 25s) (No visible element found: id: seller-profile-link) |
| `open_seller_deep_link` | PASS ⟳stale | run-231 | 97 |  |  |

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

## `rtl` — Pashto + Dari right-to-left layout across main screens

0/8 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | FAIL-assert ⟳stale | run-227 | 201 |  | [Failed] browse_rtl_dari (3m 6s) (Assertion is false: "دری" is visible) |
| `browse_rtl_pashto` | FAIL-assert ⟳stale | run-227 | 500 |  | [Failed] browse_rtl_pashto (8m 5s) (Assertion is false: "پښتو" is visible) |
| `categories_hub_rtl` | FAIL-assert ⟳stale | run-227 | 453 |  | [Failed] categories_hub_rtl (7m 16s) (Element not found: Text matching regex: ډلې وګورئ) |
| `chat_rtl` | FAIL-assert ⟳stale | run-227 | 404 |  | [Failed] chat_rtl (6m 25s) (Assertion is false: id: profile-tab is visible) |
| `listing_detail_rtl` | FAIL-assert ⟳stale | run-227 | 512 |  | [Failed] listing_detail_rtl (8m 14s) (Assertion is false: "پلورونکي سره اړیکه" is visible) |
| `my_listings_rtl` | FAIL-assert ⟳stale | run-227 | 511 |  | [Failed] my_listings_rtl (8m 11s) (Element not found: Text matching regex: د پلورونکي حالت ته لاړ شئ) |
| `profile_quick_actions_rtl` | FAIL-? ⟳stale | run-227 | 499 |  | [Failed] profile_quick_actions_rtl (8m 1s) (No visible element found: "شخصي معلومات") |
| `profile_rtl` | FAIL-assert | run-227 | 490 |  | [Failed] profile_rtl (7m 55s) (Assertion is false: "ویرایش پروفایل" is visible) |

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

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

1/4 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert ⟳stale | run-230 | 171 |  | [Failed] listing_create_multi_photos (2m 36s) (Assertion is false: "Photos" is visible) |
| `listing_edit_add_photos` | FAIL-? ⟳stale | run-230 | 162 |  | [Failed] listing_edit_add_photos (2m 28s) (No visible element found: "Edit") |
| `listing_gallery_no_photo` | PASS | run-230 | 162 |  |  |
| `listing_gallery_swipe` | FAIL-assert ⟳stale | run-230 | 161 |  | [Failed] listing_gallery_swipe (2m 27s) (Assertion is false: "Contact Seller" is visible) |

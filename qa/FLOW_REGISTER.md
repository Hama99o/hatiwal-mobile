# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**103 of 235 flows passing** · 131 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 103 | green, and no backend error underneath |
| FAIL-assert | 74 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-? | 16 | failed, cause unclear — read the log |
| (rig) | 1 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 41 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

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
| `profile_stats_verify` | FAIL-assert | s2/run-156 | 463 | flow | Same hardcoded year. |
| `recently_viewed` | FAIL-assert | s2/run-156 | 157 |  | [Failed] recently_viewed (2m 18s) (Assertion is false: "Buy and sell locally in Afghanistan" is visible) |
| `recently_viewed_empty_state` | FAIL-assert | s2/run-156 | 160 |  | [Failed] recently_viewed_empty_state (2m 20s) (Assertion is false: "Buy and sell locally in Afghanistan" is vi |
| `seller_mode_toggle` | PASS | s2/run-156 | 187 |  |  |
| `theme_switch` | FAIL-assert | s2/run-156 | 168 |  | [Failed] theme_switch (2m 28s) (Element not found: Id matching regex: theme-option-light) |
| `transaction_stats_hidden_when_zero` | FAIL-assert | s2/run-156 | 157 |  | [Failed] transaction_stats_hidden_when_zero (2m 16s) (Assertion is false: "Buy and sell locally in Afghanistan |
| `transaction_stats_own_profile` | FAIL-assert | s2/run-156 | 183 |  | [Failed] transaction_stats_own_profile (2m 41s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | s2/run-156 | 170 |  | [Failed] transaction_stats_public_profile (2m 30s) (Assertion is false: id: transaction-stats-badge is visible |
| `transaction_stats_seller_own_profile` | PASS | s2/run-156 | 205 |  |  |
| `user_profile_sold_tab` | FAIL-? | s2/run-156 | 168 | flow | Same ${visible()} problem. |
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
| `block_prevents_message` | UNTESTED | — |  |  |  |
| `block_user` | UNTESTED | — |  |  |  |
| `block_user_hides_listings` | UNTESTED | — |  |  |  |
| `report_listing` | UNTESTED | — |  | fixture | RIG-004; also gained the duplicate-rule assertion for listings, which nothing covered. |
| `report_listing_no_reason` | UNTESTED | — |  |  |  |
| `report_user` | UNTESTED | — |  | fixture | RIG-004 part 2: retargeted to ahmad (36) so it cannot collide intra-cycle. |
| `report_user_from_profile` | UNTESTED | — |  | fixture | Retargeted to omar (37); stopped using nondeterministic listing-card index 0. |
| `report_user_then_block` | UNTESTED | — |  | fixture | Retargeted to maryam (40); now unblocks, which it never did. |

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

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

15/40 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-252 | 268 |  |  |
| `create_listing_all_fields` | FAIL-assert ⟳stale | run-252 | 260 | flow | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
| `create_listing_category_search` | PASS | run-252 | 176 |  |  |
| `create_listing_currency_eur` | FAIL-assert ⟳stale | run-252 | 224 | flow | My Shop list is virtualised, so an unrendered card is absent; now searches. Price is one node (€250.00). |
| `create_listing_currency_usd` | PASS ⟳stale | run-252 | 238 | flow | Asserted "$450" — `$` is a regex end-anchor, so it could never match. |
| `create_listing_draft_discard` | PASS | run-252 | 161 |  |  |
| `create_listing_draft_restore` | FAIL-assert ⟳stale | run-252 | 252 | flow | "Draft saved" is a toast from toast.success; a bare assert races it. Now polls. |
| `create_listing_full_publish` | PASS ⟳stale | run-252 | 247 |  | AxiosError |
| `create_listing_multi_quantity` | PASS | run-252 | 199 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | run-252 | 207 |  |  |
| `create_listing_publish_blocked` | FAIL-assert ⟳stale | run-252 | 229 | flow | Touched the form before the location sheet closed; the helper allows 45s for it. |
| `create_listing_publish_direct` | PASS ⟳stale | run-252 | 285 |  |  |
| `create_listing_publish_requirements` | PASS | run-252 | 206 |  |  |
| `create_listing_quantity_edges` | FAIL-assert ⟳stale | run-252 | 210 | flow | Field maps empty to 1, so eraseText appends. Blur-then-focus lets selectTextOnFocus replace. |
| `create_listing_title_edges` | FAIL-assert | run-252 | 446 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS | run-252 | 187 |  |  |
| `create_listing_with_condition` | FAIL-assert ⟳stale | run-252 | 469 | flow | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-252 | 276 |  |  |
| `delete_listing` | FAIL-assert ⟳stale | run-252 | 233 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert ⟳stale | run-252 | 261 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | PASS | run-252 | 227 |  |  |
| `edit_listing_all_fields` | FAIL-? ⟳stale | run-252 | 166 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | FAIL-? | run-252 | 169 | flow | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | PASS | run-252 | 211 |  |  |
| `edit_listing_remove_photo` | FAIL-assert ⟳stale | run-252 | 169 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-assert | run-252 | 171 | flow | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert | run-252 | 168 | fixture | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | FAIL-assert ⟳stale | run-252 | 176 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | FAIL-? ⟳stale | run-252 | 184 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | PASS | run-252 | 175 |  |  |
| `lifecycle_sold` | PASS | run-252 | 179 |  |  |
| `lifecycle_unpublish` | PASS | run-252 | 175 |  |  |
| `listing_analytics_sparkline` | FAIL-assert ⟳stale | run-252 | 168 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | run-252 | 161 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert | run-252 | 167 | fixture | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | FAIL-assert ⟳stale | run-252 | 182 | flow | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-? ⟳stale | run-252 | 168 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | FAIL-? ⟳stale | run-252 | 176 | flow | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | PASS | run-252 | 168 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-assert ⟳stale | run-252 | 195 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `chat` — Conversations, messages, offers, meetup arrangement, read state

22/44 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-249 | 195 |  |  |
| `block_from_conversation` | FAIL-assert ⟳stale | run-249 | 182 | app bug | UI-046 FIXED: composer stayed live after blocking; API refuses the send (403). |
| `chat_older_messages_pagination` | PASS | run-249 | 166 |  |  |
| `composer_draft` | FAIL-assert ⟳stale | run-249 | 211 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | PASS | run-249 | 186 |  |  |
| `conversation_delete` | PASS | run-249 | 167 |  |  |
| `conversation_read_status` | FAIL-assert ⟳stale | run-249 | 193 | fixture | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | run-249 | 220 |  |  |
| `conversations_empty_state` | PASS ⟳stale | run-249 | 159 |  |  |
| `conversations_filter` | FAIL-? ⟳stale | run-249 | 194 | flow | ${visible()} does not exist in Maestro's JS sandbox; raised TypeError. Regex alternation instead. |
| `conversations_list` | PASS | run-249 | 178 |  |  |
| `conversations_role_filter` | PASS | run-249 | 260 |  |  |
| `dead_end_notice_absent_when_active` | UNTESTED | — |  |  |  |
| `dead_end_notice_sold` | UNTESTED | — |  |  |  |
| `delete_message` | PASS | run-249 | 216 |  |  |
| `lifecycle_from_chat` | FAIL-assert ⟳stale | run-249 | 255 |  | [Failed] lifecycle_from_chat (4m) (Assertion is false: "Type a message..." is not visible) |
| `mark_read` | FAIL-assert ⟳stale | run-249 | 183 | fixture | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | FAIL-assert ⟳stale | run-249 | 168 | fixture | Assumed the seed left something unread; every flow that opens a thread marks it read. |
| `meetup_decline` | PASS | run-249 | 421 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | PASS | run-249 | 504 | flow | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | FAIL-? | run-249 | 31 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | PASS | run-249 | 327 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | PASS | run-249 | 430 | flow | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | PASS | run-249 | 262 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | FAIL-assert ⟳stale | run-249 | 258 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-assert ⟳stale | run-249 | 216 | flow | Tapped seller-only "Counter" as the buyer who sent the offer. Now switches to the seller. |
| `offer_in_existing_thread` | PASS | run-249 | 198 |  |  |
| `offer_send_and_accept` | PASS | run-249 | 405 |  |  |
| `offer_send_and_decline` | FAIL-assert ⟳stale | run-249 | 244 | flow | Same wrong-session bug for "Decline"; also asserted "Pending", which no offer bubble renders. |
| `quick_replies` | PASS | run-249 | 208 |  |  |
| `report_participant` | FAIL-assert ⟳stale | run-249 | 200 | fixture | RIG-004: Report is unique per reporter+target and nothing cleared them. First submit now tolerant. |
| `reserve_after_accept` | PASS | run-249 | 405 |  |  |
| `reserve_after_buyer_accepts_counter` | FAIL-? ⟳stale | run-249 | 215 | flow | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | (rig) ⟳stale ⚠slow | run-249 | 601 | flow | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `send_message` | PASS | run-249 | 171 |  |  |
| `send_message_double_tap` | PASS | run-249 | 178 |  |  |
| `send_message_empty` | PASS | run-249 | 183 |  |  |
| `send_message_offline` | FAIL-assert ⟳stale | run-249 | 189 | flow | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | run-249 | 171 |  |  |
| `send_multiple_messages` | PASS | run-249 | 206 |  |  |
| `send_photo` | FAIL-assert ⟳stale | run-249 | 218 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-? | run-249 | 162 | fixture | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | FAIL-assert | run-249 | 193 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `view_other_profile_from_conversation` | FAIL-assert ⟳stale | run-249 | 220 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

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

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

2/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert ⚠1 | run-254 | 132 | fixture | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | PASS | run-254 | 272 |  |  |
| `seller_mode_tab_bar_changes` | PASS | run-254 | 164 |  |  |
| `seller_views_own_listing_buyer_mode` | FAIL-assert ⟳stale | run-254 | 228 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

## `auth` — Sign up, login, logout, session persistence, guest gating

13/16 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | run-247 | 164 |  |  |
| `guest_browse` | PASS | run-247 | 150 |  |  |
| `guest_offer_redirect` | PASS | run-247 | 220 |  |  |
| `guest_save_redirect` | PASS | run-247 | 216 |  |  |
| `login` | PASS | run-247 | 151 |  |  |
| `login_deep` | PASS | run-247 | 220 |  |  |
| `login_empty_fields` | PASS | run-247 | 117 |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | PASS | run-247 | 115 |  |  |
| `login_wrong_password` | PASS | run-247 | 128 |  | Request failed with status code |
| `logout` | PASS | run-247 | 236 | rig | ENVIRONMENT, not the flow. run-241 aborted mid-feature: an openaleph-mobile Gradle build took the load average to 49 on 16 cores and this session's emulator died — the rig logged "CPU only 0% idle — refusing to boot" and "could not recover the emulator — aborting feature 'auth'". Re-run on a quiet machine before reading anything into it. logout is also the reference flow that showed sign-out lands on the Bazaar (see login_deep). |
| `logout_cancel` | PASS | run-247 | 234 |  |  |
| `register_duplicate_email` | PASS ⟳stale | run-247 | 161 | flow | APP IS CORRECT (422 + errors.full_messages surfaced) but the FLOW was wrong, and my first diagnosis blamed the wrong thing. Register.tsx renders each error as `<Text>{"• "}{msg}</Text>`, so the node reads "• Email has already been taken" and Maestro's anchored regex cannot match the bare literal. It would have failed on a quiet machine too — the `Refreshing…` banner in the first screenshot was real but incidental. Now asserts ".*Email has already been taken.*". |
| `register_navigate_to_login` | PASS | run-247 | 117 |  |  |
| `session_persist` | PASS | run-247 | 162 |  |  |
| `sign_up` | PASS ⟳stale | run-247 | 187 |  |  |
| `sign_up_validation` | PASS ⟳stale | run-247 | 159 |  |  |

## `onboarding` — First-run experience

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | run-255 | 220 |  |  |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

19/38 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-248 | 217 |  | AxiosError |
| `browse_listings` | PASS | run-248 | 170 |  |  |
| `browse_sort_most_viewed` | PASS | run-248 | 179 |  | AxiosError AxiosError |
| `browse_sort_nearest` | PASS ⟳stale | run-248 | 211 |  |  |
| `categories_hub` | PASS | run-248 | 198 |  |  |
| `clear_all_filters` | PASS | run-248 | 201 |  |  |
| `filter_active_sellers` | PASS | run-248 | 191 |  |  |
| `filter_by_category` | PASS | run-248 | 182 |  |  |
| `filter_condition` | PASS | run-248 | 186 |  |  |
| `filter_price_range` | PASS | run-248 | 205 |  |  |
| `full_marketplace_cycle` | FAIL-assert ⟳stale | run-248 | 544 | flow | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_detail` | PASS | run-248 | 173 |  |  |
| `listing_detail_multi_quantity` | PASS | run-248 | 185 |  |  |
| `listing_detail_offer` | FAIL-assert ⟳stale | run-248 | 205 |  | [Failed] listing_detail_offer (3m 8s) (Assertion is false: "Offer:.*" is visible) |
| `listing_detail_offer_invalid` | PASS | run-248 | 197 |  |  |
| `listing_detail_price_drop_badge` | FAIL-assert ⟳stale | run-248 | 180 |  | [Failed] listing_detail_price_drop_badge (2m 41s) (Assertion is false: "-\d+%" is visible) |
| `listing_detail_report` | FAIL-assert ⟳stale | run-248 | 195 | fixture | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_save_unsave` | FAIL-assert ⟳stale | run-248 | 193 |  | [Failed] listing_detail_save_unsave (2m 56s) (Element not found: Id matching regex: saved-tab) |
| `listing_detail_saves_count` | FAIL-assert ⟳stale | run-248 | 199 |  | [Failed] listing_detail_saves_count (3m) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-248 | 176 |  |  |
| `listing_detail_similar` | FAIL-? ⟳stale | run-248 | 182 |  | [Failed] listing_detail_similar (2m 48s) (No visible element found: "Description") |
| `listing_detail_sold_recovery` | FAIL-? ⟳stale | run-248 | 111 | flow | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | FAIL-? ⟳stale | run-248 | 110 |  | [Failed] listing_detail_sold_state (1m 35s) (No visible element found: id: seller-profile-link) |
| `listing_detail_views_count` | FAIL-assert ⟳stale | run-248 | 230 |  | [Failed] listing_detail_views_count (3m 34s) (Assertion is false: "view" is visible) |
| `not_interested` | PASS | run-248 | 163 |  |  |
| `saved_search_apply` | FAIL-assert ⟳stale | run-248 | 171 |  | [Failed] saved_search_apply (2m 36s) (Element not found: Text matching regex: Electronics) |
| `scroll_to_top` | PASS | run-248 | 166 |  |  |
| `search_empty_state` | PASS | run-248 | 165 |  |  |
| `search_listings` | PASS | run-248 | 194 |  |  |
| `search_with_filter` | FAIL-assert ⟳stale | run-248 | 190 |  | [Failed] search_with_filter (2m 54s) (Assertion is false: "Good" is visible) |
| `seller_profile` | PASS | run-248 | 191 |  |  |
| `seller_profile_from_listing` | PASS | run-248 | 195 |  |  |
| `seller_response_rate_badge` | FAIL-? ⟳stale | run-248 | 197 |  | [Failed] seller_response_rate_badge (2m 59s) (No visible element found: "Usually responds.*") |
| `subcategory_drilldown` | FAIL-assert ⟳stale | run-248 | 187 | flow | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | FAIL-assert ⟳stale | run-248 | 193 | flow | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | FAIL-assert ⟳stale | run-248 | 186 | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | FAIL-assert ⟳stale | run-248 | 189 | flow | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | PASS ⟳stale | run-248 | 199 | flow | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | run-253 | 230 |  |  |
| `filter_map_default_kabul` | PASS | run-253 | 167 |  |  |
| `filter_map_location_denied` | PASS | run-253 | 189 |  |  |
| `filter_map_use_my_location` | PASS | run-253 | 174 |  |  |
| `filter_map_use_my_location_granted` | PASS | run-253 | 163 |  |  |
| `map_location_outside_afghanistan` | PASS | run-253 | 190 |  |  |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

2/4 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert ⟳stale | run-251 | 318 | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | FAIL-assert ⟳stale | run-251 | 203 | flow | Published listing saves via common.save = "Save"; "Save Changes" is Edit Profile's. |
| `listing_gallery_no_photo` | PASS | run-251 | 192 |  |  |
| `listing_gallery_swipe` | PASS | run-251 | 153 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

5/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | run-256 | 200 |  |  |
| `conversations_pagination` | PASS | run-256 | 153 |  |  |
| `filter_combined_pagination` | FAIL-assert ⟳stale | run-256 | 168 |  | [Failed] filter_combined_pagination (2m 33s) (Element not found: Text matching regex: Electronics) |
| `my_listings_pagination` | PASS | run-256 | 218 |  |  |
| `saved_pagination_deep` | PASS | run-256 | 187 |  |  |
| `search_pagination` | PASS | run-256 | 163 |  |  |

## `dark_mode` — Every main screen in dark theme + theme persistence

6/8 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | PASS | run-250 | 174 |  |  |
| `chat_dark` | PASS | run-250 | 189 |  |  |
| `listing_detail_dark` | PASS | run-250 | 180 |  |  |
| `my_listings_dark` | PASS | run-250 | 229 |  |  |
| `profile_dark` | FAIL-? ⟳stale | run-250 | 206 | ux | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | PASS | run-250 | 186 |  |  |
| `theme_light_all_screens` | PASS | run-250 | 204 |  |  |
| `theme_persists_after_navigate` | FAIL-? ⟳stale | run-250 | 182 | ux | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

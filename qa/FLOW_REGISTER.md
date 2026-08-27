# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**101 of 235 flows passing** · 134 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 101 | green, and no backend error underneath |
| FAIL-assert | 70 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-? | 18 | failed, cause unclear — read the log |
| UNTESTED | 46 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `chat` — Conversations, messages, offers, meetup arrangement, read state

16/44 passing · 27 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | s2/run-142 | 227 |  |  |
| `block_from_conversation` | FAIL-assert | s2/run-142 | 210 | app bug | UI-046 FIXED: composer stayed live after blocking; API refuses the send (403). |
| `chat_older_messages_pagination` | FAIL-? | s2/run-142 | 193 |  | [Failed] chat_older_messages_pagination (2m 46s) (No visible element found: id: messages-list-top) |
| `composer_draft` | PASS | s2/run-142 | 228 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | PASS | s2/run-142 | 224 |  |  |
| `conversation_delete` | PASS | s2/run-142 | 215 |  |  |
| `conversation_read_status` | FAIL-assert | s2/run-142 | 226 | fixture | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | s2/run-142 | 305 |  |  |
| `conversations_empty_state` | FAIL-assert | s2/run-142 | 290 |  | [Failed] conversations_empty_state (4m 27s) (Assertion is false: "Bazaar" is visible) |
| `conversations_filter` | FAIL-? | s2/run-142 | 208 | flow | ${visible()} does not exist in Maestro's JS sandbox; raised TypeError. Regex alternation instead. |
| `conversations_list` | PASS | s2/run-142 | 198 |  |  |
| `conversations_role_filter` | PASS | s2/run-142 | 307 |  |  |
| `dead_end_notice_absent_when_active` | UNTESTED | — |  | flow — helper ran before the inbox appeared; the helper now waits (fixes 3 callers) |  |
| `dead_end_notice_sold` | UNTESTED | — |  | new flow (added 27-Aug) — conversation-row not visible; awaiting first triage pass |  |
| `delete_message` | PASS | s2/run-142 | 195 |  |  |
| `lifecycle_from_chat` | FAIL-assert | s2/run-142 | 315 | flow — toast race ("Listing marked as sold"); load-bearing wait, see audit_toasts note | [Failed] lifecycle_from_chat (4m 54s) (Assertion is false: "Reserve" is visible) |
| `mark_read` | FAIL-assert | s2/run-142 | 242 | fixture | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | FAIL-assert | s2/run-142 | 181 | flow — divider sits above the only INBOUND msg (mid-thread); virtualised list never rendered it. Now scrolls UP | Assumed the seed left something unread; every flow that opens a thread marks it read. |
| `meetup_decline` | FAIL-assert | s2/run-142 | 196 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | FAIL-assert | s2/run-142 | 192 | flow | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | PASS | s2/run-142 | 213 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | FAIL-assert | s2/run-142 | 208 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | FAIL-assert | s2/run-142 | 192 | flow | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | FAIL-assert | s2/run-142 | 156 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | FAIL-assert | s2/run-142 | 471 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-assert | s2/run-142 | 182 | flow | Tapped seller-only "Counter" as the buyer who sent the offer. Now switches to the seller. |
| `offer_in_existing_thread` | PASS | s2/run-142 | 181 |  |  |
| `offer_send_and_accept` | PASS | s2/run-142 | 400 |  |  |
| `offer_send_and_decline` | FAIL-assert | s2/run-142 | 196 | flow | Same wrong-session bug for "Decline"; also asserted "Pending", which no offer bubble renders. |
| `quick_replies` | FAIL-assert | s2/run-142 | 197 |  | [Failed] quick_replies (2m 56s) (Element not found: Text matching regex: Is this still available?) |
| `report_participant` | FAIL-assert | s2/run-142 | 223 | fixture | RIG-004: Report is unique per reporter+target and nothing cleared them. First submit now tolerant. |
| `reserve_after_accept` | FAIL-assert | s2/run-142 | 188 |  | [Failed] reserve_after_accept (2m 43s) (Element not found: Text matching regex: Make an Offer) |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | s2/run-142 | 202 | flow | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | FAIL-assert ⚠slow | s2/run-142 | 568 | flow | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `send_message` | PASS | s2/run-142 | 189 |  |  |
| `send_message_double_tap` | PASS | s2/run-142 | 209 |  |  |
| `send_message_empty` | PASS | s2/run-142 | 202 |  |  |
| `send_message_offline` | FAIL-assert ⚠1 | s2/run-142 | 245 | flow | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | s2/run-142 | 203 |  |  |
| `send_multiple_messages` | PASS | s2/run-142 | 237 |  |  |
| `send_photo` | FAIL-assert | s2/run-142 | 221 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-? | s2/run-142 | 6 | fixture | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | FAIL-? | s2/run-142 | 5 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `view_other_profile_from_conversation` | FAIL-? | s2/run-142 | 7 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

9/29 passing · 9 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert ⟳stale | run-257 | 178 |  | [Failed] account_delete_and_restore (2m 43s) (Element not found: Text matching regex: Delete account) |
| `account_delete_cancel` | PASS | run-257 | 202 |  |  |
| `away_mode` | FAIL-assert ⟳stale | run-257 | 180 | app+flow — away row was untappable (no Pressable/testID); fixed cb68fa4 (live via Metro, no rebuild) | [Failed] away_mode (2m 46s) (Assertion is false: "Away until (YYYY-MM-DD)" is visible) |
| `blocked_users` | PASS | run-257 | 170 |  |  |
| `change_language_dari` | PASS | run-257 | 175 |  |  |
| `change_language_english` | FAIL-? ⟳stale | run-257 | 543 | flow — toothless restart wait; helper+nav fixed cb68fa4 | [Failed] change_language_english (8m 47s) (No visible element found: "Sign Out") |
| `change_language_pashto` | PASS | run-257 | 181 |  |  |
| `edit_profile` | FAIL-assert ⟳stale | run-257 | 479 | stale — toast assertion already replaced by durable name check | [Failed] edit_profile (7m 44s) (Assertion is false: "Profile saved" is visible) |
| `edit_profile_all_fields` | FAIL-assert ⟳stale | run-257 | 250 | flow — same nav-bar tap; my retap guard aimed at the same dead coords. Fixed 1983b60 | [Failed] edit_profile_all_fields (3m 56s) (Element not found: Id matching regex: province-search-input) |
| `edit_profile_avatar` | PASS | run-257 | 193 |  |  |
| `edit_profile_bio_too_long` | FAIL-assert ⟳stale | run-257 | 302 | flow — 520 chars do type; error renders above viewport; now scrolls UP cb68fa4 | [Failed] edit_profile_bio_too_long (4m 47s) (Assertion is false: "Bio must be 500 characters or less" is visib |
| `edit_profile_province` | FAIL-? ⟳stale | run-257 | 269 | flow — tap landed on the NAV BAR (trigger centre y~2308 of 2400); centerElement fixes it, 1983b60 | [Failed] edit_profile_province (4m 14s) (No visible element found: "Save Changes") |
| `edit_profile_validation` | PASS ⟳stale | run-257 | 202 |  |  |
| `hidden_listings` | PASS ⟳stale | run-257 | 209 |  |  |
| `language_persists_across_tabs` | PASS | run-257 | 286 |  |  |
| `language_switch_all_screens` | FAIL-? ⟳stale | run-257 | 286 | flow — asserted Profile content while restart left app on feed; reordered cb68fa4 | [Failed] language_switch_all_screens (4m 31s) (No visible element found: "اطلاعات شخصی") |
| `profile_stats_verify` | FAIL-? | run-257 | 480 | rig — killed mid-flow (no failure reason, 7m45s); feature-timeout truncation, re-run | Same hardcoded year. |
| `recently_viewed` | FAIL-? ⟳stale | run-257 | 148 | flow+app — row had no testID; added profile-row-recently-viewed. Fixed 34e713a | [Failed] recently_viewed (2m 12s) (No visible element found: "Recently Viewed") |
| `recently_viewed_empty_state` | FAIL-assert | s2/run-156 | 160 |  | [Failed] recently_viewed_empty_state (2m 20s) (Assertion is false: "Buy and sell locally in Afghanistan" is vi |
| `seller_mode_toggle` | PASS | s2/run-156 | 187 |  |  |
| `theme_switch` | FAIL-assert | s2/run-156 | 168 |  | [Failed] theme_switch (2m 28s) (Element not found: Id matching regex: theme-option-light) |
| `transaction_stats_hidden_when_zero` | FAIL-assert | s2/run-156 | 157 |  | [Failed] transaction_stats_hidden_when_zero (2m 16s) (Assertion is false: "Buy and sell locally in Afghanistan |
| `transaction_stats_own_profile` | FAIL-assert | s2/run-156 | 183 |  | [Failed] transaction_stats_own_profile (2m 41s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | s2/run-156 | 170 | flow — vacuous assertNotVisible on the dead soldItems key; removed | [Failed] transaction_stats_public_profile (2m 30s) (Assertion is false: id: transaction-stats-badge is visible |
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

## `dark_mode` — Every main screen in dark theme + theme persistence

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | s4/run-108 | 219 |  | [Failed] browse_dark (2m 57s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-assert | s4/run-108 | 167 |  | [Failed] chat_dark (2m 21s) (Element not found: Text matching regex: Dark) |
| `listing_detail_dark` | FAIL-assert | s4/run-108 | 192 |  | [Failed] listing_detail_dark (2m 19s) (Element not found: Text matching regex: Dark) |
| `my_listings_dark` | FAIL-assert | s4/run-108 | 247 |  | [Failed] my_listings_dark (3m 40s) (Element not found: Text matching regex: Dark) |
| `profile_dark` | FAIL-assert | s4/run-108 | 166 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | FAIL-assert | s4/run-108 | 164 |  | [Failed] saved_tab_dark (2m 19s) (Element not found: Text matching regex: Appearance) |
| `theme_light_all_screens` | FAIL-assert | s4/run-108 | 158 |  | [Failed] theme_light_all_screens (2m 14s) (Element not found: Text matching regex: Appearance) |
| `theme_persists_after_navigate` | UNTESTED | — |  | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

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

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | UNTESTED | — |  | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | UNTESTED | — |  | flow | Published listing saves via common.save = "Save"; "Save Changes" is Edit Profile's. |
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

## `listings` — Seller create/edit/delete + full draft→active→reserved→sold lifecycle

12/40 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-252 | 268 |  |  |
| `create_listing_all_fields` | FAIL-assert ⟳stale | run-252 | 260 | STALE — already retargeted off tapOn "Kabul" (comment at :85 records it); awaiting re-run | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
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
| `create_listing_title_edges` | FAIL-assert ⟳stale | run-252 | 446 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS ⟳stale | run-252 | 187 |  |  |
| `create_listing_with_condition` | FAIL-assert ⟳stale | run-252 | 469 | flow | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-252 | 276 |  |  |
| `delete_listing` | FAIL-assert ⟳stale | run-252 | 233 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert ⟳stale | run-252 | 261 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | PASS ⟳stale | run-252 | 227 |  |  |
| `edit_listing_all_fields` | FAIL-? ⟳stale | run-252 | 166 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | FAIL-? | run-252 | 169 | STALE — run-252 executed the old route (commands.json proves it); already fixed | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | PASS ⟳stale | run-252 | 211 |  |  |
| `edit_listing_remove_photo` | FAIL-assert ⟳stale | run-252 | 169 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-assert ⟳stale | run-252 | 171 | flow — optional gallery tap no-opped silently; now by testID. Fixed 34e713a | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert ⟳stale | run-252 | 168 | flow — tab switch refires the request; nothing waited for the list. Fixed 34e713a | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | FAIL-assert ⟳stale | run-252 | 176 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | FAIL-? ⟳stale | run-252 | 184 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | PASS | run-252 | 175 |  |  |
| `lifecycle_sold` | PASS | run-252 | 179 |  |  |
| `lifecycle_unpublish` | PASS | run-252 | 175 |  |  |
| `listing_analytics_sparkline` | FAIL-assert ⟳stale | run-252 | 168 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | run-252 | 161 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert ⟳stale | run-252 | 167 | flow — same missing wait as expired_listing_badge. Fixed 34e713a | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | FAIL-assert ⟳stale | run-252 | 182 | flow — swipe fix already present; tab taps now by testID (SOLD badge collided). Verdict stale | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-? ⟳stale | run-252 | 168 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | FAIL-? ⟳stale | run-252 | 176 | flow — same; executed step was pre-swipe scrollUntilVisible. Verdict stale | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | PASS | run-252 | 168 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-assert ⟳stale | run-252 | 195 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

2/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert ⚠1 | run-254 | 132 | candidate — one spurious 401 logged the app out; see UI_FINDINGS, needs 2nd sighting | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | PASS | run-254 | 272 |  |  |
| `seller_mode_tab_bar_changes` | PASS | run-254 | 164 |  |  |
| `seller_views_own_listing_buyer_mode` | FAIL-assert ⟳stale | run-254 | 228 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

## `auth` — Sign up, login, logout, session persistence, guest gating

16/16 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | run-262 | 154 |  |  |
| `guest_browse` | PASS | run-262 | 134 |  |  |
| `guest_offer_redirect` | PASS | run-262 | 184 |  |  |
| `guest_save_redirect` | PASS | run-262 | 178 |  |  |
| `login` | PASS | run-262 | 143 |  |  |
| `login_deep` | PASS | run-262 | 196 |  |  |
| `login_empty_fields` | PASS | run-262 | 106 |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | PASS | run-262 | 103 |  |  |
| `login_wrong_password` | PASS | run-262 | 118 |  | Request failed with status code |
| `logout` | PASS | run-262 | 215 | rig | ENVIRONMENT, not the flow. run-241 aborted mid-feature: an openaleph-mobile Gradle build took the load average to 49 on 16 cores and this session's emulator died — the rig logged "CPU only 0% idle — refusing to boot" and "could not recover the emulator — aborting feature 'auth'". Re-run on a quiet machine before reading anything into it. logout is also the reference flow that showed sign-out lands on the Bazaar (see login_deep). |
| `logout_cancel` | PASS | run-262 | 205 |  |  |
| `register_duplicate_email` | PASS | run-262 | 136 | flow | APP IS CORRECT (422 + errors.full_messages surfaced) but the FLOW was wrong, and my first diagnosis blamed the wrong thing. Register.tsx renders each error as `<Text>{"• "}{msg}</Text>`, so the node reads "• Email has already been taken" and Maestro's anchored regex cannot match the bare literal. It would have failed on a quiet machine too — the `Refreshing…` banner in the first screenshot was real but incidental. Now asserts ".*Email has already been taken.*". |
| `register_navigate_to_login` | PASS | run-262 | 107 |  |  |
| `session_persist` | PASS | run-262 | 146 |  |  |
| `sign_up` | PASS | run-262 | 172 |  |  |
| `sign_up_validation` | PASS | run-262 | 153 |  |  |

## `onboarding` — First-run experience

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | run-255 | 220 |  |  |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile

26/38 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-263 | 207 |  | AxiosError |
| `browse_listings` | PASS | run-263 | 163 |  |  |
| `browse_sort_most_viewed` | PASS | run-263 | 172 |  | AxiosError AxiosError |
| `browse_sort_nearest` | PASS | run-263 | 195 |  |  |
| `categories_hub` | PASS | run-263 | 184 |  |  |
| `clear_all_filters` | PASS | run-263 | 189 |  |  |
| `filter_active_sellers` | PASS | run-263 | 181 |  |  |
| `filter_by_category` | PASS | run-263 | 171 |  |  |
| `filter_condition` | PASS | run-263 | 173 |  |  |
| `filter_price_range` | PASS | run-263 | 182 |  |  |
| `full_marketplace_cycle` | FAIL-assert ⟳stale ⚠slow | run-263 | 585 | flow — doubled search (missing eraseText) + inherited price filter emptied the feed; fixed | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_detail` | PASS | run-263 | 167 |  |  |
| `listing_detail_multi_quantity` | FAIL-assert ⟳stale | run-263 | 158 | flow — scroll stopped at the clipped bottom row so the price row never showed; centred. API data verified correct | [Failed] listing_detail_multi_quantity (2m 23s) (Assertion is false: "each" is visible) |
| `listing_detail_offer` | PASS | run-263 | 189 |  |  |
| `listing_detail_offer_invalid` | PASS | run-263 | 180 |  |  |
| `listing_detail_price_drop_badge` | FAIL-assert ⟳stale | run-263 | 163 | flow — asserted the drop badge on a listing with no drop; retargeted to the seeded Lenovo | [Failed] listing_detail_price_drop_badge (2m 28s) (Assertion is false: "↓\d+%" is visible) |
| `listing_detail_report` | PASS | run-263 | 171 | fixture | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_save_unsave` | FAIL-assert ⟳stale | run-263 | 234 | flow — asserted a global 'No saved items yet' it does not own; now asserts this listing is gone | [Failed] listing_detail_save_unsave (3m 38s) (Assertion is false: "No saved items yet" is visible) |
| `listing_detail_saves_count` | FAIL-assert ⟳stale | run-263 | 198 | flow — tapped the save TOGGLE blind and unsaved it, so savesCount hit 0; now state-aware | [Failed] listing_detail_saves_count (3m 1s) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-263 | 170 |  |  |
| `listing_detail_similar` | PASS | run-263 | 169 |  |  |
| `listing_detail_sold_recovery` | FAIL-? ⟳stale | run-263 | 125 | flow — cold-start deep link discarded by startup nav; waits for settle + re-fires. See UI_FINDINGS | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | FAIL-assert ⟳stale | run-263 | 117 | flow — same cold-start deep-link loss; fixed alongside sold_recovery | [Failed] listing_detail_sold_state (1m 42s) (Assertion is false: "Seller" is visible) |
| `listing_detail_views_count` | PASS | run-263 | 224 |  |  |
| `not_interested` | PASS | run-263 | 162 |  |  |
| `saved_search_apply` | FAIL-assert ⟳stale | run-263 | 180 | flow — tapped the SHEET's "Clear" after closing the sheet; now the feed's clear-filters chip | [Failed] saved_search_apply (2m 46s) (Element not found: Text matching regex: Clear) |
| `scroll_to_top` | PASS | run-263 | 161 |  |  |
| `search_empty_state` | PASS | run-263 | 176 |  |  |
| `search_listings` | PASS | run-263 | 196 |  |  |
| `search_with_filter` | PASS | run-263 | 216 |  |  |
| `seller_profile` | PASS | run-263 | 178 |  |  |
| `seller_profile_from_listing` | PASS | run-263 | 174 |  |  |
| `seller_response_rate_badge` | FAIL-? ⟳stale | run-263 | 210 | flow — anchored pattern started mid-label; badge renders "82% reply rate · Usually responds…" as one Text | [Failed] seller_response_rate_badge (3m 12s) (No visible element found: "Usually responds.*") |
| `subcategory_drilldown` | FAIL-assert ⟳stale | run-263 | 245 | flow — chip reads "Subcategory: Phones & Tablets"; the two chip asserts still said "Phones" | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | FAIL-assert ⟳stale | run-263 | 193 | flow — index 0 of a recency-ordered inbox reached Fatima (owns a listing); now targets Ahmad | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | PASS | run-263 | 165 | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | FAIL-assert ⟳stale | run-263 | 174 | flow — asserted a "Message" button the profile has never had (contact is per-listing by design) | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | PASS | run-263 | 216 | flow | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

5/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | run-253 | 230 |  |  |
| `filter_map_default_kabul` | PASS ⟳stale | run-253 | 167 |  |  |
| `filter_map_location_denied` | PASS | run-253 | 189 |  |  |
| `filter_map_use_my_location` | PASS | run-253 | 174 |  |  |
| `filter_map_use_my_location_granted` | PASS | run-253 | 163 |  |  |
| `map_location_outside_afghanistan` | PASS | run-253 | 190 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

5/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | run-256 | 200 |  |  |
| `conversations_pagination` | PASS | run-256 | 153 |  |  |
| `filter_combined_pagination` | FAIL-assert ⟳stale | run-256 | 168 | flow — assertNotVisible on dead copy (vacuous); now asserts a cross-category listing is absent | [Failed] filter_combined_pagination (2m 33s) (Element not found: Text matching regex: Electronics) |
| `my_listings_pagination` | PASS | run-256 | 218 |  |  |
| `saved_pagination_deep` | PASS | run-256 | 187 |  |  |
| `search_pagination` | PASS | run-256 | 163 |  |  |

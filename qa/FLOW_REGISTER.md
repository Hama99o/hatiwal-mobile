# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**99 of 258 flows passing** · 154 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 99 | green, and no backend error underneath |
| FAIL-assert | 95 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 18 | failed, cause unclear — read the log |
| (rig) | 5 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 40 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `listings` — Seller create/edit/delete + the 3-state lifecycle (Draft/Live/Sold) — Mark sold is always the one-tap primary, no Reserved tab

14/40 passing · 25 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-491 | 215 |  |  |
| `create_listing_all_fields` | FAIL-assert | run-492 | 217 | STALE — already retargeted off tapOn "Kabul" (comment at :85 records it); awaiting re-run | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
| `create_listing_category_search` | FAIL-assert | run-491 | 176 |  | [Failed] create_listing_category_search (2m 40s) (Assertion is false: "Electronics" is visible) |
| `create_listing_currency_eur` | FAIL-assert | run-491 | 167 | flow | My Shop list is virtualised, so an unrendered card is absent; now searches. Price is one node (€250.00). |
| `create_listing_currency_usd` | PASS | run-491 | 226 | flow | Asserted "$450" — `$` is a regex end-anchor, so it could never match. |
| `create_listing_draft_discard` | FAIL-assert | run-491 | 171 |  | [Failed] create_listing_draft_discard (2m 35s) (Assertion is false: "Discard changes?" is visible) |
| `create_listing_draft_restore` | FAIL-assert | run-491 | 208 | flow | "Draft saved" is a toast from toast.success; a bare assert races it. Now polls. |
| `create_listing_full_publish` | FAIL-assert | run-491 | 244 |  | AxiosError |
| `create_listing_multi_quantity` | FAIL-assert | run-491 | 207 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | run-491 | 199 |  |  |
| `create_listing_publish_blocked` | FAIL-assert | run-491 | 222 | flow | Touched the form before the location sheet closed; the helper allows 45s for it. |
| `create_listing_publish_direct` | PASS | run-491 | 256 |  |  |
| `create_listing_publish_requirements` | PASS | run-491 | 181 |  |  |
| `create_listing_quantity_edges` | FAIL-assert | run-491 | 204 | flow | Field maps empty to 1, so eraseText appends. Blur-then-focus lets selectTextOnFocus replace. |
| `create_listing_title_edges` | PASS | run-491 | 207 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS | run-491 | 188 |  |  |
| `create_listing_with_condition` | FAIL-assert | run-491 | 231 | flow | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-491 | 211 |  |  |
| `delete_listing` | FAIL-assert | run-491 | 180 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert | run-491 | 219 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | FAIL-assert | run-491 | 193 |  | [Failed] edit_listing (2m 55s) (Element not found: Id matching regex: listing-form-price-input) |
| `edit_listing_all_fields` | FAIL-assert | run-491 | 204 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | FAIL-assert | run-491 | 211 | STALE — run-252 executed the old route (commands.json proves it); already fixed | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | FAIL-assert | run-491 | 215 |  | [Failed] edit_listing_quantity (3m 17s) (Element not found: Id matching regex: listing-form-price-input) |
| `edit_listing_remove_photo` | FAIL-assert | run-491 | 219 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-assert | run-491 | 232 | flow — optional gallery tap no-opped silently; now by testID. Fixed 34e713a | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert | run-491 | 165 | flow — tab switch refires the request; nothing waited for the list. Fixed 34e713a | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | PASS | run-491 | 171 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | PASS | run-491 | 211 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | FAIL-assert ⟳stale | run-491 | 211 |  | [Failed] lifecycle_reserve (3m 16s) (Element not found: Text matching regex: Contact Seller) |
| `lifecycle_sold` | PASS | run-491 | 174 |  |  |
| `lifecycle_unpublish` | PASS | run-491 | 174 |  |  |
| `listing_analytics_sparkline` | FAIL-assert | run-491 | 167 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | run-491 | 153 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert | run-491 | 165 | flow — same missing wait as expired_listing_badge. Fixed 34e713a | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | FAIL-assert | run-491 | 180 | flow — swipe fix already present; tab taps now by testID (SOLD badge collided). Verdict stale | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-assert | run-491 | 165 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | PASS | run-491 | 160 | flow — same; executed step was pre-swipe scrollUntilVisible. Verdict stale | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | FAIL-assert | run-491 | 177 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-assert | run-491 | 195 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `chat` — Conversations, messages, offers, meetup arrangement, read state — mark-sold one-tap from the thread, place/release a hold with the buyer you're already talking to

20/49 passing · 23 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS ⟳stale | run-496 | 481 |  |  |
| `block_from_conversation` | FAIL-assert ⚠1 | run-496 | 169 | flow — same list race as conversation_archive (assertVisible on `conversation-row-\\d+` with no extendedWaitUntil). Its logcat also carries 2 `Network Error` lines, so timing was against it. | 2026-09-05 CAUSE FOUND, board BLK-2. The block SUCCEEDS server-side (INSERT+COMMIT in the API log; endpoint returns 204 by hand) while the app shows "Could not block user. Try again." 401s in the same window and devise rotates the token per request; http.ts clears the session on any 401. Load-sensitive: passed at 147s on a quiet host. Supersedes the older #312 note. |
| `chat_older_messages_pagination` | PASS | run-496 | 156 |  | AxiosError |
| `composer_draft` | PASS | run-496 | 256 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | FAIL-assert ⟳stale | run-496 | 192 | flow — RACE, proven from the hierarchy dump. At the failing step (step-083) the dump holds `conversations-search-bar`, `conversations-filter-chip-row` and the tab bar but ZERO `conversation-row-*`: the list had not loaded yet. The end-of-flow screenshot 3 min later shows three rows. The testID is correct and IS a template literal (ConversationRow.tsx:209, `conversation-row-${item.id}`). Fix: assertVisible -> extendedWaitUntil, the pattern chat_older_messages_pagination already uses (timeout 20000). | [Failed] conversation_archive (2m 56s) (Assertion is false: id: conversation-row-\d+ is visible) |
| `conversation_delete` | PASS | run-496 | 418 | flow | 2026-09-02: soft-DELETED its own fixture. Targeted the shared Xiaomi thread as "safe because SOLD"; the delete stamped buyer_deleted_at (09-01 17:54) so not_deleted_for hid it from the buyer for good and every later run failed. App was correct. Now owns "QA Disposable conversation_delete"; the seed clears delete/archive flags on disposable convos each run. |
| `conversation_read_status` | FAIL-assert ⚠1 | run-496 | 176 | flow — same list race as conversation_archive. 1 `Network Error` line in its logcat. | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | run-496 | 229 |  |  |
| `conversations_empty_state` | FAIL-assert | run-496 | 313 | rig/env — the app NEVER STARTED. End-of-flow screenshot is the dev-client error page: 'There was a problem loading the project' with java.net.SocketTimeoutException: failed to connect. Metro was briefly unreachable from the emulator at 14:47. Metro verified healthy afterwards (/status 200, process up 14h) and a 14:58 screenshot renders the app normally, so this was transient. `go-to-register` is NOT stale — it exists at Login.tsx:465. | [Failed] conversations_empty_state (4m 58s) (Element not found: Id matching regex: go-to-register) |
| `conversations_filter` | FAIL-assert | run-496 | 285 | rig/env — inside the 14:47-14:59 window where four flows failed consecutively; asserts `profile-tab` (a signed-in tab bar) and does not get one. 1 `Network Error` line. | 2026-09-02: asserted the "All caught up!" EMPTY state on the Unread tab, which 3 sibling flows mutate and the seed gives exactly ONE unread. Order-dependent. Now branches with runFlow: when (native in 2.7.0). |
| `conversations_list` | FAIL-assert ⚠2 | run-496 | 207 | rig/env — same window. 2 `Network Error` lines. The 'Unread' label is NOT stale (chat.json filters.unread = 'Unread', and it is visible in conversation_archive's screenshot). | [Failed] conversations_list (3m 12s) (Element not found: Text matching regex: Unread)  ||  api: AxiosError Axi |
| `conversations_role_filter` | FAIL-assert | run-496 | 173 | rig/env — same window. End-of-flow screenshot (14:58) is the LOGIN screen with an empty form and no error banner: the flow never signed in. The app itself loads fine at that point, so this is the login not sticking, not a role-filter defect. | 2026-09-02: asserted 2 listings on screen at once; they sit at positions 10-11 of a 24-thread seller inbox (the seed adds 6 badge threads at 18-22). Positive asserts now scroll. NB the assertNotVisible ones are weak by nature — filtered-out and below-the-fold are indistinguishable to Maestro; documented in the flow. |
| `dead_end_notice_absent_when_active` | FAIL-assert | run-496 | 226 | flow — login silently skipped. Asserts `profile-tab` (a signed-in tab bar) and does not get one. See _helpers/login.yaml's unguarded `when: visible: login-email-input` — no wait, so a slow login screen means the whole sign-in block is skipped and the 60s profile-tab gate can never pass. 1 `Network Error` line. | [Failed] dead_end_notice_absent_when_active (3m 31s) (Assertion is false: id: profile-tab is visible) |
| `dead_end_notice_sold` | PASS | run-496 | 209 | new flow (added 27-Aug) — conversation-row not visible; awaiting first triage pass |  |
| `delete_message` | PASS | run-496 | 168 | app+flow | 2026-09-02: failed on "Delete message" with the message sent and visible. Cause was the APP — the bubble sat behind the composer bar so the long press hit the bar and no sheet opened. Fixed structurally in 61ad571 (list ends at the bar). Flow also now waits for the sheet's animation. |
| `jump_to_latest` | FAIL-? | run-496 | 157 | flow — same login skip. Fails on `No visible element found: "Switch to .*"`, which is login.yaml's post-login mode check; it can only be reached authenticated. | 2026-09-05 "Switch to .*" was OFF-SCREEN on a scrolled profile, not missing — the app was signed in and healthy in the screenshot. ensure_buyer_mode now scrolls UP to recover it (UP matters: a previous fix used a DOWN scroll and carried the toggle further away). |
| `lifecycle_from_chat` | (rig) | run-496 | 601 | rig — no cause line recorded in the log at all (flow killed or timed out). Re-run. |  |
| `mark_read` | FAIL-assert | run-496 | 354 | flow — asserts the LOGIN tagline 'Buy and sell locally in Afghanistan' is visible and it is not. Needs its own read once the login helper is fixed; the session state it assumes is the thing currently unstable. | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | FAIL-assert | run-496 | 307 | flow — asserts "Today" (a message-list date divider) and does not get it. Downstream of the same session instability; re-run after the login helper fix before triaging further. | 2026-09-02: asserted an unread badge exists then tapped conversation-row index 0 — the newest thread, not necessarily the unread one. The divider only exists inside a thread with unread messages. Now taps unread-badge, which bubbles to its own row. |
| `meetup_decline` | PASS | run-496 | 371 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | FAIL-? ⟳stale | run-496 | 210 | flow — converted to open_listing_by_title.yaml (was failing on "Phone Case Silicone Clear - Wholesale"). | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | PASS | run-496 | 226 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | PASS | run-496 | 270 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | FAIL-assert | run-496 | 387 | flow — login SKIPPED (PENDING_RIG_FIXES fix 6). End-of-flow screenshot is the login screen with an EMPTY form and no error banner, i.e. the sign-in block never ran. `conversations-search-bar` is not stale (Conversations.tsx:554) — the Chats tab does not exist at all for a guest, so the search bar cannot be there. | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | PASS | run-496 | 244 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | PASS | run-496 | 211 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-assert | run-496 | 387 | GATE FLOW (hideKeyboard revert) — fails on `"Accept offer" is visible`, NOT the app-exit symptom, so the revert is not implicated. Copy is current (chat.json offer.accept = 'Accept offer'). Ran BEFORE fixes 6/4 landed; re-run. | 2026-09-05 scroll-to-title; searches inline and taps the card BY testID — after typing, the title is also the search input's own text, so a text tap can hit the field (flow_lint SEARCHTAP). |
| `offer_in_existing_thread` | FAIL-assert | run-496 | 216 | flow — `"Send Offer"` not visible; copy is current (listing.json detail.sendOffer). Never reached the offer sheet. Ran before fix 6; re-run. | [Failed] offer_in_existing_thread (3m 21s) (Assertion is false: "Send Offer" is visible) |
| `offer_quantity_round_trip` | FAIL-? ⟳stale | run-496 | 203 | flow — converted to open_listing_by_title.yaml (was failing on "Wool Socks Bulk Pack - 12 Pairs"). | [Failed] offer_quantity_round_trip (3m 7s) (No visible element found: "Wool Socks Bulk Pack - 12 Pairs") |
| `offer_send_and_accept` | FAIL-assert | run-496 | 187 | flow — `Make an Offer` text not found; copy is current in BOTH chat.json (offer.makeOffer) and listing.json (detail.makeOffer). Never reached the listing detail. Ran before fix 6; re-run. | 2026-09-05 scroll-to-title lost its race with a 98-listing feed (timeout had already gone 8s->20s). Now uses _helpers/open_listing_by_title.yaml, the same search sequence that keeps browse/listing_detail_held_units_transparency green. |
| `offer_send_and_decline` | FAIL-assert | run-496 | 354 | flow — ran AFTER fix 6 and still ended LOGGED OUT, but on guest BAZAAR (tab bar Bazaar/Categories/Login), not on the login screen. That is a SECOND hole, now fixed: goto_login.yaml's two `tapOn profile-tab` are both optional, so if the tab bar has not mounted they silently no-op and the helper returns from guest Bazaar. A tab-bar wait was added ahead of them. Note the loud failure worked as intended — it died at login.yaml's `assertNotVisible: "Login"`, not 60s later on something unrelated. | 2026-09-05 same scroll-to-title cause as offer_send_and_accept; wired to _helpers/open_listing_by_title.yaml. |
| `place_and_release_hold` | PASS | run-496 | 207 | PASS — first flow to run with fixes 6+4 in place. |  |
| `quick_replies` | FAIL-assert | run-496 | 228 | flow — `Is this still available?` (a quick-reply chip) not found. Needs its own look once the auth path is stable; ran before the tab-bar wait. | Exception in thread "Thread-5" java.io.IOException: Command failed (shell,v2,raw:pm list packages --user 0 dev |
| `report_participant` | FAIL-assert | run-496 | 290 | flow — asserts `.*already reported.*`, i.e. it expects a PRIOR report to exist. Fixture-order dependency, not a UI defect: whether it passes depends on whether report_user ran successfully first, and report_user failed this pass. Re-run after the auth fixes. | 2026-09-05 NOT an app bug. A Report is unique per reporter+target and one from an e2e account existed at 02:48, created AFTER that pass's 02:42 seed, so the flow's FIRST submit already took the duplicate path — and ReportSheet offers "Block this user?" from inside onSuccess, making everything after it unreachable (RIG-004). reset_e2e clears reports BETWEEN passes, which cannot help one created DURING one. FIX: delete its own report row first, or target a user no other flow reports. |
| `reserve_after_accept` | FAIL-assert | run-496 | 241 | flow-bug fixed | 2026-09-05 same scroll-to-title cause; wired to _helpers/open_listing_by_title.yaml. |
| `reserve_after_buyer_accepts_counter` | FAIL-assert | run-496 | 233 | GATE FLOW — gate SATISFIED: no app-exit symptom, app alive on browse. Its screenshot shows the IME covering the result card, i.e. it does its own search-and-tap instead of using open_listing_by_title.yaml. Convert it next (it was not converted in this batch because the chat pass was in flight when the batch was written). | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | (rig) | run-496 | 601 | flow | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `scroll_to_latest` | FAIL-assert | run-496 | 283 | app | 2026-09-03 SOLVED: the meetup sheet was drawn UNDER the Android keyboard, so Time and Propose were unreachable when the sheet opened with the IME already up — the ordinary path, which no meetup flow covered. Fixed d46c896; PASS at BOTH widths after the rebuild. Its earlier 600s timeout at 360dp was a SYMPTOM of the same bug (dead waits), not a ceiling that needed raising. |
| `send_message` | PASS | run-496 | 236 |  |  |
| `send_message_double_tap` | PASS | run-496 | 238 |  |  |
| `send_message_empty` | PASS | run-496 | 226 |  |  |
| `send_message_offline` | FAIL-assert | run-496 | 503 | flow | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | run-496 | 215 |  |  |
| `send_multiple_messages` | PASS | run-496 | 248 |  |  |
| `send_photo` | PASS | run-496 | 239 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-? | run-496 | 207 | fixture | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | PASS | run-496 | 230 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `unread_badge_survives_navigation` | FAIL-assert | run-496 | 162 |  | [Failed] unread_badge_survives_navigation (2m 28s) (Element not found: Id matching regex: conversation-action- |
| `view_other_profile_from_conversation` | PASS | run-496 | 200 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile — a reserved listing stays searchable + messageable, and a held batch shows its hold

11/42 passing · 21 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-494 | 201 |  | AxiosError |
| `browse_listings` | PASS | run-494 | 145 |  |  |
| `browse_sort_most_viewed` | FAIL-assert ⟳stale | run-494 | 155 | flow — chip strip. Labels are NOT stale (browse.json still has sort.mostViewed/nearest, FilterSheet SORT_OPTIONS renders 5 chips in a horizontal ScrollView). The blind `repeat 6x swipe 85%->20% @74%/68%` is not scrolling that strip at all: 6 iterations move ~2800dp, five chips need ~200. Replace with scrollUntilVisible direction:RIGHT. NOT yet verified on device. | AxiosError AxiosError |
| `browse_sort_nearest` | FAIL-assert ⟳stale | run-494 | 152 | flow — same chip strip as browse_sort_most_viewed. Extra wrinkle: `nearest` is NOT in SORT_OPTIONS; it is a separate chip (FilterSheet:409) that acquires location on tap, so it may also need a location fixture. | [Failed] browse_sort_nearest (2m 19s) (Assertion is false: "Nearest first" is visible) |
| `categories_hub` | PASS | run-494 | 156 |  |  |
| `clear_all_filters` | PASS | run-494 | 159 |  |  |
| `filter_active_sellers` | PASS | run-494 | 148 |  |  |
| `filter_by_category` | PASS | run-494 | 144 |  |  |
| `filter_condition` | PASS | run-494 | 149 |  |  |
| `filter_price_range` | PASS | run-494 | 159 |  |  |
| `full_marketplace_cycle` | FAIL-assert | run-494 | 532 | flow — doubled search (missing eraseText) + inherited price filter emptied the feed; fixed | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_contact_whatsapp` | FAIL-? | run-494 | 231 |  | [Failed] listing_contact_whatsapp (3m 31s) (No visible element found: id: seller-phone-reveal-button) |
| `listing_detail` | FAIL-? ⟳stale | run-494 | 201 | flow — converted to open_listing_by_title.yaml (search instead of scrolling a ~98-listing feed). Helper is proven in run-496 via reserve_after_accept. | [Failed] listing_detail (3m 4s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_held_units_transparency` | FAIL-assert ⟳stale | run-494 | 226 | REVERT CONFIRMED — no longer exits the app (run-494 fails on `listing-card` not visible, not the Android home screen). The hideKeyboard->drag revert worked here. Remaining failure is the scroll race. | [Failed] listing_detail_held_units_transparency (3m 29s) (Assertion is false: id: listing-card is visible) |
| `listing_detail_multi_quantity` | FAIL-assert | run-494 | 222 | flow — scroll stopped at the clipped bottom row so the price row never showed; centred. API data verified correct | [Failed] listing_detail_multi_quantity (3m 21s) (Assertion is false: "AFN.*" is visible) |
| `listing_detail_offer` | FAIL-? ⟳stale | run-494 | 549 | flow — converted to open_listing_by_title.yaml. | [Failed] listing_detail_offer (8m 46s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_offer_invalid` | (rig) | run-494 | 602 |  |  |
| `listing_detail_price_drop_badge` | FAIL-? | run-494 | 241 | flow — scroll race (Lenovo ThinkPad Laptop Core i5 8GB). Gated on open_listing_by_title rollout. | [Failed] listing_detail_price_drop_badge (3m 34s) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8 |
| `listing_detail_quantity_intent` | FAIL-? ⟳stale | run-494 | 283 | flow — both listing opens converted to open_listing_by_title.yaml. | [Failed] listing_detail_quantity_intent (3m 57s) (No visible element found: "Phone Case Silicone Clear - Whole |
| `listing_detail_report` | FAIL-? ⟳stale | run-494 | 223 | flow — converted to open_listing_by_title.yaml. | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_reserved_contactable` | PASS | run-494 | 165 |  |  |
| `listing_detail_save_unsave` | FAIL-? ⟳stale | run-494 | 151 | flow — CORRECTED DIAGNOSIS. Not a scroll-length problem: this flow calls the opener straight after login.yaml, and login.yaml ENDS ON THE PROFILE SCREEN (its last steps are ensure_english + ensure_buyer_mode, both working the profile's mode toggle). So the feed was never on screen and no scroll timeout could have helped. Now uses open_listing_by_title.yaml, which reaches the Bazaar feed itself. | [Failed] listing_detail_save_unsave (2m 18s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_saves_count` | FAIL-assert | run-494 | 178 | flow — tapped the save TOGGLE blind and unsaved it, so savesCount hit 0; now state-aware | [Failed] listing_detail_saves_count (2m 44s) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-494 | 156 |  |  |
| `listing_detail_similar` | FAIL-? | run-494 | 180 |  | [Failed] listing_detail_similar (2m 44s) |
| `listing_detail_sold_recovery` | (rig) | run-494 |  | rig — 'emulator died and could not be rebooted'. Host disk was 98% full and swap exhausted; pruned 2026-09-05. Re-run. | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | UNTESTED | — |  | flow — same cold-start deep-link loss; fixed alongside sold_recovery |  |
| `listing_detail_views_count` | UNTESTED | — |  |  |  |
| `not_interested` | UNTESTED | — |  |  |  |
| `saved_search_apply` | UNTESTED | — |  | flow — tapped the SHEET's "Clear" after closing the sheet; now the feed's clear-filters chip |  |
| `scroll_to_top` | UNTESTED | — |  |  |  |
| `search_empty_state` | UNTESTED | — |  |  |  |
| `search_listings` | UNTESTED | — |  |  |  |
| `search_with_filter` | UNTESTED | — |  |  |  |
| `seller_profile` | UNTESTED | — |  |  |  |
| `seller_profile_from_listing` | PASS | s2/run-141 | 237 |  |  |
| `seller_response_rate_badge` | UNTESTED | — |  | flow — anchored pattern started mid-label; badge renders "82% reply rate · Usually responds…" as one Text |  |
| `subcategory_drilldown` | UNTESTED | — |  | flow — chip reads "Subcategory: Phones & Tablets"; the two chip asserts still said "Phones" | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | UNTESTED | — |  | flow — index 0 of a recency-ordered inbox reached Fatima (owns a listing); now targets Ahmad | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | UNTESTED | — |  | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | UNTESTED | — |  | flow — asserted a "Message" button the profile has never had (contact is per-listing by design) | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | UNTESTED | — |  | REVERT CONFIRMED — PASSED in run-494 after the hideKeyboard->drag revert. | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

14/30 passing · 14 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-assert | run-493 | 171 |  | [Failed] account_delete_and_restore (2m 37s) (Element not found: Id matching regex: register-email-input) |
| `account_delete_cancel` | FAIL-? | run-493 | 217 |  | [Failed] account_delete_cancel (3m 18s) (No visible element found: "Delete account") |
| `away_mode` | PASS | run-493 | 239 | app+flow — away row was untappable (no Pressable/testID); fixed cb68fa4 (live via Metro, no rebuild) |  |
| `blocked_users` | PASS | run-493 | 179 |  |  |
| `change_language_dari` | FAIL-assert | run-493 | 186 |  | [Failed] change_language_dari (2m 46s) (Assertion is false: id: language-option-en is visible) |
| `change_language_english` | PASS | run-493 | 278 | flow — toothless restart wait; helper+nav fixed cb68fa4 |  |
| `change_language_pashto` | FAIL-assert | run-493 | 174 |  | [Failed] change_language_pashto (2m 35s) (Assertion is false: "Language" is visible) |
| `contact_visibility` | FAIL-assert | run-493 | 215 | flow | 2026-09-03: the failing assertion named the copied number but the cause was navigation. hideKeyboard is a Back press and popped Edit Profile to Profile; the next THREE commands reported COMPLETED against a stale hierarchy, so the assertNotVisible before it passed for the WRONG reason. Replaced with pressKey:Enter, which turned out to SUBMIT the form — both removed. Green at 360dp once the keypress was gone; now unstable again from my keyboardDismissMode=on-drag reflowing the form mid-scroll (board #313). NOT an app bug. |
| `edit_profile` | PASS | run-493 | 183 | stale — toast assertion already replaced by durable name check |  |
| `edit_profile_all_fields` | FAIL-assert | run-493 | 309 | flow+app | 2026-09-03: FOUR causes, two of them app bugs. (1) asserted text 'Save' on a button reading 'Save Changes'; (2) centerElement on the sticky save button; (3) APP — the sticky Save sat BEHIND the keyboard (d8edc9e), verified visually at 360dp; (4) APP — the keyboard swallowed the tap on the NEXT field, so 'UpdatedLast' landed in the First Name box (e36a6b4, keyboardDismissMode=on-drag). Also a pre-existing viewport assumption on the final derived-city assertion (no scroll). MY OWN regressions along the way: a pressKey:Enter that SUBMITTED the form (608ddda, reverted) and a scrollUntilVisible that is a no-op when the target is already 'visible'. Flow-side stability still open — board #313. |
| `edit_profile_avatar` | FAIL-assert | run-493 | 213 |  | [Failed] edit_profile_avatar (3m 15s) (Assertion is false: id: avatar-picker is visible) |
| `edit_profile_bio_too_long` | PASS | run-493 | 341 | flow — 520 chars do type; error renders above viewport; now scrolls UP cb68fa4 |  |
| `edit_profile_province` | FAIL-assert | run-493 | 276 | flow | 2026-09-02: DOWN + centerElement:true on profile-edit-button, which sits near the TOP of Profile — DOWN scrolls away from it and centring is impossible with too little content above. ORDER-DEPENDENT (siblings passed on the identical block). Now UP + visibilityPercentage 40, applied to all 8 flows carrying it. |
| `edit_profile_validation` | PASS | run-493 | 215 |  |  |
| `hidden_listings` | PASS | run-493 | 216 |  |  |
| `language_persists_across_tabs` | PASS | run-493 | 336 |  |  |
| `language_switch_all_screens` | PASS | run-493 | 387 | flow — asserted Profile content while restart left app on feed; reordered cb68fa4 |  |
| `profile_stats_verify` | FAIL-assert ⟳stale | run-493 | 205 | rig — killed mid-flow (no failure reason, 7m45s); feature-timeout truncation, re-run | Same hardcoded year. |
| `recently_viewed` | PASS | run-493 | 190 | flow+app — row had no testID; added profile-row-recently-viewed. Fixed 34e713a |  |
| `recently_viewed_empty_state` | PASS | run-493 | 176 |  |  |
| `seller_mode_toggle` | PASS | run-493 | 193 |  |  |
| `theme_switch` | FAIL-assert ⟳stale | run-493 | 214 |  | [Failed] theme_switch (3m 17s) (Element not found: Id matching regex: theme-option-light) |
| `transaction_stats_hidden_when_zero` | PASS | run-493 | 161 |  |  |
| `transaction_stats_own_profile` | FAIL-assert | run-493 | 204 |  | [Failed] transaction_stats_own_profile (3m 7s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | run-493 | 205 | flow — vacuous assertNotVisible on the dead soldItems key; removed | [Failed] transaction_stats_public_profile (3m 8s) (Assertion is false: id: transaction-stats-badge is visible) |
| `transaction_stats_seller_own_profile` | FAIL-assert | run-493 | 211 |  | [Failed] transaction_stats_seller_own_profile (3m 15s) (Assertion is false: "Sold" is visible) |
| `user_profile_sold_tab` | FAIL-assert | run-493 | 211 | flow | Same ${visible()} problem. |
| `view_profile` | FAIL-assert | run-493 | 208 |  | [Failed] view_profile (3m 11s) (Assertion is false: "Language" is visible) |
| `view_profile_error` | PASS | run-493 | 201 |  | AxiosError |
| `view_seller_profile_from_profile` | FAIL-assert | run-493 | 194 |  | [Failed] view_seller_profile_from_profile (2m 59s) (Assertion is false: "Ahmad Karimi" is visible) |

## `seller` — One-tap Mark sold from any live listing (never reserve-first) + the Sales ledger (edit/void a row, reviewed-sale refusal, outside-buyer rows, undo-after-sold)

5/18 passing · 13 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `held_quantity_refusal` | FAIL-assert | run-497 | 253 | flow — "Winter Gloves Wholesale Box - 15 Pairs" not visible. That listing IS live (API: status=active, seller Omar Noori). Same scroll/wrong-screen family as the flows converted in 4e44fc0; convert it to open_listing_by_title.yaml next. | [Failed] held_quantity_refusal (4m) (Assertion is false: "Winter Gloves Wholesale Box - 15 Pairs" is visible) |
| `listing_actions_sheet` | FAIL-assert | run-497 | 257 | flow — `Element not found: Id matching regex: browse-tab`, i.e. NO TAB BAR: the flow is standing on a pushed screen. _helpers/pop_to_tab_bar.yaml exists for exactly this and its header notes audit_structure found five flows doing it. Add that helper before the tab tap. | [Failed] listing_actions_sheet (3m 59s) (Element not found: Id matching regex: browse-tab) |
| `listing_conversations` | FAIL-assert | run-497 | 222 | flow — IDENTITY-SWITCH bug, same as reserved_buyer: login.yaml as the buyer, then "Make an Offer" missing on a seller-owned active negotiable listing. Fixed at the helper (profile-tab wait before the wrong-account check). | 2026-09-05 same IME cause. Its note claimed scrollUntilVisible dismisses the keyboard — true only if it scrolls, and it is a NO-OP when the target is already visible, which after a filtering search it always is. Dead scroll removed, margin drag used instead (Back is unsafe here — it exited the app once). |
| `mark_sold_all_units` | PASS | run-497 | 210 |  |  |
| `mark_sold_with_buyer` | PASS | run-497 | 181 |  |  |
| `multi_quantity_offplatform_sale` | FAIL-? | run-497 | 166 | flow — "QA Disposable offplatform_units" not visible. A DISPOSABLE fixture, so check it was actually seeded for this pass before treating it as a UI defect. | [Failed] multi_quantity_offplatform_sale (2m 32s) (No visible element found: "QA Disposable offplatform_units" |
| `multi_quantity_partial_sale` | FAIL-assert | run-497 | 237 | flow — "The price for one item" not visible. Copy check needed in all 3 locales before triaging further. | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | FAIL-assert | run-497 | 271 | flow — "Publish this listing?" not visible (the publish confirm). Needs its own read; no Network Error, so not the auth family. | [Failed] publish_from_owner_detail (4m 18s) (Assertion is false: "Publish this listing?" is visible) |
| `publish_success` | FAIL-assert | run-497 | 226 | flow — "Pick location on map" not visible. Likely the create-listing form's location step; no Network Error. | 2026-09-05 title asserted while the detail screen was scrolled past it; guarded UP scroll added. |
| `reserved_buyer` | FAIL-assert | run-497 | 219 | GATE FLOW — gate satisfied (no app-exit symptom). Failure is the IDENTITY-SWITCH bug: it logs in via login.yaml as the buyer, opens a seller-owned listing and finds no "Make an Offer". The API says that listing is status=active, negotiable=true, seller="Omar Noori", and listingAvailability.ts requires a non-owner buyer to get the Message/Offer row — so the app was the OWNER. Root cause found and fixed: login.yaml's whole wrong-account check was gated on `when: visible: profile-tab` with no wait, so a tab bar still mounting skipped it. SEPARATELY, note this flow targets a RESERVED listing in its later legs: canOfferOnListing excludes `reserved` by design (SF-M3 §3.2), so any assertion of "Make an Offer" on a reserved listing is a flow bug regardless — check that before re-running. | 2026-09-05 the IME covered the search result; the card tap landed on the keyboard (Maestro reports covered taps COMPLETED) so the app never left BROWSE and the failure surfaced later on 'Make an Offer'. hideKeyboard added after typing. |
| `sales_screen_correct_quantity` | FAIL-assert | run-497 | 325 |  | [Failed] sales_screen_correct_quantity (5m 11s) (Assertion is false: id: sales-tally is not visible) |
| `sales_screen_reviewed_sale_refusal` | FAIL-assert | run-497 | 171 | flow — `seller-card-more-action` not found; the testID IS current (SellerListingCard.tsx:464), so this is a reach/timing failure, not selector rot. Ran AFTER the identity fix and shows no wrong-account signature. | [Failed] sales_screen_reviewed_sale_refusal (2m 37s) (Element not found: Id matching regex: seller-card-more-a |
| `sales_screen_void_row` | PASS | run-497 | 317 |  |  |
| `save_draft` | FAIL-assert | run-497 | 233 | flow — asserts "Create Listing" and does not get it; the copy IS current (listing.json `create` = "Create Listing"). Reach/timing, not stale copy. Post-identity-fix. | [Failed] save_draft (3m 40s) (Assertion is false: "Create Listing" is visible) |
| `sell_without_reserving` | PASS | run-497 | 262 |  |  |
| `sold_quantity_reconciliation` | FAIL-assert | run-497 | 298 | flow — `listing-form-quantity-reopen-note` not visible; testID IS current (ListingForm.tsx:1688). Reach/timing. Post-identity-fix. | [Failed] sold_quantity_reconciliation (4m 43s) (Assertion is false: id: listing-form-quantity-reopen-note is v |
| `undo_mark_sold` | FAIL-assert | run-497 | 231 | flow — `location-confirm` not visible; testID IS current (LocationRangePicker.tsx:470). Reach/timing — the location sheet had not opened or had not rendered. Post-identity-fix. | [Failed] undo_mark_sold (3m 38s) (Assertion is false: id: location-confirm is visible) |
| `undo_mark_sold_with_buyer` | PASS | run-497 | 190 |  |  |

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

## `dark_mode` — Every main screen in dark theme + theme persistence

0/8 passing · 8 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | FAIL-assert | s4/run-108 | 219 |  | [Failed] browse_dark (2m 57s) (Assertion is false: "APPEARANCE" is visible) |
| `chat_dark` | FAIL-assert | s4/run-108 | 167 |  | [Failed] chat_dark (2m 21s) (Element not found: Text matching regex: Dark) |
| `listing_detail_dark` | FAIL-assert | s4/run-108 | 192 |  | [Failed] listing_detail_dark (2m 19s) (Element not found: Text matching regex: Dark) |
| `my_listings_dark` | FAIL-assert | s4/run-108 | 247 | MY REGRESSION — restart helper waited for listing-card; seller mode returns to seller-listing-card. Fixed | [Failed] my_listings_dark (3m 40s) (Element not found: Text matching regex: Dark) |
| `profile_dark` | FAIL-assert | s4/run-108 | 166 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | FAIL-assert | s4/run-108 | 164 |  | [Failed] saved_tab_dark (2m 19s) (Element not found: Text matching regex: Appearance) |
| `theme_light_all_screens` | FAIL-assert | s4/run-108 | 158 |  | [Failed] theme_light_all_screens (2m 14s) (Element not found: Text matching regex: Appearance) |
| `theme_persists_after_navigate` | UNTESTED | — |  | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

## `report` — Report a listing or user, block, block side-effects

1/8 passing · 7 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | UNTESTED | — |  |  |  |
| `block_user` | FAIL-? | run-495 | 0 |  |  |
| `block_user_hides_listings` | PASS | run-495 | 262 | PASS, but its logcat carries one `Network Error` line — worth watching, not a defect on its own. |  |
| `report_listing` | FAIL-? | run-495 | 360 | rig — no cause line and its end-of-flow screenshot is a CORRUPT PNG (PIL: cannot identify image file), i.e. the flow was killed mid-screenshot. Re-run. | RIG-004; also gained the duplicate-rule assertion for listings, which nothing covered. |
| `report_listing_no_reason` | FAIL-assert | run-495 | 239 | rig — same auth/timing family as report_user (asserts `profile-tab`, i.e. a signed-in tab bar, and does not get one). No Network Error in its own logcat, so re-run before triaging further. | [Failed] report_listing_no_reason (3m 39s) (Assertion is false: id: profile-tab is visible) |
| `report_user` | FAIL-assert | run-495 | 232 | rig/env — login never completed. Screenshot is the LOGIN screen showing 'No connection. Check your internet and try again.' and the logcat carries `Network Error` against http://10.0.2.2:3007/api/v1. API verified healthy from the host (200 on listings and sign_in) and the emulator reaches the host (ping 0% loss), so this was a transient timeout — the driver started this pass while host load was ~13. NOT evidence about the hideKeyboard revert either way. | RIG-004 part 2: retargeted to ahmad (36) so it cannot collide intra-cycle. |
| `report_user_from_profile` | FAIL-? | run-495 | 588 | rig — never opened the listing. The result card (Honda CG 125 Motorbike 2021) is rendered in the screenshot and the flow failed on `seller-profile-link` without tapping it. Also shows the inputText character drop: field holds '5 Motorbike 2021', leading 'Honda CG 12' dropped. open_listing_by_title.yaml's wait-on-listing-card + tap-by-testID is the pattern that fixes this. | Retargeted to omar (37); stopped using nondeterministic listing-card index 0. |
| `report_user_then_block` | FAIL-? | run-495 | 186 | rig — ran UNAUTHENTICATED. The end-of-flow screenshot's tab bar reads Bazaar / Categories / Login, so `seller-profile-link` (which DOES exist, ListingDetail.tsx:797) was never reachable. Also shows the inputText character drop: the search field holds 'nch 4K Smart TV' — the leading 'Sony 55 i' was dropped. | Retargeted to maryam (40); now unblocks, which it never did. |

## `rtl` — Pashto + Dari right-to-left layout across main screens

2/10 passing · 7 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | PASS | s2/run-495 | 313 |  |  |
| `browse_rtl_pashto` | PASS | s2/run-495 | 517 |  |  |
| `buyer_picker_rtl` | (rig) | s2/run-495 | 601 |  |  |
| `categories_hub_rtl` | UNTESTED | — |  | flow | 2026-09-02: tapped text "Back" in a flow whose whole purpose is Pashto. The app renders no literal "Back" — BackButton has accessibilityLabel t(common.goBack) (ps شاته ځه) and testID back_button. Now targets the testID. |
| `chat_rtl` | UNTESTED | — |  | flow? | 2026-09-02: expects ps common.send "لیږل", present verbatim. Same language-revert hypothesis as profile_rtl. |
| `listing_detail_rtl` | UNTESTED | — |  |  |  |
| `my_listings_rtl` | UNTESTED | — |  |  |  |
| `profile_quick_actions_rtl` | UNTESTED | — |  | flow | 2026-09-02 SOLVED, flow bug, b20007e: the language-revert hypothesis was WRONG, and so was the mode-toggle one. Profile.tsx:306 renders this row as `${t('…myListings')} (${count})`, so the text is 'زما اعلانونه (0)' and Maestro's anchored regex could not match the bare label — the three sibling labels carry no suffix, which is why only this row failed. run-379's screenshot shows Profile correctly in seller mode (green tab bar, three tabs, saved-tab gone). Matched as a prefix now. NOT an app bug. |
| `profile_rtl` | UNTESTED | — |  | flow? | 2026-09-02: expects fa profile.editProfile "ویرایش پروفایل", which EXISTS verbatim in the locale file — so not a stale selector. Hypothesis: the language-revert bug (fixed 8097ab3) left the app in English after the switch, so no translated string could match. Re-running on a build with that fix. |
| `sales_ledger_rtl` | UNTESTED | — |  |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

0/4 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | s2/run-156 | 114 | candidate — one spurious 401 logged the app out; see UI_FINDINGS, needs 2nd sighting | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | UNTESTED | — |  |  |  |
| `seller_mode_tab_bar_changes` | FAIL-assert | s2/run-156 | 172 |  | [Failed] seller_mode_tab_bar_changes (2m 34s) (Element not found: Id matching regex: mode-switcher-banner) |
| `seller_views_own_listing_buyer_mode` | FAIL-assert | s2/run-156 | 208 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

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
| `first_run` | FAIL-redbox | s2/run-156 | 127 |  | [Failed] first_run (1m 47s) (Assertion is false: "Buy or sell — your choice" is visible) |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

2/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | PASS | s2/run-286 | 283 | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | PASS ⟳stale | s2/run-286 | 165 | flow | 2026-09-02: never scrolled to its own Save button, which adding a photo pushes below the fold — the rule this file's own header states. Now scrolls at visibilityPercentage 40. |
| `listing_gallery_no_photo` | FAIL-assert | s2/run-286 | 197 |  | [Failed] listing_gallery_no_photo (3m 6s) (Assertion is false: "No photo" is visible) |
| `listing_gallery_swipe` | PASS | s2/run-286 | 147 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

5/6 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | s2/run-156 | 151 |  |  |
| `conversations_pagination` | PASS | s2/run-156 | 138 |  |  |
| `filter_combined_pagination` | FAIL-assert | s2/run-156 | 155 | flow — assertNotVisible on dead copy (vacuous); now asserts a cross-category listing is absent | [Failed] filter_combined_pagination (2m 20s) (Element not found: Text matching regex: Electronics) |
| `my_listings_pagination` | PASS | s2/run-156 | 202 |  |  |
| `saved_pagination_deep` | PASS | s2/run-156 | 147 |  |  |
| `search_pagination` | PASS | s2/run-156 | 161 |  |  |

## `auth` — Sign up, login, logout, session persistence, guest gating

16/16 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | s2/run-285 | 140 |  |  |
| `guest_browse` | PASS | s2/run-285 | 102 |  |  |
| `guest_offer_redirect` | PASS | s2/run-285 | 157 |  |  |
| `guest_save_redirect` | PASS | s2/run-285 | 158 |  |  |
| `login` | PASS | s2/run-285 | 119 |  |  |
| `login_deep` | PASS | s2/run-285 | 183 |  |  |
| `login_empty_fields` | PASS | s2/run-285 | 93 |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | PASS | s2/run-285 | 89 |  |  |
| `login_wrong_password` | PASS | s2/run-285 | 100 |  | Request failed with status code |
| `logout` | PASS | s2/run-285 | 196 | rig | ENVIRONMENT, not the flow. run-241 aborted mid-feature: an openaleph-mobile Gradle build took the load average to 49 on 16 cores and this session's emulator died — the rig logged "CPU only 0% idle — refusing to boot" and "could not recover the emulator — aborting feature 'auth'". Re-run on a quiet machine before reading anything into it. logout is also the reference flow that showed sign-out lands on the Bazaar (see login_deep). |
| `logout_cancel` | PASS | s2/run-285 | 194 |  |  |
| `register_duplicate_email` | PASS | s2/run-285 | 119 | flow | APP IS CORRECT (422 + errors.full_messages surfaced) but the FLOW was wrong, and my first diagnosis blamed the wrong thing. Register.tsx renders each error as `<Text>{"• "}{msg}</Text>`, so the node reads "• Email has already been taken" and Maestro's anchored regex cannot match the bare literal. It would have failed on a quiet machine too — the `Refreshing…` banner in the first screenshot was real but incidental. Now asserts ".*Email has already been taken.*". |
| `register_navigate_to_login` | PASS | s2/run-285 | 92 |  |  |
| `session_persist` | PASS | s2/run-285 | 121 |  |  |
| `sign_up` | PASS | s2/run-285 | 150 |  |  |
| `sign_up_validation` | PASS | s2/run-285 | 132 |  |  |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

7/7 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | s2/run-285 | 195 |  |  |
| `filter_map_default_kabul` | PASS | s2/run-285 | 140 |  |  |
| `filter_map_location_denied` | PASS | s2/run-285 | 159 |  |  |
| `filter_map_use_my_location` | PASS | s2/run-285 | 149 |  |  |
| `filter_map_use_my_location_granted` | PASS | s2/run-285 | 144 |  |  |
| `map_location_outside_afghanistan` | PASS | s2/run-285 | 160 |  |  |
| `zoom_controls_not_occluded` | PASS | s2/run-285 | 175 |  |  |

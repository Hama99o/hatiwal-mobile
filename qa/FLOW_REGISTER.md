# Hatiwal Mobile — Flow Register

The QA board for every Maestro flow in the app. **Regenerated** by
`./qa/qa.sh register` after each run.

> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real
> run data every time. The **`Triage`** and **`Notes`** columns are yours —
> they are parsed back out of this file and preserved. Put your verdict in
> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.

## Progress

**142 of 258 flows passing** · 109 still need attention

| Status | Count | Meaning |
|---|---:|---|
| PASS | 142 | green, and no backend error underneath |
| FAIL-assert | 72 | an assertion failed — real bug OR a stale selector, triage it |
| FAIL-redbox | 1 | a red box / JS console error appeared — real app error |
| FAIL-? | 34 | failed, cause unclear — read the log |
| (rig) | 7 | rig broke mid-run — result meaningless, re-run |
| UNTESTED | 2 | never executed |

### Definition of done

Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the
screen looked correct while the request failed, which is precisely the
bug class a user reports as "nothing happened".

## Flows

## `listings` — Seller create/edit/delete + the 3-state lifecycle (Draft/Live/Sold) — Mark sold is always the one-tap primary, no Reserved tab

21/40 passing · 19 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing` | PASS | run-517 | 222 |  |  |
| `create_listing_all_fields` | FAIL-assert | run-517 | 202 | STALE — already retargeted off tapOn "Kabul" (comment at :85 records it); awaiting re-run | Leftover map steps opened the map, breaking set_listing_location's own scroll; helper does it. |
| `create_listing_category_search` | PASS | run-517 | 170 |  |  |
| `create_listing_currency_eur` | FAIL-assert | run-517 | 175 | flow | My Shop list is virtualised, so an unrendered card is absent; now searches. Price is one node (€250.00). |
| `create_listing_currency_usd` | PASS | run-517 | 225 | flow | Asserted "$450" — `$` is a regex end-anchor, so it could never match. |
| `create_listing_draft_discard` | PASS | run-517 | 158 |  |  |
| `create_listing_draft_restore` | FAIL-assert | run-517 | 209 | flow | "Draft saved" is a toast from toast.success; a bare assert races it. Now polls. |
| `create_listing_full_publish` | PASS | run-517 | 237 |  | AxiosError |
| `create_listing_multi_quantity` | FAIL-assert | run-517 | 204 | fixed | Found UI-011 (HIGH): quantity never reached the API on create/edit — typed 15, stored 1, because both multipart builders are field-by-field allow-lists that never appended it. Also UI-012: the toggle row's label was inert (only the 44x24 switch responded) and the shared Switch had no testID, so no flow could target any switch in the app. Flow needed: a leaf category (Electronics is a parent and leaves the picker over the form), no hide-keyboard on a dirty form (Android BACK → "Discard changes?"), and Save Draft tapped in the fixed toolbar rather than after a keyboard dance. run-042 green; DB confirms qty=15 multi=true. |
| `create_listing_price_edges` | PASS | run-517 | 193 |  |  |
| `create_listing_publish_blocked` | FAIL-assert | run-517 | 221 | flow | Touched the form before the location sheet closed; the helper allows 45s for it. |
| `create_listing_publish_direct` | PASS | run-517 | 248 |  |  |
| `create_listing_publish_requirements` | PASS | run-517 | 190 |  |  |
| `create_listing_quantity_edges` | FAIL-assert | run-517 | 204 | flow | Field maps empty to 1, so eraseText appends. Blur-then-focus lets selectTextOnFocus replace. |
| `create_listing_title_edges` | PASS | run-517 | 206 | env | Login gate timed out at 60s under host load; flow never ran its own steps. |
| `create_listing_validation` | PASS | run-517 | 177 |  |  |
| `create_listing_with_condition` | FAIL-assert | run-517 | 453 | flow | Tapped a title sitting in the search box, so the tap hit the input. Card testID now. |
| `create_listing_with_photos` | PASS | run-517 | 214 |  |  |
| `delete_listing` | PASS | run-517 | 196 | flow | Toast unwaitable: onDeleted does router.replace, so it fires on a dying screen. Asserts the outcome. |
| `draft_lifecycle` | FAIL-assert | run-517 | 251 | flow | Never confirmed the native publish dialog; now via confirm_dialog (android:id/button1). |
| `edit_listing` | PASS | run-517 | 212 |  |  |
| `edit_listing_all_fields` | FAIL-assert | run-517 | 180 | flow | Reached for lifecycle-more-action (detail-only) from the list. Card ⋮ route now. |
| `edit_listing_discard` | PASS | run-517 | 167 | STALE — run-252 executed the old route (commands.json proves it); already fixed | Same detail-control-from-the-list mistake; identical opening in four flows. |
| `edit_listing_quantity` | PASS | run-517 | 231 |  |  |
| `edit_listing_remove_photo` | FAIL-assert | run-517 | 202 | flow | Phantom "Remove" confirm (removePhoto has no dialog); also needed a photo to exist. |
| `edit_listing_reorder_photos` | FAIL-assert | run-517 | 233 | flow — optional gallery tap no-opped silently; now by testID. Fixed 34e713a | HOLLOW: one tap only selects. Now two taps, asserts the hint clears, attaches 2 photos. |
| `expired_listing_badge` | FAIL-assert | run-517 | 169 | flow — tab switch refires the request; nothing waited for the list. Fixed 34e713a | No expired listing existed at all; expires_at was never seeded. Fixture added. |
| `lifecycle_publish` | FAIL-assert | run-517 | 189 | fixture | Draft tab index 0 was a photoless QA draft, so publish was blocked. Seeded "Ready To Publish Draft". |
| `lifecycle_reactivate` | PASS | run-517 | 215 | flow | Detail control with the card sheet already open; sheet offers listing-action-activate. |
| `lifecycle_reserve` | FAIL-assert | run-517 | 226 |  | [Failed] lifecycle_reserve (3m 31s) (Element not found: Text matching regex: Contact Seller) |
| `lifecycle_sold` | PASS | run-517 | 179 |  |  |
| `lifecycle_unpublish` | PASS | run-517 | 179 |  |  |
| `listing_analytics_sparkline` | FAIL-assert | run-517 | 174 | flow | Analytics does not render for a draft ({!isDraft}); needed the Active tab, not just a scroll. |
| `listing_conversations_list` | PASS | run-517 | 157 | flow | Tapped "chats"; the card renders "{{count}} chats". |
| `listing_renew_flow` | FAIL-assert | run-517 | 169 | flow — same missing wait as expired_listing_badge. Fixed 34e713a | Needed the expired fixture; nothing to renew before it existed. |
| `listing_status_counts` | FAIL-assert | run-517 | 192 | flow — swipe fix already present; tab taps now by testID (SOLD badge collided). Verdict stale | "Sold" is the last tab in a horizontal scroller; scrollUntilVisible swipes at screen centre. |
| `my_listing_detail_view` | FAIL-assert | run-517 | 172 | flow | Same draft-gated analytics; Active tab first. |
| `my_listings_filter_tabs` | PASS | run-517 | 168 | flow — same; executed step was pre-swipe scrollUntilVisible. Verdict stale | Same clipped last tab; coordinate swipe across the row. |
| `my_listings_search` | PASS | run-517 | 163 | flow | Asserted a bare "No"; now asserts the absence of cards instead of empty-state copy. |
| `price_drop_after_edit` | FAIL-assert | run-517 | 200 | flow | hideKeyboard is Back and popped the edit form — first of the five sites the handbook predicted. |

## `chat` — Conversations, messages, offers, meetup arrangement, read state — mark-sold one-tap from the thread, place/release a hold with the buyer you're already talking to

27/49 passing · 16 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `archive_conversation` | PASS | run-521 | 242 | PASS on a quiet box (run-523) — confirms the extendedWaitUntil-before-conversation-row fix. |  |
| `block_from_conversation` | PASS | run-521 | 175 | CANDIDATE APP BUG (not filed — mechanism unproven). On a QUIET pass (run-523, 188s, zero SUSPECT/rig_fail) the unblock SUCCEEDED — step-081 asserted the "User unblocked" toast — and step-082's hierarchy still shows "You can't message this user." with NO composer. Server verified clean at that moment: GET /blocks returns {"users":[]} and 0 of 8 conversations are flagged blocked, so the unblock committed and blockedWithParticipant is correctly false. Mechanism candidate: unblockMutation.onSuccess sets blockedByMe false then calls load() EXACTLY ONCE with no retry; isBlocked is re-derived only from that single fetch (Conversation.tsx:565), so if it races the commit the banner stays up until the user navigates away. Cannot be proven from the artifacts — the logcat does not record API traffic. TO CONFIRM: re-run and, on failure, navigate out of the thread and back; if the composer returns, the single-shot refetch is the bug. | 2026-09-05 CAUSE FOUND, board BLK-2. The block SUCCEEDS server-side (INSERT+COMMIT in the API log; endpoint returns 204 by hand) while the app shows "Could not block user. Try again." 401s in the same window and devise rotates the token per request; http.ts clears the session on any 401. Load-sensitive: passed at 147s on a quiet host. Supersedes the older #312 note. |
| `chat_older_messages_pagination` | PASS | run-521 | 166 |  | AxiosError |
| `composer_draft` | PASS | run-521 | 192 | flow | Tapped a title that was sitting in the search box, so the tap hit the input. |
| `conversation_archive` | PASS | run-521 | 173 | PASS on a quiet box (run-523) — confirms the extendedWaitUntil-before-conversation-row fix; this is the flow whose hierarchy dump originally proved the list had not loaded. |  |
| `conversation_delete` | PASS | run-521 | 159 | flow/fixture — "QA Disposable conversation_delete" not visible. A DISPOSABLE fixture that this flow consumes, so check it was seeded for THIS pass before treating it as a UI defect; kind=unknown, not app_bug_or_flow. | 2026-09-02: soft-DELETED its own fixture. Targeted the shared Xiaomi thread as "safe because SOLD"; the delete stamped buyer_deleted_at (09-01 17:54) so not_deleted_for hid it from the buyer for good and every later run failed. App was correct. Now owns "QA Disposable conversation_delete"; the seed clears delete/archive flags on disposable convos each run. |
| `conversation_read_status` | PASS | run-521 | 181 | flow — same list race as conversation_archive. 1 `Network Error` line in its logcat. | mark_unread needs an INBOUND message; index 0 was QA debris with none. Pinned via helper. |
| `conversations-search` | PASS | run-521 | 204 |  | AxiosError |
| `conversations_empty_state` | FAIL-assert | run-521 | 172 | flow — `register-email-input` not found, but it IS current (Register.tsx:232), so this is a reach/timing failure: the flow never got to the Register screen. Needs its own read; ran on a QUIET pass (176s, no SUSPECT/rig_fail) so the result is trustworthy. | [Failed] conversations_empty_state (2m 36s) (Element not found: Id matching regex: register-email-input) |
| `conversations_filter` | PASS | run-521 | 226 | rig/env — inside the 14:47-14:59 window where four flows failed consecutively; asserts `profile-tab` (a signed-in tab bar) and does not get one. 1 `Network Error` line. | 2026-09-02: asserted the "All caught up!" EMPTY state on the Unread tab, which 3 sibling flows mutate and the seed gives exactly ONE unread. Order-dependent. Now branches with runFlow: when (native in 2.7.0). |
| `conversations_list` | PASS | run-521 | 164 | rig/env — same window. 2 `Network Error` lines. The 'Unread' label is NOT stale (chat.json filters.unread = 'Unread', and it is visible in conversation_archive's screenshot). |  |
| `conversations_role_filter` | FAIL-assert | run-521 | 221 | flow — FIXED. `role-chip-selling` is NOT stale: Conversations.tsx renders testID={`role-chip-${key}`} and line 704 branches on key === "selling". It was simply OFF SCREEN — run-523's screenshot shows the row at 360dp as "All · Unread · Read · Buying ›", and assertVisible is a claim about what is ON SCREEN. Added scrollUntilVisible direction:RIGHT before the assert (a no-op where the chip is already in view). Same shape as browse_sort_most_viewed / browse_sort_nearest. | 2026-09-02: asserted 2 listings on screen at once; they sit at positions 10-11 of a 24-thread seller inbox (the seed adds 6 badge threads at 18-22). Positive asserts now scroll. NB the assertNotVisible ones are weak by nature — filtered-out and below-the-fold are indistinguishable to Maestro; documented in the flow. |
| `dead_end_notice_absent_when_active` | PASS | run-521 | 227 | flow — login silently skipped. Asserts `profile-tab` (a signed-in tab bar) and does not get one. See _helpers/login.yaml's unguarded `when: visible: login-email-input` — no wait, so a slow login screen means the whole sign-in block is skipped and the 60s profile-tab gate can never pass. 1 `Network Error` line. |  |
| `dead_end_notice_sold` | FAIL-assert | run-521 | 244 | NOT an app bug — verified end to end, and the notice was RIGHT to be absent. The fixture is correct (conversation 1775, listing "Xiaomi Redmi Note 11 128GB", API says status=sold), and showUnavailableNotice (threadAvailability.ts:59) requires viewerKnown && !isOwner && !listingDeleted && status==="sold". The failing term is !isOwner: the end-of-flow screenshot shows the OTHER participant as "A" (Ahmad Karimi, the buyer), so the viewer was the SELLER, and the composer is present — exactly an owner's view. The notice is deliberately never shown to the listing's own seller. This flow logs in via login.yaml (buyer), so it is another instance of the WRONG-ACCOUNT family (see 7d84539), not a UI defect. The thread was also EMPTY ("No messages yet"), so check it opened the intended Xiaomi conversation. | [Failed] dead_end_notice_sold (3m 48s) (Assertion is false: id: listing-unavailable-notice is visible) |
| `delete_message` | PASS | run-521 | 244 | app+flow | 2026-09-02: failed on "Delete message" with the message sent and visible. Cause was the APP — the bubble sat behind the composer bar so the long press hit the bar and no sheet opened. Fixed structurally in 61ad571 (list ends at the bar). Flow also now waits for the sheet's animation. |
| `jump_to_latest` | PASS | run-521 | 310 | flow — same login skip. Fails on `No visible element found: "Switch to .*"`, which is login.yaml's post-login mode check; it can only be reached authenticated. | 2026-09-05 "Switch to .*" was OFF-SCREEN on a scrolled profile, not missing — the app was signed in and healthy in the screenshot. ensure_buyer_mode now scrolls UP to recover it (UP matters: a previous fix used a DOWN scroll and carried the toggle further away). |
| `lifecycle_from_chat` | PASS | run-521 | 349 | rig — no cause line recorded in the log at all (flow killed or timed out). Re-run. |  |
| `mark_read` | PASS | run-521 | 226 | flow — asserts the LOGIN tagline 'Buy and sell locally in Afghanistan' is visible and it is not. Needs its own read once the login helper is fixed; the session state it assumes is the thing currently unstable. | Same unrepliable-thread trap. |
| `mark_read_end_to_end` | FAIL-assert | run-521 | 215 | flow — asserts the "Today" date divider, which only exists once the thread HAS messages. Sibling dead_end_notice_sold landed in an EMPTY thread ("No messages yet") in this same pass, so check the conversation it opens actually has messages before treating this as a read-state defect. Quiet pass (224s, zero SUSPECT/rig_fail), so the result itself is trustworthy. | 2026-09-02: asserted an unread badge exists then tapped conversation-row index 0 — the newest thread, not necessarily the unread one. The divider only exists inside a thread with unread messages. Now taps unread-badge, which bubbles to its own row. |
| `meetup_decline` | PASS | run-521 | 405 | flow | reload-corrupted in run-232, AND a real defect underneath: it tapped Decline on a proposal nothing seeds (grep meetup in e2e.rb = 0), and Decline needs `!isMine`. Now two-party via _helpers/propose_meetup. 1bdaa76 |
| `meetup_full_cycle` | FAIL-assert | run-521 | 257 | flow — converted to open_listing_by_title.yaml (was failing on "Phone Case Silicone Clear - Wholesale"). | reload-corrupted in run-232, AND a real defect underneath: it relaunched as the same user and tried to accept its OWN bubble, which `!isMine` (MessageBubble.tsx) forbids. Now switches to the seller. 1bdaa76 |
| `meetup_proposal` | PASS | run-521 | 259 | flow | CONFIRMED reload artefact — its logcat carries `Destroying ReactContext`: I saved a src/ file mid-run and the dev client reloaded. No app or flow defect known. Submit is now by ID anyway (the label swaps to "Sending…"). 1bdaa76 919aeb2 |
| `meetup_proposed_bubble_ui` | PASS | run-521 | 287 | flow | PROVEN defect, no reload in its logcat: filled only the place, and the app rightly refuses without a time (handlePropose sets timeError). Now fills both. 1bdaa76 |
| `meetup_respond` | FAIL-assert | run-521 | 423 | flow — NOT convertible as-is: it searches the PARTIAL title "Phone Case" while open_listing_by_title asserts the exact title it is given, so converting would break it. Either pass the full title or leave the inline search. | PROVEN defect, no reload in its logcat: Accept needs a proposal from the counterpart and nothing seeds one. Now two-party. 1bdaa76 |
| `meetup_validation` | PASS | run-521 | 269 | flow | CONFIRMED reload artefact (`Destroying ReactContext` in logcat). UI-043 withdrawn. Inline-error coverage (place/time required) kept intact. 1bdaa76 919aeb2 |
| `message_long_text` | PASS | run-521 | 288 | flow | Asserted 27 chars of the 366-char message it sent. Now spans both ends. |
| `offer_counter_flow` | FAIL-assert ⟳stale | run-521 | 243 | flow — was re-implementing the helper inline (search + drag + testID tap) and carried the same two defects. Converted to open_listing_by_title.yaml, which now has the Enter-submit dismissal and the navigation proof. | 2026-09-05 scroll-to-title; searches inline and taps the card BY testID — after typing, the title is also the search input's own text, so a text tap can hit the field (flow_lint SEARCHTAP). |
| `offer_in_existing_thread` | FAIL-assert | run-521 | 246 | flow — does NOT open a listing by search (no browse-search-input, no scrollUntilVisible), so it is NOT the helper family. Fails on `"Send Offer" is visible`; needs its own read once the auth path settles. | [Failed] offer_in_existing_thread (3m 49s) (Assertion is false: "Send Offer" is visible) |
| `offer_quantity_round_trip` | FAIL-assert | run-521 | 262 | flow+HELPER BUG — it WAS converted (4e44fc0) and still failed, which exposed a defect in open_listing_by_title.yaml itself: its final `assertVisible: "${TITLE}"` cannot prove navigation, because when the card tap fails the title is still visible AS THE CARD, so the helper reported success and the caller died later on "Make an Offer". run-521's screenshot shows the real cause: query typed, card rendered, IME still covering it. Helper now submits with pressKey:Enter and asserts browse-search-input is GONE. | [Failed] offer_quantity_round_trip (4m 4s) (Element not found: Text matching regex: Make an Offer) |
| `offer_send_and_accept` | FAIL-assert | run-521 | 279 | flow — ran as #30, BEFORE the helper fix landed. Re-run before triaging; it is in the same family as reserve_after_accept. | 2026-09-05 scroll-to-title lost its race with a 98-listing feed (timeout had already gone 8s->20s). Now uses _helpers/open_listing_by_title.yaml, the same search sequence that keeps browse/listing_detail_held_units_transparency green. |
| `offer_send_and_decline` | FAIL-assert | run-521 | 275 | flow — WRONG ACCOUNT, proven from logcat 2026-09-08. Corrects the earlier "never reached the listing detail" verdict: it DOES reach it, as the OWNER. The hierarchy dump holds `text: This is your listing` 105-140x per run across offer_counter_flow / offer_quantity_round_trip / offer_send_and_accept / offer_send_and_decline / reserve_after_accept / reserve_after_buyer_accepts_counter and seller/{listing_conversations,reserved_buyer}. So the app is signed in as seller@hatiwal.test while a buyer leg runs, isOwnListing is true, and canOfferOnListing correctly hides Make an Offer (ListingDetail.tsx:1120) — the APP IS RIGHT. Fixture is innocent: `Men Winter Jacket XL Black` is `user: seller`, `status: :active`, and the seed never sets `negotiable` so it defaults true. offer_send_and_accept fails BEFORE its own login_seller leg, so the dumps are the buyer leg, not the legitimate seller one. offer_in_existing_thread passes because it works inside an existing thread and never opens a listing detail. REPRODUCIBLE in both clean cycles (run-504..507, run-515..518), so 8a91b71's profile-tab wait did not close it. PROVEN 2026-09-12 from Maestro's step-screenshot trace (debug-<flow>/.maestro/tests/*/screenshots, one PNG per EXECUTED step). offer_send_and_accept ran: step-015/016 dev-menu, step-027 scrollUntilVisible sign-out-button, step-034 tapOn Skip (onboarding, in ps/fa), step-044 assertCondition login-email-input, step-048 Don't allow, step-098 Make an Offer (fail). The guard DID detect the wrong account and entered the sign-out branch at 027 — but there is NO tapOnElement sign-out-button and NO android:id/button1 between 027 and 034, so the scroll found nothing, `when: visible: sign-out-button` was FALSE and the tap was SILENTLY SKIPPED. No sign-out means no login form, so the sign-in block's `when: visible: login-email-input` gate at 044 was also false and skipped — the flow carried on as the seller and died 60 steps later. Note the ordering: login.yaml runs the wrong-account guard BEFORE goto_login.yaml, and goto_login is what invokes skip_onboarding.yaml — so the guard can run while the app is still on the onboarding carousel with no Profile to scroll. FIX (not yet applied, needs a free device to confirm): make the identity guarantee POSITIVE and terminal — after the sign-in block, assert profile-display-name matches Ahmad Karimi. Today every check is a silent no-op chain, and being signed in as the WRONG user is indistinguishable from being signed in as the right one. Worst case of the new assert is 156 flows failing loudly AT LOGIN, which is immediately visible and trivially revertible — strictly better than silent wrong-account corruption. | 2026-09-05 same scroll-to-title cause as offer_send_and_accept; wired to _helpers/open_listing_by_title.yaml. |
| `place_and_release_hold` | PASS | run-521 | 226 | PASS — first flow to run with fixes 6+4 in place. |  |
| `quick_replies` | FAIL-assert | run-521 | 291 | flow — asserts the full quick-reply text "Is this still available? Please let me know.". Check that exact string in all 3 locales before treating it as a UI defect. | Exception in thread "Thread-5" java.io.IOException: Command failed (shell,v2,raw:pm list packages --user 0 dev |
| `report_participant` | FAIL-assert | run-521 | 339 | flow — asserts `.*already reported.*`, i.e. it expects a PRIOR report to exist. Fixture-order dependency, not a UI defect: whether it passes depends on whether report_user ran successfully first, and report_user failed this pass. Re-run after the auth fixes. | 2026-09-05 NOT an app bug. A Report is unique per reporter+target and one from an e2e account existed at 02:48, created AFTER that pass's 02:42 seed, so the flow's FIRST submit already took the duplicate path — and ReportSheet offers "Block this user?" from inside onSuccess, making everything after it unreachable (RIG-004). reset_e2e clears reports BETWEEN passes, which cannot help one created DURING one. FIX: delete its own report row first, or target a user no other flow reports. |
| `reserve_after_accept` | FAIL-assert | run-521 | 330 | HELPER FIX CONFIRMED — ran as flow #35 of run-521, i.e. WITH the fixed open_listing_by_title.yaml, and its final hierarchy is the DETAIL screen (AFN 3,500, Clothes & Fashion, Kandahar, Description) with NO browse-search-input. So the helper navigated correctly and the false pass is gone. The remaining failure is "Make an Offer" absent ON the detail screen, which is the wrong-account bug (owner sees ownListingNotice, not the offer row) — tracked by the session that owns login.yaml (see 7d84539). | 2026-09-05 same scroll-to-title cause; wired to _helpers/open_listing_by_title.yaml. |
| `reserve_after_buyer_accepts_counter` | FAIL-assert ⟳stale | run-521 | 365 | flow — converted to open_listing_by_title.yaml with the EXACT full title ("Toyota Corolla 2016 Automatic", not the "Toyota Corolla" prefix it used, because the helper asserts the title it is given). It was re-implementing the helper inline and carried both defects the helper was fixed for; its own screenshot shows the IME covering the result card. | Older fixture, far down a paginating feed; 8s scroll budget. Now searches. |
| `reserved_sold_dead_end_notice` | (rig) | run-521 | 603 | rig/env — recorded with kind=rig_fail in run-521, a pass that ran under HOST CONTENTION: session 1's emulator plus ANOTHER agent's three chrome-headless processes, ffmpeg and Rails on the same box. The pass averaged 310s/flow (15205s for 49) against a ~208s baseline and the driver began backing off at load 16.9. NOT an app or flow defect — re-run on a quiet box before triaging. (Note results.jsonl marks these via `kind`, while `result` still reads "fail" — filtering on result alone misses them.) | Five logins could not fit FLOW_TIMEOUT=600; split into three flows, only this one mutates. |
| `scroll_to_latest` | (rig) | run-521 | 605 | rig/env — recorded with kind=rig_fail in run-521, a pass that ran under HOST CONTENTION: session 1's emulator plus ANOTHER agent's three chrome-headless processes, ffmpeg and Rails on the same box. The pass averaged 310s/flow (15205s for 49) against a ~208s baseline and the driver began backing off at load 16.9. NOT an app or flow defect — re-run on a quiet box before triaging. (Note results.jsonl marks these via `kind`, while `result` still reads "fail" — filtering on result alone misses them.) | 2026-09-03 SOLVED: the meetup sheet was drawn UNDER the Android keyboard, so Time and Propose were unreachable when the sheet opened with the IME already up — the ordinary path, which no meetup flow covered. Fixed d46c896; PASS at BOTH widths after the rebuild. Its earlier 600s timeout at 360dp was a SYMPTOM of the same bug (dead waits), not a ceiling that needed raising. |
| `send_message` | (rig) | run-521 | 604 | rig/env — recorded with kind=rig_fail in run-521, a pass that ran under HOST CONTENTION: session 1's emulator plus ANOTHER agent's three chrome-headless processes, ffmpeg and Rails on the same box. The pass averaged 310s/flow (15205s for 49) against a ~208s baseline and the driver began backing off at load 16.9. NOT an app or flow defect — re-run on a quiet box before triaging. (Note results.jsonl marks these via `kind`, while `result` still reads "fail" — filtering on result alone misses them.) | AxiosError |
| `send_message_double_tap` | (rig) | run-521 | 603 | rig/env — recorded with kind=rig_fail in run-521, a pass that ran under HOST CONTENTION: session 1's emulator plus ANOTHER agent's three chrome-headless processes, ffmpeg and Rails on the same box. The pass averaged 310s/flow (15205s for 49) against a ~208s baseline and the driver began backing off at load 16.9. NOT an app or flow defect — re-run on a quiet box before triaging. (Note results.jsonl marks these via `kind`, while `result` still reads "fail" — filtering on result alone misses them.) |  |
| `send_message_empty` | PASS | run-521 | 548 |  | AxiosError |
| `send_message_offline` | FAIL-? | run-521 | 504 | flow — NOT a listing-opener case, checked before converting: it taps `chat-tab` first and scrolls to the title in the CONVERSATION list, so it opens a thread, not a listing from the feed. Its "No visible element found: Lenovo ThinkPad..." is about the conversation list. Needs a wait on the conversation row, or a fixture check. | hideKeyboard is Back on Android and popped the conversation; "Send" was on another screen. |
| `send_message_whitespace` | PASS | run-521 | 564 |  |  |
| `send_multiple_messages` | PASS | run-521 | 544 |  |  |
| `send_photo` | PASS | run-521 | 310 | flow | Asserted "common.close" — a t() KEY copied from a Jest test. |
| `start_conversation` | FAIL-? | run-521 | 226 | fixture | RIG-005: Wool Blanket had drifted to sold, so it left the browsable feed. Re-seeded. |
| `start_conversation_and_reply` | PASS | run-521 | 241 |  | Parsing Failed at /home/hama99o/Apps/Personal/Hatiwal/hatiwal-mobile/maestro/_helpers/open_bundle.yaml:216:41 |
| `unread_badge_survives_navigation` | FAIL-assert | run-521 | 174 |  | [Failed] unread_badge_survives_navigation (2m 35s) (Element not found: Id matching regex: conversation-action- |
| `view_other_profile_from_conversation` | PASS | run-521 | 231 | flow | "Member since" is own-profile only (Profile.tsx); public profile shows a "Joined" tile. |

## `browse` — Buyer browse, search, filters, sort, listing detail, seller profile — a reserved listing stays searchable + messageable, and a held batch shows its hold

25/42 passing · 15 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_all_categories` | PASS | run-519 | 204 |  | AxiosError |
| `browse_listings` | FAIL-? ⚠slow | run-519 | 1747 |  | [Failed] browse_listings (28m 50s) |
| `browse_sort_most_viewed` | PASS | run-519 | 172 | flow — chip strip. Labels are NOT stale (browse.json still has sort.mostViewed/nearest, FilterSheet SORT_OPTIONS renders 5 chips in a horizontal ScrollView). The blind `repeat 6x swipe 85%->20% @74%/68%` is not scrolling that strip at all: 6 iterations move ~2800dp, five chips need ~200. Replace with scrollUntilVisible direction:RIGHT. NOT yet verified on device. | AxiosError AxiosError |
| `browse_sort_nearest` | PASS | run-519 | 5660 | flow — same chip strip as browse_sort_most_viewed. Extra wrinkle: `nearest` is NOT in SORT_OPTIONS; it is a separate chip (FilterSheet:409) that acquires location on tap, so it may also need a location fixture. |  |
| `categories_hub` | PASS | run-519 | 184 |  |  |
| `clear_all_filters` | PASS | run-519 | 176 |  |  |
| `filter_active_sellers` | PASS | run-519 | 170 |  |  |
| `filter_by_category` | PASS | run-519 | 179 |  |  |
| `filter_condition` | PASS | run-519 | 224 |  |  |
| `filter_price_range` | PASS | run-519 | 215 |  |  |
| `full_marketplace_cycle` | FAIL-assert | run-519 | 254 | flow — doubled search (missing eraseText) + inherited price filter emptied the feed; fixed | Four taps with the same search-box collision; three now erase and re-search first. |
| `listing_contact_whatsapp` | PASS | run-519 | 212 |  |  |
| `listing_detail` | PASS | run-519 | 257 | flow — converted to open_listing_by_title.yaml (search instead of scrolling a ~98-listing feed). Helper is proven in run-496 via reserve_after_accept. |  |
| `listing_detail_held_units_transparency` | FAIL-assert | run-519 | 473 | REVERT CONFIRMED — no longer exits the app (run-494 fails on `listing-card` not visible, not the Android home screen). The hideKeyboard->drag revert worked here. Remaining failure is the scroll race. | [Failed] listing_detail_held_units_transparency (7m 25s) (Assertion is false: "Switch to .*" is visible) |
| `listing_detail_multi_quantity` | FAIL-? | run-519 | 233 | flow — scroll stopped at the clipped bottom row so the price row never showed; centred. API data verified correct | [Failed] listing_detail_multi_quantity (3m 28s) (No visible element found: "Phone Case Silicone Clear - Wholes |
| `listing_detail_offer` | PASS | run-519 | 266 | flow — converted to open_listing_by_title.yaml. |  |
| `listing_detail_offer_invalid` | FAIL-? | run-519 | 209 |  | [Failed] listing_detail_offer_invalid (2m 50s) (No visible element found: "Wool Blanket Handmade King Size") |
| `listing_detail_price_drop_badge` | FAIL-? | run-519 | 208 | flow — scroll race (Lenovo ThinkPad Laptop Core i5 8GB). Gated on open_listing_by_title rollout. | [Failed] listing_detail_price_drop_badge (3m) (No visible element found: "Lenovo ThinkPad Laptop Core i5 8GB") |
| `listing_detail_quantity_intent` | FAIL-assert | run-519 | 280 | flow — both listing opens converted to open_listing_by_title.yaml. | [Failed] listing_detail_quantity_intent (4m 3s) (Assertion is false: "Phone Case Silicone Clear - Wholesale" i |
| `listing_detail_report` | PASS | run-519 | 244 | flow — converted to open_listing_by_title.yaml. | RIG-004 tolerance; covers the detail-screen entry point. |
| `listing_detail_reserved_contactable` | PASS | run-519 | 185 |  |  |
| `listing_detail_save_unsave` | FAIL-assert | run-519 | 272 | flow — CORRECTED DIAGNOSIS. Not a scroll-length problem: this flow calls the opener straight after login.yaml, and login.yaml ENDS ON THE PROFILE SCREEN (its last steps are ensure_english + ensure_buyer_mode, both working the profile's mode toggle). So the feed was never on screen and no scroll timeout could have helped. Now uses open_listing_by_title.yaml, which reaches the Bazaar feed itself. | [Failed] listing_detail_save_unsave (4m 11s) (Assertion is false: id: listing-card is visible) |
| `listing_detail_saves_count` | FAIL-assert | run-519 | 192 | flow — tapped the save TOGGLE blind and unsaved it, so savesCount hit 0; now state-aware | [Failed] listing_detail_saves_count (2m 53s) (Assertion is false: "Saved by.*" is visible) |
| `listing_detail_share` | PASS | run-519 | 167 |  |  |
| `listing_detail_similar` | PASS | run-519 | 184 |  |  |
| `listing_detail_sold_recovery` | FAIL-? | run-508 | 166 | rig — 'emulator died and could not be rebooted'. Host disk was 98% full and swap exhausted; pruned 2026-09-05. Re-run. | Optional tap paired with an optional assert checked nothing; now a when: conditional. |
| `listing_detail_sold_state` | FAIL-assert | run-508 | 151 | flow — same cold-start deep-link loss; fixed alongside sold_recovery | [Failed] listing_detail_sold_state (2m 17s) (Assertion is false: "Description" is visible) |
| `listing_detail_views_count` | PASS | run-508 | 210 |  |  |
| `not_interested` | PASS | run-508 | 149 |  |  |
| `saved_search_apply` | FAIL-assert | run-508 | 178 | flow — tapped the SHEET's "Clear" after closing the sheet; now the feed's clear-filters chip | [Failed] saved_search_apply (2m 44s) (Assertion is false: "Saved search" is visible) |
| `scroll_to_top` | PASS | run-508 | 154 |  |  |
| `search_empty_state` | FAIL-assert | run-508 | 167 |  | [Failed] search_empty_state (2m 33s) (Assertion is false: "No listings found" is visible) |
| `search_listings` | FAIL-assert | run-508 | 228 |  | [Failed] search_listings (3m 34s) (Assertion is false: "No listings found" is visible) |
| `search_with_filter` | PASS | run-508 | 182 |  |  |
| `seller_profile` | FAIL-? | run-508 | 156 |  | [Failed] seller_profile (2m 22s) (No visible element found: "Wool Blanket Handmade King Size") |
| `seller_profile_from_listing` | PASS | run-508 | 162 |  |  |
| `seller_response_rate_badge` | FAIL-? ⚠slow | run-508 | 39235 | flow — anchored pattern started mid-label; badge renders "82% reply rate · Usually responds…" as one Text | [Failed] seller_response_rate_badge (10h 53m 40s) (No visible element found: "Phone Case.*") |
| `subcategory_drilldown` | PASS | run-508 | 172 | flow — chip reads "Subcategory: Phones & Tablets"; the two chip asserts still said "Phones" | Seed is "Phones & Tablets"; 5 refs widened. One was assertNotVisible "Phones" — a FALSE PASS. |
| `user_profile_empty_listings` | FAIL-? | run-508 | 162 | flow — index 0 of a recency-ordered inbox reached Fatima (owns a listing); now targets Ahmad | Premise impossible: asserted a listing's own seller has 0 listings. Reaches a 0-listing profile via chat. |
| `user_profile_listing_grid` | PASS | run-508 | 162 | flow | Grid sits below the profile header; assertVisible does not scroll. Added both ways. |
| `user_profile_stats` | PASS | run-508 | 153 | flow — asserted a "Message" button the profile has never had (contact is per-listing by design) | Hardcoded "2024"; member_since renders "August 2026" as one node. Year-shaped pattern. |
| `view_mode_toggle` | PASS | run-508 | 190 | REVERT CONFIRMED — PASSED in run-494 after the hideKeyboard->drag revert. | HOLLOW: every tap optional, only assertion was the always-present tab label. Rewritten. |

## `seller` — One-tap Mark sold from any live listing (never reserve-first) + the Sales ledger (edit/void a row, reviewed-sale refusal, outside-buyer rows, undo-after-sold)

4/18 passing · 14 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `held_quantity_refusal` | FAIL-assert | run-520 | 344 | SUSPECT — ran in run-522 while the host was at load 17-25, shared with another agent's chrome-headless, ffmpeg and Rails. That pass came back 0 of 8, worse than any seller pass on record (previous: 11%, 27%, 38%), and flow times were 400-470s against a ~208s baseline. Do NOT triage as an app bug — re-run on a quiet box. The driver's own gate has since been changed to hold up to an hour for load, and to log SUSPECT PASS if it proceeds anyway. | [Failed] held_quantity_refusal (5m 25s) (Assertion is false: "Winter Gloves Wholesale Box - 15 Pairs" is visib |
| `listing_actions_sheet` | FAIL-assert | run-520 | 280 | SUSPECT — ran in run-522 while the host was at load 17-25, shared with another agent's chrome-headless, ffmpeg and Rails. That pass came back 0 of 8, worse than any seller pass on record (previous: 11%, 27%, 38%), and flow times were 400-470s against a ~208s baseline. Do NOT triage as an app bug — re-run on a quiet box. The driver's own gate has since been changed to hold up to an hour for load, and to log SUSPECT PASS if it proceeds anyway. | [Failed] listing_actions_sheet (4m 22s) (Element not found: Id matching regex: browse-tab) |
| `listing_conversations` | FAIL-? | run-520 | 170 | SUSPECT — ran in run-522 while the host was at load 17-25, shared with another agent's chrome-headless, ffmpeg and Rails. That pass came back 0 of 8, worse than any seller pass on record (previous: 11%, 27%, 38%), and flow times were 400-470s against a ~208s baseline. Do NOT triage as an app bug — re-run on a quiet box. The driver's own gate has since been changed to hold up to an hour for load, and to log SUSPECT PASS if it proceeds anyway. | 2026-09-05 same IME cause. Its note claimed scrollUntilVisible dismisses the keyboard — true only if it scrolls, and it is a NO-OP when the target is already visible, which after a filtering search it always is. Dead scroll removed, margin drag used instead (Back is unsafe here — it exited the app once). |
| `mark_sold_all_units` | FAIL-? | run-520 | 24 |  |  |
| `mark_sold_with_buyer` | PASS | run-516 | 187 | SUSPECT — ran in run-522 while the host was at load 17-25, shared with another agent's chrome-headless, ffmpeg and Rails. That pass came back 0 of 8, worse than any seller pass on record (previous: 11%, 27%, 38%), and flow times were 400-470s against a ~208s baseline. Do NOT triage as an app bug — re-run on a quiet box. The driver's own gate has since been changed to hold up to an hour for load, and to log SUSPECT PASS if it proceeds anyway. |  |
| `multi_quantity_offplatform_sale` | FAIL-? | run-516 | 173 | flow — "QA Disposable offplatform_units" not visible. A DISPOSABLE fixture, so check it was actually seeded for this pass before treating it as a UI defect. | [Failed] multi_quantity_offplatform_sale (2m 38s) (No visible element found: "QA Disposable offplatform_units" |
| `multi_quantity_partial_sale` | FAIL-assert | run-516 | 237 | SUSPECT — ran in run-522 while the host was at load 17-25, shared with another agent's chrome-headless, ffmpeg and Rails. That pass came back 0 of 8, worse than any seller pass on record (previous: 11%, 27%, 38%), and flow times were 400-470s against a ~208s baseline. Do NOT triage as an app bug — re-run on a quiet box. The driver's own gate has since been changed to hold up to an hour for load, and to log SUSPECT PASS if it proceeds anyway. | Found UI-008 (HIGH): typed 3, sold all 15 — pre-filled field appended, clamp silently swallowed it, listing retired. Fixed with selectTextOnFocus + a destructive over-stock hint; same fix applied to the web dialog. Also UI-009 ("15 of 15 left" before any sale). Flow itself needed: explicit seller login (login_seller.yaml lands in the dev-client launcher; login.yaml ignores an EMAIL override when a session exists), scrollUntilVisible on `lifecycle-more-action`, and the review prompt instead of the racing toast. run-020 green, 0 api errors, DB confirms 3 sold / 12 left / still active. |
| `publish_from_owner_detail` | FAIL-assert | run-516 | 275 | flow — "Publish this listing?" not visible (the publish confirm). Needs its own read; no Network Error, so not the auth family. | [Failed] publish_from_owner_detail (4m 20s) (Assertion is false: "Publish this listing?" is visible) |
| `publish_success` | FAIL-assert | run-516 | 299 | flow — "Pick location on map" not visible. Likely the create-listing form's location step; no Network Error. | 2026-09-05 title asserted while the detail screen was scrolled past it; guarded UP scroll added. |
| `reserved_buyer` | FAIL-assert | run-516 | 227 | flow — WRONG ACCOUNT, proven from logcat 2026-09-08. Corrects the earlier "never reached the listing detail" verdict: it DOES reach it, as the OWNER. The hierarchy dump holds `text: This is your listing` 105-140x per run across offer_counter_flow / offer_quantity_round_trip / offer_send_and_accept / offer_send_and_decline / reserve_after_accept / reserve_after_buyer_accepts_counter and seller/{listing_conversations,reserved_buyer}. So the app is signed in as seller@hatiwal.test while a buyer leg runs, isOwnListing is true, and canOfferOnListing correctly hides Make an Offer (ListingDetail.tsx:1120) — the APP IS RIGHT. Fixture is innocent: `Men Winter Jacket XL Black` is `user: seller`, `status: :active`, and the seed never sets `negotiable` so it defaults true. offer_send_and_accept fails BEFORE its own login_seller leg, so the dumps are the buyer leg, not the legitimate seller one. offer_in_existing_thread passes because it works inside an existing thread and never opens a listing detail. REPRODUCIBLE in both clean cycles (run-504..507, run-515..518), so 8a91b71's profile-tab wait did not close it. PROVEN 2026-09-12 from Maestro's step-screenshot trace (debug-<flow>/.maestro/tests/*/screenshots, one PNG per EXECUTED step). offer_send_and_accept ran: step-015/016 dev-menu, step-027 scrollUntilVisible sign-out-button, step-034 tapOn Skip (onboarding, in ps/fa), step-044 assertCondition login-email-input, step-048 Don't allow, step-098 Make an Offer (fail). The guard DID detect the wrong account and entered the sign-out branch at 027 — but there is NO tapOnElement sign-out-button and NO android:id/button1 between 027 and 034, so the scroll found nothing, `when: visible: sign-out-button` was FALSE and the tap was SILENTLY SKIPPED. No sign-out means no login form, so the sign-in block's `when: visible: login-email-input` gate at 044 was also false and skipped — the flow carried on as the seller and died 60 steps later. Note the ordering: login.yaml runs the wrong-account guard BEFORE goto_login.yaml, and goto_login is what invokes skip_onboarding.yaml — so the guard can run while the app is still on the onboarding carousel with no Profile to scroll. FIX (not yet applied, needs a free device to confirm): make the identity guarantee POSITIVE and terminal — after the sign-in block, assert profile-display-name matches Ahmad Karimi. Today every check is a silent no-op chain, and being signed in as the WRONG user is indistinguishable from being signed in as the right one. Worst case of the new assert is 156 flows failing loudly AT LOGIN, which is immediately visible and trivially revertible — strictly better than silent wrong-account corruption. | 2026-09-05 the IME covered the search result; the card tap landed on the keyboard (Maestro reports covered taps COMPLETED) so the app never left BROWSE and the failure surfaced later on 'Make an Offer'. hideKeyboard added after typing. |
| `sales_screen_correct_quantity` | FAIL-assert | run-516 | 323 |  | [Failed] sales_screen_correct_quantity (5m 9s) (Assertion is false: id: sales-tally is not visible) |
| `sales_screen_reviewed_sale_refusal` | FAIL-assert | run-516 | 196 | flow — `seller-card-more-action` not found; the testID IS current (SellerListingCard.tsx:464), so this is a reach/timing failure, not selector rot. Ran AFTER the identity fix and shows no wrong-account signature. | [Failed] sales_screen_reviewed_sale_refusal (3m 1s) (Assertion is false: ".*3 of 10 sold.*" is visible) |
| `sales_screen_void_row` | FAIL-assert | run-516 | 319 |  | [Failed] sales_screen_void_row (5m 4s) (Assertion is false: id: sales-tally is not visible) |
| `save_draft` | FAIL-assert | run-516 | 232 | flow — asserts "Create Listing" and does not get it; the copy IS current (listing.json `create` = "Create Listing"). Reach/timing, not stale copy. Post-identity-fix. | [Failed] save_draft (3m 37s) (Assertion is false: "Create Listing" is visible) |
| `sell_without_reserving` | PASS | run-516 | 266 |  |  |
| `sold_quantity_reconciliation` | FAIL-assert | run-516 | 302 | flow — `listing-form-quantity-reopen-note` not visible; testID IS current (ListingForm.tsx:1688). Reach/timing. Post-identity-fix. | [Failed] sold_quantity_reconciliation (4m 46s) (Assertion is false: id: listing-form-quantity-reopen-note is v |
| `undo_mark_sold` | PASS | run-516 | 263 | flow — `location-confirm` not visible; testID IS current (LocationRangePicker.tsx:470). Reach/timing — the location sheet had not opened or had not rendered. Post-identity-fix. |  |
| `undo_mark_sold_with_buyer` | PASS | run-516 | 195 |  |  |

## `profile` — Profile view/edit, language + theme switch, stats, blocked users

18/30 passing · 11 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `account_delete_and_restore` | FAIL-? | run-518 | 184 |  | [Failed] account_delete_and_restore (2m 50s) (No visible element found: id: register-confirm-password-input) |
| `account_delete_cancel` | FAIL-? | run-518 | 213 |  | [Failed] account_delete_cancel (3m 18s) (No visible element found: "Delete account") |
| `away_mode` | PASS | run-518 | 212 | app+flow — away row was untappable (no Pressable/testID); fixed cb68fa4 (live via Metro, no rebuild) |  |
| `blocked_users` | PASS | run-518 | 170 |  |  |
| `change_language_dari` | PASS | run-518 | 176 |  |  |
| `change_language_english` | PASS | run-518 | 572 | flow — toothless restart wait; helper+nav fixed cb68fa4 |  |
| `change_language_pashto` | PASS | run-518 | 175 |  |  |
| `contact_visibility` | PASS | run-518 | 571 | flow | 2026-09-03: the failing assertion named the copied number but the cause was navigation. hideKeyboard is a Back press and popped Edit Profile to Profile; the next THREE commands reported COMPLETED against a stale hierarchy, so the assertNotVisible before it passed for the WRONG reason. Replaced with pressKey:Enter, which turned out to SUBMIT the form — both removed. Green at 360dp once the keypress was gone; now unstable again from my keyboardDismissMode=on-drag reflowing the form mid-scroll (board #313). NOT an app bug. |
| `edit_profile` | PASS | run-518 | 166 | stale — toast assertion already replaced by durable name check |  |
| `edit_profile_all_fields` | FAIL-assert | run-518 | 267 | flow+app | 2026-09-03: FOUR causes, two of them app bugs. (1) asserted text 'Save' on a button reading 'Save Changes'; (2) centerElement on the sticky save button; (3) APP — the sticky Save sat BEHIND the keyboard (d8edc9e), verified visually at 360dp; (4) APP — the keyboard swallowed the tap on the NEXT field, so 'UpdatedLast' landed in the First Name box (e36a6b4, keyboardDismissMode=on-drag). Also a pre-existing viewport assumption on the final derived-city assertion (no scroll). MY OWN regressions along the way: a pressKey:Enter that SUBMITTED the form (608ddda, reverted) and a scrollUntilVisible that is a no-op when the target is already 'visible'. Flow-side stability still open — board #313. |
| `edit_profile_avatar` | PASS | run-518 | 185 |  |  |
| `edit_profile_bio_too_long` | PASS | run-518 | 289 | flow — 520 chars do type; error renders above viewport; now scrolls UP cb68fa4 |  |
| `edit_profile_province` | FAIL-assert | run-518 | 260 | flow | 2026-09-02: DOWN + centerElement:true on profile-edit-button, which sits near the TOP of Profile — DOWN scrolls away from it and centring is impossible with too little content above. ORDER-DEPENDENT (siblings passed on the identical block). Now UP + visibilityPercentage 40, applied to all 8 flows carrying it. |
| `edit_profile_validation` | PASS | run-518 | 199 |  |  |
| `hidden_listings` | PASS | run-518 | 198 |  |  |
| `language_persists_across_tabs` | PASS | run-518 | 290 |  |  |
| `language_switch_all_screens` | PASS | run-518 | 310 | flow — asserted Profile content while restart left app on feed; reordered cb68fa4 |  |
| `profile_stats_verify` | FAIL-? | run-518 | 200 | rig — killed mid-flow (no failure reason, 7m45s); feature-timeout truncation, re-run | Same hardcoded year. |
| `recently_viewed` | PASS | run-518 | 175 | flow+app — row had no testID; added profile-row-recently-viewed. Fixed 34e713a |  |
| `recently_viewed_empty_state` | PASS | run-518 | 168 |  |  |
| `seller_mode_toggle` | PASS | run-518 | 187 |  |  |
| `theme_switch` | FAIL-? | run-518 | 213 |  | [Failed] theme_switch (3m 19s) (No visible element found: id: theme-option-light) |
| `transaction_stats_hidden_when_zero` | PASS | run-518 | 157 |  |  |
| `transaction_stats_own_profile` | FAIL-assert | run-518 | 192 |  | [Failed] transaction_stats_own_profile (2m 57s) (Assertion is false: "Items Bought" is visible) |
| `transaction_stats_public_profile` | FAIL-assert | run-518 | 200 | flow — vacuous assertNotVisible on the dead soldItems key; removed | [Failed] transaction_stats_public_profile (3m 5s) (Assertion is false: id: transaction-stats-badge is visible) |
| `transaction_stats_seller_own_profile` | FAIL-assert | run-518 | 216 |  | [Failed] transaction_stats_seller_own_profile (3m 21s) (Assertion is false: "Sold" is visible) |
| `user_profile_sold_tab` | FAIL-assert | run-518 | 219 | flow | Same ${visible()} problem. |
| `view_profile` | FAIL-assert ⟳stale | run-518 | 216 |  | [Failed] view_profile (3m 21s) (Assertion is false: "Language" is visible) |
| `view_profile_error` | PASS | run-518 | 216 |  | AxiosError |
| `view_seller_profile_from_profile` | FAIL-assert | run-518 | 217 |  | [Failed] view_seller_profile_from_profile (3m 21s) (Assertion is false: "Ahmad Karimi" is visible) |

## `auth` — Sign up, login, logout, session persistence, guest gating

11/16 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `confirm_email_prompt` | PASS | run-514 | 193 |  |  |
| `guest_browse` | PASS | run-514 | 171 |  |  |
| `guest_offer_redirect` | FAIL-? | run-514 | 194 |  | [Failed] guest_offer_redirect (2m 49s) (No visible element found: "Wool Blanket Handmade King Size") |
| `guest_save_redirect` | FAIL-? | run-514 | 164 |  |  |
| `login` | PASS | run-514 | 173 |  |  |
| `login_deep` | PASS | run-514 | 225 |  |  |
| `login_empty_fields` | PASS | run-514 | 139 |  | Request failed with status code Request failed with status code |
| `login_navigate_to_register` | PASS | run-514 | 140 |  |  |
| `login_wrong_password` | PASS | run-514 | 154 |  | Request failed with status code |
| `logout` | PASS | run-514 | 224 | rig | ENVIRONMENT, not the flow. run-241 aborted mid-feature: an openaleph-mobile Gradle build took the load average to 49 on 16 cores and this session's emulator died — the rig logged "CPU only 0% idle — refusing to boot" and "could not recover the emulator — aborting feature 'auth'". Re-run on a quiet machine before reading anything into it. logout is also the reference flow that showed sign-out lands on the Bazaar (see login_deep). |
| `logout_cancel` | PASS | run-514 | 222 |  |  |
| `register_duplicate_email` | FAIL-? | run-514 | 185 | flow | APP IS CORRECT (422 + errors.full_messages surfaced) but the FLOW was wrong, and my first diagnosis blamed the wrong thing. Register.tsx renders each error as `<Text>{"• "}{msg}</Text>`, so the node reads "• Email has already been taken" and Maestro's anchored regex cannot match the bare literal. It would have failed on a quiet machine too — the `Refreshing…` banner in the first screenshot was real but incidental. Now asserts ".*Email has already been taken.*". |
| `register_navigate_to_login` | PASS | run-514 | 140 |  |  |
| `session_persist` | PASS | run-514 | 210 |  |  |
| `sign_up` | FAIL-? | run-514 | 202 |  | [Failed] sign_up (3m 2s) (No visible element found: id: register-confirm-password-input) |
| `sign_up_validation` | FAIL-? | run-514 | 209 |  | [Failed] sign_up_validation (3m 11s) (No visible element found: id: register-confirm-password-input) |

## `saved` — Save / unsave a listing, saved tab, sold-while-saved

3/8 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `save_from_browse_feed` | PASS | run-512 | 199 |  |  |
| `save_listing` | FAIL-? | run-512 | 155 |  | [Failed] save_listing (2m 21s) (No visible element found: "Wool Blanket Handmade King Size") |
| `save_multiple_listings` | FAIL-assert | run-512 | 167 |  | [Failed] save_multiple_listings (2m 33s) (Assertion is false: id: listing-card, Index: 2 is visible) |
| `saved_empty_state` | PASS | run-512 | 157 |  |  |
| `saved_listing_goes_sold` | FAIL-assert | run-512 | 426 |  | [Failed] saved_listing_goes_sold (6m 52s) (Element not found: Id matching regex: seller-card-primary-action) |
| `saved_pagination` | FAIL-assert | run-512 | 211 |  | [Failed] saved_pagination (3m 17s) (Element not found: Id matching regex: listing-card) |
| `unsave_from_browse_feed` | PASS | run-512 | 199 |  |  |
| `unsave_listing` | FAIL-assert | run-512 | 211 |  | [Failed] unsave_listing (3m 16s) (Element not found: Text matching regex: Remove from saved) |

## `rtl` — Pashto + Dari right-to-left layout across main screens

2/10 passing · 5 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_rtl_dari` | PASS | s2/run-522 | 371 |  |  |
| `browse_rtl_pashto` | PASS | s2/run-522 | 568 |  |  |
| `buyer_picker_rtl` | (rig) | s2/run-522 | 602 |  |  |
| `categories_hub_rtl` | FAIL-? | s2/run-522 | 365 | flow | 2026-09-02: tapped text "Back" in a flow whose whole purpose is Pashto. The app renders no literal "Back" — BackButton has accessibilityLabel t(common.goBack) (ps شاته ځه) and testID back_button. Now targets the testID. |
| `chat_rtl` | FAIL-? | s2/run-522 | 558 | flow? | 2026-09-02: expects ps common.send "لیږل", present verbatim. Same language-revert hypothesis as profile_rtl. |
| `listing_detail_rtl` | (rig) | s2/run-522 | 604 |  | AxiosError |
| `my_listings_rtl` | FAIL-? | s2/run-522 | 559 |  |  |
| `profile_quick_actions_rtl` | FAIL-? | s2/run-522 | 48 | flow | 2026-09-02 SOLVED, flow bug, b20007e: the language-revert hypothesis was WRONG, and so was the mode-toggle one. Profile.tsx:306 renders this row as `${t('…myListings')} (${count})`, so the text is 'زما اعلانونه (0)' and Maestro's anchored regex could not match the bare label — the three sibling labels carry no suffix, which is why only this row failed. run-379's screenshot shows Profile correctly in seller mode (green tab bar, three tabs, saved-tab gone). Matched as a prefix now. NOT an app bug. |
| `profile_rtl` | (rig) | s2/run-522 | 605 | flow? | 2026-09-02: expects fa profile.editProfile "ویرایش پروفایل", which EXISTS verbatim in the locale file — so not a stale selector. Hypothesis: the language-revert bug (fixed 8097ab3) left the app in English after the switch, so no translated string could match. Re-running on a build with that fix. |
| `sales_ledger_rtl` | FAIL-? | s2/run-522 | 576 |  | [Failed] sales_ledger_rtl (8m 31s) |

## `report` — Report a listing or user, block, block side-effects

4/8 passing · 4 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `block_prevents_message` | PASS | run-510 | 268 |  |  |
| `block_user` | FAIL-? | run-510 | 157 |  | [Failed] block_user (2m 23s) (No visible element found: "Wool Blanket Handmade King Size") |
| `block_user_hides_listings` | PASS | run-510 | 205 | PASS, but its logcat carries one `Network Error` line — worth watching, not a defect on its own. |  |
| `report_listing` | FAIL-? | run-510 | 158 | rig — no cause line and its end-of-flow screenshot is a CORRUPT PNG (PIL: cannot identify image file), i.e. the flow was killed mid-screenshot. Re-run. | RIG-004; also gained the duplicate-rule assertion for listings, which nothing covered. |
| `report_listing_no_reason` | FAIL-? | run-510 | 158 | rig — same auth/timing family as report_user (asserts `profile-tab`, i.e. a signed-in tab bar, and does not get one). No Network Error in its own logcat, so re-run before triaging further. | [Failed] report_listing_no_reason (2m 23s) (No visible element found: "Wool Blanket Handmade King Size") |
| `report_user` | PASS | run-510 | 178 | rig/env — login never completed. Screenshot is the LOGIN screen showing 'No connection. Check your internet and try again.' and the logcat carries `Network Error` against http://10.0.2.2:3007/api/v1. API verified healthy from the host (200 on listings and sign_in) and the emulator reaches the host (ping 0% loss), so this was a transient timeout — the driver started this pass while host load was ~13. NOT evidence about the hideKeyboard revert either way. | RIG-004 part 2: retargeted to ahmad (36) so it cannot collide intra-cycle. |
| `report_user_from_profile` | PASS | run-510 | 175 | rig — never opened the listing. The result card (Honda CG 125 Motorbike 2021) is rendered in the screenshot and the flow failed on `seller-profile-link` without tapping it. Also shows the inputText character drop: field holds '5 Motorbike 2021', leading 'Honda CG 12' dropped. open_listing_by_title.yaml's wait-on-listing-card + tap-by-testID is the pattern that fixes this. | Retargeted to omar (37); stopped using nondeterministic listing-card index 0. |
| `report_user_then_block` | FAIL-assert | run-510 | 195 | rig — ran UNAUTHENTICATED. The end-of-flow screenshot's tab bar reads Bazaar / Categories / Login, so `seller-profile-link` (which DOES exist, ListingDetail.tsx:797) was never reachable. Also shows the inputText character drop: the search field holds 'nch 4K Smart TV' — the leading 'Sony 55 i' was dropped. | Retargeted to maryam (40); now unblocks, which it never did. |

## `reviews` — Double-blind reviews after a sold transaction

1/3 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `pending_reviews_nudge` | FAIL-redbox | run-511 | 262 |  | [Failed] pending_reviews_nudge (4m 8s) (Assertion is false: "Review saved" is visible) |
| `profile_reviews_empty_state` | PASS | run-511 | 157 |  |  |
| `rate_buyer_after_sale` | FAIL-assert | run-511 | 237 |  | [Failed] rate_buyer_after_sale (3m 43s) (Assertion is false: id: seller-listing-card is visible) |

## `safety` — Safety tips on listing detail and in the meetup sheet

0/2 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `safety_tips_listing_detail` | UNTESTED | — |  |  |  |
| `safety_tips_meetup_sheet` | UNTESTED | — |  |  |  |

## `dark_mode` — Every main screen in dark theme + theme persistence

6/8 passing · 2 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_dark` | PASS | s2/run-502 | 311 |  |  |
| `chat_dark` | PASS | s2/run-502 | 276 |  |  |
| `listing_detail_dark` | FAIL-? | s2/run-502 | 232 |  | [Failed] listing_detail_dark (3m 32s) (No visible element found: "Wool Blanket Handmade King Size") |
| `my_listings_dark` | FAIL-? | s2/run-502 | 338 | MY REGRESSION — restart helper waited for listing-card; seller mode returns to seller-listing-card. Fixed | [Failed] my_listings_dark (5m 17s) (No visible element found: id: theme-option-light) |
| `profile_dark` | PASS | s2/run-502 | 306 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: ended on the Bazaar feed mid-flow, cause not established. Checkpointed. |
| `saved_tab_dark` | PASS | s2/run-502 | 247 |  |  |
| `theme_light_all_screens` | PASS | s2/run-502 | 276 |  |  |
| `theme_persists_after_navigate` | PASS | s2/run-502 | 331 | flow — same toothless restart wait; fixed cb68fa4 | UI-048 OPEN: same. Waited on profile-tab, which is visible on every tab. |

## `maps` — Location pickers — create-listing pin, Browse filter range, current location, permissions

6/7 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `create_listing_map_pin` | PASS | s2/run-503 | 337 |  |  |
| `filter_map_default_kabul` | PASS | s2/run-503 | 238 |  |  |
| `filter_map_location_denied` | PASS | s2/run-503 | 256 |  |  |
| `filter_map_use_my_location` | PASS | s2/run-503 | 232 |  |  |
| `filter_map_use_my_location_granted` | PASS | s2/run-503 | 230 |  |  |
| `map_location_outside_afghanistan` | PASS | s2/run-503 | 310 |  |  |
| `zoom_controls_not_occluded` | FAIL-? | s2/run-503 | 213 |  | [Failed] zoom_controls_not_occluded (3m 13s) (No visible element found: "Toyota Corolla 2016 Automatic") |

## `gallery` — Listing photo upload, carousel, reorder, empty-photo state

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `listing_create_multi_photos` | FAIL-assert | run-509 | 289 | flow | Asserted the reorder hint with nothing selected; hint needs selectedIdx !== -1. |
| `listing_edit_add_photos` | PASS | run-509 | 187 | flow | 2026-09-02: never scrolled to its own Save button, which adding a photo pushes below the fold — the rule this file's own header states. Now scrolls at visibilityPercentage 40. |
| `listing_gallery_no_photo` | PASS | run-509 | 200 |  |  |
| `listing_gallery_swipe` | PASS | run-509 | 203 |  |  |

## `mode` — Buyer ↔ seller mode switch, tab bar, persistence

3/4 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `seller_mode_my_listings_empty` | FAIL-assert | run-513 | 178 | candidate — one spurious 401 logged the app out; see UI_FINDINGS, needs 2nd sighting | new_seller@hatiwal.test was referenced by the flow and seeded nowhere. |
| `seller_mode_persists` | PASS | run-513 | 241 |  |  |
| `seller_mode_tab_bar_changes` | PASS | run-513 | 154 |  |  |
| `seller_views_own_listing_buyer_mode` | PASS | run-513 | 222 | flow | Searched the feed for "seller"; search matches titles, so it found nothing. |

## `share` — Deep links into a listing and a seller profile

1/2 passing · 1 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `open_listing_deep_link` | PASS | s2/run-503 | 129 |  |  |
| `open_seller_deep_link` | FAIL-assert | s2/run-503 | 142 |  | [Failed] open_seller_deep_link (1m 54s) (Assertion is false: id: more-options-button is visible) |

## `onboarding` — First-run experience

1/1 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `first_run` | PASS | s2/run-503 | 549 |  |  |

## `pagination` — Infinite scroll across browse, search, saved, chat, my-listings

6/6 passing · 0 open

| Flow | Status | Last run | Secs | Triage | Notes |
|---|---|---|---:|---|---|
| `browse_pagination` | PASS | s2/run-503 | 232 |  |  |
| `conversations_pagination` | PASS | s2/run-503 | 255 |  | AxiosError |
| `filter_combined_pagination` | PASS | s2/run-503 | 273 | flow — assertNotVisible on dead copy (vacuous); now asserts a cross-category listing is absent |  |
| `my_listings_pagination` | PASS | s2/run-503 | 368 |  |  |
| `saved_pagination_deep` | PASS | s2/run-503 | 371 |  |  |
| `search_pagination` | PASS | s2/run-503 | 329 |  |  |

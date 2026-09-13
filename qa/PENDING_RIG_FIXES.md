# Pending rig fixes

**The identity-switch fix (login.yaml + login_seller.yaml, from run-497 flow 11) was applied on 2026-09-05 and is REOPENED as of 2026-09-13 — run-526 shows the owner notice on screen in five flows, with the TextView itself in the logcat. See "REOPENED 2026-09-13" below; it is the largest single cause of failure in the campaign. Fix 4 is APPLIED. Fixes 1, 2, 3, 5 remain queued.**

Applied mid-pass, deliberately, with the boundary recorded so run-496 stays
attributable: the first **30 offer_send_and_accept** flows of run-496 ran with the OLD helpers;
everything after that flow ran with the fixes. Both edits target the login
helper and two flows that had already run, so nothing in flight was rewritten
underneath itself.

Written 2026-09-05 while the `chat` pass was in flight. **None of these are
applied yet**, deliberately: `qa/qa.sh` is executing right now (bash re-reads a
running script by byte offset, so editing it mid-pass can corrupt execution) and
the flow YAML under `maestro/chat/` is being read as each flow starts. Apply
these when `/tmp/hatiwal-pass-running` is absent.

---

## 1. `inputText` drops the LEADING characters of a search query

**Evidence, two independent flows in run-495:**

| Flow | Intended query | What the field actually held |
|---|---|---|
| `report_user_from_profile` | `Honda CG 125 Motorbike 2021` | `5 Motorbike 2021` |
| `report_user_then_block` | `Sony 55 inch 4K Smart TV` | `nch 4K Smart TV` |

Both dropped ~11 leading characters. The cause is the standard Android race:
`tapOn` the field returns before the input has focus, and `inputText` starts
typing into nothing.

**Fix:** a `waitForAnimationToEnd` (or an `assertVisible` on the focused field)
between `tapOn` the search input and `inputText`, everywhere we type into a
search box — including `_helpers/open_listing_by_title.yaml`, which today does
`tapOn: {id: browse-search-input}` immediately followed by `inputText` and so
carries the same race into every flow that adopts it.

**Why this matters beyond these two flows:** a mangled query is a plausible
contributor to the "No visible element found: <listing title>" family. Partial
matches usually still return the row (which is why search-then-tap-by-testID is
robust), but a title-text assertion against a mangled query is not.

## 2. The RN perf-monitor overlay is switched on

Visible in every run-495 screenshot as a dark box in the top-right reading
`UI: 60.0 fps / 2xx dropped so far / 1x stutters (4+) so far`. It sits directly
over the browse screen's view-mode toggle and filters button, so a tap there can
land on the overlay instead of the control.

**Fix:** turn it off in the dev client (dev menu → "Hide Perf Monitor") and add a
doctor check so a pass never starts with it up. It is a per-app-install dev
setting, so it survives reboots and will keep contaminating passes until cleared.

## 3. A failed login should invalidate the pass, not produce N app-bug rows

`report_user` failed with "No connection" on the LOGIN screen, and
`report_user_then_block` ran to completion **unauthenticated** (its tab bar reads
Bazaar / Categories / Login). Those become `app_bug_or_flow` rows that look like
six defects.

**Fix:** in the summariser, if a failed flow's `.logcat` contains `Network Error`
against `EXPO_PUBLIC_API_URL`, or its final hierarchy shows the logged-out tab
set, classify it `env_fail` and say so in `summary.md`. The evidence is already
greppable — `grep -c 'Network Error' <flow>.logcat` separated run-495's flows
correctly on the first try.

---

## 4. Chat flows assert server data without waiting for it

**Proven, not inferred.** `conversation_archive`'s hierarchy dump at the failing
step (`debug-conversation_archive/.../screen-hierarchy/step-083-*.json`) contains
`conversations-search-bar`, `conversations-filter-chip-row` and the whole tab bar
— and **zero** `conversation-row-*` nodes. The list simply had not arrived. Its
own end-of-flow screenshot, three minutes later, shows three rows.

The testID is right, and it is a template literal — `conversation-row-${item.id}`
at `ConversationRow.tsx:209`. A first grep for `conversation-row` that stops at
`head -6` returns only a seller *test file* and reads as "stale selector", which
is exactly the trap the handbook warns about.

**Fix:** replace `assertVisible: {id: "conversation-row-\\d+"}` with
`extendedWaitUntil: {visible: {id: "conversation-row-\\d+"}, timeout: 20000}`
before the first use of a row. `maestro/chat/chat_older_messages_pagination.yaml`
already does exactly this and it PASSED in run-496 — the house pattern exists,
these flows just do not use it.

Affected (from run-496): `conversation_archive` (lines 31, 51, 76),
`block_from_conversation`, `conversation_read_status`. Also audit
`archive_conversation` (lines 23, 50, 55, 69, 80), `composer_draft` (52, 88) and
`conversations_filter` (44, 48) — same pattern, they happened to win the race.

**Do not edit these while a chat pass is running** — maestro reads each flow file
as that flow starts, so an edit mid-pass changes flows that have not run yet and
makes the pass unattributable.

## 5. Environmental noise is being recorded as flow/app failures

run-496 lost four flows in a row between 14:47 and 14:59:
`conversations_empty_state` (dev client could not reach Metro at all —
`java.net.SocketTimeoutException`, "There was a problem loading the project"),
then `conversations_filter`, `conversations_list`, `conversations_role_filter`
(all ending unauthenticated or on the login screen).

Metro was verified healthy right after (`/status` 200, process up 14h35m) and a
14:58 screenshot renders the app fine, so these were transient. Two contributing
causes worth fixing:

- **The host-pressure gate only runs BEFORE a pass.** A 49-flow chat pass takes
  hours, and load moves a lot inside that window — including from work this agent
  does on the host. The gate should be re-checked between flows, not once.
- **`adb reverse tcp:8081 tcp:3008` had disappeared** by 15:00, though the driver
  sets it at boot. Restored by hand. Worth re-asserting per pass (it is cheap and
  idempotent) rather than once at startup.

Combined with fix 3 above, the aim is that a pass which loses Metro or its login
reports `env_fail` and says so, instead of contributing rows that read like
product defects.

---

## 6. `_helpers/login.yaml` skips signing in when the login screen is slow — THE BIG ONE

This is the single highest-value fix in this file. It plausibly accounts for a
large share of failures across **every** feature, not just chat.

**The mechanism**, read straight off the helper:

```yaml
- runFlow: goto_login.yaml          # ends in waitForAnimationToEnd — does NOT
                                    # wait for the login form to exist
- runFlow:
    when:
      visible:
        id: "login-email-input"     # evaluated IMMEDIATELY
    commands:                       # ...so if the form has not rendered yet,
      - tapOn: {id: "login-email-input"}   # this whole block is SKIPPED,
      ...                                  # silently, and the flow carries on
                                           # UNAUTHENTICATED
- extendedWaitUntil:
    visible: {id: "profile-tab"}    # then waits 60s for a signed-in tab bar
    timeout: 60000                  # that can never appear for a guest
```

**The file already documents this exact failure shape from a different cause** —
the guard used to read the translated placeholder "Email", so it was false in
Pashto and Dari, "the whole sign-in block was skipped, and the gate below then
waited 60s for a tab bar that could never appear. Nine flows burned ~7m30s each
on that." The locale cause was fixed. The TIMING cause was not.

**Evidence it is happening now**, from run-495/496:
- `Completed 401` on `/users/me`, `/categories`, `/listings`,
  `/users/saved_searches` — the app making authenticated calls while genuinely
  logged out.
- Screenshots ending on the guest tab bar (Bazaar / Categories / Login) or an
  empty login form with no error banner.
- Flows failing on `profile-tab is visible`, on `"Switch to .*"` (login.yaml's
  own post-login mode check), and on row/data assertions that require a session.

**Ruled out, by checking rather than assuming:**
- *Bad credentials / the inputText truncation.* Every recent `POST
  /api/v1/auth/sign_in` in the API log returns **200 OK in ~950ms**. When the
  flow actually submits, it works.
- *A dead or unreachable API.* Same 200s, and the log's most recent entries are
  live conversations requests completing in ~257ms.
- *`goto_login.yaml` tapping the wrong tab for a guest.* It taps `profile-tab`,
  and that IS the guest Login tab — `app/(main)/(tabs)/_layout.tsx` swaps only
  the title (`isAuthenticated ? sidebar.profile : auth.login`) and keeps the
  testID. This helper is correct.

**Fix:** make the login screen's arrival a precondition instead of a guess —
`extendedWaitUntil: {visible: {id: "login-email-input"}, timeout: 20000}` at the
end of `goto_login.yaml` (optional there, since a warm authenticated app never
shows the form), and in `login.yaml` make the skip explicit: if
`login-email-input` is absent, assert that a signed-in handle IS present, so a
flow fails at the point of the real problem rather than 60 seconds later on a
tab bar.

> Note on log timestamps, which cost one wrong conclusion here: Rails logs in
> **UTC** (`+0000`) while the file mtime is local (+2). "Last sign_in at 13:31"
> next to an mtime of 15:35 looks like a two-hour-dead log and is in fact the
> same minute. Convert before concluding the API went quiet.

---

## Triage rule: two login failures that look identical in the log

Both end with the app on the login screen and both produce downstream failures
about a missing signed-in handle. The end-of-flow SCREENSHOT separates them, and
they need different fixes:

| Screenshot | Meaning | Fix |
|---|---|---|
| Fields **empty**, no error banner | the sign-in block was **skipped** — the guard found no `login-email-input` and the flow carried on unauthenticated | fix 6 |
| Fields **filled**, red "No connection" banner | the flow **did** submit and the request failed | fix 5 (host pressure) — the API itself answers `sign_in` 200 in ~950ms |

Observed: `meetup_respond` and `conversations_role_filter` are the first kind;
`report_user` is the second. Do not fix one by reaching for the other's cause.

---

## Candidate 8 UPDATE: block_from_conversation PASSED on re-run — it is INTERMITTENT

**run-526 (chat, quiet box): `block_from_conversation` PASSED in 171s.** In
run-523 it failed with the unblock succeeding and the thread still showing "You
can't message this user." with no composer.

Nothing was changed in that flow or in `Conversation.tsx` between the two runs, so
this is not a fix — **it is proof the failure is intermittent**, which is what the
single-shot-refetch hypothesis predicts: `unblockMutation.onSuccess` calls
`load()` exactly once with no retry, so it only fails when that one request races
the unblock's commit.

That strengthens the mechanism and simultaneously explains why it must NOT be
filed yet: an intermittent failure needs the navigate-away-and-back check to
distinguish "the UI never recovers" from "the UI recovered a moment later". Keep
watching it across passes and count the failure rate.

---

## REOPENED 2026-09-13: the identity switch is NOT fixed, and here is the proof

The section below closed this on 2026-09-05 with "the identity-switch bug now
fixed in login.yaml". run-526 (2026-09-13) shows the same thing, and this time
the evidence is direct rather than inferred. From `offer_counter_flow.logcat`:

```
Maestro : Skipping invisible child: ... packageName: com.hatiwal.app;
className: android.widget.TextView; text: This is your listing;
boundsInScreen: Rect(258, 1180 - 510, 1180); ... visible: false
```

The owner notice is ON SCREEN. Not inferred from "the only branch that can draw a
lone Ban pill" — the string itself is in the log, in FIVE flows:
offer_counter_flow, offer_quantity_round_trip, offer_send_and_accept,
offer_send_and_decline, reserve_after_accept.

**That also kills the guest hypothesis for good.** A guest renders the generic
`unavailableNotice` ("This item is no longer available"). The log says
`ownListingNotice`, so there WAS a currentUser and it was the seller. No card.

Verified the same pass, so the fixture is not in question:

| Checked | Result |
|---|---|
| listing 3210 via API as the buyer | `status=active`, `negotiable=true`, `available_units=1`, `held_units=0`, `expired=false`, price 3500.0 — matches the screenshot |
| owner of 3210 | seller id **420** (Omar Noori) |
| the buyer's own listings (`/my/listings`) | **zero** — so this is not a same-title listing owned by the buyer |
| `GET /blocks` as the buyer | `{"users":[]}` |

`isOwnListing = !!currentUser && currentUser.id === listing.seller?.id`
(ListingDetail.tsx:472). The notice fired, so currentUser.id was 420 — the app
was signed in as **Omar Noori**, while the flow had run `login.yaml`
(`EMAIL: buyer@hatiwal.test`, id 419) and its guard had visibly worked: step-027
`scrollUntilVisible-sign-out-button`, step-044 `login-email-input`. It signed out
and reached the login form, and still ended up on the seller.

**This is the single largest cause of failure in the campaign** — six STABLE FAIL
flows (0/5–0/6 each) that are not app bugs and not timing:
offer_counter_flow, offer_quantity_round_trip, offer_send_and_accept,
offer_send_and_decline, reserve_after_accept, reserve_after_buyer_accepts_counter.

**Wider than the offer family — update 02:0x.** run-526 adds two more, and the
count is now EIGHT stable-fail flows, none of them app bugs:

* `quick_replies` — the quick-reply row renders `quickReplies.SELLER.*`
  ("Yes, it's available", "Let's meet at [place]", "The price is firm") while the
  flow asserts `quickReplies.BUYER.stillAvailable`. The thread header also carries
  **Mark Sold**, a seller-only action.
* `report_participant` — the Rails log settles it from the server side. Both
  reports carry `reportable_id: 419` (the BUYER), and devise_token_auth updates
  the tokens of user **420** on each request, i.e. the CURRENT user is the seller.
  The seller was reporting the buyer, backwards from the flow's intent.

**Two probes, and they are not interchangeable:**

| Screen | How to tell | Do NOT use |
|---|---|---|
| ListingDetail | `grep -a "This is your listing" <flow>.logcat` | — |
| a chat thread | seller-only UI (Mark Sold) or `quickReplies.seller.*` copy in the screenshot | the owner-notice grep — that string lives on ListingDetail and is absent from threads whatever the identity |
| any request | `hatiwal-api/log/development.log` — the `UPDATE "users" ... WHERE "users"."id" = N` on each authenticated request names the CURRENT user | — |

The Rails-log probe is the strongest of the three: it names the authenticated
user directly, needs no screenshot, and works for every flow that makes a request.

**Not edited here:** `login.yaml` belongs to the 7d84539 session (see fixes 7
and 9). It needs its owner, and it needs re-verifying rather than re-closing —
the 09-05 entry closed it without a run that proved the switch had taken.

**Retracting my own fix.** I had added `extendedWaitUntil visible "Make an
Offer" timeout 20000` to these flows, reading an absent button as a slow one.
The button was absent because the app was RIGHT to hide it. A longer wait could
never have helped. Second time in one session I treated a state problem as a
timing problem (the other: the publish confirm dialog).

---

## RESOLVED — NOT AN APP BUG: the bare "no entry" pill was the OWNER notice

**Closed 2026-09-05.** The app was viewing its OWN listing, so `ownListingNotice`
is correct behaviour. Proof, in one step: the API reports that listing as
`status=active`, `negotiable=true`, `seller="Omar Noori"`, and
`listingAvailability.ts` makes the branches exhaustive — a non-owner buyer on a
live listing MUST get the Message/Offer row, and the generic "unavailable"
fallback is unreachable for a live status. The only branch that can draw a lone
`Ban` pill with no action row is `isOwnListing`. So the flow was running as the
owner, which is the identity-switch bug now fixed in login.yaml — no product
defect, no card filed. The guest hypothesis below was wrong.

Original write-up kept for the reasoning trail:

### (superseded) OPEN CANDIDATE: listing detail shows a bare "no entry" pill and NO action row, on an ACTIVE listing

**Status: unattributed. Do NOT file this as an app bug until the device check
below is done.** Three plausible causes have already been ruled out, which is
exactly why the remaining one must be confirmed rather than assumed.

**What was seen.** run-496 `reserve_after_accept`, end-of-flow screenshot: the
listing detail for "Men Winter Jacket XL Black" (AFN 3,500) renders correctly —
gallery 1/3, price, title, "Clothes & Fashion", Kandahar, 8 views, Description —
and the bottom action area is a single wide pill containing a centred `Ban`
(no-entry) glyph and **no readable label**. The flow then failed on
`Element not found: Text matching regex: Make an Offer`.

The step-093 hierarchy dump agrees: the detail screen's text is all present
(title, price, category, location, views, "Description") and there is **no action
button of any kind** — nothing matching offer / contact / message / cta.

`ListingDetail.tsx` has three branches that can render `Ban` + a label:
`isOwnListing` -> `listing.detail.ownListingNotice`, the generic fallback ->
`listing.detail.unavailableNotice`, and a sold listing routes to
`ListingUnavailableActions` instead (which draws no Ban pill).

**Ruled out, each by checking:**

| Hypothesis | Checked | Result |
|---|---|---|
| Missing translation, so the label renders empty | all 3 locales | present — en "This is your listing" / "This item is no longer available", plus ps and fa |
| Listing is sold, i.e. a legitimate dead end | API, live | `status=active`, `qty=1`, `sold=None` — and a sold listing would render `ListingUnavailableActions`, not a Ban pill |
| Buyer had blocked the seller earlier in the pass (block_from_conversation, block_user and report_user_then_block all ran before it) | `GET /api/v1/blocks` as the buyer | `{"users":[]}` — no block |
| Flow ran as the listing's OWNER, making the notice correct | flow order | `login.yaml` (buyer) is line 74, the offer tap line 95, `login_seller.yaml` only line 108 — so the buyer should have been active, and steps 026-046 (sign-out -> onboarding -> login form -> notification permission) show a real fresh sign-in happened |

**The remaining hypothesis** is that the app was a GUEST at that moment — a
guest viewing an active listing would fall through to the generic branch. If so
there are two things to fix, one in each layer: the auth path (why a guest), and
the copy — telling a guest "This item is no longer available" about a live
listing is misleading, where "Log in to message the seller" is the useful
message.

**To confirm, on an idle device:** open an active listing not owned by you, as
(a) the buyer and (b) a guest, and read the bottom action area each time. If the
guest sees the Ban pill on a live listing, that is a real product defect and
should get a FlowApp card; if the buyer sees a proper Message/Offer row, the flow
failure is purely the auth path and belongs to fix 6's family.

---

## Confirmed working: `_helpers/open_listing_by_title.yaml`

Worth recording, because it de-risks the pending rollout. It is ALREADY wired
into three chat flows (`offer_send_and_accept`, `offer_send_and_decline`,
`reserve_after_accept`) and it **does its job**: `reserve_after_accept`'s
screenshot is the correct listing detail for the requested title. Those three
flows fail AFTER the helper, on the action row above — not on reaching the
listing.

Contrast `reserve_after_buyer_accepts_counter`, which does its own search and
tap: its screenshot is the browse screen with the query typed, one result card
rendered, and **the IME covering the lower half of that card** — the exact defect
the helper's `dismiss_keyboard_by_drag` + wait-on-`listing-card` +
tap-by-testID sequence exists to prevent.

So the rollout is safe to proceed with: the pattern is proven on this very run.

---

## 7. FOR THE login.yaml OWNER: 134 flows tap a tab the instant the helper returns

**Not applied here — `login.yaml` / `login_seller.yaml` belong to the session that
committed 7d84539, and this is a one-line change in each rather than something to
race over.** Flagged because the blast radius is large and the symptom is
misleading.

**The shape**, counted across `maestro/`:

```
- runFlow: ../_helpers/login.yaml          # or login_seller.yaml
- tapOn:
    id: "browse-tab"                       # or profile-tab, chat-tab, ...
```

**134 flows** do exactly this — more than half the suite.

**The symptom when it loses the race** (run-522, `seller/listing_actions_sheet`,
on its first action):

```
Element not found: Id matching regex: browse-tab
```

which reads like a dead testID and is not: `browse-tab` is declared in
`app/(main)/(tabs)/_layout.tsx` and every other flow taps it happily. The tab bar
just had not mounted yet. This is the same class already fixed three times in
this campaign — a `when:`/tap racing a screen that is still coming up — and it is
why "Element not found: <a testID that plainly exists>" should be read as a
timing failure until proven otherwise.

**The fix, at the source rather than in 134 files:** end both login helpers by
waiting for the tab bar.

```yaml
- extendedWaitUntil:
    visible:
      id: "browse-tab"
    timeout: 20000
    optional: true
```

`browse-tab` is the right probe because every tab bar renders it whichever tab is
selected — `_helpers/pop_to_tab_bar.yaml` already uses it for that reason.
`optional: true` keeps a caller that legitimately ends elsewhere unaffected.

**Do NOT reach for `pop_to_tab_bar.yaml` here.** It recovers by pressing BACK up
to twice, and Back has already exited this app to the Android home screen once in
this campaign (the hideKeyboard revert, 2026-09-05). After a login helper the app
is on Profile with a tab bar that is merely late — Back would navigate away from a
correct screen to fix a timing problem.

`seller/listing_actions_sheet` has the wait inline already, as the worked example.

---

## 8. CANDIDATE APP BUG: unblock succeeds but the thread stays blocked

**Not filed as a FlowApp card — the mechanism is not proven.** Recorded because
the evidence is clean and it came off the first QUIET pass in days.

**Evidence** (run-523 `block_from_conversation`, 188s, no SUSPECT PASS, no
rig_fail anywhere in the pass):

- step-081 asserted the **"User unblocked"** toast — so the unblock request
  succeeded and the app said so.
- step-082's hierarchy still shows **"You can't message this user."** and no
  `Type a message...` composer.
- The server was clean at that moment, checked directly:
  `GET /api/v1/blocks` -> `{"users":[]}`, and **0 of 8** conversations report
  `blockedWithParticipant` or `blockedByMe`.

So the block really was lifted, and the UI did not follow.

**Mechanism candidate.** `unblockMutation.onSuccess` sets `blockedByMe` false and
then calls `load(currentConversationId)` **exactly once**, with no retry.
`isBlocked` — the flag that renders the banner and hides the composer — is
re-derived *only* from that fetch (`Conversation.tsx:565`,
`setIsBlocked(conv.blockedWithParticipant ?? false)`). If that single request
races the unblock's commit and comes back `true`, nothing re-fetches again and
the thread stays blocked until the user navigates away.

The single-shot refetch is deliberate: the code comment explains that asserting
`false` optimistically caused the flicker-then-vanish in card 312. That reasoning
is sound — but "ask the server once, immediately" trades one race for another.

**Cannot be proven from the artifacts:** the flow's `.logcat` does not record API
traffic, so there is no record of what that fetch returned.

**To confirm, cheaply:** re-run the flow and, on failure, navigate out of the
thread and back in. If the composer returns, the single-shot refetch is the bug.

**Suggested fix if confirmed:** have the unblock endpoint return the updated
conversation block state and use it directly — no second round trip and no race.
Failing that, invalidate the conversation query so React Query refetches, rather
than one manual `load()`.

---

## 9. FOR THE login_seller.yaml OWNER: the mode gate at line 342 does not scroll

**Not applied here — `login_seller.yaml` belongs to the session that committed
7d84539, and the proven fix already exists in a sibling helper, so this is a copy
rather than a design problem.**

**Symptom** (run-523, a clean pass — load ~8, zero SUSPECT PASS, zero rig_fail):

```
Assertion is false: "Switch to .*" is visible
```

in `meetup_decline` (396s) and `meetup_full_cycle` (477s).

**It is not a missing toggle.** The screen-hierarchy dump at the failing step is
the Profile screen scrolled DOWN into its settings section — `ACTIVITY`,
`Appearance`, `Blocked Users`, `Hidden Listings`, `Language`, `My Reports`. The
mode toggle lives at the TOP of Profile, so it is simply above the viewport.

**The file already predicts this.** Its own comment at line 118 says the gate
"does not scroll either", and `login.yaml:141` repeats it. There IS an UP scroll
at line 127 — but it targets `profile-display-name` inside the wrong-account
branch, and that branch is skipped when the right account is already signed in.
The gate at line 342 then runs against whatever scroll position the previous flow
left behind, because the tab navigator keeps Profile mounted.

**The fix is already written and working**, in `_helpers/ensure_buyer_mode.yaml`
around line 114 — scroll UP to the toggle before gating on it:

```yaml
- scrollUntilVisible:
    element:
      text: "Switch to .*"
    direction: UP
    timeout: 20000
    # NOT centerElement: the toggle sits near the very top and cannot be
    # centred, which is how CENTERELEM failures are manufactured.
```

`direction: UP` is the whole point, and that helper's comment records why: an
earlier attempt used a bare `scrollUntilVisible`, which only ever scrolls DOWN
and so carried the toggle further away — exactly the "scrolled the toggle AWAY
and then could not find it" failure noted at login_seller.yaml:334.

Two flows lost to it in a single clean pass, and it will hit any flow that
reaches `login_seller.yaml` with Profile left scrolled.

---

## Measurement note: the clean pass scored the SAME as the contended one

run-523 ran on a quiet box — load ~5-8, one emulator, **zero SUSPECT PASS lines**
— and finished **27 pass / 22 fail of 49 = 55%**.

run-521, which ran through the contention window at load 17-25, finished
**27 pass / 22 fail = 55%**. Identical.

**This corrects an expectation recorded earlier in this campaign.** When run-521
came in at 55% it was written up as "not comparable, degraded by contention",
with the implication that a quiet box would score better. It did not. The honest
reading is that **contention was never the main driver of the failure count** —
it cost wall-clock (16065s vs a ~208s/flow baseline) and two `rig_fail` timeouts,
but the failures themselves were waiting underneath either way.

The overlap confirms it: **19 of 22 failures are the same flows in both runs.**
The three that differ each have an explanation, and none of them is "the box was
busy":

| Only failed in run-521 | Only failed in run-523 |
|---|---|
| meetup_respond, send_message, send_message_double_tap | block_from_conversation, conversation_delete, meetup_decline |

Two of the run-521-only three (`send_message`, `send_message_double_tap`) were
`rig_fail` timeouts in that run and PASSED cleanly in run-523, which is the one
place contention did show up.

**What this means for reading the next pass.** Nothing shipped in this campaign
had landed when run-523 started, so 55% is the BASELINE, not a verdict on the
fixes. run-524 is the first pass carrying them: the listing-opener conversions,
the "Make an Offer" waits in six flows, the role-chip horizontal scroll, the
corrected offline assertion, the start_conversation conversion, and the 2x
timeout for account-switching flows. Judge the work there — and by failure SHAPE
first, since a pass rate alone hid this for two runs.

### Seller confirms the same thing chat did

run-524 (seller, quiet box, zero SUSPECT PASS): **5 pass / 13 fail of 18 = 27%**.
run-516, four days earlier: **5 pass / 13 fail = 27%**. Identical, like chat's
55% was identical across run-521 and run-523.

Two features, two pairs of runs, same totals each time. These suites fail on a
STABLE set of causes — they are not noisy, and they are not primarily
contention-driven. That is good news for this campaign's method: a fix that
removes a cause should move the number, and nothing else should.

Almost every seller fix landed DURING run-524, so the flows that ran before it
could not benefit. The next seller pass is the verdict on: the tab-bar wait in
listing_actions_sheet (already showing progress — it now fails much later, at
"Listing published!"), the action-bar wait in listing_conversations, the dialog
wait in publish_from_owner_detail, the sheet wait in multi_quantity_partial_sale,
and the search_my_shop conversions in mark_sold_all_units and
multi_quantity_offplatform_sale.

One family to watch there: THREE flows now fail around publishing —
listing_actions_sheet at "Listing published!", publish_from_owner_detail at the
confirm dialog, and sell_without_reserving at "Publish". publish_success PASSES,
so the publish path itself works; the three are almost certainly the same
async-assert shape, but that should be confirmed from evidence rather than
assumed because it is convenient.

---

## run-526: the first pass carrying the campaign's fixes — and a caution about reading it

Like-for-like on the seven flows run-526 had completed, against run-523:

```
run-523   5 pass / 2 fail
run-526   7 pass / 0 fail
```

**Neither of the two that flipped was fixed by this campaign**, and that is worth
stating plainly rather than banking as a win:

| flow | 523 | 526 | was it fixed here? |
|---|---|---|---|
| `block_from_conversation` | fail | pass | **No** — this is candidate bug 8, deliberately left unfiled and untouched |
| `conversation_delete` | fail | pass | **No** — explicitly NOT converted; it scrolls the CONVERSATIONS list and needs the conversations search bar, not search_my_shop |

Both are therefore **intermittent**, not repaired. That is useful in two
directions: it confirms candidate 8 is a race rather than a permanent broken
state, and it warns that `conversation_delete`'s scroll sometimes wins — so its
pending fix is still needed and should not be dropped because a pass went green.

**None of the campaign's actual fixes has been exercised yet at this point in the
pass.** The six "Make an Offer" waits, the role-chip scroll, the corrected offline
assertion, `start_conversation`'s conversion and the 2x timeout all sit later in
the alphabet. Judge them when those flows run, not on this prefix.

---

## Two testers, measured properly this time: the cost is +5%, not +26%

The owner asked for parallel testing again, so session 2 was relaunched on
2026-09-12 and measured against a recorded baseline. **The naive reading and the
controlled reading disagree, and the controlled one is right.**

Naive (session 1's own flows, before vs after the launch):

```
before session 2:  10 flows, mean 194s
with session 2:     5 flows, mean 234s      -> looks like +21%
```

Controlled (the SAME flows compared against run-523, which had no second tester):

```
before session 2:  10 flows   523: 198s  ->  526: 194s   =  -2%
with session 2:     5 flows   523: 223s  ->  526: 234s   =  +5%
```

The apparent +21% is almost entirely **flow difficulty**: those five flows took
223s in run-523 as well, with nothing else running. The real cost of the second
emulator is about **+5%**, and session 1 has produced **zero rig_fail rows**.

**This also corrects the earlier figure in this file.** The "+26%" recorded when
session 2 was first stopped came from the same flawed first-N-vs-last-N
comparison, so it overstated the cost. What genuinely justified stopping it then
was the *independent* evidence: load 21.4, and two flows lost outright to the
600s cap. Those were real; the percentage was not measured properly.

**Conditions are also materially different now.** Load is sitting at ~9.9 on 16
cores rather than 21, the suite now waits explicitly for async content wherever
it used to race, and double-login flows have 2x FLOW_TIMEOUT — so a slower device
costs wall clock instead of manufacturing failures.

**Session 2 is producing real coverage**, not noise: `browse_rtl_dari` and
`browse_rtl_pashto` both PASS at 411dp — a viewport and a locale direction
session 1 never exercises.

**The tripwire stands unchanged**: stop session 2 if session 1's same-flow cost
exceeds roughly +20%, or if session 1 produces any `rig_fail` row.

**Method note worth keeping:** never compare "first N vs last N" within a run to
judge load. Flows run alphabetically and the tail is heavier. Compare the same
flow across runs, or the number is difficulty wearing a contention costume.

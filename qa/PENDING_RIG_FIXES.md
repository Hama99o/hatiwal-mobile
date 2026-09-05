# Pending rig fixes — queued for the next quiet window

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

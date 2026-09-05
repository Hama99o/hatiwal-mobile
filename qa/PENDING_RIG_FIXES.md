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

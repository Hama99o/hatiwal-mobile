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

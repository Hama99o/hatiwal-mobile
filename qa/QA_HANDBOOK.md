# Hatiwal Mobile — QA Handbook

**The one document to read before testing this app.** If you are a new session
starting QA work, read this top to bottom once. Everything needed to run a real
test pass is here, including every trap that has already cost hours.

> **Running more than one QA session at once?** Prefix every command with
> `QA_SESSION=n` — each session drives its own emulator, with its own device lock
> and its own `qa/reports/sn/` directory, all from the same APK. And to test a
> form factor you have no AVD for, `QA_SESSION=n ./qa/qa.sh profile small|large|tablet`.
> Both are documented in [README.md](README.md#several-qa-sessions-at-once-one-emulator-each).
> Using this rig on a DIFFERENT app: copy `qa.config.example.sh` to
> `qa.config.sh` — the machinery needs no edits.

Scope: **Android, mobile only.** iOS cannot be driven from this machine (needs
macOS + Xcode). The web app has its own path — use the `qa-sweep` skill for that.

---

## 1. What this is

A real-data end-to-end test rig. The APK behaves like **staging**: it runs against
the real Rails API with real seeded data. **There are no mocks in the E2E layer.**
Mocks exist only in the Jest unit layer, which is where they belong.

Three layers, all reachable from one command:

| Layer | Tool | Answers |
|---|---|---|
| E2E | Maestro on an Android emulator | does the feature work on a device? |
| Unit | Jest (127 suites / 2125 tests) | does each piece work in isolation? |
| Visual | screenshots from every flow | does the screen actually look right? |

### Files

| Path | What it is |
|---|---|
| `qa/qa.sh` | the only entry point |
| `qa/features.yaml` | the manifest: 17 features → flows, Jest globs, API endpoints |
| `qa/FLOW_REGISTER.md` | the board — every flow, status, your triage notes |
| `qa/UI_FINDINGS.md` | every visual/UX defect, with severity and evidence |
| `qa/README.md` | rig internals and troubleshooting detail |
| `qa/lib/*` | the implementation (doctor, emulator, flows, report, register) |
| `qa/reports/run-00N/` | per-run evidence: logs, logcat, screenshots |
| `maestro/` | 214 flows across 17 areas + 5 shared helpers |

---

## 2. Ground rules

These are not suggestions. Each one exists because breaking it cost real time.

1. **Always run `./qa/qa.sh doctor` first.** If it blocks, fix the rig. Never run
   flows against a failed preflight — the results are noise.
2. **Never build the APK while the emulator runs.** Gradle takes every core, the
   emulator ANRs ("Emulator is not responding"), and every flow fails for no app
   reason. Build → *then* boot.
3. **Fix what you find, in the same pass.** Owner's standing instruction: find a
   defect, fix it, re-run the flow to prove it, continue. Do not stop to ask.
   Only pause when a fix changes product behaviour reasonable people could
   disagree about (dropping a feature, rewriting copy in 3 locales, altering the
   listing lifecycle) — state a recommendation and carry on with the rest.
4. **A red flow is not automatically an app bug.** Classify it (§6) before
   touching app code.
5. **A green flow is not automatically a good screen.** Look at the screenshot.
   Logging defects is the reviewer's job, not the owner's.
6. **Never kill `maestro` mid-run.** It kills the on-device driver, and every
   flow afterwards fails with `0s` / `unknown` — meaningless results that look
   like app failures. If you must stop, expect to re-run with
   `--reinstall-driver` and discard the tail of that run.
7. **Never `git stash` / `git checkout --` / `git reset --hard` / `git add -A`.**
   Several agents share this checkout. See the root `CLAUDE.md`.
8. **Do not edit `qa/qa.sh` while a `qa.sh` command is running.** Bash reads
   scripts incrementally and will choke on shifted bytes mid-execution.

---

### Never ask `when: visible` about a screen you have not waited for

This single mistake produced more fake app bugs than anything else in this rig,
in three different places, and every one of them looked like a product defect on
perfectly healthy code.

`when: visible` (and `runFlow: when:`) is a **short poll that then commits to a
verdict**. Ask it about something that has not drawn yet and the answer is "no",
the guarded block is silently skipped, and the flow marches on against a screen
it was never designed for. What you get in the report is an assertion failure
several steps later, naming an element that has nothing to do with the cause.

The worst instance: `open_bundle.yaml` asked *"is the launcher visible?"* 7s after
`launchApp: clearState: true` — before expo-dev-launcher had rendered — so it
skipped the entire enter-the-bundle block and left the app parked on the launcher
for the whole flow. The reported failure was `Element not found: Email`. Nothing
was wrong with the login screen; the app had never been opened.

**The rule:** wait for the thing (`extendedWaitUntil`, `optional: true` where its
absence is legal), *then* branch on it. And prefer a **positive** gate — waiting
for something to appear — over `notVisible`, which passes instantly on a blank
screen and therefore proves nothing. "The bundling banner is gone" is not "the app
is up": that banner is itself drawn by JS, so before the first render there is
nothing to see.

### Never target a control by percentage `point:`

A `tapOn: point: "90%,10%"` is form-factor dependent, and the rig's whole purpose
is to run several form factors. The dev-menu close control sits a fixed ~68px from
the right edge: 93.7% on a 1080-wide phone, **96.1% on a 2560-wide tablet**. The
tap worked on phones for weeks and hit empty header on the tablet, leaving the dev
panel covering the app for entire flows. Target the element — that panel exposes a
`Close` accessibility label. Keep a point tap only as a last-resort fallback.

## 3. Environment facts you must know

### The API address is always `10.0.2.2` — never a LAN IP

From inside an Android emulator, `10.0.2.2` **is** the host. It does not change
between office WiFi and a home hotspot, and it works with no network at all.

This machine moves between networks, and `.env` carries a LAN IP per network. A
stale LAN IP makes every request fail in a way that looks exactly like an app bug.
So the rig pins `10.0.2.2`, and Metro must agree because it inlines
`EXPO_PUBLIC_API_URL` at build time:

```bash
HOST_IP=10.0.2.2 docker compose up -d mobile
```

`./qa/qa.sh doctor` verifies this by reading the env out of the running container.

**Real-device testing is the exception** — a phone needs the actual LAN IP:

```bash
./qa/qa.sh net            # report what is stale
./qa/qa.sh net --write    # sync .env to the network you are on (backs up to .env.bak)
```

### Ports

| Port | What |
|---|---|
| `3007` | Rails API (Docker `hatiwal-api-web-1`) |
| `3008` | Metro for **Hatiwal** (Docker `hatiwal-mobile-mobile-1`) |
| `3098` | ActionCable |
| `8081` | **danger zone** — see below |

### Another Expo project can hijack your app

The dev-client launcher auto-discovers `10.0.2.2:8081`, and `10.0.2.2` addresses
the host **directly** — `adb reverse` does not intercept it. If another Expo
project holds host `:8081`, **its JS bundle loads into the Hatiwal APK**.

This happened: `edu-safi` (Madares) was on `:8081`, the in-app dev menu read
"Madares", and the app died on `Cannot find native module 'ExpoLocalization'` — a
module Madares imports and Hatiwal does not. It looks exactly like a Hatiwal bug
and is not one.

`doctor` step 4 now blocks on this. Identify what is serving a port:

```bash
curl -s http://localhost:8081/ | grep -oE '"name":"[^"]*"' | head -1
```

### The QA build must be a debug build

`src/api/http.ts` **throws at startup** when a non-`__DEV__` build points at a
local or plain-http API. So:

- QA against local data **requires** a debug build **and** Metro running.
- The preview/production APKs point at the **live** API. Running write-flows with
  one of those creates real listings in production. Don't.

Consequence: the app opens the `expo-dev-client` launcher instead of the app.
`maestro/_helpers/open_bundle.yaml` handles that; see §5.

### Machine capacity matters

An emulator needs real CPU. At load 63 on 16 cores it froze repeatedly and the
System UI ANR'd. What fixed it:

- killed runaway processes (6 stale `pollinations-mcp` at 90–97% CPU each)
- stopped 18 non-Hatiwal Docker containers (kept all `hatiwal-*`)
- switched the emulator from `-gpu swiftshader_indirect` (software rendering,
  burns host CPU) to `-gpu host`

Result: load 63 → ~5, and boot 105s → ~10s via snapshot.

---

## 4. Running a session

### One-time (or after native changes)

```bash
./qa/qa.sh doctor      # 8-step preflight
./qa/qa.sh build       # debug APK — run ALONE, nothing else heavy
./qa/qa.sh up          # boot emulator, disable animations, install, adb reverse
./qa/qa.sh seed        # rake db:seed:reset_e2e, then verifies login actually works
```

**When you must rebuild the APK** — only these:

| Change | Rebuild? |
|---|---|
| screen, component, hook, API module, store, translations | **No** — Metro serves it |
| a Maestro flow | **No** |
| new package with **native** code | **Yes** |
| `app.json` native config (permissions, package, icons, splash) | **Yes** |
| Expo SDK / React Native upgrade | **Yes** |

First build ~15 min; later ones ~2–4 min because the NDK output (~858 MB) is
cached. Wiping `android/` (e.g. `expo prebuild --clean`) costs the full build again.

### Every test pass

```bash
./qa/qa.sh doctor              # never skip
./qa/qa.sh smoke               # ~24 flows, one per feature — fast signal
./qa/qa.sh feature chat        # deep: all flows of one feature + its Jest suites
./qa/qa.sh flow chat/send_message   # ONE flow, ~30s — the fix→retest loop
./qa/qa.sh triage              # re-print the last report
./qa/qa.sh register            # refresh FLOW_REGISTER.md
./qa/qa.sh list                # the manifest with counts
./qa/qa.sh down                # stop the emulator (saves a boot snapshot)
```

Run `smoke` before a deep pass. If a feature's fastest flow is already red, a
38-flow deep run just gives you 38 copies of the same failure.

### Rough timings

| Command | Flows | Estimate |
|---|---|---|
| `flow <one>` | 1 | ~30s–2 min |
| `smoke` | 24 | ~30–50 min |
| `feature chat` | 38 | ~45–75 min |
| `all` | 214 | several hours |

---

## 5. How a flow actually starts

Every flow goes through shared helpers. Understanding them prevents
misdiagnosing their side effects as app bugs.

| Helper | Does |
|---|---|
| `open_bundle.yaml` | gets past the dev-client launcher into the Hatiwal bundle: types `http://10.0.2.2:3008`, waits out `Bundling nn%`, dismisses the dev-menu sheet, closes the dev-menu panel with Back, switches to English **only if** the UI is in Pashto, dismisses the known post-reload LogBox |
| `skip_onboarding.yaml` | taps `Skip` on the first-run carousel |
| `goto_login.yaml` | `skip_onboarding` + taps the `Login` tab to reach the login screen |
| `login.yaml` | **warm launch** (no `clearState`), enters the bundle, signs in if the form is showing, then proves authentication |
| `login_seller.yaml` | same, as `seller@hatiwal.test` |

### Why `login.yaml` does NOT use `clearState: true`

`clearState` wipes three things at once, and each cost a fragile UI dance on
**every** flow:

1. the dev-client's remembered Metro server → launcher, type URL, Connect
2. the dev-menu "intro" dismissal → a sheet covering the screen
3. all app state → the app becomes first-run → onboarding carousel

That was ~60s and ~10 brittle steps per flow — roughly **3 hours** across 214
flows. A warm launch keeps all of it settled.

**The trade-off, stated plainly:** less isolation. State carries over between
flows. A flow that genuinely needs a clean slate (onboarding, first-run,
empty-state) must clear it itself with `launchApp: clearState: true` followed by
`open_bundle.yaml`.

### The app's real first-run path

```
onboarding carousel --Skip--> guest Bazaar --Login tab--> login screen
```

Both onboarding **and** the login screen show the heading "Welcome to Hatiwal", so
a flow can assert that successfully while sitting on the **wrong screen** and then
fail on the next line. The login screen is the one that also shows
"Buy and sell locally in Afghanistan".

### Assert authentication, not arrival

`"Bazaar"` is visible to **guests**. Asserting it after signing in produces a
**false pass** — worse than a failure, because it hides everything downstream. The
tell is the last tab: `"Me"` when authenticated, `"Login"` when not. So
`login.yaml` asserts `"Me"` visible **and** `"Login"` absent.

### Test accounts (`hatiwal-api/db/seeds/e2e.rb`)

| Account | Password | Notes |
|---|---|---|
| `buyer@hatiwal.test` | `Password123!` | Ahmad Karimi — saved listings, 1 purchase |
| `seller@hatiwal.test` | `Password123!` | Omar Noori — draft/active/reserved/sold |
| `newbuyer@hatiwal.test` | `Password123!` | fresh, no history |

Maestro evaluates `${...}` as **JavaScript**. Bash-style defaults
(`${EMAIL:-"x"}`) do **not** mean "or default" — they evaluate to `NaN`, and every
affected flow typed the literal `NaN` into both fields. Use an `env:` block in the
flow's front matter; `--env` still overrides it.

---

## 6. Triaging a failure

The report groups failures **by cause**, because the first question is always "is
this the app or the rig?"

| Kind | Meaning | Action |
|---|---|---|
| `app_crash` | FATAL EXCEPTION in logcat | real defect — fix the app |
| `app_error` | red box / JS console error | real app error — fix before trusting anything after it |
| `silent_api_error` | **flow passed while the API was failing** | a defect, not a pass — see below |
| `app_bug_or_flow` | an assertion failed | triage: real bug, or a stale selector |
| `rig_fail` | Metro/emulator/backend broke mid-run | meaningless — re-run |
| `unknown` | cause unclear | read the log |

### `SILENT` is never a pass

A flow whose assertions passed while logcat showed `AxiosError` /
`Request failed with status code` / an unhandled rejection is reported as
`silent_api_error`. The screen looked right while the request failed. That is
exactly the bug users report as *"nothing happened"*, and assertions are blind to
it. Treat it as a defect and say so.

### How to decide app-bug vs flow-bug — from evidence, not intuition

For every failure, in this order:

1. `qa/reports/run-00N/<feature>/<flow>.log` — Maestro names the step and selector.
2. `qa/reports/run-00N/<feature>/screens/<flow>.png` — **look at the screen.** This
   alone has explained most failures instantly.
3. `<flow>.logcat` — API errors before blaming the UI.
4. Grep the app for the selector. Gone → **flow bug**, fix the YAML. Present but
   the screen is wrong → **app bug**, fix the app.

Full step-by-step detail lives in Maestro's own debug output:
`~/.maestro/tests/<timestamp>/<flow>/` — `commands.json`, `screen-hierarchy/`,
per-step screenshots.

### Record the verdict

Put it in the `Triage` column of `qa/FLOW_REGISTER.md`. That file is
**regenerated** from run data, but `Triage` and `Notes` are parsed back out and
preserved — they are the campaign's memory. Without them the next session
re-triages the same flow.

| Triage | Means |
|---|---|
| `app-bug` | app is wrong → fix code, re-run |
| `flow-bug` | selector/expectation stale → fix YAML, re-run |
| `ux` | works but reads badly → log in `UI_FINDINGS.md` |
| `fixed?` | fixed, awaiting re-run |
| `fixed` | fixed and re-run green |
| `wontfix` | deliberate, reason in Notes |

---

## 7. Reviewing the UI (do not skip this)

Maestro can only tell you an element **exists**. Every flow leaves a screenshot at
`qa/reports/run-00N/<feature>/screens/<flow>.png`, **pass or fail** — open them.

Check against `docs/DESIGN_INSPIRATION.md` and `docs/DESIGN_SYSTEM.md`:

- **clipping / overflow** — a control sliced at a card edge (found: the review-nudge chevron)
- **truncation** — `Categor…` in the tab bar
- **grammar and pluralization** — `1 Items Bought`
- **contrast** — muted text at `opacity: 0.6` on a legally-required action
- **consistency** — one row underlined while its siblings are not
- **error copy** — does the message name the *actual* problem?
- **empty states, loading states, touch targets (44×44 min)**
- **RTL** (ps/fa) and **dark mode**

Log everything in `qa/UI_FINDINGS.md` with severity, evidence path, and status.
Hand genuine design work to the `marketplace-designer` agent.

---

## 8. Fix, verify, commit

```
smoke  →  feature <name>  →  read summary.md  →  triage from evidence
                                     ↓
                          FIX IT (app / flow / rig)
                                     ↓
                    ./qa/qa.sh flow <area>/<name>     (~30s, no rebuild)
                                     ↓
                              green? → commit
```

**Verification is not optional.** After any app-code change:

```bash
npx jest --watchAll=false          # all 127 suites must stay green
```

Backend changes additionally require, per the root `CLAUDE.md`:

```bash
cd ../hatiwal-api
bundle exec rspec                  # all green
bundle exec rubocop                # no offenses
```

Watch for tests that were **pinning the bug in place**. One asserted the old bare
`"common.error"`; the correct move was updating the expectation to the better
behaviour, not reverting the fix. Say so when it happens.

Commits go to **`vicatio-branch`**, never `main`. Commit only files belonging to
your fix. Pair the fix with its evidence:

```
fix(chat): show an error toast when sending a message fails

qa: chat/send_message was SILENT — the request 422'd and the composer just
cleared, so the user believed the message had sent. Flow now PASS, 0 api errors.
```

---

## 9. Symptom → cause → fix

| Symptom | Cause | Fix |
|---|---|---|
| "Emulator is not responding" | CPU starvation, not a broken Android Studio | check `uptime` vs `nproc`; never build while the emulator runs |
| `adb devices` empty but `qemu` alive, ports 5554/5555 gone | emulator wedged; `adb kill-server` won't help | `kill -9 $(pgrep -f "qemu-system-x86_64.*qa_phone")` then `./qa/qa.sh up` |
| Dev menu shows another app's name; missing native module | another Expo project on host `:8081` | stop it, or let `open_bundle.yaml` type `10.0.2.2:3008` |
| Red box pointing at code you already deleted | Metro served a stale bundle (its cache lives in the container's anonymous `node_modules` volume; `--clear` runs only at start) | `docker restart hatiwal-mobile-mobile-1` |
| Wall of `rig_fail` | Metro OOM'd (exit 137) | the runner restarts it; check Metro before touching code |
| Flows fail `0s` with `unknown` | Maestro's on-device driver died (usually because it was killed) | re-run with `--reinstall-driver`; discard those results |
| `Unresolved reference 'R'` / `'BuildConfig'` | stale generated `android/` disagreeing with `app.json` | align `namespace`/`applicationId`; see `README.md` |
| `cannot find symbol com.hatiwal.BuildConfig` | stale **root** `android/build/generated/autolinking/autolinking.json`, and a warm Gradle daemon never re-runs the config command | `./gradlew --stop`, delete that dir, rebuild |
| Every login fails with "Invalid login credentials" | bash-style `${EMAIL:-...}` evaluating to `NaN` | `env:` block |
| Login "passes" but nothing is logged in | asserted `"Bazaar"`, which guests see | assert `"Me"` present and `"Login"` absent |
| `timeout 30 adb_qa …` fails with exit 127 | `timeout` cannot execute a shell function | use `adb_qa_t <secs> …` |
| `Element not found: Email` on a flow that logs in fine by hand | the app never left the expo-dev-launcher — a `when: visible` check ran before the launcher drew and skipped the whole enter-the-bundle block | wait, then branch (see §2); read Maestro's `--debug-output` `maestro.log`, which timestamps every command and shows the skipped body |
| An assertion fails while the screenshot shows the app looking fine | the dev-menu panel is covering it (it is a separate window, so the app's own views are absent from the hierarchy — a `hierarchy` dump returning 3 strings is the tell) | dismiss by the `Close` label, never a percentage `point:` |
| `rig_fail` with `(no message captured)` and an empty `.log` | `FLOW_TIMEOUT` killed Maestro before it wrote anything | it is 480s; a cold flow pays launcher entry + a full bundle transform before step 1, and a second session doubles that |
| "Another emulator instance is running" but nothing is running | stale `hardware-qemu.ini.lock` / `multiinstance.lock` from an emulator killed uncleanly | `up` clears them when no live qemu holds the AVD; if two sessions want one AVD, give them separate ones (`QA_AVD_n`) |
| `FLOW_REGISTER.md` suddenly reports far fewer passing flows | a second session regenerated it (fixed: it now merges every `reports/sN/`) — or you ran the generator against a stale tree | `./qa/qa.sh register`; run labels are qualified `s2/run-055` |
| A green `PASS` row still shows a failure message in `Notes` | an auto-filled reason was being preserved as if a human wrote it (fixed) | re-run `register`; genuine triage notes are untouched |

---

## 10. Session checklists

### Start

- [ ] `./qa/qa.sh doctor` — green, or fix what it names
- [ ] Metro serving Hatiwal on `:3008`; nothing foreign on `:8081`
- [ ] bundle API is `10.0.2.2` (doctor reads it from the container)
- [ ] `buyer@hatiwal.test` can log in (doctor checks; else `./qa/qa.sh seed`)
- [ ] load well under `nproc`
- [ ] read `qa/FLOW_REGISTER.md` (what is open) and `qa/UI_FINDINGS.md` (known defects)

### End

- [ ] `./qa/qa.sh register` — board reflects reality
- [ ] `Triage` + `Notes` filled for every failure you touched
- [ ] new UI defects logged in `UI_FINDINGS.md` with evidence paths
- [ ] `npx jest --watchAll=false` green (plus rspec + rubocop if the API changed)
- [ ] work committed to `vicatio-branch`
- [ ] state plainly what is fixed, what is open, and what results are untrustworthy

---

## 11. Current state

**4 of 214 flows passing.** That number is honest and low because these flows had
**never been executed** before this rig existed — `~/.maestro/tests` was empty.
They were written across many build cycles and never run, so stale selectors are
the expected majority on first contact, not a surprise.

Known-good so far: `browse/browse_listings`, `auth/guest_browse`, `auth/login`,
`auth/login_empty_fields`.

Open items are tracked in `qa/UI_FINDINGS.md` (11 findings, 4 open) and
`qa/FLOW_REGISTER.md`. The in-progress **quantity/multi-item** feature is being
built in another session — do not treat it as finished.

Do not "improve" this number by weakening assertions. A false pass costs more
than a red flow.

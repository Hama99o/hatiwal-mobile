# Hatiwal Mobile QA Rig

> **New here? Read [QA_HANDBOOK.md](QA_HANDBOOK.md) first.** It is the operator's
> guide — ground rules, environment facts, how to run a pass, how to triage, and
> every trap that has already cost hours. This file is the rig's *internals* and
> deep troubleshooting reference, linked to from there.

Deep, per-feature QA for the React Native app on a real Android emulator.
No web, no cloud, no subscription — Maestro CLI + the Android emulator, local.

## Why this exists

`maestro/` already held **213 flows** written across many build cycles. None of
them had ever been executed — `~/.maestro/tests` was empty. Untested tests are
not a safety net, they are an unmeasured liability. This rig exists to run them,
and to tell you *why* something is red.

## The one thing to understand first

**A red flow is not automatically an app bug.** It is one of four things, and the
report always says which:

| Kind | Meaning | What to do |
|---|---|---|
| `app_crash` | logcat has a FATAL EXCEPTION | real defect — fix the app |
| `app_bug_or_flow` | an assertion failed | triage: real bug, or a stale selector |
| `rig_fail` | metro/emulator/backend broke mid-run | result is meaningless — re-run |
| `unknown` | cause unclear | read the log |

On the first-ever run, expect `app_bug_or_flow` to be dominated by stale flow
selectors. **Do not change app code because one flow went red.** Open the
evidence first.

## Build constraint you cannot design around

`src/api/http.ts` throws at startup when a **non-`__DEV__`** build points at a
local or plain-http API. Consequences:

- QA against local seed data **requires a debug build + Metro running**.
- The preview/production APKs point at the **live** API. Running write-flows
  with one of those creates real listings in production. Don't.

## Order of operations (this matters)

The emulator and a gradle build must **never** run at the same time. A gradle
build takes every core, the emulator is starved, Android shows
*"Emulator is not responding"*, and every flow then fails for no app reason.

```bash
./qa/qa.sh doctor          # 1. is the machine and rig fit to test?
./qa/qa.sh build           # 2. build the APK — ALONE, nothing else running
./qa/qa.sh up              # 3. boot emulator + install (build is done by now)
./qa/qa.sh seed            # 4. reset backend e2e accounts
./qa/qa.sh smoke           # 5. ~20 flows, fast signal across all 17 features
./qa/qa.sh feature chat    # 6. deep pass on one feature (flows + jest)
```

## Commands

Every command takes an optional `QA_SESSION=n` prefix to pick which emulator it
drives (default 1). See "Several QA sessions at once" below.

| Command | Does |
|---|---|
| `doctor` | 8-step preflight; blocks when results would be meaningless |
| `build` | debug APK at half your cores, `nice`d, logged to `reports/build.log` |
| `up [phone\|tablet]` | boot AVD, disable animations, install APK, `adb reverse` |
| `seed` | `rake db:seed:reset_e2e` then verifies login actually works |
| `list` | the feature manifest with flow counts |
| `smoke` | each feature's 1-3 fastest flows |
| `feature <name>` | every flow of that feature **plus** its Jest suites |
| `flow <area>/<name>` | one flow — the fix→retest loop, ~30s |
| `all` | all 213 flows |
| `jest <name>` | just the unit layer for one feature |
| `triage` | re-print the last run's report |
| `down` | stop the emulator |
| `profile <small\|phone\|large\|tablet\|reset>` | override this session's screen size/density — extra form factors without extra AVDs |

## What `doctor` checks

1. tooling — adb, emulator, maestro, java 17, node 20 (Metro dies on node 18)
2. **host capacity** — load vs cores, swap, free RAM (the #1 cause of fake failures)
3. emulator — present, `boot_completed`, and *responsive* (a starved emulator
   answers adb but not the UI)
4. metro — serving on :3008, plus `adb reverse 8081`
5. backend — reachable, and **not** via `localhost` (inside the emulator that is
   the emulator itself; use the LAN IP or `10.0.2.2`)
6. **seed data** — `buyer@hatiwal.test` can actually log in. 190 of 213 flows
   start from `_helpers/login.yaml`; if this account is missing, every one of
   them fails at step 1 for a reason unrelated to the feature.
7. app installed
8. clean launch — logcat scanned for crashes and bundle-load failures

## The QA campaign loop

The goal is not "run the suite once". It is to drive all 213 flows to green —
finding UI, UX and backend defects on the way — and keep a record of where each
one stands. `qa/FLOW_REGISTER.md` is that record.

```
        ┌──────────────────────────────────────────┐
        │  ./qa/qa.sh smoke        (fast signal)   │
        └────────────────┬─────────────────────────┘
                         v
        ./qa/qa.sh feature <name>     deep pass, one feature
                         v
        read qa/reports/run-00N/summary.md
        triage each failure from EVIDENCE, write the verdict
        into the Triage column of FLOW_REGISTER.md
                         v
        FIX IT NOW (app code, flow, or rig — whatever is wrong)
                         v
        ./qa/qa.sh flow <area>/<name>    (~30s, no rebuild)
                         v
        green? ──► commit ──► next feature
```

### Triage vocabulary

Put one of these in the register's `Triage` column. The register keeps it
across regenerations, so it is the memory of the campaign:

| Triage | Means | Next action |
|---|---|---|
| `app-bug` | the app is genuinely wrong | fix app code, re-run the flow |
| `flow-bug` | the selector/expectation is stale, app is fine | fix the `.yaml`, re-run |
| `ux` | it works but reads badly — wording, hierarchy, empty state | hand to `marketplace-designer` |
| `fixed?` | fixed, awaiting a re-run to confirm | `qa.sh flow <area>/<name>` |
| `fixed` | fixed AND re-run green | nothing — done |
| `wontfix` | deliberate, with the reason in Notes | none |

### Three defect classes this rig can find

1. **Functional** — an assertion fails. `FAIL-assert` / `FAIL-crash`.
2. **Silent backend** — the flow PASSES while logcat shows `AxiosError` /
   `Request failed with status code` / an unhandled rejection. Reported as
   `SILENT`, and it is **not** a pass: the screen looked right while the request
   failed. This is the "nothing happened, no error shown" bug users report, and
   assertions are blind to it.
3. **UI / UX** — every flow leaves a screenshot at
   `reports/run-00N/<feature>/screens/<flow>.png`, pass or fail. Review those
   for hierarchy, price prominence, truncation, empty states, RTL and dark mode
   against `docs/DESIGN_INSPIRATION.md`. Assertions cannot judge whether a
   screen is *good*, only whether an element exists.

### Committing

Work lands on **`vicatio-branch`** (never `main`) — the convention for
autonomous work in this repo. Several agents share this checkout, so commit only
the files belonging to the fix at hand, and never `git add -A`, `git stash`,
`git checkout --` or `git reset --hard` (see the root `CLAUDE.md`).

A good campaign commit pairs the fix with the evidence:

```
fix(chat): show an error toast when sending a message fails

qa: chat/send_message was SILENT — the request 422'd and the composer
just cleared, so the user believed the message had sent.
flow now PASS with 0 api errors.
```

## Several QA sessions at once (one emulator each)

One emulator can only be driven by **one** Maestro at a time — two tear down each
other's on-device driver and the flow "fails" in ~0s having run nothing. That used
to mean a second session was simply blocked, and worse, its launcher failures
looked like app bugs (see `UI_FINDINGS.md` RIG-001).

So each session gets its own emulator instance. Set `QA_SESSION` and everything
that could collide is namespaced: the serial it drives, the device lock it holds,
and the directory it writes.

```bash
# Terminal 1 — tablet
QA_SESSION=1 ./qa/qa.sh up tablet        # emulator-5554 → qa/reports/
QA_SESSION=1 ./qa/qa.sh feature browse

# Terminal 2 — phone, at the same time
QA_SESSION=2 ./qa/qa.sh up phone         # emulator-5556 → qa/reports/s2/
QA_SESSION=2 ./qa/qa.sh feature chat

# Terminal 3 — a third, if the host can take it
QA_SESSION=3 ./qa/qa.sh up phone         # emulator-5558 → qa/reports/s3/
```

| | Session 1 | Session 2 | Session n |
|---|---|---|---|
| serial | `emulator-5554` | `emulator-5556` | `emulator-$((5554+2(n-1)))` |
| reports | `qa/reports/` | `qa/reports/s2/` | `qa/reports/sn/` |
| device lock | `reports/.device.lock` | `reports/s2/.device.lock` | `reports/sn/.device.lock` |

Session 1 keeps the original serial and paths, so existing habits and report
links do not move.

**One AVD per session — pin it in `qa.config.sh`.**

```bash
export QA_AVD_1="qa_tablet"
export QA_AVD_2="qa_phone"
export QA_AVD_3="qa_phone_small"
```

`up` with no argument boots **this session's** AVD. An explicit `up phone` /
`up tablet` still overrides it.

Two sessions **cannot share one AVD.** Instances 2+ do pass `-read-only`, but that
is only half the requirement: the emulator's own message is *"run **all** emulators
with -read-only flag"*, and session 1 runs writable so it can keep a boot snapshot.
A writable instance holds the AVD exclusively, so a read-only second boot dies with
**"Another emulator instance is running"** — a message that sounds like a stale lock
and sends you looking in the wrong place. That is why the mapping above is explicit,
and why `up` refuses a collision by name instead of letting the emulator fail.

They install the same built APK, so there is nothing to keep in sync — the whole
point is the *same binary* on different screens.

**Stale locks are cleared automatically.** An emulator killed uncleanly — host
reboot, OOM, or an agent session teardown taking the process group with it —
leaves `hardware-qemu.ini.lock` and `multiinstance.lock` in the AVD directory, and
every later boot fails with the same misleading "already running" error. `up`
removes them, but **only when no live qemu process holds that AVD**, so a genuinely
running emulator is never disturbed.

**Ports step by TWO.** The odd port in each pair is the adb channel, so stepping by
one would collide with the previous instance.

**How many?** Each emulator takes ~3 GB and 4 cores. `doctor` refuses to boot above
1× load, and a gradle build must never run alongside any of them.

### Form factors — the point of running several

The bugs this catches are the ones a phone-only rig cannot see. Two were found the
day this landed: the listing grid was hardcoded to 2 columns (two ~600dp cards per
row on a tablet) and chat bubbles were capped only as a *percentage* (~1000dp lines
of text). Both had shipped; both were invisible at 400dp.

The strongest case so far is **UI-020**, and it is worth reading as the argument
for running two sessions at once. The *same flow*, on the *same APK*, at the same
moment: the phone passed and the tablet failed. On the tablet the listing detail
screen rendered the photo and the action bar and **nothing else** — no title, no
price, no stock pill, no seller — because the hero's height was computed from
width alone and came out taller than the viewport. A buyer on a tablet could not
see what an item was or what it cost. No amount of phone testing would ever have
shown it, and a single-session rig would have had to choose which one to look at.

Real AVDs are best (real DPI, real system UI), but you only have as many as you
create. `qa.sh profile` gives extra form factors for free on any session:

```bash
QA_SESSION=2 ./qa/qa.sh profile small    # 720x1280 @320  → 360dp wide
QA_SESSION=2 ./qa/qa.sh profile phone    # 1080x2400 @420 → 411dp
QA_SESSION=2 ./qa/qa.sh profile large    # 1284x2778 @458 → 448dp
QA_SESSION=2 ./qa/qa.sh profile tablet   # 2560x1600 @320 → 1280dp
QA_SESSION=2 ./qa/qa.sh profile reset    # back to the AVD's own values
```

**Always `reset` when finished.** An override survives reboots and would silently
skew every later run on that device. `dp width` — not pixels — is what drives
layout, which is why each line above prints it.

A useful daily split: session 1 on the tablet, session 2 small phone, session 3
large phone. The same suite across three widths finds layout bugs no single
device can.

## Using this rig on another app

The machinery is generic; everything app-specific lives in **one** file.

```bash
cp qa/qa.config.example.sh qa/qa.config.sh   # then edit
```

It sets the app id, AVD names, Metro/API ports, the backend directory, the seed
command and the test accounts. Every setting is `${VAR:-default}`, so the config
only needs the values that differ — and `qa/qa.sh` and `qa/lib/*.sh` need no edits
at all.

Two files remain per-project by nature:

| File | What to change |
|---|---|
| `qa/qa.config.sh` | app id, AVDs, ports, backend, seed command, accounts |
| `qa/features.yaml` | the feature manifest: maestro dirs, smoke flows, Jest globs |

A project with no local backend can leave `QA_SEED_CMD` empty — `seed` then just
verifies the login still works instead of failing a rig that needs no seeding.

## Reports

```
qa/reports/run-00N/
  summary.md          per-feature health + failures grouped by cause
  results.jsonl       one line per flow (machine-readable)
  <feature>/<flow>.log      maestro output
  <feature>/<flow>.logcat   device log for that flow only
  <feature>/debug-<flow>/   screenshots — kept for FAILURES ONLY
```

## Adding a feature

Add an entry to `features.yaml`: the `maestro/` dir, 1-3 `smoke` flows, the
Jest globs, and the API endpoints it needs. `qa.sh` picks it up with no code
change — the manifest is the only place features are declared.

## Troubleshooting

### `Unresolved reference 'R'` / `'BuildConfig'` in MainActivity.kt or MainApplication.kt

The `android/` directory is **generated and gitignored** (`.gitignore:22`) — it is
an `expo prebuild` artifact, not source. When it goes stale it disagrees with
`app.json`, and the symptom is a Kotlin compile failure on generated classes.

Hit for real on 2026-08-21: `android/app/build.gradle` still carried the old
identity from before the package was renamed —

```
namespace     "com.hatiwal"        # stale
applicationId "com.hatiwal"        # stale
```

while `app.json`, both Kotlin sources, and all 213 Maestro flows said
`com.hatiwal.app`. AGP therefore generated `com.hatiwal.R` and
`com.hatiwal.BuildConfig`, which the sources in package `com.hatiwal.app`
cannot see by their bare names. The manifest's `.MainActivity` /
`.MainApplication` were broken the same way, so even a successful compile would
have crashed on launch.

Check all five identities agree before blaming the code:

```bash
python3 -c "import json;print(json.load(open('app.json'))['expo']['android']['package'])"
grep -E 'namespace|applicationId' android/app/build.gradle
head -1 android/app/src/main/java/com/hatiwal/app/MainActivity.kt
grep '^appId:' maestro/config.yaml
```

Two ways to fix:

- **Minimal** — correct `namespace` + `applicationId` in `android/app/build.gradle`.
  Keeps every compiled native module cached, so only `:app:` recompiles (~2 min
  instead of ~15).
- **Canonical** — `npx expo prebuild -p android --clean` regenerates `android/`
  from `app.json`. Correct but throws away the whole native build cache.

### `cannot find symbol: com.hatiwal.BuildConfig` after renaming the namespace

Second-order fallout from the fix above, and it took three failed builds to
pin down — so read this before guessing.

`:app:generateReactNativeEntryPoint` does **not** read the namespace from
`build.gradle`. Per `@react-native/gradle-plugin`
(`GenerateEntryPointTask.kt:42`) it reads `model.project.android.packageName`
out of the cached `react-native config` output:

```
android/build/generated/autolinking/autolinking.json      <-- ROOT level
```

That file is written once and then never refreshed, because Gradle sees it
exists and treats the task as up to date. Ours was **a month old** and still
said `com.hatiwal`, so every rebuild faithfully regenerated
`ReactNativeApplicationEntryPoint.java` with the old package.

Note the path: the **root** `android/build/generated/autolinking` is the one
that matters. Clearing only `android/app/build/generated/autolinking` (the
app-level path) does nothing — the stale value lives one level up.

```bash
# check what the cache actually claims
python3 -c "import json;print(json.load(open('android/build/generated/autolinking/autolinking.json'))['project']['android']['packageName'])"

# force it to regenerate from build.gradle
rm -rf android/build/generated/autolinking android/app/build/generated/autolinking
```

**Deleting the cache is not enough — you must also stop the Gradle daemon.**
`autolinkLibrariesFromCommand()` runs at *settings-evaluation* time
(`android/settings.gradle:27-29`), and a warm daemon keeps that model in memory
across builds. So it never re-runs the config command and never rewrites the
JSON, no matter how many times you delete it. Four builds failed identically
before this was found. The full fix is:

```bash
cd android && ./gradlew --stop          # force settings re-evaluation
rm -rf build/generated/autolinking app/build/generated/autolinking
cd .. && ./qa/qa.sh build
```

Verify the source of truth independently of Gradle at any time:

```bash
npx expo-modules-autolinking react-native-config --platform android | grep packageName
```

If that prints the right package but the build still emits the old one, the
daemon is stale — stop it.

Do NOT `rm -rf android/app/build` to fix any of this — that discards
`build/intermediates/cxx` (~858 MB of CMake/NDK output) and costs a full native
rebuild. Delete only the stale metadata; each failed build costs ~3-14 min.

Other stale outputs worth clearing after a namespace change:

```bash
rm -rf android/app/build/generated/source/buildConfig \
       android/app/build/tmp/kotlin-classes/debug/com/hatiwal \
       android/app/build/intermediates/javac/debug/compileDebugJavaWithJavac/classes/com/hatiwal
```

### The dev-client loaded a DIFFERENT app (cross-project contamination)

The single most misleading failure found while building this rig. Symptoms:

- the in-app dev menu shows another project's name
- a red box: `Cannot find native module 'ExpoXxx'` for a module Hatiwal does not use
- flows fail at their very first assertion with no obvious cause

Cause: the QA build is a **debug** build with `expo-dev-client`, so it opens a
launcher listing discovered dev servers. The launcher auto-discovers
**`10.0.2.2:8081`**, and `10.0.2.2` addresses the host *directly* — **`adb
reverse` does not intercept it**. This machine runs several Expo projects in
Docker simultaneously:

| Host port | Container | App |
|---|---|---|
| `:8081` | `edu-safi-mobile-mobile-1` | Madares (`edu-safi`) |
| `:3008` | `hatiwal-mobile-mobile-1` | **Hatiwal** |

So the launcher offered Madares, and Madares' JS bundle ran inside the Hatiwal
APK. `doctor` step 4 now detects this and blocks. Identify what is serving a port:

```bash
curl -s http://localhost:8081/ | grep -oE '"name":"[^"]*"' | head -1
```

Two ways out — `maestro/_helpers/open_bundle.yaml` takes the first:

1. **Enter Hatiwal's Metro explicitly** in the launcher (`New development server`
   → the URL → `Connect`). Leaves the other project untouched.
   `http://localhost:8081` also works *because* the device's localhost goes
   through `adb reverse` to host `:3008` — unlike `10.0.2.2`.
2. **Stop the other project's Metro** for the duration of the run.

Note `launchApp: clearState: true` — used by 190 of 213 flows — wipes the
dev-client's remembered server, so this must be handled on *every* flow, not once.

### Metro served a stale bundle

Symptom: a red box pointing at source that no longer exists (an import you
already deleted). The Docker `mobile` service mounts host source live (`.:/app`)
but `node_modules` is an **anonymous volume** baked at image build time, and
Metro's cache lives inside it. `--clear` only runs at container start, so a
long-lived container keeps serving an old bundle.

```bash
docker restart hatiwal-mobile-mobile-1     # then wait for packager-status:running
```

### The emulator wedges and adb loses it

`adb devices` empty while `qemu-system-x86_64` still runs, and ports 5554/5555
are not listening — the emulator is a zombie, usually after CPU starvation.
`adb kill-server` will not recover it. Kill the qemu process and re-boot:

```bash
kill -9 $(pgrep -f "qemu-system-x86_64.*qa_phone")
./qa/qa.sh up
```

### A wall of `rig_fail`

Metro died (it OOMs on long suites, exit 137). The runner restarts the Docker
`mobile` container and marks affected flows `rig_fail` rather than blaming the
app. Check Metro before touching code.

### "Emulator is not responding"

CPU starvation, not a broken Android Studio. Check `uptime` against `nproc`.
This is why `build` refuses to start above 1.5x cores and `up` refuses above
1x — never run a gradle build and the emulator at the same time.

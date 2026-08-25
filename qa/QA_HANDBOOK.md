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

## Never kill by process name on this machine

Another project (edu-safi) runs its own QA rig here, with its own emulator, its own
Metro and its own maestro. So `pkill -f 'maestro.cli.AppKt'` is not "clean up my
orphan" — it is "stop whatever anyone else is testing".

I proved the risk the hard way today: asking for port 5584 collided with their
already-running emulator, and every `adb -s emulator-5584` command went to THEIR
device. I installed our APK on it and, worse, overwrote their
`adb reverse tcp:8081 tcp:3018` with ours to 3008 — so their app was being served our
JS bundle mid-run. Repaired by restoring their reverse and uninstalling our APK.

Two rules, both cheap:

1. **Verify identity before touching a device.** `adb -s <serial> emu avd name` must
   equal this session's AVD, checked immediately before each mutating command. The rig
   already does this in `_device_is_ours`; calling adb directly bypasses it, which is
   exactly how this happened.
2. **Scope cleanup by something that is definitionally ours.** The device lock
   (`qa/reports/.device.lock`) is this project's file, so whoever holds it is ours:

       for p in $(fuser qa/reports/.device.lock 2>/dev/null); do
         case "$(ps -o args= -p "$p")" in *maestro*|*java*) kill "$p";; esac
       done

   A path pattern is better than a bare process name but still matches an unrelated
   shell that merely mentions the path.

And pick ports well clear of both rigs — 5580 is ours, 5584 is theirs.

## Known-pending: 9 sites scroll to a buried seeded listing

Two flows have now failed this way — `multi_quantity_partial_sale` and
`rate_buyer_after_sale` — both with `scrollUntilVisible` at 8000ms for a listing the
SEED creates, which sits well down My Shop among many others. Both were fixed by
searching instead.

Raising the timeout is NOT the fix. `listing_conversations` records spending 463s
driving infinite scroll and still not finding a listing that was present, so the feed
does not necessarily bring a buried item into view at all.

An audit (seed titles minus "QA Disposable *", cross-referenced against
scrollUntilVisible targets with a timeout <= 10s, excluding sites where a search is
issued first) leaves 9 sites in 5 flows:

    chat/offer_send_and_accept.yaml:46
    chat/reserve_after_accept.yaml:78
    chat/reserve_after_buyer_accepts_counter.yaml:52
    chat/reserved_sold_dead_end_notice.yaml:42, 74, 107, 157, 190
    seller/listing_conversations.yaml:69

**Deliberately not fixed yet.** None has failed on a phone, and the fix is not
uniform: the right search box differs by screen ("Search listings..." on the buyer
feed, "Search my listings..." on My Shop), so a sweep would need per-site screen
detection — the exact shape of change that broke five flows earlier in this session.
`seller/listing_conversations.yaml:34` is in the same file and is FINE, because a
search precedes it and the scroll is only a backstop.

When `chat` next runs, expect these; the fix pattern is in
`rate_buyer_after_sale.yaml` (search, then hideKeyboard immediately, then
extendedWaitUntil).

## Every cycle must re-seed, or the disposable fixtures are single-use

`reserved_buyer` failed on `assertVisible: "Who's buying this item?"` — the buyer
picker's title when RESERVING. The listing was already `reserved` from an earlier
cycle, so its primary action had become "Mark sold" and the sheet read "Who bought
this item?" instead. The tap worked; the app was right; the fixture was stale.

The seed already handles this — `DISPOSABLE_LISTINGS` resets every status on every
seed, and its comment predicts this exact failure ("without this a disposable listing
is single-use ... every later cycle finds it in the wrong state and fails for a reason
that has nothing to do with the code under test"). The mechanism was never the
problem. **Cycle 8 simply never re-seeded**, so a fixture consumed in cycle 6 or 7
stayed consumed.

So: **run `./qa/qa.sh seed` at the START of every cycle.** Between cycles is also the
only safe moment — re-seeding mid-cycle moves fixtures under running flows.

Within a single cycle it is sufficient, because each disposable is owned by exactly
one flow ("Safe to reserve, sell, unpublish or delete — no flow asserts anything about
it"), so nothing else can consume it first.

How to check before blaming a flow:

    bundle exec rails runner 'puts Listing.find_by(title: "QA Disposable <flow>").status'

## Search for the OUTCOME, not the mechanism

Three separate mistakes in one session, all the same shape:

1. **Adding a location step to publish flows.** Grepped for `tapOn: "Publish"`.
   Missed `draft_lifecycle`, which publishes another way — found only when it failed
   four minutes in. The right search was the SUCCESS ASSERTION,
   `assertVisible: "Your listing is live!"`, which is what every such flow has in
   common regardless of how it gets there.
2. **The same batch, in the other direction.** Never checked whether the targets
   already set a location by a different mechanism (`location-search-input` +
   "Confirm location" rather than the map-pin row). Five did. The insertion broke
   them. The right search was the CAPABILITY — any location handling at all — not
   the helper name being added.
3. **"Asserted copy the app never renders".** Built a value->key map and kept the
   first key per value. `"Contact Seller"` has two, one dead and one live, so a
   working flow was reported as broken. The right lookup was value -> ALL keys,
   clear the hit if ANY is referenced.

The rule: **a bulk change needs to be scoped by what the target DOES, not by how it
happens to do it.** Mechanisms vary between files; outcomes are why the files exist.
Both directions matter — "which flows need this?" and "which already have it?" — and
a search that answers only one of them will pass while being wrong.

Corollary for audits: state which question the audit asked. A passing audit proves
that question was satisfied and nothing more.

## A feature timeout orphans its maestro, which keeps the device lock

`timeout N ./qa/qa.sh feature X` signals `qa.sh`, NOT the java process it spawned.
So a truncated feature leaves a live maestro holding the device lock, and the next
feature sits on "another QA run is driving the emulator right now" until the
orphan's own 600s cap expires.

It happened after BOTH truncated features in cycle 8 — profile and listings —
costing about ten minutes each on top of the truncation. The symptom is misleading:
the message says another QA RUN is driving the emulator, which reads like two
sessions colliding, when it is one session colliding with its own dead feature.

Kill the orphan when, and only when, the feature exited 124:

    timeout "$budget" ./qa/qa.sh feature "$f"; rc=$?
    [ "$rc" = 124 ] && { pkill -f 'maestro.cli.AppKt'; sleep 5; }

Unconditionally safe at that point because `qa.sh` has already exited, so whatever
the orphan was measuring is unrecoverable either way. Gate it on 124 so a clean
finish never kills a legitimate flow.

## A flat per-feature timeout silently truncates the big features

Cycles 7 and 8 wrapped each feature in `timeout 5400` — 90 minutes. At a measured
median of ~230s per flow that buys about 23 flows, so:

- `profile` (29 flows) was killed at `rc=124` with ~9 flows unrun.
- `listings` (40 flows) the same, with ~20 unrun.
- `chat` (42 flows) would never have been more than half measured.

The truncation IS logged (`rc=124`), so it is not invisible — but the missing flows
are, and an unrun flow looks exactly like one that was never written. Coverage then
reads as "39% passing" when the denominator quietly excludes the largest features.

Budget per feature from its flow count instead: `flows x 420s`, floor 30 minutes.
420 rather than the 230 median because the slowest passing flows measured 551s and
a flow that hits its own `FLOW_TIMEOUT` burns ~500s on the way there — sizing to the
median guarantees the tail is cut off.

The same reasoning applies to reading old coverage numbers: check whether the
feature finished (`=== <feature> done rc=0`) before trusting its pass rate.

## Before inserting a step into N flows, check whether they already do it

I added a shared location step to nine publish flows because they "never set a
location". Five of them already did — via a different mechanism
(`location-search-input` + "Confirm location" rather than the map-pin row) — and
one of those five even asserted `notVisible: "Tap to set exact location on map"`
immediately beforehand, proving its pin had taken. My helper then looked for that
exact prompt and could not find it, so the insertion did not just duplicate work:
**it broke five flows that were already doing the right thing.**
`create_listing_publish_blocked` failed on it four minutes in.

What made this avoidable is the part worth remembering. I ran an audit before
committing and it passed — but it checked the wrong precondition. It asked "is the
step in a place where the create form is still on screen?" (a real question, which
caught three genuinely misplaced insertions) and never asked the more basic one:
**"does this flow already do this, by any means?"**

So when a change is a bulk insertion, the audit needs both halves:

1. Does the target already do this ANOTHER WAY? Grep for the capability, not for
   the helper name — a second mechanism will not match the name you are adding.
2. Is the insertion point valid for this flow's state?

A passing audit only proves the question you asked was satisfied.

## Audits that correctly produce no change

Keeping these written down so they are not re-derived, and so the sweep is not
attempted again — two audits have already been deleted from this rig for crying
wolf, and both did so by flagging a pattern rather than a failure.

- **Bare `index:` selectors (10 sites).** `tapOn: {index: 0}` with no `id`/`text`
  sibling targets "the first element in the hierarchy", which sounds arbitrary
  enough to sweep. Do not: `chat/archive_conversation` **passes** with five of
  them. In a list screen the first element genuinely is the first row. The four
  flows that carry the rest are failing for reasons already identified elsewhere,
  measured on the tablet, or never run. Revisit only with a phone verdict pointing
  at the index step itself.
- **Toast copy asserted without polling (4 sites).** All false positives:
  `itemsSaved` = "Saved Items" is a stat-card LABEL, not a toast. Toast handling in
  the suite already uses `extendedWaitUntil` where it matters.
- **Asserted copy whose i18n key the app never references (1 site).** This is the
  audit that found `profile.title` — four flows asserting a "profile screen header"
  that is rendered nowhere — so it is worth keeping. It is now clean. Its one
  remaining hit, `"Contact Seller"`, is a FALSE POSITIVE and shows the trap: TWO
  keys carry that same string, `browse.startChat` (dead) and
  `listing.detail.contactSeller` (the one actually rendered), and a value->key map
  keeps whichever it saw first. Any future run of this audit must resolve a value to
  ALL its keys and clear the hit if ANY of them is referenced.
- **testIDs referenced by flows but "missing" from source (36 sites).** All 118
  resolve. The gap was the matcher, which could not see multi-line and conditional
  `testID={...}` assignments. Any future version of this audit must handle those
  two shapes before reporting anything.

The rule these share: **a pattern is not a defect.** Flag the ones with a failing
verdict whose failing STEP is the pattern; leave the rest alone.

## Never touch the device by hand while a flow is running

The photo picker had leaked and was poisoning flow after flow, and the per-flow
`force-stop` that prevents it could not take effect until the next FEATURE
(`flows.sh` is sourced per `qa.sh feature` invocation). So the choice was to let
~17 remaining flows run under a picker, or clear it by hand mid-feature.

Clearing it by hand was the right trade — but the cost landed exactly where
predicted: `am force-stop com.hatiwal.app` hit while `edit_profile_validation` was
mid-run, the app vanished, and the flow spent 60s waiting for a tab bar that could
not appear. Its screenshot is the Android app drawer. That verdict is an artefact
of the intervention, not a result.

Two things follow:

- **A verdict produced during a manual intervention is not evidence.** Mark it and
  re-run it. It is worse than no result, because it looks exactly like a real
  failure — and here it looked specifically like a regression in the login helper
  that had just been changed, which cost time to rule out. The API log did that:
  no `sign_in` POST during the flow's window, so the helper never got the chance
  to be wrong.
- **If you must intervene, do it between features**, where `qa.sh feature` has
  exited and no flow holds the device — not between flows, which is a window of a
  couple of seconds you cannot reliably hit.

## The whole suite was being judged on a tablet

`qa.config.sh` gave session 1 `qa_tablet` — 2560x1600, landscape, 800dp. Session 1
is the **default** session, the one that runs when you run one session, so the
fleet's "one form factor per session" design quietly meant the entire suite was
measured on a tablet and the **phone was never tested at all**. Hatiwal is a
mobile-first marketplace; the phone is the only form factor that matters.

It stayed invisible for cycles because nothing ever printed which device was under
test. `doctor` now names the AVD, its resolution and its dp width, and warns when
it is a tablet.

Consequences worth knowing when reading old verdicts:

- Bottom sheets, the tab bar, and every RTL layout differ at that size. `seller
  0/8`, `rtl 0/8`, `reviews 0/3` and `safety 0/2` were measured there and are not
  trustworthy. `listing_conversations` failed on `sign-out-button` on the tablet
  and got four steps further on the phone before failing on something else.
- Some flows were WRITTEN against the tablet and say so in their comments
  ("on a landscape tablet it covers the lower half of the form"). Their scroll
  workarounds are harmless on a phone, but do not read those comments as evidence
  about phone layout.
- Any verdict recorded before the switch should be re-measured before it is
  trusted, whichever way it went — a tablet PASS is not a phone PASS either.

The general lesson: **the rig must state what it is testing on.** A silent
environment variable decided months of results.

## A hung `adb` is how the rig dies silently

The emulator dying is survivable — `run_flows` has a per-flow health gate that
boots it back. On 25 Aug that gate never ran: the rig stopped producing verdicts
at 15:15 and sat there for 13 minutes with a live `qa.sh` and no maestro process,
because **`rig_healthy` asks the device whether it is healthy, and a dead device
makes `adb` block forever.** The recovery code existed and was unreachable.

Every `adb` call in the rig is now bounded (`adb_qa_t <secs>`), so a device death
surfaces within a minute and the gate can do its job. **Never add a bare
`adb_qa` device call** — `grep 'adb_qa [a-z]' qa/lib/*.sh qa/qa.sh | grep -v adb_qa_t`
must stay empty.

Two traps this exposed:

- `timeout` execs a binary and **cannot run a shell function**. `timeout 30 adb_qa …`
  exits 127, which reads exactly like "the device is wedged". That is why
  `adb_qa_t` takes the timeout as its first argument instead.
- Writing a script with `os.replace` (the atomic-write rule below) **does not
  preserve the execute bit**. It silently turned five rig scripts into
  `100644`, and the next launch failed with `Permission denied`. Always
  `chmod --reference` or copy `st_mode` across, and check
  `git diff --summary` for `mode change` before committing.

Also worth stating plainly: the emulator has now died several times with **no OOM
kill in the kernel log and GB of memory free**. Protecting qemu from the OOM
killer was still correct — it fixed the deaths that *were* OOM — but it is not the
whole story, so the rig must always be able to recover rather than assume a
healthy device.

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

### Device and account state that flows do NOT control (and must therefore assert)

Four kinds of state survive `clearState: true`, so a flow that depends on any of
them has to set or assert it explicitly. Each of these cost an hour to find because
the resulting failure names something else entirely.

| State | Survives clearState? | How it bites | What to do |
|---|---|---|---|
| **Runtime permissions** | Yes — and worse, **Maestro GRANTS THEM ALL on `launchApp`** | The app already has location, so it never prompts. A flow waiting for the dialog times out; `dumpsys` shows `granted=true` after every run no matter what you did first | `permissions: { all: deny }` on launchApp — the only control that holds, because it applies AFTER the launch |
| **Buyer/seller mode** | Yes — persisted on the USER, so it also crosses devices | Seller mode has no "Bazaar" tab at all (My Shop / Chats / Me), so buyer flows fail "Element not found: Bazaar" while perfectly signed in | `_helpers/ensure_buyer_mode.yaml` (or `login_seller.yaml`, which always did this) |
| **Airplane mode** | Yes — device-wide | Set by an offline flow that then FAILS before its own cleanup; every later flow cannot reach Metro and fails on `"Me" is visible` | cleared in the per-flow preflight (`lib/flows.sh`) |
| **GPS fix** | It is one-shot and goes STALE | A location flow minutes into a suite gets nothing and the app correctly says "Couldn't determine your location" | re-sent before every flow; override with `QA_GEO_LAT/LON` |

**`pm reset-permissions`, not `pm revoke`.** Revoke marks the permission USER-FIXED
("don't ask again"), so Android never shows the dialog — the app gets an immediate
denial. Only reset restores the never-asked state. `qa.sh perm reset|grant|revoke`
does all three, but for prompt tests prefer `permissions: all: deny` in the flow.

**Denying permissions surfaces a dialog you were not testing.** With permissions
denied the app asks for notifications right after login, and its modal covers the
tab bar — so the next tab tap fails on an element hidden behind it. The deny helper
dismisses it first.

### `tapOn` does not scroll, and the keyboard hides bottom buttons

Two mechanical facts behind a large share of all failures here:

**`tapOn` never scrolls to its target.** If the element is off-screen the flow fails
with "Element not found" on something that exists. The listing form is taller than a
phone, so 20 taps across 18 flows were aimed at fields below the fold; the seller row
on listing detail needed a scroll in 10 flows. `scrollUntilVisible` is the fix and is
safe to add unconditionally — it checks first and does nothing when the element is
already visible.

**A button below a text input is probably behind the keyboard.** This has now
appeared FIVE times: the dev-launcher's Connect, the login screen's Sign In, the
meetup sheet's submit, the map picker's "Confirm location", and Register's "Create
Account". Two were real product bugs (Register had no `KeyboardAvoidingView` at all;
the map picker still does not dismiss on result-select — UI-023). When a bottom CTA
"does not exist", screenshot it before believing the selector is wrong.

`hideKeyboard` is safe ONLY immediately after typing, when the IME is guaranteed up
and consumes the Back that Maestro sends. With no keyboard up, that Back reaches the
app and can exit it.

### A fresh emulator is missing things the app needs, and the failures blame the app

Three capabilities the app legitimately depends on are simply absent on a clean
emulator. In each case the app behaves correctly and the FLOW fails, so the report
points at the wrong thing. `qa.sh up` now provides all three:

| Missing | What the failure looks like | Seeded by |
|---|---|---|
| **GPS fix** | "Couldn't determine your location. Please try again." Nearest-sort, distance filters, the map picker and "use my current location" all unpassable. | `adb emu geo fix` (Kabul; `QA_GEO_LAT`/`QA_GEO_LON`) |
| **Photos in the gallery** | `Assertion is false: "Cover" is visible` — the picker opens empty, nothing is selected, so no cover badge. Four create-listing flows plus all of `gallery/`. | 4 images copied to `/sdcard/Pictures/QA` + a media scan (`QA_GALLERY_IMAGE`) |
| **Radio left ON** by a failed offline flow | "Failed to connect to /10.0.2.2:3008" in the launcher, and flows failing on `"Me" is visible` — reads as a broken login | cleared in the per-flow preflight |

> The general shape: when a whole *area* fails on something environmental rather
> than a selector, suspect the device before the app. Kabul rather than the
> emulator's default location matters too — a distance sort of Afghan fixtures
> against Mountain View orders them meaninglessly.

### Never run `maestro` directly while a `qa.sh` run holds the device

`qa.sh` takes a per-session device lock precisely because **two Maestro instances
on one device tear down each other's on-device driver**. Calling `maestro test`
or even `maestro hierarchy` by hand bypasses that lock.

What makes this dangerous is that it does not look like a rig failure. The
interference produces flows that run for **two minutes and then fail on a
plausible assertion** — "Element not found: Nearest first" — rather than the
0-second driver death the classifier knows how to spot. I invalidated a batch of
six confirmations this way and spent three runs "fixing" a flow that was never
broken, because the evidence read exactly like a real selector bug. The truth was
only in the raw log:

```
io.grpc.StatusRuntimeException: UNAVAILABLE
java.io.IOException: Command failed (tcp:43249): closed
```

**If you need an ad-hoc probe** — a `hierarchy` dump is genuinely the fastest way
to settle "what does this screen actually contain" — check first:

```bash
pgrep -af 'qa[.]sh flow'      # note the [.]: keeps the pattern from matching itself
```

and wait for it to be empty. Use a different session's emulator if you have one.

> **Also:** never `pkill -f <pattern>` where the pattern appears in your own
> command line — `pkill` matches the shell running it and kills you mid-edit. Twice
> here, both times leaving a half-finished job and an exit code (144) that explains
> nothing. Kill by PID from `pgrep -af`, or use a `[b]racket` in the pattern.

### Never take an expected string from a locale file

**15% of the translation keys in this app are dead** — 132 of 862 are referenced
nowhere in `src/` or `app/` (UI-021). So the natural way to write a flow is a trap:
you grep the locale files for the wording you saw, find a plausible key, assert its
value, and it can never match, because nothing renders that key. The failure then
reads as a missing feature.

Three flows fell into this on one afternoon, each off by a hair:

| Asserted | Dead key | Actually rendered |
|---|---|---|
| `"No conversations"` | `chat.empty.title` | **"No conversations yet"** |
| `"Browse categories"` | `browse.browseCategories` | **"Categories"** |
| `"All Categories"` | `browse.allCategories` | **"All"** |
| `"Chat"` | `common.chat` | **"Chats"** (`sidebar.chat`) |

One word, and Maestro's anchored matching makes it a failure.

**Take the string from the component that renders it, or from the device.**

```bash
maestro --device emulator-5554 hierarchy      # ground truth, takes seconds
```

Best of all, assert a `testID` — no translator can move it, and it survives all
three locales. If the control you need has no `testID`, adding one is a safe change
(it cannot alter behaviour) and is usually the right fix: `block-user-button`,
`save-toggle-button`, `browse-filters-toggle` and `messages-list` were all added
this way, each because the button beside them already had one.

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

## `nohup … &` is not enough to survive a tool timeout — use `setsid`

Launching a long QA run with `nohup bash run.sh &` and then sleeping in the same
shell invocation loses the run. When the invocation hits its timeout the harness
SIGTERMs the whole **process group**, and `nohup` only ignores SIGHUP — so the
script, and the Maestro driver it had started, both die.

The symptom is deceptive: the log keeps the header it printed at start
("──── browse/search_listings") and the Maestro log keeps its last line
("Waiting for flows to complete…"), so it reads like a flow still running, for as
long as you care to wait. `ps` is what settles it — no `java`/maestro process
exists at all. Six minutes were spent here believing a flow was slow when nothing
had been running for five of them.

```bash
# survives; the run gets its own session and process group
setsid nohup bash qa/fleet.sh 1 2 > qa/reports/fleet.log 2>&1 < /dev/null &
```

Also: verify a long run is alive by process, not by log tail. A Maestro log whose
last line is "Waiting for flows to complete…" proves only that the line was
written before the driver stopped.

## Metro in Docker does not see host edits — restart the container after an app change

`hatiwal-mobile-mobile-1` serves the debug bundle from a bind-mounted `/app`. The
container reads the edited file correctly (`docker exec … grep` finds it), but
Metro's watcher does not fire for host writes, so it keeps serving the bundle it
already built. A debug APK loads its JS from Metro, so **rebuilding and
reinstalling the APK does not pick up a `.tsx` change** — the stale JS comes over
the wire either way.

This cost a false failure: a freshly added `testID="mode-toggle-button"` reported
`No visible element found` in a flow, while the same assertion passed in a probe
once the container had been restarted.

```bash
docker restart hatiwal-mobile-mobile-1
# then confirm against the bundle Metro is ACTUALLY serving:
curl -s "http://localhost:3008/.expo/.virtual-metro-entry.bundle?platform=android&dev=true&minify=false" \
  | grep -c my-new-testid        # expect >= 1
```

Use that exact URL. `/index.bundle` is **not** the entry for this Expo app — it
returns a 404 JSON body ("Unable to resolve module ./index"), and `grep -c` on a
404 returns 0, which reads exactly like a stale bundle. Check the HTTP status
before believing a zero.

## Do not run `tsc`, `jest` or a bundle fetch while the fleet is sweeping

Heavy host work starves the emulators, and the way that surfaces is a **lie**: the
accessibility hierarchy dump comes back nearly empty, so Maestro sees none of the
elements that are plainly on screen and fails a perfectly good assertion.

Concretely: three flows failed on `Assertion is false: "Me" is visible` while the
screenshot taken two steps earlier showed the app signed in as Ahmad Karimi in
buyer mode with the "Me" tab visible AND focused. The hierarchy JSON for the
failing step contained exactly one string — the status-bar clock, "1:22".

**Duration is the tell.** Passing flows on this rig run a 175s median and have
never exceeded 315s. The three contaminated failures took 372s, 447s and 462s.
Any flow past ~330s should be treated as suspect before it is triaged as a bug.

So: while `fleet.sh` runs, restrict yourself to reading and editing files. Batch
`npx tsc`, `npx jest`, Gradle and bundle fetches into a window where the fleet is
stopped. This is the same family of mistake as running `maestro` directly during a
`qa.sh` run — a competing consumer that makes flows fail *plausibly* rather than
obviously.

Editing app `.tsx` files mid-sweep is its own hazard: the debug APK pulls JS from
Metro at launch, so a flow can bundle a half-written file. Confine mid-sweep edits
to `maestro/` and docs.

## Killing a wrapper script leaves its `qa.sh` child holding the device lock

Stopping a run by killing the script you launched is not enough. `qa.sh` holds
`reports/.device.lock` via `flock`, and if you kill only the wrapper, the `qa.sh`
child survives, keeps the lock, and the next `up` / `flow` / `feature` sits at
"another QA run is driving the emulator right now — waiting for it to finish"
forever. Pattern-matching does not find it either: the orphan shows up in `ps` as
a bare `bash`, not as anything containing `qa.sh`.

Ask the lock who holds it instead of guessing:

```bash
fuser -v qa/reports/.device.lock          # session 1
fuser -v qa/reports/s2/.device.lock       # session 2 (per-session REPORTS_DIR)
```

Then kill those PIDs — but read the list first: it includes the process that is
legitimately *waiting* for the lock, and killing that one just cancels the run you
were trying to start.

Related: the emulator can die outright under memory pressure, and the flow log
then ends in `java.io.IOException: Command failed (host:transport:emulator-5580):
device 'emulator-5580' not found` with an `AndroidDriver.close` stack. That is not
a flow failure — check `adb devices` before triaging anything else in that run.

## Fixing an app bug can turn a flow's workaround into the bug

`create_listing_map_pin` was green for weeks with a `hideKeyboard` step and a
comment explaining why it was safe: the flow had just typed, so the IME was up and
would consume the Back that `hideKeyboard` sends on Android.

Then UI-023 was fixed properly — `LocationRangePicker` now calls
`Keyboard.dismiss()` itself when a search result is selected. The IME was already
down, so the Back went to the app instead and **closed the map modal**. The flow
failed with `Element not found: Id matching regex: location-confirm` on a picker
it had dismissed itself, and the screenshot showed the form with "Tap to set exact
location on map" still unset. A green flow went red because the app got better.

So: when you fix a keyboard-covers-CTA bug, grep the suite for `hideKeyboard` and
re-check every use. More generally, a workaround encodes an assumption about a
defect; fixing the defect invalidates the assumption. The comment explaining why a
workaround is safe is the thing to re-read, not to trust.

Related, from the same day: `open_bundle.yaml` already carried a warning that
`hideKeyboard` with no IME up exits the app entirely — and that warning sat four
lines above where a `hideKeyboard` was later added anyway, costing five minutes
per flow against the Android home screen.

## Two sessions, one database — fixture state is shared, and it bites

The fleet runs two emulators, but they talk to ONE Rails API and ONE database. So
a flow in session 1 that mutates fixture state changes what session 2 sees,
mid-flow. This is not theoretical; it produced a failure that took three separate
investigations to unwind:

1. The e2e seed created the multi-quantity conversation with a single BUYER
   message, leaving it one-sided.
2. `conversation_archive` (session 1) archived the conversation above it.
3. `composer_draft` posted to the one-sided thread, bumping it to the top.
4. The three unread-badge flows then long-pressed that row and could never get a
   badge back, because `mark_unread` has no inbound message to un-read — and the
   API answered 204 anyway.

Consequences worth knowing before adding flows or sessions:

- **Per-feature seeding is NOT safe in a multi-session fleet.** `qa.sh seed`
  resets the shared database, so doing it between features in one session
  destroys whatever the other session is mid-way through. Seed only when the
  whole fleet is stopped.
- **Prefer flows that create what they assert.** A flow that posts its own
  message, or creates its own listing, is immune to what the other session did.
  `create_listing_full_publish` is the model: everything it asserts, it made.
- **"The topmost row" is not a stable target.** Ordering is driven by
  `last_message_at`, which any flow in either session can change.
- Cross-session interference looks like flakiness — a flow that passes alone and
  fails in the fleet. Before calling such a flow flaky, ask what the other
  session was running at that moment.

## `inputText` can lose the first character — settle after the tap

A device screenshot showed a saved draft titled **"Broad Location Item"** where the
flow had typed **"Abroad Location Item"**. The leading "A" was gone, and the flow
failed four minutes later asserting the title it had typed — reading like a
listing-creation bug.

It is not an app bug. The field is a plain react-hook-form `Controller` with
`value` + `onChangeText`, no remount, no debounce, no transform. The cause is that
Maestro types the instant `tapOn` returns, so the first character can land before
the input has focus. No human types within a frame of tapping.

`waitForAnimationToEnd` does **not** fix it. `eraseText` does:

```yaml
- tapOn: "What are you selling?"
- eraseText                      # forces the IME to attach; without it the "A" vanishes
- inputText: "Abroad Location Item"
```

Measured on device with the field's own character counter as the oracle, which is
what made this settleable rather than a guess:

| strategy | counter | verdict |
|---|---|---|
| tap → `inputText` | 19/150 | first character lost |
| tap → `waitForAnimationToEnd` → `inputText` | 19/150 | **no better** |
| tap → `eraseText` → `inputText` | 20/150 | intact |

("Abroad Location Item" is 20 characters.) Applied to all 47 tap→type pairs on the
create form's title, price and description fields — all empty at that point, so
`eraseText` costs nothing.

Note the counter trick generally: when a field's contents look wrong, find
something in the UI that states the length or the value independently. Reading
"Broad" vs "Abroad" off a screenshot is easy to get wrong; 19 vs 20 is not.

**When triaging a "wrong text" failure, compare the strings character by
character before assuming the app mangled the value.** "Broad" vs "Abroad" is one
missing letter and easy to read past.


## Maestro anchors the regex at BOTH ends — one `.*` is not enough mid-string

Appending `.*` to a substring assertion only works when the text is a **prefix** of
the real copy:

```yaml
- assertVisible: "Blocked users cannot contact you.*"   # OK — it IS the prefix
- assertVisible: "restore it by logging back in.*"      # NEVER matches
- assertVisible: ".*restore it by logging back in.*"    # correct
```

The second one sits in the middle of "Your account will be scheduled for deletion
… You can restore it by logging back in within 30 days.", and an anchored pattern
starting with `restore` cannot match a string starting with `Your`.

This bit me in exactly the way worth remembering: fixing 14 substring assertions in
one pass, I appended a single `.*` to all of them. That was right for 11 and wrong
for 3, and the 3 failures looked identical to the original bug. When bulk-fixing a
class, check each member against the real value rather than assuming they share a
shape.

## Check that the API READS every parameter the client sends

The seller's "Search my listings…" typed into a box that did nothing for as long as
it has existed. The mobile side was correct at every layer — MyListings debounced
the field, passed `search:` to `getMyListings`, and the client appended `?search=`
— and `Api::V1::My::ListingsController#index` never referenced
`params[:search]`. The request arrived complete and the server ignored it.

Nothing catches this by construction: the flow passes, the response is a valid
200, and the screen renders perfectly. Only the CONTENT is wrong, and only if you
know what it should have been.

The check is cheap:

```bash
# what the client sends
grep -rhoE 'query\.append\("([a-z_\[\]]+)"' src/api/*.ts | sed 's/.*("//;s/"//' | sort -u
# what a given controller reads
grep -oE "params\[:[a-z_]+\]" hatiwal-api/app/controllers/api/v1/my/listings_controller.rb | sort -u
```

Compare **per endpoint**, not globally: `search` was read by the public
`listings_controller` all along, so a repo-wide grep found it and proved nothing.

Running it over every endpoint turned up one more mismatch that is NOT a bug —
`getMyListings` accepts a `categoryId` no caller passes, so the parameter is dead
in the client rather than dropped by the server. Worth verifying which side is
missing before filing anything.

## An audit I built and threw away: "modal-only strings"

Four failures had the same shape — a flow reaching for a label that only exists
inside an overlay, without opening it: "Report" in the listing detail's More
sheet, "Block User" in UserProfile's ActionMenu, "Blocked Users" as a settings row
below the fold, and the report flow's success toast being covered by the "also
block this user?" alert. Each reported `Element not found: <label>` on a screen
that was rendering perfectly.

Tempting to automate, and I did. It does not work by static analysis:

- Treating any file containing `confirmAlert(` as a modal made every string in
  Profile.tsx and ListingForm.tsx "modal-only": 499 candidates.
- Narrowing to *Sheet/*Menu/*Dialog files plus keys inside `confirmAlert(...)`
  argument lists got it to 101 — and the first fourteen were still wrong, because
  "Sign Out" is a real row on Profile AND the confirm button of its own alert.
  "Block User" is the same: a menu item and an alert button.

A string being in an overlay is not a property of the string, it is a property of
the JSX position, and telling them apart needs the render tree rather than a
regex. An audit that is wrong in its first fourteen rows teaches you to ignore it,
which is worse than not having it.

### The second attempt: "tapped without scrolling to it"

Same outcome, three iterations, worth recording so it is not tried a fourth time.
Four flows had genuinely reached for off-screen controls ("Blocked Users", the
Language row, `seller-profile-link`, the theme RESET taps), so a check looked
obvious:

1. "no scroll within 12 lines" — reported `open_language_picker`, where the scroll
   and the tap are 14 lines apart with a guard block between them. Wrong on its
   own helper.
2. "the suite scrolls to this selector elsewhere" — reported eight flows for
   tapping the FIRST `listing-card` in a feed, which is on screen on arrival.
3. same, minus selectors ever tapped with an `index:` — down to six, and two were
   still wrong: `saved_tab_dark` scrolls to the neighbouring `"Appearance"` LABEL
   rather than to the option's id, which puts the target on screen just as well.

Whether a control needs scrolling depends on its position in a rendered layout,
and no amount of regex over the flow recovers that. The targeted greps that found
all four real cases took a minute each and were exact: pick the labels you know
live in a screen's lower half, then check every tap on them for a preceding
scroll.

What IS mechanically detectable is in `audit_structure.py`: opening a modal menu
twice (the opener sits behind its own modal), and tapping a tab while one is open
(the modal covers the tab bar). Both are about the SEQUENCE, not the string, and
both are exact.

For the string case the reliable move is manual and cheap: when a label is not
found on a screen you believe renders it, grep the component and look at what
gates it — `{!isOwnListing && ...}`, `{menuVisible && ...}`, a `view :detailed`.
The four cases above each took one grep once the question was asked that way.

## `LogBox` in the logcat means an OVERLAY was covering the app

The rig classifies a failure as `app_error` when the logcat mentions
`Console Error`, `Uncaught Error` or **LogBox**. That third one is easy to
misread as noise; it is the most useful of the three.

LogBox is React Native's dev overlay. When it appears in the logcat alongside view
strings (`LogBoxData.js:225:39`, `tooltipText: null`, `viewIdR…`) it was IN THE
VIEW TREE — i.e. a box was drawn over the app. While it is up, neither a person nor
a flow can tap what is behind it, so the failure reads as a missing element:

    mode/seller_views_own_listing_buyer_mode
      → `Element not found: Id matching regex: profile-tab`
      → LogBox was sitting on the tab bar

So when a control that certainly exists is "not found", grep the logcat for LogBox
before doubting the selector. Two cases found this way:

- `[UniversalList] fetch error` logged with `console.error` raised a full-screen
  LogBox that blanked the very list whose inline error state was supposed to show.
  Fixed by making it `console.warn` (the error state is the user-facing part).
- The expo-dev-client's linking config conflicting with expo-router's raised a
  LogBox over the tab bar. Not actionable — one `scheme`, one routing plugin — so
  it is silenced by exact string in `app/_layout.tsx`. LogBox is inert in release,
  so suppressing a known non-issue costs users nothing and stops it hiding the UI.

The rule that follows: **never `console.error` for a condition the app already
handles.** The log itself becomes a worse bug than the thing it reports.

## `qa:expect-api-error` — flows whose subject IS a failed request

`SILENT` means "the assertions passed while a request failed" — the app looked
right and told the user nothing. It is the most damning verdict the rig gives, so
it must not fire on a flow that provokes the failure deliberately.

`auth/login_wrong_password` was marked SILENT for the 401 it exists to trigger.
Put this marker anywhere in such a flow and its API errors stop counting:

    # qa:expect-api-error — reason

Opt-in by marker rather than by inference. The tempting shortcut — "if the flow
asserts an error string, expect an API error" — would quietly excuse REAL silent
failures in any flow that happens to check an error somewhere along the way, and
those are exactly the ones worth catching.

Two flows carry it: login_wrong_password (a 401 from wrong credentials) and
register_duplicate_email. `login_empty_fields` used to need it and no longer does:
the app now validates before sending, so there is no request to fail (UI-036).

## Edit a rig script ATOMICALLY while a run is in flight

`qa/qa.sh`, `qa/lib/*.sh` are re-read on every invocation, and a queue calls them
constantly. Writing one in place leaves a window where a concurrent call reads a
truncated file:

    ./qa/qa.sh: line 395: `           say "$n flow(s) with a stale FAIL verdict"'

`bash -n` on the finished file passes, which makes the error look impossible. It
cost one `prune` call mid-queue; it could as easily have cost a feature run.

Write to a temp file and `os.replace()` it — that swaps the inode, so anything
already reading the old file keeps a consistent copy:

    tmp = p.with_suffix(".sh.tmp"); tmp.write_text(new)
    tmp.chmod(p.stat().st_mode); os.replace(tmp, p)

Same for the flows a running feature is about to execute: Maestro reads each
.yaml at flow start, so an edit lands on whichever flows have not begun — which is
also why verdicts go stale mid-run and why `flow_sha` exists.

## `centerElement: true` is not a free upgrade — it breaks LAST-item targets

`scrollUntilVisible` stops the moment its target enters the view tree, which can
leave it at the very bottom of the viewport — underneath the FloatingTabBar, which
overlays that edge. Maestro taps an element's CENTRE, so the tap lands on the tab
bar and nothing happens. No error; the flow carries on against a screen that never
changed. That is what swallowed the taps in the language picker and cost two
seller flows ~7 minutes each.

`centerElement: true` fixes it — for a target with content BELOW it.

It does the OPPOSITE for a target at the END of a scrollable list. I applied it to
all 161 scroll-then-tap sites and broke the Sign Out scroll: "Sign Out" and
"Delete account" are the last rows on Profile, so the list cannot scroll far enough
to centre them and `centerElement` keeps trying until it times out — reporting
`No visible element found: id: sign-out-button` while the hierarchy dump for that
very step contains `#sign-out-button`. An element that is plainly on screen,
reported missing, by an option added to make finding it more reliable.

So: use it where the earlier bug actually bites, and read the screen first. A
target at the bottom of its list needs no help — it is already as visible as it
will get.

## `hideKeyboard` is BACK. Only use it directly after typing.

On Android `hideKeyboard` presses Back. That is safe only while an IME is up to
consume it. With no keyboard, Back does what Back does — closes the screen.

I hit this twice. First it broke create_listing_map_pin by closing the map modal.
Then I swept `hideKeyboard` into 17 flows before their submit buttons, reasoning
"typing happened earlier, so the IME must be up". It is not: anything between the
typing and the submit can dismiss it — a category sheet, a photo picker, a map
modal. In create_listing_publish_direct the sequence was

    - tapOn: "Confirm location"     # closes the map modal, IME already gone
    - hideKeyboard                  # → BACK → leaves the form
    - tapOn: "Publish"              # now behind a "Discard changes?" alert

and the hierarchy dump at failure was that alert: CANCEL / DISCARD. Four publish
flows failed on `Element not found: Publish` for a button that was simply behind a
dialog my own step had raised.

THE RULE: `hideKeyboard` belongs immediately after `inputText`/`eraseText`, with at
most a `waitForAnimationToEnd` between. Anywhere else, the IME is already down and
you are pressing Back on the screen under test.

Checked mechanically: 31 remaining uses all follow typing directly, 0 do not.

## The emulator was not flaky — the kernel was killing it

It died five times in one day, each death taking the running feature with it, and
once deadlocking the entire cycle: the run sat holding the device lock with nothing
to drive while the reboot waited for that same lock. Every symptom pointed at a
flaky emulator (`listing_actions_sheet FAIL 549s` is a dying VM, not a slow test).

`dmesg` settled it in one line:

    Out of memory: Killed process (qemu-system-x86) anon-rss:4692376kB
                   ... oom_score_adj:200
    chrome invoked oom-killer ... Killed process (qemu-system-x86)

**qemu runs with `oom_score_adj=200`** — a POSITIVE adjustment, so the kernel picks
it before anything else on the machine. A browser tab opening was enough to take
the rig out.

`qa/lib/protect_emulator.sh` lowers that score after boot (needs `QA_SUDO_PW`; a
negative score is privileged). It does NOT create memory — if the machine truly runs
out, something still dies — it stops the emulator being the automatic first victim.

The general lesson: when a component dies repeatedly with no error of its own,
check whether something ELSE is killing it before treating it as unreliable. Five
reboots went by before I looked at dmesg.

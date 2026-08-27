# Sell-flow QA plan — environment verified 2026-08-27 18:45

For the overnight QA run the owner asked for. Everything below was **measured on this host**, not
assumed. Read this before starting; it exists so the night is not spent rediscovering environment
problems.

---

## 1. The environment IS capable of a real device run

| Check | Result |
|---|---|
| `/dev/kvm` | present (hardware accel available) |
| `maestro` | `~/.maestro/bin/maestro` — **not on default PATH**, export it |
| AVD cold boot | `qa_phone` booted in **~70s**, Android **15**, as `emulator-5554` |
| AVDs available | `qa_phone`, `qa_phone2`, `qa_phone3`, `qa_phone4` (`qa_edu_phone` belongs to another project — leave it) |
| App installed | `com.hatiwal.app`, flags include **DEBUGGABLE** → dev build, loads JS from Metro |
| Host cores / load | 16 cores, **load average 14.5** — saturated by other projects' containers |

**Boot command that worked:**
```bash
~/Android/Sdk/emulator/emulator -avd qa_phone -no-window -no-audio -no-boot-anim \
  -gpu swiftshader_indirect &
```

**Concurrency ceiling: 2 QA sessions.** The host is already at ~14.5/16 before any emulator. More
width will produce timeouts that look like app bugs and waste the night chasing them.

---

## 2. THE TRAP: there are two Metro bundlers, and 8081 is the wrong project

```
:3008  -> hatiwal-mobile's Metro (docker container hatiwal-mobile-mobile-1)   <- USE THIS
:8081  -> /home/hama99o/Apps/Seven/openaleph-mobile  (expo start, host node)  <- NOT OURS
```

Verified: `:8081` answers `packager-status:running` and returns **404** for a Hatiwal module path.
A dev build looks for a dev server on **8081 by default**, so left alone the app can load
**another application's JavaScript bundle** while the report claims to cover Hatiwal.

**Point the app at Hatiwal's Metro explicitly before any flow runs.** From inside the emulator the
host is `10.0.2.2`, so the dev server is `10.0.2.2:3008` and the API is `10.0.2.2:3007`.

Sanity check that must pass before trusting a single result: the app under test renders a Hatiwal
screen, and a request appears in the **hatiwal-api** log — not merely that the app opened.

---

## 3. The shipped preflight blocks on a FALSE POSITIVE — fix before using

`~/.claude/skills/qa-sweep/assets/maestro/preflight.sh` reported:

```
FAIL  errors after launch:
  D AndroidRuntime: Calling main entry com.android.commands.monkey.Monkey
  I AndroidRuntime: VM exiting with result code 0.
```

Those lines are **`monkey`'s own launcher output** — `result code 0` means the launch *succeeded*.
The logcat scan greps too broadly (any `AndroidRuntime` line). As shipped it fails every run on
every app. Narrow it to real signals — `FATAL EXCEPTION`, `ReactNativeJS.*(Error|error)`,
`Could not connect to development server`, red-box markers — or it will block the whole night.

Everything else in preflight passed: adb, maestro, device online, `.env` present, backend reachable,
app installed.

---

## 4. Prerequisites that must land BEFORE flows run

1. **`qa/features.yaml` still describes the OLD flow.** It reads
   *"full draft→active→reserved→sold lifecycle"* and *"mark reserved/sold with buyer"* — the exact
   reserve-then-sell path this redesign removed. Run unchanged, QA either reports correct new
   behaviour as broken or passes while checking nothing that matters. **Rewrite it first**, and add
   features that do not exist yet:
   - sell without reserving (the one-tap primary)
   - the Sales ledger screen: rows, edit a row, void a row, stock restored
   - undo immediately after marking sold
   - quantity edit reopens a sold-out listing (**up**), and is refused readably (**down**)
   - held-unit transparency on a batch ("N held · N available")
   - a reserved listing is still findable in search AND still messageable
   - place / release a hold from the chat thread
2. **Seed fixtures are missing** (already carded, #288). Without these the two headline cases are
   silently skipped:
   - a multi-unit listing **with an open hold** (nothing seeds this today)
   - a sold-out listing
   - a sold-out listing whose quantity was then raised
3. **Every Maestro flow written today has NEVER been executed** — no emulator was up while the
   builders worked, and they said so honestly. Expect genuine failures *in the flows themselves*,
   not only in the app. Budget for that; it is the point of running them.

---

## 5. Regression surface — do not test only the new screens

`Listing.browsable` was widened, and it is the scope behind the buyer feed, search, category
counts, the similar-listings rail, recently-viewed and saved. **Browse, Search and Saved are in the
blast radius even though nobody edited those screens.** Include them.

Also worth one pass each because their policies were widened: messaging a reserved listing
(`start_conversation?`), and `renew` / `unpublish` / `activate` (now 422 instead of 500).

---

## 6. Rules for the run

- **Find first, fix second.** Ranked report, then ask before changing anything.
- Re-run a failing step once before recording it; a real failure reproduces.
- Cover screen sizes by running the same flows against a phone AVD and a tablet AVD (RN does not
  reflow like CSS). Also check safe-area insets, keyboard-avoiding inputs, large font scale,
  light/dark, and **RTL in ps + fa** — this redesign added numeric controls inside sentences.
- Screenshot every screen reached; evidence goes to `qa/reports/`.
- State plainly what could NOT be tested and why. No silent gaps.

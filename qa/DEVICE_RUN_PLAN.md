# Device-run plan — change_language_urdu + create_listing_currency_pkr (2026-09-19)

Get real device proof of the two 1.1.0 flagship flows that have none (see
FINDINGS_2026-09-19.md). Every path below was verified off-device. Leave in the
working tree per CLAUDE.md; awaiting owner review.

## Preconditions (before touching the emulator)
- Owner's DIRECT go (his machine). Charger is connected (battery no longer a blocker).
- **ONE EMULATOR, EVER** (hard rule — Karwan's CLAUDE.md; the box has hard-rebooted from
  memory exhaustion 4× in a day). Do NOT boot `qa_phone` alongside another running emulator
  (right now e0's `qa_phone2` is up). The single slot must be FREE first — this is a **serial
  handoff** (e0 shuts down → I boot `qa_phone`), never a parallel second emulator. Ask e0
  directly for the release; don't infer from the device list.
- Slot free — verify by PROCESS NAME, not pattern:
  - `ps -eo comm= | grep -c '^qemu-system-x86$'` → 0   (no other emulator up)
  - `ps -eo comm= | grep -c '^java$'` → 0   (Metro/Gradle)
  - `adb devices` → empty
- The rig's own boot guard refuses if CPU is not idle enough — trust it.

## AVD: **qa_phone** — NOT hatiwal_play, NOT qa_phone2  ← correction
- Use **qa_phone** (rig's `QA_AVD_1`, **411dp primary** phone). `qa.sh up phone` installs
  the debug APK onto it and starts Metro.
- Do NOT use `hatiwal_play`: it carries the standalone Play STORE build (1.0.4, pre-Urdu/PKR).
  Running these flows there IS the "installed build predates 1.1.0" trap.
- Do NOT use `qa_phone2`: e0 offered it, but `qa.config.sh` labels it the **360dp SMALL
  variant** ("set via `qa.sh profile small`"), not the primary. A first proof of a build in
  review belongs on the canonical **411dp** so a red is an execution fact, not a
  "maybe-360dp" question. (`create_listing_currency_pkr` is 360dp-safe by design — it types
  nothing — but `change_language_urdu`'s string-visibility asserts are safer at 411dp.)
  NOTE: the `qa/RIG_CONTRACT.md` e0 cited for a "qa_phone2 = MultiMagic's" split does **not
  exist** in this checkout or git history; `qa.config.sh` is the authoritative source.
- `qa_phone` is Karwan's side (he released it earlier and will queue behind me). Confirm it
  is free with the process-name proof right before booting; snapshot cleared → cold boot (~2 min).

## Build: reuse the existing debug APK (no rebuild)
- `android/app/build/outputs/apk/debug/app-debug.apk` exists (Sep 14, 287 MB).
- A debug APK loads JS from Metro. Urdu + PKR are JS-only (i18n JSON, ListingForm zod
  enum, currency/format, provinces) — no new native module — so Metro serving the current
  working tree (HEAD 12cfa27 = 1.1.0) makes the shipped features testable on that shell.
- ⇒ Skip `qa.sh build`. This is what makes the run cheap.

## Exact sequence (QA_SESSION=1 → qa_phone, emulator-5554, reports/)
```bash
QA_SESSION=1 QA_AVD_1=qa_phone ./qa/qa.sh doctor                       # rig sanity
QA_SESSION=1 QA_AVD_1=qa_phone ./qa/qa.sh up phone                     # cold boot + install app-debug.apk + Metro
QA_SESSION=1 QA_AVD_1=qa_phone ./qa/qa.sh flow profile/change_language_urdu
QA_SESSION=1 QA_AVD_1=qa_phone ./qa/qa.sh flow listings/create_listing_currency_pkr
QA_SESSION=1 ./qa/qa.sh down                                          # then release with the process-name proof
```
Run each `flow` separately (the fix→retest loop) so each verdict lands before the next.

## Where verdicts land (per-flow, not batched)
- `qa/reports/run-<N>/results.jsonl` (via `lib/emit_result.py`); screenshots under
  `qa/reports/run-<N>/<feature>/`.
- Aggregated to `qa/history.jsonl` (`./qa/qa.sh register` refreshes FLOW_REGISTER.md).
- Copy each verdict into FINDINGS_2026-09-19.md as it lands (battery/handover rule).

## What each GREEN proves
- **change_language_urdu:** switching to Urdu applies RTL + Urdu strings AND the profile
  SAVES with `preferredLanguage="ur"`. The exact bug it guards (EditProfile zod once
  `["en","ps","fa"]` while the picker offered Urdu → silent save failure) is statically
  FIXED: no 3-only enum remains in src, `PreferredLanguage` includes "ur", and
  `translationCoverage.test.ts` guards it.
- **create_listing_currency_pkr:** PKR appears in the currency sheet and is selectable
  (statically confirmed: ListingForm zod enum + option + `ListingCurrency` type).

## Stale-build contingency (if the shell is not compatible)
Symptoms: `qa.sh up` install fails, OR the app runs but Urdu is absent / behaves pre-1.1.0
(⇒ the installed shell is a stale STANDALONE build, or a native dep changed). Then:
```bash
QA_SESSION=1 QA_AVD_1=qa_phone ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a \
  ./qa/qa.sh build      # arm64-only — full ABIs OOM this box (see project_hatiwal_play_deploy)
QA_SESSION=1 QA_AVD_1=qa_phone ./qa/qa.sh up phone
```
`qa.sh build` (Gradle assembleDebug) is the slow, OOM-prone part (~5–15 min). If it is
needed, the run will NOT fit a 25-min slot — report that and ask for a longer slot rather
than rush a half-build.

## Timebox reality
Fast path ≈ cold boot ~2 min + install ~1 min + Metro warmup + two flows (~3–4 min each in
history) ≈ **12–18 min** — inside 25. The "5 min" only holds if the emulator is already
warm. Slow path (rebuild) does not fit.

## On RED
Any red is a finding about a build in review → write the verdict + screenshot to disk
immediately and send it to the supervisor at once, not at the end of the slot.

## Run gotchas (from Karwan/e0, learned on the box)
- **Force-stop the app AFTER a density / night-mode / LANGUAGE change, not before.** (e0's finding.) Otherwise
  the screen renders at the OLD size inside the new window and a stale layout looks *exactly*
  like a real overflow. This is the worst false positive for `change_language_urdu`: a stale-
  layout wrap reads as "the Urdu string is too long." (The flow already includes
  `await_language_restart.yaml`, so it should handle this — but if a red shows an Urdu overflow,
  suspect stale layout FIRST, and it reinforces why 411 dp is the canonical choice.)
- **Load average: do NOT boot above ~12.** e0 measured on this box: 15.5 → Pixel Launcher
  ANR'd and a flow died on a system dialog that reads exactly like a failed assertion; 7.5 →
  12 flows ran clean; e0's rig refuses >12. `uptime` first; it falls within minutes as other
  suites finish. (At e0's 2026-09-19 handoff, load was **16.1** — too high; wait it out.)
- **A wedged framework looks like a live device:** `adb devices` can say "device" while
  `cmd activity` answers "Can't find service." If services go missing, REBOOT the AVD (~70s to
  come back) rather than debugging the flow.
- **Node:** box default is v18.18.0; Expo 54 needs 20+. `npx expo start` dies with
  `configs.toReversed is not a function` (names neither Node nor a version — misleading). Use
  `.nvmrc` / `nvm use 20`. That failure is NOT MEASURED, not a FAIL.

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OVERNIGHT QA DRIVER
#
# Owner instruction, 2026-09-05: "The test should continue like this, and I will
# sleep … make sure we test every edge case, the screen … make sure it didn't
# stop. It should continue until tomorrow."
#
# WHY A SCRIPT AND NOT JUST AN AGENT LOOP. An agent wakes up, does a thing, and
# goes quiet between turns; a device sitting idle between wakeups is exactly the
# "it stopped" this is meant to prevent. So the SCHEDULE lives here, in a plain
# background process that keeps the emulator busy continuously, and the agent's
# job is the part a script cannot do: triage a red flow, decide flow-bug vs
# app-bug, fix it, commit.
#
# WHAT IT DOES, per (feature, viewport) pair, forever until told to stop:
#   1. Rebuilds the APK when HEAD has moved past what the APK contains, so
#      fixes made overnight are actually the thing under test. The rebuild is
#      done in the documented safe order — emulator DOWN first, because Gradle
#      takes every core and a running emulator then reports "not responding" and
#      every flow fails for no app reason.
#   2. Sets the viewport profile, then runs the feature's flows.
#   3. Appends one line per pass to a status file cheap enough for the agent to
#      read on every wakeup without burning context on log tails.
#
# STOPPING: `touch /tmp/hatiwal-overnight.stop`. Checked between passes, so it
# never kills a flow mid-run and never leaves the device lock held.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

STOP_FILE=/tmp/hatiwal-overnight.stop
STATUS=qa/reports/overnight-status.tsv
LOG=qa/reports/overnight.log
mkdir -p qa/reports
rm -f "$STOP_FILE"

# 360dp FIRST for everything the owner actually reported problems on. Every bug
# found in this session's small-screen work — the clipped stock chip, the
# "Categ…" tab label, the keyboard-covered sheets — was invisible at 411dp,
# which is the width every earlier pass had used. So the narrow width leads and
# the reference width follows as the regression check.
#
# dark_mode and rtl are LAST in each cycle on purpose: both restart the app to
# apply a setting, so a failure there tends to strand the app in the other
# theme/language and pollute whatever runs next.
PAIRS=(
  "small:chat"      "small:seller"    "small:listings"  "small:profile"
  "small:browse"    "small:gallery"   "small:report"    "small:reviews"
  "small:saved"     "small:mode"      "small:auth"      "small:maps"
  "small:safety"    "small:share"     "small:pagination" "small:onboarding"
  "phone:chat"      "phone:seller"    "phone:listings"  "phone:profile"
  "phone:browse"    "phone:gallery"   "phone:report"    "phone:reviews"
  "large:chat"      "large:seller"    "large:browse"    "large:listings"
  "small:dark_mode" "small:rtl"       "phone:dark_mode" "phone:rtl"
)

say() { printf '%s  %s\n' "$(date '+%m-%d %H:%M')" "$*" | tee -a "$LOG"; }

# ── ANOTHER SESSION'S EMULATOR IS RUNNING, AND IT MUST BE LEFT ALONE ─────────
#
# Owner instruction, 2026-09-05: "other emulator should not be disturbed …
# you should work your time, and he should work his … so both should continue."
#
# emulator-5584 is `qa_edu_phone` (a different project). The rig already guards
# this — resolve_device compares the AVD name to QA_AVD, and its own comment
# records that session 1 twice ADOPTED that very device and installed Hatiwal
# onto it, back when the single-device fallback skipped the identity check. That
# hole is closed, but this run is unattended for a whole night and the one
# destructive verb in here is `qa.sh down`, so it gets its own check too:
# nothing is stopped or built unless the device we hold is provably ours.
#
# Pinned explicitly rather than relying on defaults: QA_AVD is what makes
# _device_is_ours a real test (it returns "ours" for anything when QA_AVD is
# empty), and QA_SESSION fixes the port so we ask for 5580 and never 5584.
export QA_SESSION=1
export QA_AVD=qa_phone
OURS_SERIAL=emulator-5580

device_is_ours() {
  local name
  name=$(timeout 15 adb -s "$OURS_SERIAL" emu avd name 2>/dev/null | head -1 | tr -d '\r')
  [ "$name" = "$QA_AVD" ]
}

# Every other emulator attached right now, recorded so the morning log can prove
# they were still here at the end.
foreign_devices() {
  timeout 15 adb devices 2>/dev/null | awk '/^emulator-[0-9]+\tdevice$/{print $1}' \
    | grep -v "^${OURS_SERIAL}$" | tr '\n' ' '
}

# The provenance file lives beside the APK, NOT in qa/. An earlier draft read
# qa/apk-provenance.txt, which does not exist — so apk_commit() returned empty,
# the staleness check never matched, and the driver would have rebuilt before
# EVERY pass: 32 pointless emulator stop/build/boot cycles per night, each one a
# window in which nothing is being tested.
PROVENANCE=android/app/build/outputs/apk/debug/apk-provenance.txt

apk_commit() {
  sed -n 's/^commit: *//p' "$PROVENANCE" 2>/dev/null | tr -d ' \r' | head -1
}

apk_is_bundled() {
  grep -q '^bundled: 1' "$PROVENANCE" 2>/dev/null
}

# ── BACK OFF ON HOST PRESSURE, NOT ON THE OTHER PROJECT'S EXISTENCE ─────────
#
# Owner instruction: "you should work your time, and he should work his … so both
# should continue." BOTH — so waiting for their suite to end is the wrong reading:
# it ran continuously for over 90 minutes and this driver produced nothing in that
# window, which is the "it stopped" the owner explicitly warned against.
#
# What actually caused the false failures earlier was RESOURCE EXHAUSTION, not
# concurrency: load 10.9 of 16 cores with swap fully consumed (1G/1G), where chat
# flows took 7m33s against 162s solo and assertions fired before the UI rendered.
# At load ~6 with 11G free the same two suites coexist fine. So the gate measures
# the thing that actually breaks runs.
#
# LOAD_CEILING 9 of 16 cores leaves headroom for a flow's own spikes without
# tipping into swap; MIN_FREE_GB 3 is the point below which this host started
# swapping, and swap death is what OOM-killed an emulator in an earlier session.
LOAD_CEILING=9
MIN_FREE_GB=3

# SWAP NEEDS ITS OWN GATE — added 2026-09-07 after three campaigns were voided.
#
# "Available" RAM stays HEALTHY-LOOKING while swap is exhausted, because the
# kernel counts reclaimable page cache in it. On 2026-09-06/07 this host sat at
# 10–12G available with load 7–13 — comfortably inside BOTH limits above — while
# swap was 100% full and the emulator thrashed. The damage is not slowness, it is
# WRONG VERDICTS: auth times out, the app sits on Login, and flows fail on
# elements that are present and correct. run-500 scored 9/49 on chat and 24/49 on
# the identical flows once swap was free; run-508 took 13h for 42 browse flows
# (1117s each against a ~170s baseline).
SWAP_FREE_MIN_MB=256
SWAP_CHURN_KBPS=512

# OCCUPANCY IS NOT THRASH — both halves are required.
#
# A first cut of this gate tripped on `swap free < 256MB` alone and would have
# halted the campaign for good: measured 2026-09-07 21:2x, this host sits at
# swap 2.0G/2.0G used as its STEADY STATE (two emulators, 18 containers, two
# Expo servers, Vite, Sidekiq) while paging only 0-164 KB/s — full, but calm,
# and flows run fine. Full swap is where this box lives; it is the CHURN that
# breaks verdicts.
#
# So require both: swap essentially full AND sustained paging. 512 KB/s is a
# judgement call, not a measurement of the bad state — nobody sampled vmstat
# while run-500 and run-508 were failing. It sits ~3x above the idle ceiling
# observed above, so it will not fire on calm-but-full. If a future pass still
# turns in mass "Login is not visible" failures with this gate quiet, sample
# `vmstat 2 4` during it and lower the number to what you actually see.
swap_thrashing() {
  local total freemb churn
  total=$(free -m | awk '/^Swap:/{print $2}')
  [ "${total:-0}" -gt 0 ] || return 1        # no swap configured — not a factor
  freemb=$(free -m | awk '/^Swap:/{print $4}')
  [ "${freemb:-99999}" -lt "$SWAP_FREE_MIN_MB" ] || return 1
  command -v vmstat >/dev/null 2>&1 || return 0   # can't measure churn — assume the worst
  churn=$(vmstat 2 3 2>/dev/null | awk 'NR>3{s+=$7+$8; n++} END{print (n?int(s/n):0)}')
  [ "${churn:-0}" -ge "$SWAP_CHURN_KBPS" ]
}

host_is_pressured() {
  local load free
  swap_thrashing && return 0
  load=$(awk '{print int($1)}' /proc/loadavg)
  free=$(free -g | awk '/Mem:/{print $7}')
  [ "${load:-0}" -ge "$LOAD_CEILING" ] || [ "${free:-99}" -le "$MIN_FREE_GB" ]
}

# Capped at 10 minutes, not 30: a long back-off is indistinguishable from a
# stalled night, and proceeding under load costs some slow flows whereas waiting
# costs ALL of them.
wait_for_headroom() {
  local waited=0 cap=600
  while host_is_pressured; do
    [ $waited -eq 0 ] && say "backing off: load $(cut -d' ' -f1 /proc/loadavg), $(free -g | awk '/Mem:/{print $7}')G free — running now would produce false failures"
    sleep 60; waited=$((waited + 60))
    if [ $waited -ge $cap ]; then
      # Load and swap are NOT the same bet. Proceeding under load costs some slow
      # flows — worth it, per the note above. Proceeding under swap exhaustion
      # costs the VERDICTS, so waiting is strictly better than running: a void
      # pass has to be re-run anyway AND it pollutes the register in the meantime.
      # Hold for up to an hour, saying so every 10 minutes so this is never
      # mistaken for a stalled night, then give in rather than skip the night
      # entirely — but mark the pass so triage knows not to trust it.
      # LOAD NOW GETS THE SAME PATIENCE AS SWAP, AND THE SAME WARNING.
      #
      # The note above this function argued that "proceeding under load costs some
      # slow flows whereas waiting costs ALL of them", so load escaped after 10
      # minutes while swap held for an hour. Measured 2026-09-12, that trade does
      # not hold. This driver proceeded at load ~17, the box then climbed to 24.9
      # (shared with another agent's chrome-headless, ffmpeg and Rails), and
      # run-522's seller pass came back 0 of 8 — it cost ALL of them anyway, plus
      # hours of wall clock and a triage pass over numbers that meant nothing.
      # run-521 said the same thing more quietly: 66% at flow 29, 55% by the end,
      # four rig_fails, 310s per flow against a ~208s baseline.
      #
      # So hold up to an hour for EITHER condition, and if we do give in, say
      # SUSPECT PASS in both cases. Proceeding is meant to keep the night moving,
      # not to pretend the numbers are sound: an unmarked contended pass is worse
      # than no pass at all, because the next reader triages it as app bugs.
      if [ $waited -lt 3600 ]; then
        if swap_thrashing; then
          say "swap exhausted ($(free -m | awk '/^Swap:/{print $4}')MB free) after ${waited}s — still waiting; verdicts recorded now would be VOID"
        else
          say "host busy (load $(cut -d' ' -f1 /proc/loadavg)) after ${waited}s — still waiting; verdicts recorded now would be suspect"
        fi
        cap=$((cap + 600))
        continue
      fi
      swap_thrashing \
        && say "SUSPECT PASS — swap still exhausted after ${waited}s, proceeding anyway; treat every failure below as unproven" \
        || say "SUSPECT PASS — host still busy (load $(cut -d' ' -f1 /proc/loadavg)) after ${waited}s, proceeding anyway; treat every failure below as unproven"
      return 0
    fi
  done
  [ $waited -gt 0 ] && say "headroom back after ${waited}s"
  return 0
}

# ── REBUILD ONLY WHEN NATIVE CODE MOVED ─────────────────────────────────────
#
# The APK is NOT what carries the JS under test. This dev-client build loads its
# bundle from Metro at 10.0.2.2:3008 (see open_bundle.yaml), and Metro serves the
# WORKING TREE — so a JS fix committed at 3am is under test on the next flow with
# no rebuild at all. `bundled: 1` in the provenance is misleading here: the
# launcher has no embedded-bundle entry to use it.
#
# So a rebuild is only worth its cost — an emulator stop, ~2min of Gradle, a boot
# — when something NATIVE changed. Rebuilding on every commit instead would stop
# the device several times a night for nothing, and each stop is a window in
# which nothing is being tested.
native_changed() {
  local from="$1"
  [ -n "$from" ] || return 1
  git diff --name-only "$from" HEAD -- \
      android/ ios/ package.json package-lock.json app.config.ts app.config.js app.json \
      2>/dev/null | grep -q .
}

rebuild_if_stale() {
  local head_sha apk_sha
  head_sha=$(git rev-parse HEAD 2>/dev/null)
  apk_sha=$(apk_commit)
  [ -n "$apk_sha" ] && [ "${head_sha:0:12}" = "${apk_sha:0:12}" ] && return 0

  if ! native_changed "$apk_sha"; then
    return 0   # JS-only drift: Metro already serves it
  fi

  # REFUSE to stop anything we cannot prove is ours. Skipping the rebuild costs
  # only staleness; killing another project's emulator costs them their work.
  if ! device_is_ours; then
    say "SKIP REBUILD — $OURS_SERIAL is not $QA_AVD; refusing to stop a device that is not ours"
    return 0
  fi

  say "REBUILD (native change) apk=${apk_sha:0:8} head=${head_sha:0:8} — stopping ONLY $OURS_SERIAL; untouched: $(foreign_devices)"
  ./qa/qa.sh down >>"$LOG" 2>&1
  sleep 20
  ./qa/qa.sh build bundled >>"$LOG" 2>&1 || say "REBUILD FAILED — continuing on the previous APK"
  ./qa/qa.sh up >>"$LOG" 2>&1
  sleep 10
  ensure_metro
}

# ── METRO MUST BE UP AND WARM ───────────────────────────────────────────────
#
# The APK says `bundled: 1`, and doctor concludes "Metro not required" — that is
# WRONG for this dev-client build. The launcher has no embedded-bundle entry, so
# the app always loads JS over the network, and open_bundle.yaml deep-links it to
# `10.0.2.2:3008`. Note `adb reverse` is irrelevant to that: 10.0.2.2 addresses
# the host directly and the forward does not intercept it (doctor's own note).
#
# COLD METRO IS A FLOW-KILLER. A fresh container transforms the 22MB bundle on
# first request, which took 39s measured here — and a container restart tonight
# put every flow over its patience limit, failing on `"Development Build" is not
# visible`. So the bundle is requested ONCE here, from the host, before any flow
# runs; the flows then hit a warm cache.
metro_ready() {
  [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://localhost:3008/status 2>/dev/null)" = "200" ]
}

ensure_metro() {
  if ! metro_ready; then
    say "metro down — starting it"
    docker compose up -d mobile >>"$LOG" 2>&1
    for _ in $(seq 1 40); do metro_ready && break; sleep 5; done
  fi
  # Warm the ENTRY bundle, not /index.bundle — the latter 404s in this project
  # (expo-router owns the entry point).
  local code
  code=$(curl -s -m 600 -o /dev/null -w '%{http_code}' \
    "http://localhost:3008/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false" 2>/dev/null)
  say "metro warm (entry bundle -> ${code:-timeout})"
}

# ── DO NOT LET MY OWN EDITS RELOAD THE APP MID-FLOW ─────────────────────────
#
# Because the app runs LIVE JS, editing a source file makes Metro rebuild and
# hot-reload it underneath whatever flow is running. That cost 18 flows tonight,
# and the failures looked like an app that would not boot rather than like my
# edit. The rig had already written the warning; I assumed `bundled: 1` made me
# safe and it did not.
#
# So the agent and the driver take turns. The driver publishes a marker while a
# pass is in flight, and waits here if the agent is mid-edit:
#   agent, before editing:  wait for /tmp/hatiwal-pass-running to disappear,
#                           then `touch /tmp/hatiwal-agent-editing`
#   agent, after editing:   `rm -f /tmp/hatiwal-agent-editing`
PASS_MARKER=/tmp/hatiwal-pass-running
EDIT_MARKER=/tmp/hatiwal-agent-editing

wait_for_agent() {
  local waited=0
  while [ -f "$EDIT_MARKER" ]; do
    [ $waited -eq 0 ] && say "agent is editing — holding off (its edits would hot-reload into a flow)"
    sleep 15; waited=$((waited + 15))
    # Never block the night forever on a marker somebody forgot to remove.
    #
    # 15 minutes was too short, measured on 2026-09-05: the agent held the marker
    # for a device-verification session (three viewports, relaunch + login + shots
    # at each), the cap expired mid-session, and the driver started run-495 onto a
    # device whose window size the agent was changing under it — so the pass was
    # discarded and the verification had to restart. A verification pass is the one
    # thing the marker exists to protect, and it is inherently slower than a flow.
    #
    # An hour is still a real ceiling against a marker left behind by a crashed
    # session, and the driver says loudly which case it thinks it is in.
    if [ $waited -ge 3600 ]; then
      say "edit marker held 60min — assuming it was left behind, continuing"
      rm -f "$EDIT_MARKER"; break
    fi
    if [ $waited -eq 900 ]; then
      say "agent still editing after 15min — waiting (cap is 60min)"
    fi
  done
}

# ── DO NOT BARGE IN ON A RUN THAT IS ALREADY GOING ──────────────────────────
# Two Maestro instances on one emulator interleave taps and produce failures that
# belong to neither.
say "waiting for any in-flight pass to finish before taking the device…"
waited=0
# OUR device only. A bare "maestro" pattern also matches the other project's
# suite on emulator-5584, which would idle this driver every time they test —
# yielding to them is handled deliberately per-pass, not by stalling startup.
while pgrep -f "maestro --device $OURS_SERIAL" >/dev/null 2>&1; do
  sleep 30; waited=$((waited + 30))
  [ $((waited % 600)) -eq 0 ] && say "still waiting for the running pass (${waited}s)"
done
say "device free after ${waited}s"
ensure_metro

cycle=0
while [ ! -f "$STOP_FILE" ]; do
  cycle=$((cycle + 1))
  say "═══ CYCLE $cycle ═══  ours=$OURS_SERIAL($QA_AVD)  left alone: $(foreign_devices)"

  for pair in "${PAIRS[@]}"; do
    [ -f "$STOP_FILE" ] && { say "stop file seen — exiting cleanly"; exit 0; }
    profile="${pair%%:*}"
    feature="${pair##*:}"

    wait_for_agent
    wait_for_headroom
    rebuild_if_stale

    # ── SEED BEFORE EVERY PASS, not once per cycle ──────────────────────────
    #
    # Several flows CONSUME their fixture: conversation_delete deletes its
    # listing, conversation_archive archives its thread, mark_sold_all_units
    # sells out its 200-unit batch. A per-cycle seed therefore guarantees false
    # failures the second time a feature runs — and this schedule runs chat at
    # `small`, then again at `phone`, then again at `large` inside ONE cycle.
    #
    # Observed: `conversation_delete` failed on "No visible element found: QA
    # Disposable conversation_delete" while the fixture for
    # `conversation_archive` was simply gone from the database. Both look like
    # app bugs in a triage queue and neither is one.
    #
    # Seeding here is safe because passes are sequential and the reset only
    # touches e2e accounts (`db:seed:reset_e2e`). It must NOT move earlier: the
    # rig's own guidance is to reset between runs, never underneath one, and the
    # first restart tonight seeded while a queued pass still held the device —
    # wiping fixtures out from under flows that were mid-assertion.
    if ./qa/qa.sh seed >>"$LOG" 2>&1; then
      :
    else
      # LOUD, because a silent seed failure turns the next pass into a wall of
      # false reds that reads exactly like a broken app.
      say "SEED FAILED before $profile/$feature — results from this pass are suspect"
    fi
    ./qa/qa.sh profile "$profile" >>"$LOG" 2>&1
    printf '%s/%s\n' "$profile" "$feature" > "$PASS_MARKER"

    # Snapshot the run dirs BEFORE the pass so we can identify the one this pass
    # actually created, rather than guessing by mtime further down.
    runs_before=$(ls -d qa/reports/run-* 2>/dev/null | sort)

    started=$(date +%s)
    ./qa/qa.sh feature "$feature" >>"$LOG" 2>&1
    rc=$?
    elapsed=$(( $(date +%s) - started ))

    # Verdicts come from the run's own results.jsonl, never from this script's
    # idea of what happened — the rig is the source of truth and the agent reads
    # the same rows when triaging.
    #
    # The key is `"result": "pass"`, LOWERCASE. An earlier draft grepped for
    # `"status": "PASS"`, which appears nowhere in the file, so every pass would
    # have been recorded as 0/0 all night and the morning summary would have
    # looked like nothing ran. Checked against a real run-480 row before trusting
    # it. The only three values the rig has ever written, across 1560 history
    # rows, are `pass`, `fail` and `rig_fail` — so the red pattern names
    # rig_fail explicitly rather than relying on it matching "fail" (it would
    # not: the anchored quote makes "rig_fail" a different string).
    # THE RUN DIR MUST BE THE ONE THIS PASS CREATED — never "the newest by mtime".
    #
    # This was `ls -dt qa/reports/run-* | head -1`, which reports whatever was
    # touched most recently. When a pass ABORTS before creating its own run dir —
    # a failed claim, a failed preflight, rc=3 — that hands back the PREVIOUS
    # run's directory, and its counts get written to the status file and the log
    # under the NEW feature's name. Observed 2026-09-09:
    #
    #   DONE small/chat  pass=16 fail=9  rc=3  79s  run-519
    #
    # 79s for a chat pass that normally takes 3-4h, and run-519 was created
    # 2026-09-08 by the browse pass that died with the emulator — its
    # results.jsonl holds 25 BROWSE rows. So browse verdicts were reported as
    # chat. FLOW_REGISTER.md itself survives this — it is regenerated from the
    # rows, and each row carries its own `feature`, so it still files them under
    # browse. The damage is to overnight-status.tsv and this log, which are the
    # FIRST thing an agent reads when deciding what to triage: a pass that tested
    # NOTHING appeared as a completed chat pass with plausible numbers, and the
    # 79s runtime was the only tell.
    #
    # `comm -13` = lines only in "after", i.e. genuinely new directories. If the
    # pass created none, say so loudly and record zeros rather than borrowing a
    # stale run's numbers — "nothing was tested" must never look like a result.
    runs_after=$(ls -d qa/reports/run-* 2>/dev/null | sort)
    run_dir=$(comm -13 <(printf '%s\n' "$runs_before") <(printf '%s\n' "$runs_after") | tail -1)
    if [ -z "$run_dir" ]; then
      say "NO RUN DIR for $profile/$feature (rc=$rc, ${elapsed}s) — the pass aborted before creating one; nothing was tested and no verdicts are recorded"
      run_dir="none"
    fi
    pass=0; fail=0
    if [ -f "$run_dir/results.jsonl" ]; then
      pass=$(grep -c '"result": *"pass"'   "$run_dir/results.jsonl" 2>/dev/null || true)
      fail=$(grep -cE '"result": *"(fail|rig_fail)"' "$run_dir/results.jsonl" 2>/dev/null || true)
      pass=${pass:-0}; fail=${fail:-0}
    fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$(date '+%m-%d %H:%M')" "$cycle" "$profile" "$feature" \
      "$pass" "$fail" "${run_dir##*/}" >> "$STATUS"
    rm -f "$PASS_MARKER"
    say "DONE $profile/$feature  pass=$pass fail=$fail rc=$rc ${elapsed}s  ${run_dir##*/}"
  done
done
say "stop file seen — driver exiting"

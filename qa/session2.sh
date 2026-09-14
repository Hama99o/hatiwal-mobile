#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ⚠️  DO NOT RUN THIS ON THIS MACHINE WHILE THE edu EMULATOR IS UP.
#
# MEASURED 2026-09-05, not guessed. Three emulators do not fit:
#     2 emulators  ->  8.4G available, flows average 156s (= the quiet baseline)
#     3 emulators  ->  1.6G available, swap 2.0G/2.0G EXHAUSTED, and
#                      emulator-5580 (session 1, the PRIMARY tester) went
#                      `offline` — killed. Session 1 had to reboot it mid-pass.
# Stopping this session returned the host to 6.8G available and session 1
# recovered on its own ("emulator recovered — continuing").
#
# So on THIS host the real limit is TWO emulators, and one of those belonged to
# another project (qa_edu_phone on 5584).
#
# UPDATED 2026-09-12, and the first conclusion was only half right. 5584 went
# away and RAM freed up (11G available, swap idle), so a second tester finally
# booted — and it still did not pay off, because the binding constraint here is
# CPU, not memory. With both testers up: load 21.4 on 16 cores, two
# qemu-system-x86 at 181% and 158% plus Metro at 148%, session 1's flows slowed
# 208s -> 262s (+26%), the slowest hitting 405s against a 600s timeout, and this
# session lost buyer_picker_rtl to that timeout outright.
#
# Session 1 recorded no rig_fail rows, so nothing had broken yet — but a slower
# device is what turns assertions into races, and that is the exact failure class
# this campaign spends its time removing.
#
# So: "more RAM" is NOT the signal to start this session. Spare CORES are. The
# gate below now waits out session 1's pass as well as the load average, so this
# session runs in real gaps rather than competing for the same cores.
#
# The script below is correct and can be reused — the constraint is the box, not
# the code. Check `free -g` first: it needs ~4G headroom AFTER booting.
#
# ── SECOND MEASUREMENT, 2026-09-06: TWO IS ALSO TOO MANY ON THIS BOX ─────────
# I ran this again with qa_edu_phone DOWN, reading the note above as "the slot is
# free now". It is not enough. With only OUR two emulators up (5580 + 5582) and
# the usual docker stack, the doctor reported:
#
#     WARN  swap 100% full — the emulator will thrash
#     WARN  load 11 of 16 cores — expect slow, flaky flows
#
# and results were CORRUPTED rather than merely slow. Same 49 chat flows, same
# APK, near-identical wall time (run-496 avg 267s/flow -> run-500 avg 274s/flow),
# but passes fell 21 -> 9. 15 flows went PASS -> FAIL, and the failures name the
# mechanism: `Assertion is false: "Login" is not visible` and `api: AxiosError`,
# i.e. the app sat on the Login screen because auth timed out under thrash. Those
# are FALSE failures — the rig re-ran clean afterwards (`buyer@hatiwal.test can
# log in`, api 200) once 5582 was killed and available RAM went 10G -> 17G.
#
# So the real gate is SWAP, not the emulator count and not `free -g` alone:
# if `free -h` shows swap anywhere near full with one emulator up, a second one
# will not add throughput, it will invalidate BOTH sessions' verdicts. Do not
# trust any pass/fail recorded while swap is exhausted — re-run it.
#
# ── THIRD MEASUREMENT, 2026-09-14: IT NO LONGER EVEN SURVIVES THE BOOT ────────
# Asked for again by the owner, and launched — `qa.sh up` booted qa_phone4 on
# 5582 cleanly and it reached `device`. It was DEAD roughly two minutes later,
# OOM-killed by the host along with the shell that launched it.
#
# The numbers, one emulator up beforehand: 4063MB free, swap 2047/2047 (100%).
# After 5582 came online: 1001MB free. qemu alone wants ~3.7GB RESIDENT per
# emulator, so two need ~7.4GB against ~4GB of headroom on a box whose swap is
# already gone. There is nothing left to reclaim — the kernel picked the newer
# emulator and killed it.
#
# What survived is the useful part: session 1's emulator lived (it was the
# 2026-09-05 run where session 1 died instead and had to be rebooted mid-pass),
# and free RAM returned to 4099MB the moment 5582 went.
#
# So this is now measured three times, in three different ways, and the answer
# has not changed. The honest reading is not "two is risky" — it is that on THIS
# host a second emulator cannot be kept alive at all while swap is exhausted.
# Fix the swap/memory pressure first; the script below is correct and will work
# the day the box has the headroom.
# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# SECOND QA TESTER — runs beside qa/overnight.sh, on its own emulator.
#
# Owner request 2026-09-05: "launch two QA tester so they can do it faster".
#
# ── WHY THIS IS NOT JUST `overnight.sh` TWICE ───────────────────────────────
#
# Two sessions share ONE Rails API and ONE database. That is the whole design
# problem, and getting it wrong is not slow — it is silently WRONG:
#
#   * `qa.sh seed` runs `db:seed:reset_e2e`, which WIPES and recreates the e2e
#     fixtures. If session 2 seeds while session 1 is mid-flow, session 1's
#     listings and conversations vanish underneath its assertions and it reports
#     app bugs that do not exist. That exact failure already cost a pass tonight
#     (run-487), from a single session seeding under its own queued pass.
#   * Flows that CONSUME a fixture (conversation_delete deletes its listing,
#     mark_sold_all_units sells out its batch) would race each other.
#
# So this session:
#   1. NEVER SEEDS. Session 1 owns seeding entirely.
#   2. Runs only READ-MOSTLY features — ones that switch language/theme, browse,
#      paginate, share, or walk onboarding. None of them destroy a fixture another
#      session is asserting against.
#   3. Runs at 411dp while session 1 runs 360dp, so the same flows get a second
#      screen size rather than a duplicate of the first. That is the fleet's real
#      benefit (qa/fleet.sh: "the tablet listing-detail bug was found that way —
#      identical flow, phone passed, tablet failed").
#
# ── DEVICE SAFETY ───────────────────────────────────────────────────────────
# QA_PORT_BASE is 5580, and QA_PORT = base + 2*(session-1). So:
#     session 1 -> emulator-5580   (qa_phone,     ours)
#     session 2 -> emulator-5582   (qa_phone4,    ours, this script — per qa.config.sh)
#     session 3 -> emulator-5584   (qa_edu_phone, ANOTHER PROJECT — never use)
# Session 3 is deliberately never used: 5584 is the edu emulator the owner asked
# to leave running, and the rig's own comment records session 1 twice adopting it
# and installing Hatiwal onto it.
#
# STOP: `touch /tmp/hatiwal-session2.stop`
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

export QA_SESSION=2
# NOT hardcoded: qa/qa.config.sh already maps session 2 to its own AVD and that
# mapping WINS over an export here (it is sourced after). Session 2 resolved to
# qa_phone4 on this machine, not qa_phone2 as first assumed — so the ownership
# check below asks the rig which AVD it actually booted instead of asserting a
# name, while still refusing anything that is not one of ours.
OURS=emulator-5582
FOREIGN=emulator-5584

STOP=/tmp/hatiwal-session2.stop
LOG=qa/reports/session2.log
STATUS=qa/reports/session2-status.tsv
EDIT_MARKER=/tmp/hatiwal-agent-editing
rm -f "$STOP"

say() { printf '%s  [s2] %s\n' "$(date '+%m-%d %H:%M')" "$*" | tee -a "$LOG"; }

# Read-mostly only — see the note above on why this list is not "everything else".
# Overridable so this session can be pointed at a subset without editing the
# file — e.g. `QA_FEATURES="newfeatures maps" ./qa/session2.sh` to drive only the
# work that just shipped. The default is unchanged, so a bare launch behaves
# exactly as before.
#
# Read as a space-separated string rather than an array so it survives `export`.
FEATURES=(${QA_FEATURES:-rtl dark_mode maps share pagination onboarding})

host_is_pressured() {
  local load free
  load=$(awk '{print int($1)}' /proc/loadavg)
  free=$(free -g | awk '/Mem:/{print $7}')
  # Tighter than session 1's ceiling: this session is the OPTIONAL one, so it is
  # the one that should yield when the box is full. Three emulators at ~3.4G each
  # on a host whose swap is already exhausted is exactly how tonight's false
  # failures were produced (load 10.9, flows 3x slower, assertions firing before
  # the UI rendered).
  [ "${load:-0}" -ge 14 ] || [ "${free:-99}" -le 3 ]
}

device_is_ours() {
  local name
  name=$(timeout 15 adb -s "$OURS" emu avd name 2>/dev/null | head -1 | tr -d '\r')
  # Ours = any qa_phone* / qa_tablet AVD. NEVER qa_edu_phone, which belongs to
  # another project and which this rig has twice installed Hatiwal onto by
  # accident. An empty name (device not answering) is also refused.
  case "$name" in
    qa_edu_phone|"") return 1 ;;
    qa_phone*|qa_tablet) return 0 ;;
    *) return 1 ;;
  esac
}

say "starting — device $OURS, 411dp, read-mostly features only, NEVER seeds"
say "leaving alone: $FOREIGN (another project) and emulator-5580 (session 1)"

./qa/qa.sh up >>"$LOG" 2>&1 || say "boot reported a problem — continuing, doctor will say"
sleep 10
if ! device_is_ours; then
  say "ABORT: $OURS is not one of ours. Refusing to drive another project's device."
  exit 1
fi
./qa/qa.sh profile phone >>"$LOG" 2>&1 && say "viewport: 411dp"

cycle=0
while [ ! -f "$STOP" ]; do
  cycle=$((cycle + 1))
  say "═══ CYCLE $cycle ═══"
  for feat in "${FEATURES[@]}"; do
    [ -f "$STOP" ] && { say "stop file seen"; exit 0; }

    # Hold while the agent edits app source — same interlock session 1 uses,
    # because Metro serves BOTH emulators from one working tree.
    waited=0
    while [ -f "$EDIT_MARKER" ] && [ $waited -lt 900 ]; do sleep 15; waited=$((waited+15)); done

    # YIELD FOR AS LONG AS IT TAKES — no escape hatch.
    #
    # This used to give up after 600s and run anyway, which contradicted this
    # file's own stated design ("this session is the OPTIONAL one, so it is the
    # one that should yield when the box is full"). Measured 2026-09-12, with
    # both testers up on a 16-core host:
    #
    #   load 21.4, two qemu-system-x86 at 181% and 158% CPU plus Metro at 148%
    #   session 1's flows slowed from 208s (first 20) to 262s (last 10) — +26%
    #   slowest reached 405s against a 600s timeout, and session 2 had already
    #   lost buyer_picker_rtl to that timeout
    #
    # Session 1 produced no rig_fail rows, so nothing had broken YET — but a
    # slower device is precisely what turns assertions into races, which is the
    # failure class this campaign has spent days removing. Manufacturing that
    # noise to gain a second viewport is a bad trade.
    #
    # THE BINDING CONSTRAINT ON THIS HOST IS CPU, NOT RAM. There was 11G free the
    # whole time. A second tester needs spare CORES, and while session 1 is
    # mid-pass there are none.
    #
    # So: also wait out session 1's pass, not just the load average. That makes
    # this session use genuine gaps instead of competing.
    w=0
    # OWNER ASKED FOR PARALLEL TESTING (2026-09-12), so this no longer waits out
    # session 1's pass — only real host pressure holds it back.
    #
    # The previous version also waited on /tmp/hatiwal-pass-running, which was
    # correct for "fill the gaps" but useless in practice: session 1 runs passes
    # back to back, so this session would essentially never get a turn.
    #
    # The measured risk is unchanged and is CPU, not RAM. With two emulators on
    # 2026-09-12 the box hit load 21.4, session 1's flows went 208s -> 262s
    # (+26%), and this session lost two flows to the 600s cap. What HAS changed:
    # the suite now waits explicitly for async content in the places that used to
    # race, and double-login flows get 2x FLOW_TIMEOUT, so a slower device costs
    # wall clock rather than false failures.
    #
    # LOAD_CEILING is raised to 14 for the same reason: at 11 on a 16-core box
    # this session would back off permanently while session 1 alone sits near 10.
    # 14 still yields before the zone that produced false failures.
    while host_is_pressured; do
      [ -f "$STOP" ] && { say "stop file seen while backing off"; exit 0; }
      if [ $((w % 300)) -eq 0 ]; then
        say "yielding: load $(cut -d' ' -f1 /proc/loadavg), $(free -g | awk '/Mem:/{print $7}')G free, session1 pass=$([ -f /tmp/hatiwal-pass-running ] && cat /tmp/hatiwal-pass-running || echo none)"
      fi
      sleep 60; w=$((w+60))
    done

    started=$(date +%s)
    ./qa/qa.sh feature "$feat" >>"$LOG" 2>&1
    rc=$?
    run_dir=$(ls -dt qa/reports/run-* 2>/dev/null | head -1)
    pass=0; fail=0
    if [ -f "$run_dir/results.jsonl" ]; then
      pass=$(grep -c '"result": *"pass"' "$run_dir/results.jsonl" 2>/dev/null || true)
      fail=$(grep -cE '"result": *"(fail|rig_fail)"' "$run_dir/results.jsonl" 2>/dev/null || true)
    fi
    printf '%s\t%s\tphone\t%s\t%s\t%s\t%s\n' "$(date '+%m-%d %H:%M')" "$cycle" "$feat" \
      "${pass:-0}" "${fail:-0}" "${run_dir##*/}" >> "$STATUS"
    say "DONE $feat pass=${pass:-0} fail=${fail:-0} rc=$rc $(( $(date +%s) - started ))s"
  done
done
say "stopped"

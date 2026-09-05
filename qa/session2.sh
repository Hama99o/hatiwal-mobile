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
# So on THIS host the real limit is TWO emulators, and one of those belongs to
# another project (qa_edu_phone on 5584) which the owner asked to keep running.
# That leaves exactly one for Hatiwal. A second Hatiwal tester is only viable
# when 5584 is down, or on a machine with more RAM.
#
# The script below is correct and can be reused — the constraint is the box, not
# the code. Check `free -g` first: it needs ~4G headroom AFTER booting.
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
FEATURES=(rtl dark_mode maps share pagination onboarding)

host_is_pressured() {
  local load free
  load=$(awk '{print int($1)}' /proc/loadavg)
  free=$(free -g | awk '/Mem:/{print $7}')
  # Tighter than session 1's ceiling: this session is the OPTIONAL one, so it is
  # the one that should yield when the box is full. Three emulators at ~3.4G each
  # on a host whose swap is already exhausted is exactly how tonight's false
  # failures were produced (load 10.9, flows 3x slower, assertions firing before
  # the UI rendered).
  [ "${load:-0}" -ge 11 ] || [ "${free:-99}" -le 3 ]
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

    w=0
    while host_is_pressured && [ $w -lt 600 ]; do
      [ $w -eq 0 ] && say "backing off: load $(cut -d' ' -f1 /proc/loadavg), $(free -g | awk '/Mem:/{print $7}')G free"
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

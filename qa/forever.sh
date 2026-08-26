#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Run the fleet in a loop, cycle after cycle, until told to stop.
#
#   ./qa/forever.sh            # sessions 1 and 2 (what this host can carry)
#   ./qa/forever.sh 1 2 3      # more, if the host grows
#   touch qa/reports/.stop     # finish the current cycle, then stop
#
# `fleet.sh` returns when the board is empty — that is one cycle. This wraps it:
# reset the claims, re-seed, sweep, merge the results into the board, repeat.
#
# WHY SEED BETWEEN CYCLES AND NEVER INSIDE ONE
#   Every session shares one backend. Fixtures degrade as flows run (a partial
#   sale empties a batch, a delete removes a conversation), so a cycle must start
#   from a clean seed — but re-seeding mid-cycle resets data under another
#   session's feet and produces failures that describe nothing.
#
# WHY THE DISK GUARD
#   A full disk stopped QA dead once, and it does not look like a disk problem
#   from the logs — flows just fail or hang for no app reason, and the rig itself
#   cannot write its reports. Maestro keeps a full artifact tree (screenshots plus
#   a hierarchy dump per step) for every flow of every run, which is the fastest
#   growing thing on the machine. Keep the newest few and drop the rest before
#   each cycle; they are pure diagnostics and regenerate on the next failure.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/.."

SESSIONS=("$@")
[ "${#SESSIONS[@]}" -gt 0 ] || SESSIONS=(1 2)

STOP_FILE="qa/reports/.stop"
LOG="qa/reports/forever.log"
MIN_FREE_GB=25
KEEP_ARTIFACT_RUNS=3

mkdir -p qa/reports
say() { printf '%s  %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG"; }

free_gb() { df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9'; }

reclaim_space() {
  # Maestro's per-run artifact trees, newest few kept.
  ls -dt "$HOME"/.maestro/tests/* 2>/dev/null \
    | tail -n +$((KEEP_ARTIFACT_RUNS + 1)) | xargs -r rm -rf 2>/dev/null
  # Our own heavy evidence from runs already merged into the board.
  ls -dt qa/reports/run-* 2>/dev/null | tail -n +11 | xargs -r rm -rf 2>/dev/null
}

cycle=0
while :; do
  if [ -f "$STOP_FILE" ]; then
    say "stop file present — exiting after $cycle cycle(s)"
    rm -f "$STOP_FILE"
    exit 0
  fi

  cycle=$((cycle + 1))
  say "═══ cycle $cycle — sessions ${SESSIONS[*]} ═══"

  reclaim_space
  avail="$(free_gb)"
  if [ -n "$avail" ] && [ "$avail" -lt "$MIN_FREE_GB" ]; then
    # Refuse rather than produce a run's worth of failures that mean nothing.
    say "only ${avail}GB free (need ${MIN_FREE_GB}GB) — pausing 10min, not sweeping"
    sleep 600
    continue
  fi
  say "disk ok: ${avail}GB free"

  # Claims are per-cycle: forget last cycle's before handing work out again.
  ./qa/qa.sh claim-reset >>"$LOG" 2>&1

  # One seed per cycle, with every session idle — see the note above.
  say "seeding"
  ./qa/qa.sh seed >>"$LOG" 2>&1 || say "seed failed — sweeping anyway on existing data"

  say "sweeping"
  ./qa/fleet.sh "${SESSIONS[@]}" >>"$LOG" 2>&1
  say "cycle $cycle done"

  # `fleet.sh` already merges results; register again is harmless and covers a
  # session that died before its own merge.
  ./qa/qa.sh register >>"$LOG" 2>&1

  PASS="$(grep -c '^| .*| PASS' qa/FLOW_REGISTER.md 2>/dev/null || echo '?')"
  say "board: $PASS flows passing"
done

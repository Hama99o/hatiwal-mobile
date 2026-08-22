#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Run several QA sessions at once, with NO duplicated work.
#
#   ./qa/fleet.sh            # every session listed in qa.config.sh / defaults
#   ./qa/fleet.sh 1 3        # only sessions 1 and 3
#
# Each session loops:  claim a feature -> test it -> claim the next
# until the board is empty. `qa.sh claim` is flock-guarded, so two sessions
# asking at the same instant can never get the same feature — which is the whole
# point: two emulators spending two hours on the same 42 chat flows is half the
# fleet wasted, and nothing in the logs says so.
#
# WHY A FLEET AT ALL
#   Coverage per hour. 17 features, most of them 30-40 flows at ~2 minutes each,
#   is far more than one device can sweep in a night. Four devices is roughly four
#   times the coverage — and because each session runs a different SCREEN SIZE, the
#   same flow gets exercised at 360dp, 411dp, 448dp and 1280dp. That is how the
#   tablet listing-detail bug (UI-020) was found: identical flow, phone passed,
#   tablet failed.
#
# BEFORE YOU START A CYCLE
#   Seed once, with every session idle:  ./qa/qa.sh seed
#   Fixtures DEGRADE as flows run (UI_FINDINGS RIG-009) — a partial-sale flow
#   eventually sells a batch out, a delete flow removes a conversation. Do NOT
#   seed mid-cycle: all sessions share one backend, so it resets data under
#   another session's feet mid-flow.
#
# AFTER A CYCLE
#   ./qa/qa.sh register     # merges every session's results into the board
#   ./qa/qa.sh claim-reset  # forget claims so the next sweep can start
# ─────────────────────────────────────────────────────────────────────────
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/.."

# Session -> AVD. Override in qa/qa.config.sh; these are the defaults this rig
# was set up with. Two sessions must never share an AVD (see QA_HANDBOOK).
: "${QA_AVD_1:=qa_tablet}"
: "${QA_AVD_2:=qa_phone}"
: "${QA_AVD_3:=qa_phone2}"
: "${QA_AVD_4:=qa_phone3}"
export QA_AVD_1 QA_AVD_2 QA_AVD_3 QA_AVD_4

SESSIONS=("$@")
[ "${#SESSIONS[@]}" -gt 0 ] || SESSIONS=(1 2 3 4)

run_session() {
  local s="$1" log="qa/reports/fleet-s$s.log" feat
  : > "$log"
  while feat="$("$HERE/qa.sh" claim)"; do
    [ -n "$feat" ] || break
    printf '\n═══ session %s → feature %s ═══\n' "$s" "$feat" >> "$log"
    QA_SESSION="$s" "$HERE/qa.sh" feature "$feat" >> "$log" 2>&1
  done
  printf '\n═══ session %s: board empty, done ═══\n' "$s" >> "$log"
}

echo "fleet: sessions ${SESSIONS[*]} — each logs to qa/reports/fleet-sN.log"
for s in "${SESSIONS[@]}"; do
  run_session "$s" &
done
wait
echo "fleet: all sessions finished"
"$HERE/qa.sh" register

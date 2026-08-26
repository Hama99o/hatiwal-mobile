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

# ── Host still usable? ────────────────────────────────────────────────────────
# A cycle runs for hours, and both the box and the device can go bad inside one.
# An openaleph-mobile Gradle build took the load average to 49 on 16 cores, this
# session's emulator died under it, and every remaining feature then aborted on
# preflight. Nothing false was recorded — the rig refuses to run flows without a
# device, which is the point of the preflight — but the cycle spent itself
# claiming work it could not do. So check per FEATURE, not just per cycle.
FLEET_MAX_LOAD="${FLEET_MAX_LOAD:-$(( $(nproc 2>/dev/null || echo 8) * 3 / 4 ))}"

_fleet_host_ready() {
  local s="$1" waited=0 load port
  port=$(( ${QA_PORT_BASE:-5580} + 2 * (s - 1) ))
  while :; do
    load=$(awk '{printf "%.0f", $1}' /proc/loadavg 2>/dev/null || echo 0)
    if [ "$load" -le "$FLEET_MAX_LOAD" ]; then
      # Only boot when the device is actually gone: `up` reinstalls the app, which
      # is far too expensive to run before every feature.
      if adb devices 2>/dev/null | grep -q "emulator-${port}[[:space:]]*device"; then
        return 0
      fi
      QA_SESSION="$s" "$HERE/qa.sh" up >/dev/null 2>&1 && return 0
    fi
    [ "$waited" -ge 60 ] && return 1
    sleep 120
    waited=$((waited + 2))
  done
}

run_session() {
  local s="$1" log="qa/reports/fleet-s$s.log" feat
  : > "$log"
  while feat="$("$HERE/qa.sh" claim)"; do
    [ -n "$feat" ] || break
    if ! _fleet_host_ready "$s"; then
      printf '\n═══ session %s: host unusable for 2h (load/device) — stopping ═══\n' "$s" >> "$log"
      break
    fi
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

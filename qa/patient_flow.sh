#!/usr/bin/env bash
# Run one flow, but WAIT for the machine and RETRY when the result is unmeasured.
#
#   ./qa/patient_flow.sh chat/scroll_to_latest [attempts]
#
# Why this exists. `qa.sh flow` correctly refuses to run when free RAM is under
# 4GB (a thrashing emulator produces fake failures) and correctly reports exit 3
# for that. But a CHAIN of flows then loses one to every transient dip — and on
# this host the dips are self-inflicted: an `npx jest` or `npx tsc` run beside the
# chain is enough. On 2026-09-02 that cost the same three flows three times over.
#
# So: wait for room BEFORE each attempt, and treat exit 2 (ran, no verdict —
# driver death or a collision) and exit 3 (preflight blocked) as "try again"
# rather than as results. A real pass or failure returns immediately.
#
# Exit code is the last attempt's, so a caller still sees 0/1 for a real verdict
# and 2/3 only when it never became measurable.
set -u
FLOW="${1:?usage: $0 <feature/flow> [attempts]}"
ATTEMPTS="${2:-4}"
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.." || exit 1

need_gb=4
avail() { free -g | awk 'NR==2{print $7}'; }

wait_for_room() {
  local waited=0
  while [ "$(avail)" -lt "$need_gb" ]; do
    [ "$waited" -ge 1800 ] && return 1
    sleep 30; waited=$((waited + 30))
  done
}

e=3
for i in $(seq 1 "$ATTEMPTS"); do
  if ! wait_for_room; then
    echo "  patient_flow: no RAM for $FLOW after 30m ($(avail)GB free)" >&2
    e=3; break
  fi
  # A device that vanished mid-chain is not a flow verdict either — bring it back
  # before blaming the flow.
  if ! adb devices 2>/dev/null | grep -q emulator; then
    echo "  patient_flow: no device — booting" >&2
    QA_SESSION="${QA_SESSION:-1}" nice -n 10 timeout 900 ./qa/qa.sh up >/dev/null 2>&1
  fi
  QA_SESSION="${QA_SESSION:-1}" nice -n 10 timeout 1500 ./qa/qa.sh flow "$FLOW"
  e=$?
  case $e in
    0|1) break ;;                       # a real verdict — done
    *)   echo "  patient_flow: $FLOW unmeasured (exit $e), attempt $i/$ATTEMPTS" >&2 ;;
  esac
done
exit $e

#!/usr/bin/env bash
# Which red flows were already fixed AFTER the run that failed them?
#
# The campaign fixes flows while the sweep is running, so a summary always holds
# some failures whose cause is already committed. Triaging those wastes a session
# (this script exists because two sold-listing flows were investigated from
# scratch after their fix had landed five minutes later).
#
# Compares each failing flow's last commit time against the mtime of the log that
# recorded the failure. Standalone on purpose: the rig's own libs are sourced by a
# long-running sweep, and editing those mid-run is its own hazard.
#
# LIMITATION, and it matters: this detects "changed since", NOT "fixed". A batch
# commit touching ten flows marks all ten stale even if only one of the failures
# was addressed. Treat STALE as "do not spend a triage on this log yet", never as
# "this now passes" — the only thing that proves a fix is a green re-run.
#
# Usage: ./qa/stale_check.sh [run-NNN]
set -euo pipefail
cd "$(dirname "$0")/.."
run="${1:-$(ls -dt qa/reports/run-* | head -1 | xargs basename)}"
res="qa/reports/$run/results.jsonl"
[ -f "$res" ] || { echo "no results for $run"; exit 1; }

printf '%-38s %-8s %s\n' FLOW VERDICT NOTE
python3 - "$res" <<'PY' | while IFS='|' read -r feat flow; do
import json,sys,io
for l in io.open(sys.argv[1],encoding="utf-8",errors="replace"):
    l=l.strip()
    if not l.startswith("{"): continue
    try: d=json.loads(l)
    except: continue
    if d.get("result")!="pass": print(f"{d.get('feature')}|{d.get('flow')}")
PY
  f="maestro/$feat/$flow.yaml"
  log="qa/reports/$run/$feat/$flow.log"
  [ -f "$f" ] || { printf '%-38s %-8s %s\n' "$flow" "?" "flow file missing"; continue; }
  [ -f "$log" ] || { printf '%-38s %-8s %s\n' "$flow" "?" "no log"; continue; }
  # Environmental failures are not triage work. Maestro's on-device driver dies
  # fairly often (DeviceServerDiedException, "Command failed (tcp:NNNNN): closed"),
  # usually failing in well under a minute, and the fix is a re-run — not a flow
  # edit. Without this they sit in the list looking like unaddressed defects: this
  # is why meetup_proposal read as "worth triaging" after it had been diagnosed.
  # Environmental failures are not triage work. Maestro's on-device driver dies
  # fairly often and the fix is a re-run, not a flow edit.
  #
  # Detect it by ABSENCE OF EVIDENCE rather than by the exception string: when the
  # driver dies the rig can be left with an empty log and no <failure> at all, and
  # the exception may be recorded in a SIBLING flow's xml instead — which is how I
  # first mis-attributed meetup_proposal's failure to a driver death I had read out
  # of meetup_proposed_bubble_ui.xml (that one was a first attempt the rig retried
  # into a pass). A short run that captured nothing is the signature.
  xml="qa/reports/$run/$feat/$flow.xml"
  secs=$(grep -ah "\"flow\": \"$flow\"" "$res" 2>/dev/null | sed -n 's/.*"seconds": \([0-9]*\).*/\1/p' | tail -1)
  has_failure=no
  [ -s "$xml" ] && grep -qa '<failure>' "$xml" && has_failure=yes
  if [ "$has_failure" = no ] && [ -n "${secs:-}" ] && [ "$secs" -lt 60 ]; then
    printf '%-38s %-8s %s\n' "$flow" "ENV" "died in ${secs}s with no failure recorded — re-run, nothing to fix"
    continue
  fi
  # The login helpers gate on `extendedWaitUntil: visible: id: profile-tab` with a 60s
  # timeout, and Maestro reports that timeout as "Assertion is false: id: profile-tab is
  # visible". That is the login not completing in a minute, which on a loaded host is a
  # host problem and not the flow's — the flow's own steps were never reached. Naming it
  # keeps the next session from triaging a create-listing flow for a login failure.
  if [ -s "$xml" ] && grep -qa 'profile-tab is visible' "$xml"; then
    printf '%-38s %-8s %s\n' "$flow" "LOGIN" "login gate timed out in ${secs:-?}s — host load; re-run before triaging"
    continue
  fi
  if [ "$has_failure" = no ]; then
    printf '%-38s %-8s %s\n' "$flow" "NO-EVID" "failed in ${secs:-?}s but captured no <failure> — read the log"
    continue
  fi
  fixed=$(git log -1 --format=%ct -- "$f" 2>/dev/null || echo 0)
  # Compare against when the flow STARTED, not when its log was written. A fix that
  # lands while a flow is running produced a row reading "current" three seconds after
  # the commit — the run had begun 169s earlier and executed the old file
  # (edit_listing_discard). Log mtime minus the recorded duration is the start.
  ran=$(( $(stat -c %Y "$log") - ${secs:-0} ))
  if [ "${fixed:-0}" -gt "$ran" ]; then
    printf '%-38s %-8s %s\n' "$flow" "STALE" "flow changed $(( (fixed-ran)/60 ))m after this run — re-run before triaging"
  else
    printf '%-38s %-8s %s\n' "$flow" "current" "worth triaging"
  fi
done

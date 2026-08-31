#!/usr/bin/env bash
# Sell-flow QA sweep driver (card #296/SF-QA1, run 2 — 2026-08-28).
#
# Runs an ARBITRARY LIST of flows into ONE report dir, so a targeted sweep gets
# one summary/results.jsonl instead of N single-flow run dirs. `qa.sh feature`
# can only run a whole feature; `qa.sh flow` only one. Both were wrong shapes for
# "these 14 flows across 4 areas".
#
#   ./qa/sellsweep.sh seller/undo_mark_sold chat/lifecycle_from_chat ...
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/lib/common.sh"
source "$HERE/lib/emulator.sh"
source "$HERE/lib/app.sh"
source "$HERE/lib/flows.sh"

RUN_DIR="${QA_RUN_DIR:-}"
if [ -z "$RUN_DIR" ]; then
  n="$(cd "$HERE" && python3 -c "
import os,re
ns=[int(m.group(1)) for d in os.listdir('reports')
    if os.path.isdir(os.path.join('reports',d))
    for m in [re.fullmatch(r'run-(\d+)',d)] if m]
print(max(ns) if ns else 0)")"
  RUN_DIR="$REPORTS_DIR/run-$(printf '%03d' $((10#$n + 1)))"
fi
mkdir -p "$RUN_DIR"
echo "RUN_DIR=$RUN_DIR"

# ONE run_feature PER FLOW, in the order given — deliberately, not grouped by
# area. Grouping was the first version and it reordered the run: a sweep whose
# first four flows are the ones verifying today's commits became "all of seller,
# then all of rtl, then chat", so the highest-value flows landed last and a run
# that had to be cut short lost exactly the wrong ones. The per-call overhead is
# a `clear_blocks` and a fixture-id resolve, ~2s.
for spec in "$@"; do
  area="$(dirname "$spec")"
  step "$spec"
  run_feature "$area" "$RUN_DIR" "$MOBILE_DIR/maestro/${spec%.yaml}.yaml"
done

step "report"; python3 "$HERE/lib/report.py" "$RUN_DIR"

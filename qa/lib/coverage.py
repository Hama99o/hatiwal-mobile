#!/usr/bin/env python3
"""How much of the suite has actually been tested, and how much of that still counts.

Reads qa/history.jsonl (every verdict ever recorded, archived across every
session) rather than the surviving run dirs, so pruning does not move the number.

Three figures, deliberately kept apart, because collapsing them overstates
coverage:

  WRITTEN    flow files that exist.
  EXECUTED   flows with a verdict. A flow nobody has run is not evidence.
  PASSING    flows whose newest verdict is a pass.

And one caveat that has to travel with them: a verdict is only true of the flow
file that produced it. `flow_sha` (recorded since 2026-08-24) makes that
checkable; rows older than it are reported as UNKNOWABLE rather than counted as
current, because several agents edit this suite while runs are in flight and a
recorded FAIL is routinely already fixed.
"""
import collections
import hashlib
import json
import pathlib
import sys

QA = pathlib.Path(__file__).resolve().parents[1]
REPO = QA.parent
MAESTRO = REPO / "maestro"
HIST = QA / "history.jsonl"

# Directories under maestro/ that are not features.
NON_FEATURE = {"_helpers", "_diag"}


def written():
    out = set()
    for p in MAESTRO.rglob("*.yaml"):
        rel = p.relative_to(MAESTRO)
        if len(rel.parts) < 2:
            continue            # maestro/config.yaml is the manifest, not a flow
        if rel.parts[0] in NON_FEATURE:
            continue
        out.add((rel.parts[0], p.stem))
    return out


def main():
    flows = written()
    if not HIST.exists():
        print("no qa/history.jsonl yet — run `qa.sh prune` (it archives) or a feature first")
        return 1
    latest = {}
    for line in HIST.read_text().splitlines():
        if line.strip():
            r = json.loads(line)
            latest[(r["feature"], r["flow"])] = r

    executed = {k for k in latest if k in flows}
    passing = {k for k in executed if latest[k]["result"] == "pass"}

    stale, unknowable = set(), set()
    for k in executed:
        sha = latest[k].get("flow_sha")
        f = MAESTRO / k[0] / f"{k[1]}.yaml"
        if not sha:
            unknowable.add(k)
        elif f.is_file() and hashlib.sha1(f.read_bytes()).hexdigest()[:12] != sha:
            stale.add(k)

    pct = lambda n, d: (100 * n // d) if d else 0
    print(f"flows written     : {len(flows)}")
    print(f"ever executed     : {len(executed)}  ({pct(len(executed), len(flows))}% of written)")
    print(f"newest verdict = pass: {len(passing)}  "
          f"({pct(len(passing), len(flows))}% of written, "
          f"{pct(len(passing), len(executed))}% of executed)")
    print(f"never executed    : {len(flows) - len(executed)}")
    print()
    print(f"verdict provably stale : {len(stale)}   (flow file edited after the run)")
    print(f"staleness UNKNOWABLE   : {len(unknowable)}   (run predates flow_sha — "
          f"treat these as needing a re-run, not as current)")
    trustworthy = len(executed) - len(stale) - len(unknowable)
    print(f"verdicts known current : {trustworthy}  "
          f"({pct(trustworthy, len(flows))}% of the suite)")
    print()

    per = collections.defaultdict(lambda: [0, 0, 0])
    for k in flows:
        per[k[0]][0] += 1
        if k in executed:
            per[k[0]][1] += 1
        if k in passing:
            per[k[0]][2] += 1
    print(f'{"feature":16}{"written":>8}{"exec":>6}{"pass":>6}{"pass%":>7}')
    for f in sorted(per, key=lambda f: (-per[f][2] / max(1, per[f][0]), f)):
        w, e, p = per[f]
        print(f"{f:16}{w:8}{e:6}{p:6}{pct(p, w):6}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())

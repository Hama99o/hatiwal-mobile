#!/usr/bin/env python3
"""Latest recorded result for a flow, by RUN NUMBER.

The obvious idiom is wrong:

    grep -h '"flow": "x"' qa/reports/run-*/results.jsonl | tail -1

It returns whatever matching FILE came last in glob/traversal order, not the highest
run number. It reported sign_up_validation as failing from run-245 when its latest run
(247) had passed — and "this flow passes, so leave it alone" was a decision I made
repeatedly tonight on the strength of that idiom.

Usage: ./qa/last_result.py <flow> [<flow> ...]      (no args = every flow, newest first)
"""
import glob, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def latest():
    """flow -> (run, record), keeping the highest run number per flow."""
    out = {}
    # history.jsonl FIRST, then the surviving run dirs. Old runs get pruned and folded
    # into history (archive_results.py), so reading only reports/run-* reports "never
    # run" for flows that have run many times — which sent me chasing a coverage gap of
    # 139 flows that was really 3, and made six saved/ flows look untested.
    sources = [(int(m.group(1)), p)
               for p in glob.glob(os.path.join(ROOT, "qa/reports/run-*/results.jsonl"))
               for m in [re.search(r'run-(\d+)', p)] if m]
    hist = os.path.join(ROOT, "qa/history.jsonl")
    if os.path.isfile(hist):
        sources.insert(0, (None, hist))          # run number comes from each record
    for run, p in sources:
        for line in io.open(p, encoding="utf-8", errors="replace"):
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            # Per-LINE, never reassigning `run`: history rows each carry their own
            # run, and mutating the loop variable would stamp the first row's number
            # onto every later row in the file.
            rec_run = run
            if rec_run is None:
                hm = re.search(r'run-(\d+)', str(d.get("run", "")))
                if not hm:
                    continue
                rec_run = int(hm.group(1))
            f = d.get("flow")
            if f and (f not in out or rec_run >= out[f][0]):
                out[f] = (rec_run, d)
    return out

L = latest()
names = sys.argv[1:] or sorted(L)
for n in names:
    if n not in L:
        print(f"  {n:<40} never run")
        continue
    run, d = L[n]
    extra = ""
    if d.get("result") != "pass" and d.get("why"):
        extra = "  " + str(d["why"])[:58]
    print(f"  {n:<40} {d['result']:<5} {d['seconds']}s  (run-{run}){extra}")

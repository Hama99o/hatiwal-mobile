#!/usr/bin/env python3
"""Which flows can give a trustworthy verdict, and which only give noise.

Written 2026-09-13 after run-526 read as a triumph (15/5 = 76% against a 55%
baseline) and turned out to be entirely noise: all four FAIL->PASS flows and
both PASS->FAIL flows had BYTE-IDENTICAL yaml in both runs.

A flow's verdict is only evidence about a fix if the flow is stable without one.
This groups every flow's history by `flow_sha` -- so a run before an edit is
never compared with a run after it -- and reports, for the version with the most
observations:

    STABLE FAIL  0/N   a fix's verdict here is trustworthy; any pass is signal
    STABLE PASS  N/N   a regression here is trustworthy
    FLAKY        p/N   a single run says NOTHING; needs N>=3 consecutive runs

Caveat that cost a wrong attribution: `flow_sha` covers the flow file ONLY
(emit_result.py hashes spec.read_bytes()). It does NOT cover maestro/_helpers/,
and most of this campaign's fixes live in helpers. So "unchanged sha" is not
proof the inputs were unchanged -- check `git log` on the helper too.
"""
import collections
import glob
import json
import os
import sys

MIN_RUNS = 3


def load(reports="qa/reports"):
    runs = sorted(glob.glob(os.path.join(reports, "run-*")),
                  key=lambda p: int(p.rsplit("-", 1)[1]))
    obs = collections.defaultdict(list)
    for r in runs:
        n = int(r.rsplit("-", 1)[1])
        try:
            rows = [json.loads(l) for l in open(os.path.join(r, "results.jsonl"))]
        except (OSError, ValueError):
            continue
        for x in rows:
            # A rig_fail is NOT a verdict about the flow. Almost all of them are
            # our own 600s timeout firing (classify() maps exit 124 -> rig_fail),
            # which says the BOX was loaded, not that the flow behaves
            # differently. Counting them as failures made flows look flaky that
            # are not: scroll_to_latest read 2/6 with two of those four "fails"
            # being 605s and 602s timeouts, and reserved_sold_dead_end_notice
            # read 2/6 with THREE. Drop them the way a missing run is dropped.
            if x.get("kind") == "rig_fail":
                continue
            obs[x["flow"]].append((n, x.get("result"), x.get("flow_sha"),
                                   x.get("feature", "?")))
    return obs


def classify(obs, min_runs=MIN_RUNS):
    """-> (stable_fail, stable_pass, flaky, skipped) of (feature, flow, p, n, runs)."""
    sf, sp, fl, sk = [], [], [], []
    for flow, rows in obs.items():
        by_sha = collections.defaultdict(list)
        for n, res, sha, feat in rows:
            by_sha[sha].append((n, res, feat))
        # the version with the most observations = the one worth judging
        _, lst = max(by_sha.items(), key=lambda kv: len(kv[1]))
        feat = lst[0][2]
        ns = [n for n, _, _ in lst]
        p = sum(1 for _, r, _ in lst if r == "pass")
        n = len(lst)
        rec = (feat, flow, p, n, ns)
        if n < min_runs:
            sk.append(rec)
        elif p == 0:
            sf.append(rec)
        elif p == n:
            sp.append(rec)
        else:
            fl.append(rec)
    return sf, sp, fl, sk


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    sf, sp, fl, sk = classify(load())
    judged = len(sf) + len(sp) + len(fl)

    def show(title, rows, key):
        rows = [r for r in rows if not only or r[0] == only]
        if not rows:
            return
        print(f"\n=== {title} ({len(rows)}) ===")
        for feat, flow, p, n, ns in sorted(rows, key=key):
            print("%-10s %-46s %d/%d  runs %s" % (feat, flow, p, n, ns[-8:]))

    print(f"{judged} flows with >={MIN_RUNS} runs at one unchanged yaml version"
          f"   ({len(sk)} too few runs to judge)")
    print(f"  stable fail {len(sf):3d}   stable pass {len(sp):3d}   "
          f"FLAKY {len(fl):3d}  ({len(fl) * 100 // max(judged, 1)}% of the suite)")
    show("STABLE FAIL - fix verdicts here are trustworthy", sf, lambda r: (r[0], r[1]))
    show("FLAKY - a single run proves nothing", fl,
         lambda r: -(min(r[2], r[3] - r[2]) / r[3]))
    show("STABLE PASS - regressions here are trustworthy", sp, lambda r: (r[0], r[1]))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Aggregate a QA run's results.jsonl into a triage-ready report.

Grouped by failure KIND, not by feature, because the first question is always
"is this the app or the rig?" — and 214 flows in this repo have never run, so
the answer is frequently "neither, the flow is wrong".
"""
import json, sys, os, collections

KIND_ORDER = ["app_crash", "app_error", "app_bug_or_flow", "unknown", "rig_fail"]
KIND_LABEL = {
    "app_crash":       "APP CRASHED — fix first, these are real defects",
    "app_error":       "RED BOX / JS ERROR — a real app error, fix before trusting anything after it",
    "app_bug_or_flow": "ASSERTION FAILED — real bug OR stale flow selector (triage each)",
    "unknown":         "FAILED, cause unclear — read the log",
    "rig_fail":        "RIG BROKE — result meaningless, re-run after fixing the rig",
}

def main(run_dir):
    rows = []
    p = os.path.join(run_dir, "results.jsonl")
    if not os.path.exists(p):
        print("no results.jsonl in", run_dir); return 1
    for line in open(p):
        line = line.strip()
        if line:
            rows.append(json.loads(line))

    passed = [r for r in rows if r["result"] == "pass"]
    failed = [r for r in rows if r["result"] != "pass"]
    by_feat = collections.defaultdict(lambda: [0, 0])
    for r in rows:
        by_feat[r["feature"]][0 if r["result"] == "pass" else 1] += 1

    out = []
    w = out.append
    w("# Hatiwal mobile — QA run report\n")
    w(f"**{len(passed)} passed / {len(failed)} failed** of {len(rows)} flows  ")
    total_s = sum(r.get("seconds", 0) for r in rows)
    w(f"run: `{os.path.basename(run_dir)}` · wall time {total_s//60}m {total_s%60}s\n")

    w("## Per feature\n")
    w("| Feature | Pass | Fail | Health |")
    w("|---|---:|---:|---|")
    for feat in sorted(by_feat, key=lambda f: -by_feat[f][1]):
        p_, f_ = by_feat[feat]
        tot = p_ + f_
        pct = (p_ / tot * 100) if tot else 0
        bar = "green" if pct == 100 else ("amber" if pct >= 60 else "RED")
        w(f"| {feat} | {p_} | {f_} | {pct:.0f}% {bar} |")
    w("")

    if failed:
        w("## Failures by cause\n")
        groups = collections.defaultdict(list)
        for r in failed:
            groups[r.get("kind", "unknown")].append(r)
        for kind in KIND_ORDER:
            if kind not in groups:
                continue
            w(f"### {KIND_LABEL[kind]}  ({len(groups[kind])})\n")
            for r in groups[kind]:
                w(f"- **{r['feature']}/{r['flow']}** — {r.get('why','(no message captured)')}")
                w(f"  · evidence: `qa/reports/{os.path.basename(run_dir)}/{r.get('evidence','')}`")
            w("")
    else:
        w("## No failures\n\nEvery flow in this run passed.\n")

    txt = "\n".join(out)
    open(os.path.join(run_dir, "summary.md"), "w").write(txt)
    print(txt)
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))

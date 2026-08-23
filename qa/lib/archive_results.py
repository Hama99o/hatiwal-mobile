#!/usr/bin/env python3
"""Fold every run's results.jsonl into reports/history.jsonl, and copy the
screenshots FLOW_REGISTER.md cites into qa/evidence/.

Run before pruning. Each run directory holds its own results.jsonl and the
register is REGENERATED from those, so deleting run dirs deletes verdict history:
a previous prune took the tracked-flow count from 209 down to 127, and the
campaign lost its record of what had already been triaged. The register also links
screenshots by run path, so those links rot at the same moment.

Idempotent — re-running appends nothing and re-copies nothing.
"""
import json
import pathlib
import re
import shutil
import sys

QA = pathlib.Path(__file__).resolve().parents[1]
REPORTS = QA / "reports"
# TRACKED, and deliberately outside reports/ — that whole directory is
# gitignored, so a history file living in it is exactly as perishable as the
# runs it was written to outlive.
HIST = QA / "history.jsonl"
EVIDENCE = QA / "evidence"


def archive_verdicts():
    seen = set()
    if HIST.exists():
        for line in HIST.read_text().splitlines():
            if line.strip():
                r = json.loads(line)
                seen.add((r.get("run"), r.get("feature"), r.get("flow")))
    new = []
    # Every session's runs, not just the caller's: reports/run-* and reports/sN/run-*
    dirs = list(REPORTS.glob("run-*")) + list(REPORTS.glob("s*/run-*"))
    for d in sorted(dirs, key=lambda p: p.stat().st_mtime):
        f = d / "results.jsonl"
        if not f.exists():
            continue
        run = d.name if d.parent == REPORTS else f"{d.parent.name}/{d.name}"
        for line in f.read_text().splitlines():
            if not line.strip():
                continue
            r = json.loads(line)
            r["run"] = run
            key = (run, r.get("feature"), r.get("flow"))
            if key in seen:
                continue
            seen.add(key)
            new.append(r)
    with HIST.open("a") as fh:
        for r in new:
            fh.write(json.dumps(r) + "\n")
    total = sum(1 for _ in HIST.open()) if HIST.exists() else 0
    print(f"  history.jsonl: +{len(new)} rows ({total} total)")


def preserve_cited_screenshots():
    reg = QA / "FLOW_REGISTER.md"
    if not reg.exists():
        print("  no FLOW_REGISTER.md — nothing to preserve")
        return
    runs = set(re.findall(r"\|\s*(s\d+/run-\d+|run-\d+)\s*\|", reg.read_text()))
    copied = 0
    for run in sorted(runs):
        for png in (REPORTS / run).rglob("screens/*.png"):
            dest = EVIDENCE / run.replace("/", "_") / png.parent.parent.name / png.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                shutil.copy2(png, dest)
                copied += 1
    print(f"  qa/evidence/: +{copied} screenshots from {len(runs)} cited run(s)")


if __name__ == "__main__":
    archive_verdicts()
    preserve_cited_screenshots()
    sys.exit(0)

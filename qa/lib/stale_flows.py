#!/usr/bin/env python3
"""List flows whose newest verdict is a FAIL that the flow file has since changed.

`flow_sha` makes this exact: a verdict describes the file that produced it, and
when that file has been edited the verdict describes something that no longer
exists. Re-running the whole feature to refresh a handful of rows costs ~4 minutes
per flow for flows that did not change; this prints just the ones that did.

Output is `feature/flow` per line, ready for `xargs -n1 ./qa/qa.sh flow`.
"""
import hashlib
import json
import pathlib
import sys

QA = pathlib.Path(__file__).resolve().parents[1]
MAESTRO = QA.parent / "maestro"
HIST = QA / "history.jsonl"


def main():
    if not HIST.exists():
        print("no qa/history.jsonl yet", file=sys.stderr)
        return 1
    latest = {}
    for line in HIST.read_text().splitlines():
        if line.strip():
            r = json.loads(line)
            latest[(r["feature"], r["flow"])] = r

    out = []
    for (feat, flow), r in sorted(latest.items()):
        if r.get("result") == "pass":
            continue
        sha = r.get("flow_sha")
        if not sha:
            continue                      # predates hashing: unknowable, not stale
        f = MAESTRO / feat / f"{flow}.yaml"
        if not f.is_file():
            continue
        if hashlib.sha1(f.read_bytes()).hexdigest()[:12] != sha:
            out.append(f"{feat}/{flow}")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())

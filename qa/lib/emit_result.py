#!/usr/bin/env python3
"""Append one flow result to results.jsonl. Single writer, single record shape.

`flow_sha` is the SHA-1 of the .yaml AS EXECUTED, and it exists because a verdict
is only ever true of the flow file that produced it. Several agents edit this
suite while runs are in flight, so a recorded FAIL can already be answered by a
fix committed minutes later — and re-triaging it wastes the whole loop.

That happened: profile/blocked_users was triaged from a run whose executed command
list held a bare `scroll` followed by the tap, while the file on disk already had
the `scrollUntilVisible` that fixes exactly that failure. The only way to tell was
to dig the debug output out and read Maestro's own command list. With the hash
recorded, `qa.sh register` can mark the row STALE instead.
"""
import hashlib
import json
import pathlib
import sys

path, feat, flow, result, kind, secs, why, api_n = sys.argv[1:9]
rec = {
    "feature": feat,
    "flow": flow,
    "result": result,
    "seconds": int(secs),
    "api_errors": int(api_n),
    "screenshot": f"{feat}/screens/{flow}.png",
}

# The flow file lives at <repo>/maestro/<feature>/<flow>.yaml; this script runs
# from qa/lib. Absent (a renamed flow) is not an error — the field is just omitted.
spec = pathlib.Path(__file__).resolve().parents[2] / "maestro" / feat / f"{flow}.yaml"
if spec.is_file():
    rec["flow_sha"] = hashlib.sha1(spec.read_bytes()).hexdigest()[:12]

if kind:
    rec["kind"] = kind
if why:
    rec["why"] = why
if result != "pass":
    rec["evidence"] = f"{feat}/{flow}.log"
with open(path, "a") as fh:
    fh.write(json.dumps(rec) + "\n")

#!/usr/bin/env python3
"""Append one flow result to results.jsonl. Single writer, single record shape."""
import json, sys

path, feat, flow, result, kind, secs, why, api_n = sys.argv[1:9]
rec = {
    "feature": feat,
    "flow": flow,
    "result": result,
    "seconds": int(secs),
    "api_errors": int(api_n),
    "screenshot": f"{feat}/screens/{flow}.png",
}
if kind:
    rec["kind"] = kind
if why:
    rec["why"] = why
if result != "pass":
    rec["evidence"] = f"{feat}/{flow}.log"
with open(path, "a") as fh:
    fh.write(json.dumps(rec) + "\n")

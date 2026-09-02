#!/usr/bin/env python3
"""Tally a QA run from results.jsonl.

The schema field is `result` ("pass"/"fail"/...), NOT `status`. An ad-hoc reader
that looked for `status` and treated every non-"pass" row as a failure reported
two healthy runs as "0 passed / 18 failed" and "0 passed / 29 failed" — every
row was miscounted because the key simply is not there. This exists so the
tally is read one way, from the real field.

A row with api_errors > 0 but result == "pass" is SILENT: the assertions passed
while the API errored underneath. The handbook is explicit that this is a defect
and must never be reported as a pass, so it is broken out separately.
"""
import json, sys, pathlib, collections

for d in sys.argv[1:]:
    p = pathlib.Path(d)
    f = p / "results.jsonl" if p.is_dir() else p
    if not f.exists():
        print(f"  {p.name}: no results.jsonl"); continue
    rs = [json.loads(l) for l in f.read_text().splitlines() if l.strip()]
    c = collections.Counter(r.get("result", "MISSING") for r in rs)
    silent = [r for r in rs if r.get("result") == "pass" and (r.get("api_errors") or 0) > 0]
    feats = ",".join(sorted({r.get("feature", "?") for r in rs}))
    print(f"  {p.name:10} {c.get('pass',0):3} pass  {c.get('fail',0):3} fail"
          f"  {len(silent):2} SILENT  ({len(rs)} rows, {feats})")
    for k, v in c.items():
        if k not in ("pass", "fail"): print(f"      other result={k!r}: {v}")
    for r in rs:
        if r.get("result") != "pass":
            print(f"      FAIL  {r['feature']}/{r['flow']}")
    for r in silent:
        print(f"      SILENT {r['feature']}/{r['flow']}  api_errors={r['api_errors']}")

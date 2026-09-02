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
    # A rig crash (the Expo dev-client FAB taking the app down) is not a verdict.
    rig = [r for r in rs if r.get("kind") in ("rig_devclient_crash", "rig")]
    feats = ",".join(sorted({r.get("feature", "?") for r in rs}))
    fails = sum(1 for r in rs if r.get("result") != "pass" and r.get("kind") not in ("rig_devclient_crash", "rig"))
    print(f"  {p.name:10} {c.get('pass',0):3} pass  {fails:3} fail  {len(rig):2} RIG"
          f"  {len(silent):2} SILENT  ({len(rs)} rows, {feats})")
    for k, v in c.items():
        if k not in ("pass", "fail"): print(f"      other result={k!r}: {v}")
    for r in rs:
        if r.get("result") == "pass":
            continue
        if r.get("kind") in ("rig_devclient_crash", "rig"):
            # Say WHY it is not a verdict, so nobody triages it as an app bug.
            print(f"      RIG   {r['feature']}/{r['flow']}  ({r['kind']}) — re-run, do not triage")
        else:
            print(f"      FAIL  {r['feature']}/{r['flow']}")
    for r in silent:
        print(f"      SILENT {r['feature']}/{r['flow']}  api_errors={r['api_errors']}")

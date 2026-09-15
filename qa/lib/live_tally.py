#!/usr/bin/env python3
"""Report a run's LIVE failure count, not the file's raw one.

    ./qa/lib/live_tally.py                 # newest run
    ./qa/lib/live_tally.py run-575         # a specific run
    ./qa/lib/live_tally.py --all           # every run dir

A row in results.jsonl can fail to describe reality in two distinct ways, and
both were being read at face value on 2026-09-15:

  STALE   the row's flow_sha is not the sha on disk. The flow was fixed after
          the driver executed it, so the verdict describes a file that no longer
          exists. run-575 carried FOUR of these — conversations_empty_state,
          conversations_role_filter, offer_in_existing_thread and quick_replies
          — all fixed earlier the same day. Reported as "14 fail" for several
          hours; the live number was 11.

  RIG     kind is rig_devclient_crash (the Expo dev-menu FAB crash) or rig. Not
          a verdict about the app OR the flow. tally.py already excludes these;
          a naive count does not, which is how chat_rtl looked like the suite's
          worst flow at 0/33 when only ~3 of those runs were measured at all.

There is a THIRD case this tool cannot detect and must not pretend to: a fix made
in a HELPER leaves every caller's flow_sha unchanged, so a row can be stale in
substance while looking current. Those are flagged separately below by checking
whether the run predates the newest commit touching any helper the flow includes
— a hint, not a verdict. Confirm with commands.json, which inlines helpers and is
the only authoritative record of what executed.
"""
import glob
import hashlib
import json
import os
import pathlib
import subprocess
import sys

RIG_KINDS = {"rig_devclient_crash", "rig"}


def disk_shas() -> dict:
    return {
        p.stem: hashlib.sha1(p.read_bytes()).hexdigest()[:12]
        for p in pathlib.Path("maestro").rglob("*.yaml")
    }


def helpers_of(stem: str) -> list:
    for p in pathlib.Path("maestro").rglob(f"{stem}.yaml"):
        import re
        return re.findall(r"_helpers/([A-Za-z0-9_]+)\.yaml", p.read_text(encoding="utf-8"))
    return []


def newest_helper_commit(names) -> float:
    best = 0.0
    for n in names:
        try:
            out = subprocess.run(
                ["git", "log", "-1", "--format=%ct", "--", f"maestro/_helpers/{n}.yaml"],
                capture_output=True, text=True, timeout=10,
            ).stdout.strip()
            if out:
                best = max(best, float(out))
        except Exception:
            pass
    return best


def tally(run_dir: str, shas: dict) -> tuple:
    results = os.path.join(run_dir, "results.jsonl")
    if not os.path.exists(results):
        return None
    run_mtime = os.path.getmtime(results)
    live, stale, rig, helper_hint = [], [], [], []
    npass = 0
    for line in open(results, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        name = os.path.basename(str(r.get("flow") or "")).replace(".yaml", "")
        if r.get("result") == "pass":
            npass += 1
            continue
        if r.get("kind") in RIG_KINDS:
            rig.append(name)
            continue
        on_disk = shas.get(name)
        if on_disk and str(r.get("flow_sha")) != on_disk:
            stale.append((name, str(r.get("flow_sha")), on_disk))
            continue
        if newest_helper_commit(helpers_of(name)) > run_mtime:
            helper_hint.append(name)
        live.append(name)
    return npass, live, stale, rig, helper_hint


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    every = "--all" in sys.argv
    runs = sorted(glob.glob("qa/reports/**/results.jsonl", recursive=True),
                  key=os.path.getmtime)
    if args:
        runs = [r for r in runs if args[0] in r]
    elif not every:
        runs = runs[-1:]
    shas = disk_shas()
    for results in runs:
        run_dir = os.path.dirname(results)
        got = tally(run_dir, shas)
        if not got:
            continue
        npass, live, stale, rig, hint = got
        raw = len(live) + len(stale) + len(rig)
        print(f"\n{run_dir}")
        print(f"  {npass} pass | raw fail rows: {raw}  ->  LIVE FAILURES: {len(live)}")
        if stale:
            print(f"  {len(stale)} STALE (fixed after the run — verdict describes a file that is gone):")
            for n, ran, disk in stale:
                print(f"      {n:40} ran={ran} disk={disk}")
        if rig:
            print(f"  {len(rig)} RIG (dev-client crash, not a verdict): {', '.join(sorted(set(rig)))}")
        if hint:
            print(f"  {len(hint)} of the live ones include a helper changed AFTER the run —")
            print( "      sha cannot see helper fixes; check commands.json: " + ", ".join(sorted(set(hint))))
        if live:
            print(f"  live: {', '.join(sorted(live))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

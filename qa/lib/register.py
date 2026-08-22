#!/usr/bin/env python3
"""Merge run results into qa/FLOW_REGISTER.md — the living QA board.

Design rule: the AUTO columns (Status, Last run, Secs, API) are regenerated from
run data every time. The HUMAN columns (Triage, Notes) are parsed back out of the
existing file and preserved. A register you have to hand-maintain rots within a
week; one that is regenerated but forgets your triage notes is just as useless.

Usage:  register.py <reports_dir> [run_dir ...]
        With no run_dir, every run-* in reports_dir is merged, newest winning.
"""
import glob, json, os, re, sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
QA = os.path.dirname(HERE)
MOBILE = os.path.dirname(QA)
REGISTER = os.path.join(QA, "FLOW_REGISTER.md")

STATUS = {
    "pass":              "PASS",
    "silent_api_error":  "SILENT",
    "app_crash":         "FAIL-crash",
    "app_error":         "FAIL-redbox",
    "app_bug_or_flow":   "FAIL-assert",
    "rig_fail":          "(rig)",
    "unknown":           "FAIL-?",
}
# What still needs a human decision before the app can be called done.
OPEN = {"FAIL-crash", "FAIL-redbox", "FAIL-assert", "FAIL-?", "SILENT", "UNTESTED"}


def all_flows():
    """Every flow that exists, grouped by feature — the denominator."""
    m = yaml.safe_load(open(os.path.join(QA, "features.yaml")))["features"]
    out = {}
    for feat, cfg in m.items():
        d = os.path.join(MOBILE, "maestro", cfg["flows"])
        out[feat] = (cfg["title"], sorted(
            os.path.basename(p)[:-5] for p in glob.glob(d + "/*.yaml")))
    return out


# Auto-generated failure reasons, recognised so they are never mistaken for a
# human note. These are verbatim Maestro failure lines; nobody types these.
AUTO_NOTE_RE = re.compile(
    r"^\[Failed\]|Assertion is false|Element not found|No visible element found|"
    r"^rig unhealthy|^\s*\|\|\s*api:"
)


def is_auto_note(note):
    return bool(note and AUTO_NOTE_RE.search(note.strip()))


def load_results(reports_dir, run_dirs):
    """Newest run wins per flow.

    MERGES EVERY SESSION, not just the calling one. Sessions 2+ write to
    reports/sN/, so globbing only the caller's own reports_dir made each session
    regenerate the SHARED register from its own handful of runs and overwrite the
    other's — session 1 wrote "14/223 passing", session 2 immediately replaced it
    with "3/223", and the campaign's memory of every flow the other session had
    triaged was gone. The register is one board for one APK; whoever refreshes it
    must see all of it.

    Run names collide across sessions (both have run-055), so ordering is by the
    run's own mtime rather than by name — otherwise s2/run-055 could outrank a
    genuinely newer run-060.
    """
    if not run_dirs:
        run_dirs = glob.glob(os.path.join(reports_dir, "run-*"))
        # reports_dir is either reports/ or reports/sN/ — normalise to the root
        # so one call sees the top-level runs AND every session subdirectory.
        root = os.path.dirname(reports_dir.rstrip("/")) \
            if re.fullmatch(r"s\d+", os.path.basename(reports_dir.rstrip("/"))) \
            else reports_dir
        run_dirs += glob.glob(os.path.join(root, "run-*"))
        run_dirs += glob.glob(os.path.join(root, "s*", "run-*"))
        run_dirs = sorted(set(run_dirs), key=lambda d: os.path.getmtime(d))
    res = {}
    for rd in run_dirs:
        p = os.path.join(rd, "results.jsonl")
        if not os.path.exists(p):
            continue
        # Qualify the run with its session, because run numbering restarts per
        # session: plain "run-055" could mean reports/run-055 OR reports/s2/
        # run-055, which sends whoever reads this board to the wrong screenshot.
        parent = os.path.basename(os.path.dirname(rd.rstrip("/")))
        run = os.path.basename(rd)
        if re.fullmatch(r"s\d+", parent):
            run = parent + "/" + run
        for line in open(p):
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            r["run"] = run
            res[(r["feature"], r["flow"])] = r
    return res


def parse_human_columns():
    """Recover Triage + Notes from the existing register so they survive."""
    keep = {}
    if not os.path.exists(REGISTER):
        return keep
    feature = None
    for line in open(REGISTER):
        h = re.match(r"^##\s+`?([a-z_]+)`?\s", line)
        if h:
            feature = h.group(1)
            continue
        if not (feature and line.startswith("| ")):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 6 or cells[0] in ("Flow", ":---", "---"):
            continue
        flow, triage, notes = cells[0].strip("`"), cells[4], cells[5]
        if triage or notes:
            keep[(feature, flow)] = (triage, notes)
    return keep


def main(reports_dir, run_dirs):
    flows = all_flows()
    res = load_results(reports_dir, run_dirs)
    human = parse_human_columns()

    total = sum(len(f[1]) for f in flows.values())
    counts = {}
    rows_by_feat = {}

    for feat, (title, names) in flows.items():
        rows = []
        for name in names:
            r = res.get((feat, name))
            if r is None:
                st, run, secs, api = "UNTESTED", "—", "", ""
            else:
                st = STATUS.get(r.get("kind") or r["result"], r["result"].upper())
                run = r["run"]
                secs = str(r.get("seconds", ""))
                api = str(r.get("api_errors") or "")
            counts[st] = counts.get(st, 0) + 1
            triage, notes = human.get((feat, name), ("", ""))
            # An AUTO-FILLED failure reason is not a human note and must not be
            # preserved. It used to be: the reason was written into Notes, read
            # back on the next regeneration as if a person had typed it, and then
            # frozen forever — so a flow that had since been FIXED still showed
            # "Element not found: Email" next to a green PASS, which is exactly
            # the kind of stale evidence that makes a board stop being trusted.
            # Dropped here so it is recomputed from the latest run below, or left
            # empty when that run passed. Genuine notes are untouched.
            if is_auto_note(notes):
                notes = ""
            if not notes and r and r.get("why"):
                notes = r["why"][:110]
            rows.append((name, st, run, secs, api, triage, notes))
        rows_by_feat[feat] = (title, rows)

    passing = counts.get("PASS", 0)
    open_n = sum(v for k, v in counts.items() if k in OPEN)

    o = []
    w = o.append
    w("# Hatiwal Mobile — Flow Register\n")
    w("The QA board for every Maestro flow in the app. **Regenerated** by")
    w("`./qa/qa.sh register` after each run.\n")
    w("> The `Status`, `Last run`, `Secs` and `API` columns are overwritten from real")
    w("> run data every time. The **`Triage`** and **`Notes`** columns are yours —")
    w("> they are parsed back out of this file and preserved. Put your verdict in")
    w("> `Triage` (`app-bug`, `flow-bug`, `fixed?`, `wontfix`) and the detail in `Notes`.\n")

    w("## Progress\n")
    w(f"**{passing} of {total} flows passing** · {open_n} still need attention\n")
    w("| Status | Count | Meaning |")
    w("|---|---:|---|")
    order = ["PASS", "SILENT", "FAIL-assert", "FAIL-redbox", "FAIL-crash", "FAIL-?", "(rig)", "UNTESTED"]
    meaning = {
        "PASS":        "green, and no backend error underneath",
        "SILENT":      "**assertions passed while the API errored** — the app told the user nothing",
        "FAIL-assert": "an assertion failed — real bug OR a stale selector, triage it",
        "FAIL-crash":  "the app crashed (FATAL EXCEPTION in logcat)",
        "FAIL-redbox": "a red box / JS console error appeared — real app error",
        "FAIL-?":      "failed, cause unclear — read the log",
        "(rig)":       "rig broke mid-run — result meaningless, re-run",
        "UNTESTED":    "never executed",
    }
    for k in order:
        if counts.get(k):
            w(f"| {k} | {counts[k]} | {meaning[k]} |")
    w("")
    w("### Definition of done\n")
    w("Every flow `PASS`, with zero `SILENT`. A `SILENT` row is not a pass: the")
    w("screen looked correct while the request failed, which is precisely the")
    w("bug class a user reports as \"nothing happened\".\n")

    w("## Flows\n")
    for feat in sorted(rows_by_feat, key=lambda f: -sum(
            1 for r in rows_by_feat[f][1] if r[1] in OPEN)):
        title, rows = rows_by_feat[feat]
        nopen = sum(1 for r in rows if r[1] in OPEN)
        npass = sum(1 for r in rows if r[1] == "PASS")
        w(f"## `{feat}` — {title}\n")
        w(f"{npass}/{len(rows)} passing · {nopen} open\n")
        w("| Flow | Status | Last run | Secs | Triage | Notes |")
        w("|---|---|---|---:|---|---|")
        for name, st, run, secs, api, triage, notes in rows:
            api_flag = f" ⚠{api}" if api and api != "0" else ""
            w(f"| `{name}` | {st}{api_flag} | {run} | {secs} | {triage} | {notes} |")
        w("")

    txt = "\n".join(o)
    open(REGISTER, "w").write(txt)
    print(f"FLOW_REGISTER.md: {passing}/{total} passing, {open_n} open")
    for k in order:
        if counts.get(k):
            print(f"  {k:12} {counts[k]}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])

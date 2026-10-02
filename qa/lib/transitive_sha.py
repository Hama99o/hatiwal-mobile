#!/usr/bin/env python3
"""
transitive_sha — a SHADOW hash column, computed ALONGSIDE the existing flow_sha,
never in place of it. It changes no verdict and invalidates no baseline. It exists
to MEASURE whether folding included helpers into the hash would make the flows that
verify_fixes marks "-" judgeable — so the switch can be a decision from data, not
an argument.

WHY. flow_sha (emit_result.py:34) is SHA-1 of the flow .yaml bytes ONLY. A fix
inside an included _helper leaves every caller's flow_sha unchanged, so
verify_fixes marks those callers "-" (the sha cannot pin them). transitive_sha
folds the included helpers' bytes in, so a helper fix DOES move the caller's hash.

ONE WALKER. The include-resolution rules below are copied verbatim from
audit_structure.py:189-206 — a string `runFlow: file.yaml`, and the block form
`runFlow: {file: ...}`, each resolved relative to the including file's directory.
If those rules ever change they must change in BOTH places; `--selftest` guards the
behaviour here. (The one-line switch to make this authoritative is for the rig
owner: have emit_result.py + live_tally.disk_shas + coverage.py call transitive_sha
and, ideally, have audit_structure import _direct_includes from here so there is a
single walker.)

Usage:
  python3 qa/lib/transitive_sha.py --selftest
  python3 qa/lib/transitive_sha.py --report <area/flow> [<area/flow> ...]
"""
import hashlib
import json
import pathlib
import subprocess
import sys

import yaml

MAESTRO = pathlib.Path(__file__).resolve().parent.parent.parent / "maestro"


def _direct_includes(spec: pathlib.Path) -> list[pathlib.Path]:
    """Helper files a SINGLE flow includes — audit_structure.py:189-206 rules."""
    try:
        docs = list(yaml.safe_load_all(spec.read_text()))
    except Exception:
        return []
    out: list[pathlib.Path] = []

    def visit(node):
        if isinstance(node, dict):
            rf = node.get("runFlow")
            if isinstance(rf, str):                      # runFlow: helper.yaml
                out.append((spec.parent / rf).resolve())
            elif isinstance(rf, dict):
                rel = rf.get("file")                     # runFlow: {file: helper.yaml, ...}
                if rel:
                    out.append((spec.parent / rel).resolve())
                for c in rf.get("commands") or []:       # inline block — recurse, not an include
                    visit(c)
            for v in node.values():
                visit(v)
        elif isinstance(node, list):
            for v in node:
                visit(v)

    for d in docs:
        visit(d)
    return out


def included_helpers(spec: pathlib.Path) -> list[pathlib.Path]:
    """Transitive helper files (deduped, sorted), following runFlow through helpers."""
    root = spec.resolve()
    seen: dict[pathlib.Path, bool] = {}
    stack = [root]
    while stack:
        for h in _direct_includes(stack.pop()):
            if h != root and h not in seen:
                seen[h] = True
                stack.append(h)
    return sorted(seen)


def flow_only_sha(spec: pathlib.Path) -> str:
    """The EXISTING flow_sha (emit_result.py:34), for the side-by-side column."""
    return hashlib.sha1(spec.resolve().read_bytes()).hexdigest()[:12]


def transitive_sha(spec: pathlib.Path) -> str:
    """SHA-1[:12] of the flow bytes + each transitively-included helper's bytes,
    in a deterministic (sorted-by-path) order. NUL-separated so concatenation is
    unambiguous."""
    h = hashlib.sha1()
    h.update(spec.resolve().read_bytes())
    for helper in included_helpers(spec):
        if helper.is_file():
            h.update(b"\0")
            h.update(helper.read_bytes())
    return h.hexdigest()[:12]


# ── the minimum-viable SEMANTIC filter ────────────────────────────────────────
# Hash the PARSED yaml, not the bytes. The YAML parser drops comments and
# normalises whitespace/indentation, so two files that differ only cosmetically
# canonicalise identically — a comment or re-indent stales nobody, a real step
# change stales every caller. Step order is preserved (lists), dict-key order is
# not meaningful (sort_keys). This is the "minimum viable" half of the
# recommendation; the stronger per-step-dependency filter is left to the owner.
def _canonical_str(text: str) -> str:
    try:
        return json.dumps(list(yaml.safe_load_all(text)), sort_keys=True, ensure_ascii=False)
    except Exception:
        return "RAW:" + text  # unparseable → never silently equal to anything


def _canonical(spec: pathlib.Path) -> str:
    return _canonical_str(spec.read_text())


def semantic_sha(spec: pathlib.Path) -> str:
    return hashlib.sha1(_canonical(spec).encode("utf-8")).hexdigest()[:12]


def semantic_transitive_sha(spec: pathlib.Path) -> str:
    h = hashlib.sha1()
    h.update(_canonical(spec).encode("utf-8"))
    for helper in included_helpers(spec):
        if helper.is_file():
            h.update(b"\0")
            h.update(_canonical(helper).encode("utf-8"))
    return h.hexdigest()[:12]


def _git_epoch(path: pathlib.Path) -> int:
    """Last-commit unix time for a file (0 if untracked/unknown)."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", str(path)],
            cwd=str(MAESTRO.parent), capture_output=True, text=True, timeout=20,
        ).stdout.strip()
        return int(out) if out else 0
    except Exception:
        return 0


def _selftest() -> int:
    import tempfile
    fails = []
    with tempfile.TemporaryDirectory() as d:
        d = pathlib.Path(d)
        h2 = d / "h2.yaml"; h2.write_text("appId: x\n---\n- tapOn: two\n")
        h1 = d / "h1.yaml"; h1.write_text("appId: x\n---\n- runFlow: {file: h2.yaml}\n")
        a = d / "a.yaml";  a.write_text("appId: x\n---\n- runFlow: h1.yaml\n- tapOn: go\n")
        n = d / "n.yaml";  n.write_text("appId: x\n---\n- tapOn: solo\n")

        got = included_helpers(a)
        if got != sorted([h1.resolve(), h2.resolve()]):
            fails.append(f"transitive include set wrong: {got}")
        if included_helpers(n) != []:
            fails.append("a flow with no runFlow should include nothing")

        before_t = transitive_sha(a)
        before_f = flow_only_sha(a)
        h2.write_text("appId: x\n---\n- tapOn: two_FIXED\n")   # fix inside the deep helper
        after_t = transitive_sha(a)
        after_f = flow_only_sha(a)
        if after_t == before_t:
            fails.append("transitive_sha did NOT change when a deep helper changed (the whole point)")
        if after_f != before_f:
            fails.append("flow_only_sha changed when only a helper changed (should be blind)")

        # --- semantic filter: cosmetic helper edits stale nobody; real ones stale all ---
        h2.write_text("appId: x\n---\n- tapOn: two_FIXED\n")
        sem0 = semantic_transitive_sha(a)
        byte0 = transitive_sha(a)
        h2.write_text("appId: x\n---\n# a fresh comment\n- tapOn:      two_FIXED\n")  # cosmetic only
        if semantic_transitive_sha(a) != sem0:
            fails.append("semantic_transitive_sha changed on a comment/whitespace-only helper edit (should not)")
        if transitive_sha(a) == byte0:
            fails.append("byte transitive_sha did not change on a cosmetic edit (sanity — it should, which is why the semantic one is needed)")
        h2.write_text("appId: x\n---\n- tapOn: two_REALLY_CHANGED\n")  # real step change
        if semantic_transitive_sha(a) == sem0:
            fails.append("semantic_transitive_sha did not change on a real step change (should)")

    if fails:
        print("SELFTEST FAIL:")
        for f in fails:
            print("  -", f)
        return 1
    print("SELFTEST PASS: transitive_sha catches a helper fix that flow_only_sha is blind to; "
          "include set is transitive across both runFlow forms; a helper-less flow includes nothing.")
    return 0


def _report(flows: list[str]) -> int:
    print(f"{'FLOW':42} {'flow_only':11} {'transitive':11} {'#helpers':8} helper_newer_than_flow?")
    disagree = []
    for name in flows:
        spec = MAESTRO / f"{name}.yaml"
        if not spec.is_file():
            print(f"{name:42} (missing)")
            continue
        fo = flow_only_sha(spec)
        tr = transitive_sha(spec)
        helpers = included_helpers(spec)
        flow_t = _git_epoch(spec)
        newest_helper_t = max((_git_epoch(h) for h in helpers if h.is_file()), default=0)
        newer = newest_helper_t > flow_t
        if newer:
            disagree.append(name)
        print(f"{name:42} {fo:11} {tr:11} {len(helpers):<8} {'YES' if newer else 'no'}")
    print()
    print(f"Two columns DISAGREE on {len(disagree)} of {len(flows)} flows "
          f"(a helper committed AFTER the flow file — flow_only is blind, transitive catches it):")
    for n in disagree:
        print("  -", n)
    return 0


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--selftest":
        sys.exit(_selftest())
    if len(sys.argv) >= 3 and sys.argv[1] == "--report":
        sys.exit(_report(sys.argv[2:]))
    print(__doc__)
    sys.exit(2)

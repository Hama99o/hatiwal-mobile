#!/usr/bin/env python3
"""Semantic lint for Maestro flows — the checks a YAML parse cannot make.

A flow can parse perfectly and still be nonsense. Two classes have already cost
real debugging time in this suite:

  1. A SELECTOR-LESS index tap.

         - tapOn:
             index: 0

     `index` alone has no selector, so it matches EVERY element on screen and
     index 0 is whatever lands first in hierarchy order — never the thing meant.
     38 of these were live at once; they failed on the assertion AFTER the tap,
     which is why they read as app bugs for so long.

  2. An EMPTY selector produced by a mis-indented bulk edit.

         when:
           visible:
           id: "profile-tab"

     Valid YAML — `visible: null` with `id` as its SIBLING. The condition is
     empty, so `when` is never satisfied and the guarded block silently never
     runs. A parse check passes this; only walking the tree catches it.

Exit 1 if anything is found, so `qa.sh audit` can gate on it.
"""
import pathlib
import sys

import yaml

SELECTOR_STEPS = {
    "tapOn", "doubleTapOn", "longPressOn", "assertVisible", "assertNotVisible",
    "scrollUntilVisible", "copyTextFrom", "waitForAnimationToEnd",
}
# Keys that identify an element. `index` is deliberately NOT here: it narrows a
# selector, it cannot BE one.
SELECTOR_KEYS = {"id", "text", "point", "css", "below", "above", "leftOf", "rightOf",
                 "containsChild", "containsDescendants", "childOf"}


def check_selector(value, where, findings):
    """`value` is whatever a selector-taking key was given."""
    if value is None:
        findings.append((where, "empty selector (None) — likely a mis-indented edit"))
        return
    if isinstance(value, str):
        return  # shorthand form: `tapOn: "Text"`
    if isinstance(value, dict):
        if not value:
            findings.append((where, "empty selector ({})"))
            return
        # `element:` wraps the real selector (scrollUntilVisible)
        if "element" in value:
            check_selector(value["element"], f"{where}.element", findings)
            return
        if not (SELECTOR_KEYS & set(value)):
            if "index" in value:
                findings.append((where, "index with NO selector — matches every element on screen"))
            elif not {"optional", "timeout", "retryTapIfNoChange", "repeat", "delay",
                      "label", "direction", "speed", "waitToSettleTimeoutMs",
                      "selected", "checked", "enabled", "focused"} & set(value):
                findings.append((where, f"no selector key in {sorted(value)}"))


def walk(node, path, findings):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in SELECTOR_STEPS:
                check_selector(v, f"{path}.{k}", findings)
            if k in ("visible", "notVisible", "true"):
                check_selector(v, f"{path}.{k}", findings)
            walk(v, f"{path}.{k}", findings)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f"{path}[{i}]", findings)


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "maestro")
    findings = []
    files = 0
    for p in sorted(root.rglob("*.yaml")):
        try:
            docs = list(yaml.safe_load_all(p.read_text()))
        except yaml.YAMLError as exc:
            findings.append((str(p), f"PARSE ERROR: {exc}"))
            continue
        files += 1
        local = []
        walk(docs, "", local)
        findings += [(f"{p}{w}", msg) for w, msg in local]

    print(f"audit_structure: {files} flows walked")
    if not findings:
        print("  no structural defects")
        return 0
    print(f"  {len(findings)} structural defects:")
    for where, msg in findings:
        print(f"    {where}: {msg}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Flows that assert a TOAST as if it were a persistent element.

A toast lives about three seconds. `assertVisible` on one is a race, and a
`waitForAnimationToEnd` in front of it usually loses that race — so the flow goes
red while the action it was checking succeeded perfectly.

It cost three report/ flows a full cycle each: `"User blocked" is visible` failed
while the block had landed and the toast had simply gone.

The fix is not to delete the check but to demote it: keep it `optional`, and
assert the durable consequence instead (a flipped menu item, a row leaving a list,
a composer disappearing). Where nothing durable exists, that is itself worth
knowing — UI-035 was found exactly that way.

READ THE COMMENT ABOVE THE WAIT BEFORE TOUCHING IT. Every finding here is a
hypothesis, not a defect, and some of these waits are LOAD-BEARING: in
report/block_user the wait on "User blocked" is the barrier that lets the mutation
settle before the menu is reopened, because blockMutation's onSuccess does
setIsBlocked(true) AND setMenuVisible(false) — reopen too early and the success
handler closes the menu again, so "Unblock User" never appears. A sweep that
removed 14 of these "redundant" waits deleted that reasoning along with them and
was reverted. Fix a flow here when it is actually red, one at a time.

Reports every non-optional assertion on a string the app only ever shows via
toast.success / toast.error / toast.info.
"""
import glob
import json
import os
import pathlib
import re
import sys

MOBILE = pathlib.Path(__file__).resolve().parents[2]


def locale_values():
    """en key -> value, flattened as ns.a.b."""
    out = {}
    for fp in glob.glob(str(MOBILE / "src/i18n/locales/en/*.json")):
        ns = os.path.basename(fp)[:-5]

        def walk(node, pre):
            if isinstance(node, dict):
                for k, v in node.items():
                    walk(v, pre + [k])
            elif isinstance(node, str):
                out[f"{ns}.{'.'.join(pre)}"] = node

        walk(json.load(open(fp)), [])
    return out


def toast_only_strings(values):
    """Values the app shows ONLY through a toast call."""
    src = []
    for root in ("src", "app"):
        for ext in ("ts", "tsx"):
            for fp in glob.glob(str(MOBILE / root / f"**/*.{ext}"), recursive=True):
                if "__tests__" in fp or ".stories." in fp:
                    continue
                src.append(open(fp, encoding="utf-8", errors="ignore").read())
    blob = "\n".join(src)

    toast_keys = set(re.findall(r'toast\.(?:success|error|info|warning)\(\s*t\(\s*["\']([\w.]+)["\']', blob))
    # A key rendered elsewhere too is not toast-only, so asserting it may be fine.
    out = {}
    for key in toast_keys:
        val = values.get(key)
        if not val:
            continue
        # count references outside toast calls
        others = len(re.findall(rf'(?<!toast\.success\(t\()(?<!toast\.error\(t\()["\']{re.escape(key)}["\']', blob))
        toasts = len(re.findall(rf'toast\.\w+\(\s*t\(\s*["\']{re.escape(key)}["\']', blob))
        if others <= toasts:
            out.setdefault(val, set()).add(key)
    return out


def main():
    values = locale_values()
    toasts = toast_only_strings(values)
    findings = []
    for p in sorted((MOBILE / "maestro").rglob("*.yaml")):
        lines = p.read_text().split("\n")
        for i, ln in enumerate(lines):
            # `extendedWaitUntil` counts too. It LOOKS like the careful version —
            # polling instead of one check — but it cannot help when the toast is
            # raised immediately before a router.replace: the message renders on a
            # screen being torn down, so there is nothing left to poll for. Missing
            # this shape is why this audit reported a clean suite while edit_profile
            # and away_mode were failing on exactly what it exists to catch.
            m = re.match(r'^-\s*assertVisible:\s*"(.+)"$', ln.strip())
            if not m and re.match(r'^visible:\s*"(.+)"$', ln.strip()):
                if "extendedWaitUntil" in "\n".join(lines[max(0, i - 3):i]):
                    m = re.match(r'^visible:\s*"(.+)"$', ln.strip())
            if not m:
                continue
            text = m.group(1)
            base = text.rstrip(".*")
            for val in (text, base):
                if val in toasts:
                    findings.append((f"{p}:{i+1}", val, sorted(toasts[val])))
                    break

    print(f"audit_toasts: {len(toasts)} toast-only strings in the app")
    if not findings:
        print("  no flow asserts a toast as if it were persistent")
        return 0
    print(f"  {len(findings)} non-optional assertion(s) on a toast:")
    for where, val, keys in findings:
        print(f"    {where}: {val!r}  ({', '.join(keys)})")
    return 1


if __name__ == "__main__":
    sys.exit(main())

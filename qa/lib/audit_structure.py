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
import re
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


# ── Check 3: a tab tap issued from a screen that has no tab bar ───────────────
# app/(main)/(tabs) holds the tab bar; listing detail, the conversation thread and
# the owner detail are all siblings of it, NOT children. Tapping a tab from one of
# those cannot find its target, and Maestro reports `Element not found:
# browse-tab` — indistinguishable from a testID that was never added.
#
# Tracked over the PARSED step list, not the raw lines: a line scan flags the
# `notVisible: {id: browse-tab}` inside the very guard that fixes this, because
# the condition is read before the `back` that follows it.
PUSHERS = ("listing-card", "seller-profile-link", "conversation-row", "seller-listing-card")
TAB_IDS = {"browse-tab", "categories-tab", "saved-tab", "chat-tab", "profile-tab"}


def selector_id(value):
    if isinstance(value, dict):
        if "element" in value:
            return selector_id(value["element"])
        got = value.get("id")
        return got if isinstance(got, str) else None
    return None


# ── Check 4: opening a modal menu twice, or never closing it ─────────────────
# `more-menu` opens ActionMenu, which is a MODAL: while it is open the control
# that opened it is behind it and not in the accessibility tree, so a second tap
# fails with `Element not found: more-menu`. The same control is also reachable by
# its translated accessibilityLabel ("Actions" = common.actions), and mixing the
# two forms is how a duplicate slipped past a check that only looked for two id
# taps.
#
# Leaving it open is the mirror-image bug: the modal covers the tab bar, so the
# next tab tap fails with `Element not found: browse-tab`.
MENU_OPENERS = {"more-menu", "more-options-button"}
MENU_CLOSERS = {"Cancel", "Close"}


def check_menus(steps, where, findings):
    open_menu = None
    for step in steps:
        if not isinstance(step, dict):
            continue
        if "launchApp" in step:
            open_menu = None
            continue
        if "runFlow" in step and isinstance(step["runFlow"], dict):
            check_menus(step["runFlow"].get("commands") or [], where, findings)
            continue
        for key in ("tapOn", "doubleTapOn", "longPressOn"):
            if key not in step:
                continue
            sel = step[key]
            sid = selector_id(sel)
            text = sel if isinstance(sel, str) else (sel.get("text") if isinstance(sel, dict) else None)
            if sid in MENU_OPENERS:
                if open_menu:
                    findings.append((where, f"taps {sid} while {open_menu} is already open — "
                                            "the opener sits behind the modal"))
                open_menu = sid
            elif text in MENU_CLOSERS or sid in MENU_CLOSERS:
                open_menu = None
            elif open_menu and sid and sid.endswith("-tab"):
                findings.append((where, f"taps {sid} while {open_menu} is open — "
                                        "the modal covers the tab bar"))
                open_menu = None
            elif text and open_menu:
                # tapping an ITEM inside the menu dismisses it
                open_menu = None


def check_navigation(steps, where, findings, spec_path=None):
    """`steps` is one flow's ordered step list."""
    pushed = None
    for step in steps:
        if step == "back" or (isinstance(step, dict) and "back" in step):
            pushed = None
            continue
        if isinstance(step, str):
            continue
        if not isinstance(step, dict):
            continue
        if "launchApp" in step:
            pushed = None
            continue
        # A runFlow to a HELPER FILE that pops also counts. _helpers/pop_to_tab_bar
        # exists precisely to make the tab bar reachable — its whole contract is "after
        # this, browse-tab is present" — and its `back`s live inside `when:` guards, so
        # reading only inline commands missed it and this audit went on reporting five
        # defects that had just been fixed.
        if "runFlow" in step and isinstance(step["runFlow"], str) and spec_path:
            helper = (pathlib.Path(spec_path).parent / step["runFlow"]).resolve()
            if helper.is_file() and "- back" in helper.read_text():
                pushed = None
            continue

        # A guarded pop counts as a pop: it pops when the bar is absent, which is
        # exactly the case being checked.
        if "runFlow" in step and isinstance(step["runFlow"], dict):
            rf = step["runFlow"]
            cmds = rf.get("commands") or []
            if any(c == "back" or (isinstance(c, dict) and "back" in c) for c in cmds):
                pushed = None
                continue
            check_navigation(cmds, where, findings, spec_path)
            continue
        for key in ("tapOn", "doubleTapOn", "longPressOn"):
            if key not in step:
                continue
            sel = selector_id(step[key])
            if not sel:
                continue
            if any(sel.startswith(q) for q in PUSHERS):
                pushed = sel
            elif sel in TAB_IDS and pushed:
                findings.append((where, f"taps {sel} while pushed by {pushed} — no tab bar on that screen"))
                pushed = None


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
        for doc in docs:
            if isinstance(doc, list):
                check_navigation(doc, "", local, p)
                check_menus(doc, "", local)
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

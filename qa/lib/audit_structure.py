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

# A TEXT-selector push. Everything in PUSHERS is matched by testID, and
# `selector_id()` returns None for a text selector, so a screen entered by tapping
# a LABEL was invisible to this check.
#
# That is how create_listing_publish_blocked went unreported while failing on
# exactly what Check 3 exists to find: "Element not found: Id matching regex:
# browse-tab". Dismissing the publish success sheet with "Done" leaves the seller
# on their own owner detail, which has no tab bar — run-559's hierarchy at the
# failing step shows my-listing-detail-scroll and listing-status-badge "Active".
#
# Keyed on the SHEET, not on the word "Done". "Done" is also the iOS keyboard
# accessory, a date picker's confirm and a multi-select's close, none of which push
# anything; treating every "Done" as a push would bury the real hits. The sheet is
# identified by the assertion flows already make right before dismissing it, so the
# rule only arms once a flow has proven that sheet is on screen.
SHEET_MARKERS = ("Your listing is live!",)
SHEET_DISMISS = ("Done",)


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
    sheet_seen = False
    for step in steps:
        if step == "back" or (isinstance(step, dict) and "back" in step):
            pushed = None
            continue
        # Arm the text-push rule when the flow proves the success sheet is up.
        if isinstance(step, dict):
            for _k in ("assertVisible", "extendedWaitUntil"):
                _v = step.get(_k)
                _t = _v if isinstance(_v, str) else None
                if isinstance(_v, dict):
                    _vis = _v.get("visible", _v)
                    _t = _vis if isinstance(_vis, str) else (
                        _vis.get("text") if isinstance(_vis, dict) else None)
                if _t and any(m in _t for m in SHEET_MARKERS):
                    sheet_seen = True
        elif isinstance(step, str) and any(m in step for m in SHEET_MARKERS):
            sheet_seen = True
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
            # The BLOCK form can name a helper file too — `runFlow:` with `file:` (and
            # often `env:` or `when:` beside it). Handling only the string form above
            # made this report a defect in the one flow that used the block form to call
            # pop_to_tab_bar, which is the helper that fixes the very thing being
            # reported.
            rel = rf.get("file")
            if rel and spec_path:
                helper = (pathlib.Path(spec_path).parent / rel).resolve()
                if helper.is_file() and "- back" in helper.read_text():
                    pushed = None
                    continue
            cmds = rf.get("commands") or []
            if any(c == "back" or (isinstance(c, dict) and "back" in c) for c in cmds):
                pushed = None
                continue
            check_navigation(cmds, where, findings, spec_path)
            continue
        for key in ("tapOn", "doubleTapOn", "longPressOn"):
            if key not in step:
                continue
            raw = step[key]
            text = raw if isinstance(raw, str) else (
                raw.get("text") if isinstance(raw, dict) else None)
            if sheet_seen and text in SHEET_DISMISS:
                # Dismissing the sheet drops onto the owner detail — a pushed
                # screen with no tab bar.
                pushed = "the publish success sheet"
                sheet_seen = False
                continue
            sel = selector_id(raw)
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


# ── REVIEW CHECKS (report, never gate) ───────────────────────────────────────
# These two find the shape that has caused SIX flow failures — a scroll that
# succeeds, leaves the list where it stopped, and a later command that inherits
# that offset (assertVisible and tapOn never scroll). See QA_HANDBOOK.md.
#
# They REPORT and do not affect the exit code, deliberately. Neither can be
# decided without reading render order out of the component: scrolling to
# `lifecycle-primary-action` and then asserting "Mark as Sold" is asserting that
# button's OWN label and is perfectly correct, while scrolling to Sign Out and
# then asserting "Edit Profile" reaches back to the top of the screen and cannot
# pass. Nothing in the YAML distinguishes those.
#
# That distinction is also why this is NOT a flow_lint rule. The same idea was
# prototyped there as a gating check and measured first: it fired 31 times across
# 311 flows with the majority legitimate, which is a rate that gets muted within a
# week — and a muted check hides the real ones. Measured, rejected, recorded here
# so nobody re-proposes it.
SCROLL_RESETS = {"tapOn", "launchApp", "runFlow", "back", "pressKey", "swipe",
                 "scroll", "openLink", "clearState"}
RESTART_HELPERS = ("await_theme_restart", "await_language_restart")
PROFILE_ONLY = ("theme-option-", "language-option-", "sign-out-button",
                "edit-profile-", "Appearance", "Language", "Edit Profile",
                "Delete account", "profile-")
# The Profile tab's LABEL in every shipped locale. Tapping it IS navigating back,
# and missing that is what made this check's first run report
# language_switch_all_screens — whose step 24 taps 'من', the Profile tab in Farsi,
# and which passes. A localized tab tap is navigation, not a selector.
PROFILE_TAB_LABELS = {"Me", "زه", "من", "میں"}


def _step_key(step):
    if isinstance(step, str):
        return step, None
    if isinstance(step, dict):
        k = next(iter(step))
        return k, step[k]
    return None, None


def _target(value):
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        el = value.get("element")
        if isinstance(el, str):
            return el
        if isinstance(el, dict):
            return str(el.get("text") or el.get("id") or el)
        return str(value.get("text") or value.get("id") or value)
    return str(value)


def check_scroll_pairs(steps, where, review):
    """Two scrollUntilVisible in the same direction with nothing between them
    that re-navigates. The second inherits the first's offset."""
    prev = None
    for i, step in enumerate(steps):
        k, v = _step_key(step)
        if k == "scrollUntilVisible":
            tgt = _target(v)
            direction = ((v.get("direction") if isinstance(v, dict) else None) or "DOWN").upper()
            if prev and prev[1] == direction and prev[2] != tgt:
                # Direction-aware wording: scrolling DOWN twice is only correct when
                # the second target is BELOW the first; scrolling UP twice, above it.
                expect = "BELOW" if direction == "DOWN" else "ABOVE"
                review.append((where, f"scrolls {direction} to {prev[2]!r} (step {prev[0]}) then "
                                      f"{direction} to {tgt!r} (step {i}) — the second inherits the "
                                      f"first's offset; confirm {tgt!r} renders {expect} {prev[2]!r}"))
            prev = (i, direction, tgt)
        elif k in SCROLL_RESETS:
            prev = None


def check_restart_nav(steps, where, review, spec_path=None):
    """A theme/language restart returns the app to its INITIAL route. Touching a
    Profile-only selector afterwards, with no navigation back, searches the feed."""
    pending = None
    for i, step in enumerate(steps):
        k, v = _step_key(step)
        if k == "runFlow":
            tgt = v if isinstance(v, str) else str((v or {}).get("file") or "")
            if any(h in tgt for h in RESTART_HELPERS):
                pending = i
                continue
            if "goto_profile_tab" in tgt or "login" in tgt or "pop_to_tab_bar" in tgt:
                pending = None
                continue
            if isinstance(v, dict) and v.get("commands"):
                check_restart_nav(v["commands"], where, review, spec_path)
                continue
            # FOLLOW A HELPER FILE. Without this the check only saw selectors the
            # flow names itself, so a restart followed by `runFlow: some_helper.yaml`
            # that touches Profile went unreported — and helpers are exactly where
            # that happens. chat_rtl's real failure is a non-optional scroll to
            # `sign-out-button` living at open_language_picker.yaml:65, which this
            # check walked straight past in its first version.
            if isinstance(v, str) and spec_path:
                helper = (pathlib.Path(spec_path).parent / v).resolve()
                if helper.is_file():
                    try:
                        hdocs = list(yaml.safe_load_all(helper.read_text(encoding="utf-8")))
                    except yaml.YAMLError:
                        hdocs = []
                    for hdoc in hdocs:
                        if isinstance(hdoc, list) and pending is not None:
                            for hstep in hdoc:
                                hk, hv = _step_key(hstep)
                                if hk in ("scrollUntilVisible", "tapOn", "assertVisible",
                                          "extendedWaitUntil"):
                                    hsel = _target(hv)
                                    if any(q in hsel for q in PROFILE_ONLY):
                                        review.append((where,
                                            f"restart helper at step {pending}, then step {i} "
                                            f"runFlow {v} which touches {hsel!r} with no navigation "
                                            f"back — a restart returns to the INITIAL route"))
                                        pending = None
                                        break
            continue
        if k in ("tapOn", "doubleTapOn", "longPressOn"):
            sel = _target(v)
            if sel.endswith("-tab") or sel in PROFILE_TAB_LABELS:
                pending = None
                continue
        if pending is not None and k in ("scrollUntilVisible", "tapOn", "assertVisible",
                                         "extendedWaitUntil"):
            sel = _target(v)
            if any(q in sel for q in PROFILE_ONLY):
                review.append((where, f"restart helper at step {pending}, then step {i} {k} {sel!r} "
                                      f"with no navigation back — a restart returns to the INITIAL "
                                      f"route, not to Profile"))
                pending = None


def _register_status():
    """Best-effort: a flow that currently PASSES has already proven its own pair,
    so say so and save the reviewer the trip."""
    status = {}
    try:
        reg = pathlib.Path(__file__).resolve().parent.parent / "FLOW_REGISTER.md"
        for line in reg.read_text(encoding="utf-8").split("\n"):
            m = re.match(r"\|\s*`([^`]+)`\s*\|\s*([A-Za-z_-]+)\s*\|", line)
            if m:
                status[m.group(1)] = m.group(2)
    except Exception:
        pass
    return status


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "maestro")
    findings = []
    review = []
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

        rev = []
        for doc in docs:
            if isinstance(doc, list):
                check_scroll_pairs(doc, "", rev)
                check_restart_nav(doc, "", rev, p)
        review += [(str(p), msg) for _w, msg in rev]

    print(f"audit_structure: {files} flows walked")

    if review:
        status = _register_status()
        print(f"\n  {len(review)} for REVIEW (not defects, exit code unaffected):")
        print("  A pair is only a bug when the SECOND target renders ABOVE the first —")
        print("  read the component, not the YAML. A flow marked PASS has already")
        print("  proven its own pair; skip it.")
        for where, msg in review:
            name = pathlib.Path(where).stem
            st = status.get(name)
            tag = f"  [register: {st}]" if st else ""
            print(f"    {where}: {msg}{tag}")

    if not findings:
        print("\n  no structural defects")
        return 0
    print(f"\n  {len(findings)} structural defects:")
    for where, msg in findings:
        print(f"    {where}: {msg}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Find broken HELPERS by clustering their callers' failures.

A helper is included by many flows, so a defect in one is expensive — and it is
also well camouflaged. Both helper defects found on 2026-09-15 were invisible to
reading the file:

  search_my_shop.yaml  17 callers, 7 passing. It typed a query and never dismissed
                       the keyboard, so the IME covered the seller card's action
                       row. The 7 passers act HIGHER up the screen and never
                       touched the covered part.
  login.yaml           ~190 callers. Its identity switch can silently fail, and
                       EIGHT flows then run as the wrong user and fail on
                       owner-gated affordances ("Make an Offer", "Contact Seller").

The shape both share: a helper hides behind the subset of callers that do not
exercise the broken part. Reading the helper tells you nothing; the CALLERS'
failures cluster.

So: group every failing caller by helper, normalise the failure message, and
report any helper with two or more callers failing the SAME way. That is a much
stronger signal than a helper simply having failing callers — most helpers do.

Reports only. A cluster is a lead, not a verdict: confirm from the hierarchy and
the component before touching anything.

TWO CAVEATS, both learned from its own first run:

1. THE SAME CLUSTER IS ATTRIBUTED TO EVERY HELPER ITS CALLERS SHARE. If two flows
   both fail on `location-confirm`, and both include login_seller, set_listing_location
   and attach_photo_from_gallery, the cluster is reported under all three. The right
   owner is the helper whose CONTENT matches the failure — here set_listing_location,
   which is the one that touches `location-confirm`. Read the shape, not the heading.

2. NORMALISE NUMBERS ONLY. An earlier version also collapsed every quoted literal
   to "X" and it over-clustered badly: `"Active" is visible` and `"Send Offer" is
   visible` became one shape, so six unrelated flows read as a single finding. The
   quoted string is usually the most discriminating part — a shared SELECTOR is the
   signal, a shared sentence template is not.

Validated against three clusters whose cause was already known when it was written:
search_my_shop / seller-card-more-action, open_listing_by_title / "Make an Offer"
(the session-bleed family), and open_bundle / register-email-input. It found all
three without being told, which is the only reason to trust the fourth.
"""
import glob
import json
import os
import pathlib
import re
import sys

RIG = {"rig_devclient_crash", "rig"}


def normalise(msg: str) -> str:
    """Collapse a failure message to its shape, so ids and titles do not split a
    real cluster into singletons."""
    m = re.sub(r"\b\d+\b", "N", msg)
    m = re.sub(r"-N+\b", "-N", m)
    # Numbers only. An earlier version also collapsed every quoted literal to "X",
    # and that OVER-clustered badly: `Assertion is false: "Active" is visible` and
    # `Assertion is false: "Send Offer" is visible` became the same shape, so six
    # unrelated flows looked like one finding. The quoted string is usually the
    # most discriminating part of the message — a shared SELECTOR is the signal,
    # a shared sentence template is not.
    return m.strip()


def main() -> int:
    root = pathlib.Path("maestro")
    # helper -> callers
    callers: dict[str, set[str]] = {}
    for p in sorted(root.rglob("*.yaml")):
        if "_helpers" in p.parts:
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except OSError:
            continue
        for h in re.findall(r"_helpers/([A-Za-z0-9_]+)\.yaml", text):
            callers.setdefault(h, set()).add(p.stem)

    # newest failure message per flow
    fail_msg: dict[str, str] = {}
    passed: set[str] = set()
    for log in sorted(glob.glob("qa/reports/**/*.log", recursive=True),
                      key=os.path.getmtime):
        name = pathlib.Path(log).stem
        try:
            for line in open(log, encoding="utf-8", errors="ignore"):
                if "[Failed]" in line and "(" in line:
                    fail_msg[name] = line.split("(", 2)[-1].strip().rstrip(")")
                    passed.discard(name)
                    break
                if "[Passed]" in line:
                    passed.add(name)
                    fail_msg.pop(name, None)
                    break
        except OSError:
            continue

    print(f"audit_helpers: {len(callers)} helpers, {len(fail_msg)} flows with a recorded failure\n")
    findings = 0
    for h in sorted(callers):
        mine = sorted(callers[h])
        fails = {c: fail_msg[c] for c in mine if c in fail_msg}
        if len(fails) < 2:
            continue
        groups: dict[str, list[str]] = {}
        for c, m in fails.items():
            groups.setdefault(normalise(m), []).append(c)
        for shape, flows in sorted(groups.items(), key=lambda kv: -len(kv[1])):
            if len(flows) < 2:
                continue
            findings += 1
            npass = len(mine) - len(fails)
            print(f"  {h}.yaml — {len(flows)} of {len(mine)} callers fail the SAME way "
                  f"({npass} pass)")
            print(f"      shape: {shape[:96]}")
            for c in sorted(flows):
                print(f"        - {c}")
            print()
    if not findings:
        print("  no helper-level clusters")
    print(f"{findings} cluster(s). A cluster is a LEAD — confirm from the hierarchy "
          f"and the component before changing a helper that many flows include.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

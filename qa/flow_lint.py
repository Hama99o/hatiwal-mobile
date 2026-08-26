#!/usr/bin/env python3
"""Static lint for Maestro flows, built from defects this campaign actually hit.

188 of 240 flows have never executed. Each one costs ~3 minutes of device time to
discover a defect that is often visible in the text. These checks encode the
failure classes already paid for:

  ANCHORED   A literal that is a strict SUBSTRING of a real UI string. Maestro
             matches an anchored full-string regex, so "view" can never match
             "{{count}} views". Cost so far: bare "Search", "view", "Offer:",
             "-\\d+%", "Your Offer", "Phones".
  TOOTHLESS  `optional: true` on an assert — it cannot fail, so it reads as
             coverage while asserting nothing. Also assertNotVisible on a literal
             no node ever equals, which is trivially true (found in
             subcategory_drilldown: assertNotVisible "Phones").
  JSFUNC     ${visible(...)} / ${selectorExists(...)} — not in Maestro 2.7.0's JS
             sandbox; raises TypeError and asserts nothing. The .log does not show
             it; only the .xml does.
  DATE       A hardcoded year. Fixtures are created at seed time, so any fixed
             year expires (found: "2024" in two flows, in 2026).

Reports only. Every hit needs a human read. From the first full pass, 21 hits →
1 real ANCHORED defect, and these confirmed false-positive shapes:

  * SYSTEM DIALOG TEXT — "Allow", "Don't allow", "Continue", "Select", "Dismiss".
    These match Android's own buttons exactly; they are substrings of our copy only
    by coincidence. The linter only knows our locale files.
  * A TYPED SEARCH TERM — search_with_filter asserts "phone" after typing it, and
    the input's node text IS exactly "phone". Flagged because "phone" happens to
    sit inside "Show phone number".
  * CODE-DEFINED LABELS — the language rows render SUPPORTED_LANGUAGES labels
    ("پښتو"), defined in src/i18n/index.ts, not in the locale JSON. Flagged against
    an unrelated "Pashto (پښتو)" string.

So ANCHORED is a prompt to check, not a verdict. TOOTHLESS and JSFUNC have no false
positives by construction: an optional assert cannot fail, and a function that does
not exist cannot evaluate. But a TOOTHLESS hit still needs a judgment call about the
remedy — some optionals are legitimate (a system permission dialog that may not
appear, a toast that may have faded where the flow checks the durable state
elsewhere), and the fix there is usually a `when:` conditional with real assertions
inside it, not a hard assert.
"""
import json, re, sys, glob, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def locale_strings():
    """Every en string, plus a regex for its interpolated form."""
    out = []
    for p in glob.glob(os.path.join(ROOT, "src/i18n/locales/en/*.json")):
        def walk(o):
            if isinstance(o, dict):
                for v in o.values(): walk(v)
            elif isinstance(o, str):
                out.append(o)
        walk(json.load(io.open(p, encoding="utf-8")))
    return out

STR = locale_strings()

def is_plain(lit):
    """No regex metacharacters — so an anchored match means literal equality."""
    return not re.search(r'[.*+?\[\]()|\\^$]', lit)

def check(path):
    hits = []
    lines = io.open(path, encoding="utf-8").read().split("\n")
    for i, raw in enumerate(lines, 1):
        l = raw.strip()
        if l.startswith("#"): continue

        if re.match(r'-?\s*optional:\s*true', l):
            ctx = " ".join(x.strip() for x in lines[max(0, i-4):i])
            if "assert" in ctx:
                hits.append((i, "TOOTHLESS", "optional assert cannot fail"))

        if re.search(r'\$\{[^}]*\b(visible|selectorExists|exists)\s*\(', l):
            hits.append((i, "JSFUNC", "no such function in Maestro's JS sandbox"))

        m = re.search(r'assert(?:Not)?Visible:\s*"([^"]+)"', l) or \
            re.search(r'^\s*text:\s*"([^"]+)"', l)
        if m:
            lit = m.group(1)
            if re.fullmatch(r'"?(19|20)\d\d"?', lit):
                hits.append((i, "DATE", f'hardcoded year {lit!r}'))
            elif is_plain(lit) and len(lit) > 2:
                exact = any(s == lit for s in STR)
                sub = [s for s in STR if lit in s and s != lit]
                if not exact and sub:
                    hits.append((i, "ANCHORED",
                                 f'{lit!r} is a substring of {sub[0][:44]!r}'))
    return hits

total = 0
for p in sorted(glob.glob(os.path.join(ROOT, "maestro/*/*.yaml"))):
    h = check(p)
    if not h: continue
    rel = p.split("maestro/")[1]
    for line, kind, why in h:
        print(f"  {kind:<10} {rel}:{line}  {why}")
        total += 1
print(f"\n  {total} finding(s) across {len(glob.glob(os.path.join(ROOT,'maestro/*/*.yaml')))} flows")

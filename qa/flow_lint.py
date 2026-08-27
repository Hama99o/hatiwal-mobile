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
  REGEXMETA  A literal with an unescaped `$`, which anchors the end of the pattern
             rather than meaning a dollar sign. Cost: create_listing_currency_usd
             asserting "$450", which could never match.
  KEYPATH    A literal that is a t() key path ("common.close") rather than the
             string it renders. Cost: send_photo, copied from a Jest expectation
             where i18next is not initialised and the key IS what comes back.
  ROLE       A tap on an owner/recipient-only action from a buyer session. Cost:
             three offer flows, each failing as if the button were missing.
  SELFTYPED  A literal that is only PART of text the flow itself typed. Cost:
             message_long_text asserted 27 characters of the 366-character message
             it had just sent, so it could never pass.
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

So ANCHORED is a prompt to check, not a verdict. A site checked and found benign
gets `# lint: anchored-ok — <reason>`, the same way TOOTHLESS has optional-ok, so
this report converges to zero and a genuine new hit is not buried under known ones. TOOTHLESS and JSFUNC have no false
positives by construction: an optional assert cannot fail, and a function that does
not exist cannot evaluate. But a TOOTHLESS hit still needs a judgment call about the
remedy — some optionals are legitimate (a system permission dialog that may not
appear, a toast that may have faded where the flow checks the durable state
elsewhere), and the fix there is usually a `when:` conditional with real assertions
inside it, not a hard assert.
"""
import json, re, sys, glob, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Not every user-visible label lives in the locale JSON. These files define labels
# in code, and the linter reported each of them as an anchored-match trap until it
# learned to read them: SUPPORTED_LANGUAGES ("پښتو") and AFGHAN_PROVINCES ("Kabul").
# Kept to a curated list — harvesting every string in src/ would make almost any
# literal look legitimate and turn false positives into false negatives.
CODE_LABEL_SOURCES = ["src/i18n/index.ts", "src/data/*.ts"]

# Actions only the listing owner, or an offer/meetup's RECIPIENT, can take. Tapping
# one of these from the buyer's session is the "missing button" that is really a
# wrong session.
OWNER_ONLY_ACTIONS = {
    "Mark Sold", "Mark as Sold", "Mark as Reserved", "Reserve", "Unpublish",
    "Accept", "Accept offer", "Decline", "Counter", "Counter back",
}

def locale_strings():
    """Every en string, plus labels defined in code rather than the locale files."""
    out = []
    for p in glob.glob(os.path.join(ROOT, "src/i18n/locales/en/*.json")):
        def walk(o):
            if isinstance(o, dict):
                for v in o.values(): walk(v)
            elif isinstance(o, str):
                out.append(o)
        walk(json.load(io.open(p, encoding="utf-8")))
    for pat in CODE_LABEL_SOURCES:
        for p in glob.glob(os.path.join(ROOT, pat)):
            src = io.open(p, encoding="utf-8").read()
            out += re.findall(r'"([^"\n]{2,60})"', src)
    return out

STR = locale_strings()


def locale_key_paths():
    """Valid t() key paths, e.g. "common.close".

    A flow asserting one of these is matching the KEY, not the rendered value. That
    is what Jest sees — i18next is not initialised there, so `t()` returns the key
    and a unit test legitimately expects "common.close" — and it does not survive
    being copied into a Maestro flow, where the app renders "Close".
    """
    out = set()
    for p in glob.glob(os.path.join(ROOT, "src/i18n/locales/en/*.json")):
        ns = os.path.basename(p)[:-5]

        def walk(o, pre):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, pre + [k])
            else:
                out.add(".".join(pre))

        walk(json.load(io.open(p, encoding="utf-8")), [ns])
    return out


KEY_PATHS = locale_key_paths()
KEYISH = re.compile(r'^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+$')

def is_plain(lit):
    """No regex metacharacters — so an anchored match means literal equality."""
    return not re.search(r'[.*+?\[\]()|\\^$]', lit)

def block_range(lines, i):
    """Line span of the command enclosing line i (1-indexed, inclusive).

    Markers must bind to their OWN command. A fixed +/-N window does not: a marker
    two lines below one assert silently suppressed the assert above it, which is
    how a synthetic test case went quietly unreported. The block runs from the
    enclosing `- command:` up to the line before the next one, and a marker comment
    directly above that command counts as part of it.
    """
    start = i - 1
    while start > 0 and not re.match(r'\s*-\s+\w', lines[start]):
        start -= 1
    while start > 0 and lines[start - 1].strip().startswith("#"):
        start -= 1
    end = i
    while end < len(lines) and not re.match(r'\s*-\s+\w', lines[end]):
        end += 1
    return start, end


def check(path):
    hits = []
    lines = io.open(path, encoding="utf-8").read().split("\n")
    # Text this flow types. An assert on a PREFIX of something the flow itself sent
    # can never match the node holding the whole of it — message_long_text asserted
    # 27 characters of a 366-character message. The locale-file comparison below
    # cannot see this class, because the string never came from the locale files.
    typed = [m for m in (re.match(r'-?\s*inputText:\s*"([^"]+)"', x.strip())
                         for x in lines if not x.strip().startswith("#")) if m]
    typed = [m.group(1) for m in typed]
    for i, raw in enumerate(lines, 1):
        l = raw.strip()
        if l.startswith("#"): continue

        if re.match(r'-?\s*optional:\s*true', l):
            # Walk back to the ENCLOSING command, not a fixed window. A 4-line
            # lookback reported optional TAPS as toothless asserts whenever an
            # assert happened to sit above them (send_photo, filter_map_location_
            # denied) — an optional tap on a system dialog that may not appear is
            # legitimate, an optional assert is not.
            owner = None
            for k in range(i - 2, -1, -1):
                if re.match(r'\s*-\s+\w', lines[k]):
                    owner = lines[k].strip().lstrip("- ").rstrip(":")
                    break
            # An optional assert can be the right call — a toast that may have
            # faded, where the flow checks the durable state right after. Mark
            # those `# lint: optional-ok — <reason>` so this report converges to
            # zero and a NEW toothless assert actually stands out.
            bs, be = block_range(lines, i)
            near = " ".join(lines[bs:be])
            if owner and owner.startswith("assert") and "lint: optional-ok" not in near:
                hits.append((i, "TOOTHLESS", f"optional {owner} cannot fail"))

        if re.search(r'\$\{[^}]*\b(visible|selectorExists|exists)\s*\(', l):
            hits.append((i, "JSFUNC", "no such function in Maestro's JS sandbox"))

        m = re.search(r'assert(?:Not)?Visible:\s*"([^"]+)"', l) or \
            re.search(r'^\s*text:\s*"([^"]+)"', l)
        if m:
            lit = m.group(1)
            # A bare `$` is a regex end-anchor, not a dollar sign. "$450" reads as
            # "end-of-string then 450" and matches nothing — create_listing_currency_usd
            # asserted exactly that. Maestro's own ${var} syntax is stripped first.
            probe = re.sub(r'\$\{[^}]*\}', '', lit)
            if '$' in probe and '\\$' not in probe:
                hits.append((i, "REGEXMETA",
                             f'{lit!r} has an unescaped $ — a regex end-anchor'))
            elif KEYISH.match(lit) and lit in KEY_PATHS:
                hits.append((i, "KEYPATH",
                             f'{lit!r} is a translation KEY, not the rendered value'))
            elif re.fullmatch(r'"?(19|20)\d\d"?', lit):
                hits.append((i, "DATE", f'hardcoded year {lit!r}'))
            elif is_plain(lit) and len(lit) > 2:
                # An exact UI string is fine however else it appears: "Edit" is a
                # real button label even when it also sits inside a listing title
                # the flow typed. Only a literal that matches NOTHING exactly can
                # be the anchored-match trap.
                exact = any(s == lit for s in STR)
                bs, be = block_range(lines, i)
                ok = "lint: anchored-ok" in " ".join(lines[bs:be])
                self_typed = [t for t in typed if lit in t and lit != t]
                sub = [s for s in STR if lit in s and s != lit]
                if exact or ok:
                    pass
                elif self_typed:
                    hits.append((i, "SELFTYPED",
                                 f'{lit!r} is only part of {self_typed[0][:38]!r}'))
                elif sub:
                    hits.append((i, "ANCHORED",
                                 f'{lit!r} is a substring of {sub[0][:44]!r}'))
    # ROLE — performing an owner/recipient-only action while signed in as the buyer.
    # Three flows did this: offer_send_and_accept (fixed earlier), offer_counter_flow
    # and offer_send_and_decline. The literal was right every time; the session was
    # wrong, and the failure reads as a missing button.
    #
    # Only TAPS count. `assertNotVisible: "Accept"` in a buyer session is correct and
    # deliberate — meetup_proposed_bubble_ui checks that the PROPOSER is not offered
    # the response buttons on their own proposal.
    body = "\n".join(l for l in lines if l.strip() and not l.strip().startswith("#"))
    if "login_seller" not in body and "seller@hatiwal.test" not in body:
        for i, raw in enumerate(lines, 1):
            l = raw.strip()
            if l.startswith("#"):
                continue
            m = re.match(r'-?\s*tapOn:\s*"([^"]+)"\s*$', l) or \
                (re.match(r'^\s*text:\s*"([^"]+)"\s*$', l) and
                 re.match(r'\s*-\s+tapOn:', lines[block_range(lines, i)[0]]) and
                 re.match(r'^\s*text:\s*"([^"]+)"\s*$', l))
            if not m:
                continue
            label = m.group(1).strip(".*")
            if label in OWNER_ONLY_ACTIONS:
                bs, be = block_range(lines, i)
                if "lint: role-ok" in " ".join(lines[bs:be]):
                    continue
                hits.append((i, "ROLE",
                             f'taps owner-only {label!r} with no seller session'))
    return hits

if "--selftest" in sys.argv:
    # A linter reporting zero is only good news if its checks still fire. Every
    # class must trip on the fixture, and the marker must suppress only its own
    # command.
    fixture = os.path.join(ROOT, "qa/testdata/lint_synthetic.yaml")
    hits = check(fixture)
    got = {k for _, k, _ in hits}
    need = {"ANCHORED", "DATE", "JSFUNC", "TOOTHLESS", "SELFTYPED", "ROLE", "KEYPATH", "REGEXMETA"}
    for line, kind, why in hits:
        print(f"  L{line:<3} {kind:<10} {why[:56]}")
    missing = need - got
    # The fixture's marked command asserts "phone". Identify it by content, not by
    # line number — a hardcoded threshold broke the moment the fixture grew.
    over = [f"L{l}: {w}" for l, _, w in hits if "'phone'" in w]
    ok = not missing and not over
    print()
    if missing: print(f"  FAIL — these checks did not fire: {sorted(missing)}")
    if over:    print(f"  FAIL — marker did not suppress its own command (line {over})")
    if ok:      print(f"  PASS — all {len(need)} checks fire; marker scoped to one command")
    sys.exit(0 if ok else 1)

total = 0
for p in sorted(glob.glob(os.path.join(ROOT, "maestro/*/*.yaml"))):
    h = check(p)
    if not h: continue
    rel = p.split("maestro/")[1]
    for line, kind, why in h:
        print(f"  {kind:<10} {rel}:{line}  {why}")
        total += 1
print(f"\n  {total} finding(s) across {len(glob.glob(os.path.join(ROOT,'maestro/*/*.yaml')))} flows")

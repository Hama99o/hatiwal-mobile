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
  SEARCHTAP  A tap on text that the flow typed into a SEARCH field. The input sits
             above the results, so the tap hits the box and the flow never navigates.
             Cost: three flows, each failing several steps later.
  REGEXMETA  A literal with an unescaped regex metacharacter used as text. `$` anchors
             the end of the pattern (create_listing_currency_usd asserted "$450"); `(` and
             `)` are grouping (away_mode asserted "Away until (YYYY-MM-DD)", which the app
             renders with the brackets the pattern then dropped).
  HIDEKEY    `hideKeyboard` with no typing before it — on Android that is Back, and
             with no IME up it pops the screen.
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
import yaml

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

    # ── YAML TYPES: a timeout must be a NUMBER ──────────────────────────────
    #
    # Every other rule here reads the file as TEXT, so none of them can see a
    # step that parses but parses WRONG. This one was written after a comment
    # got concatenated onto the end of a `timeout:` line — no newline between
    # them — which YAML happily read as the string "60000# ...but the marker is
    # each mode's SEARCH BAR...". Maestro then refused the flow outright:
    #
    #   [Failed] categories_hub_rtl (Invalid timeout value '60000# ...'
    #            in 'Assert that id: browse...'
    #
    # It was in two shared helpers reached by ~26 RTL and dark-mode flows, and
    # nothing caught it: flow_lint passed (a text scan sees a fine-looking
    # line), and `yaml.safe_load_all` passed too, because a quoted scalar IS
    # valid YAML. Only running a flow found it.
    #
    # So: parse the file and assert the types of the numeric fields. Cheap, and
    # it covers every generator of this class, not just a missing newline.
    try:
        docs = [d for d in yaml.safe_load_all(io.open(path, encoding="utf-8"))]
    except Exception as e:
        hits.append((1, "YAMLPARSE", f"does not parse as YAML: {e}"))
        docs = []
    for doc in docs:
        if not isinstance(doc, list):
            continue
        for step in doc:
            if not isinstance(step, dict):
                continue
            for cmd, body in step.items():
                if not isinstance(body, dict):
                    continue
                for field in ("timeout", "index", "times", "visibilityPercentage",
                              "maxRetries", "speed"):
                    if field in body and not isinstance(body[field], (int, float)):
                        hits.append((1, "BADTYPE",
                                     f"{cmd}.{field} is {body[field]!r} "
                                     f"({type(body[field]).__name__}), not a number — "
                                     f"Maestro rejects the flow; a comment run onto the "
                                     f"end of the line is the usual cause"))
    # Text this flow types. An assert on a PREFIX of something the flow itself sent
    # can never match the node holding the whole of it — message_long_text asserted
    # 27 characters of a 366-character message. The locale-file comparison below
    # cannot see this class, because the string never came from the locale files.
    typed = [m for m in (re.match(r'-?\s*inputText:\s*"([^"]+)"', x.strip())
                         for x in lines if not x.strip().startswith("#")) if m]
    typed = [m.group(1) for m in typed]
    # Values typed into a SEARCH field, with the line they were typed on. Tapping one
    # of these by text later hits the INPUT, not the result: the search box sits above
    # the list, and matching takes the first node in hierarchy order. Proven three
    # times with screenshots (composer_draft, full_marketplace_cycle,
    # create_listing_with_condition), each time leaving the flow on the feed believing
    # it had navigated.
    searched = []
    for i, raw in enumerate(lines, 1):
        st = raw.strip()
        if st.startswith("#"):
            continue
        m = re.match(r'-?\s*inputText:\s*"([^"]+)"', st)
        if not m:
            continue
        target = "?"
        for k in range(i - 2, max(-1, i - 8), -1):
            mm = re.search(r'id:\s*"([^"]+)"', lines[k]) or \
                 re.match(r'\s*-\s*tapOn:\s*"([^"]+)"', lines[k])
            if mm:
                target = mm.group(1)
                break
        if re.search(r'search', target, re.I):
            searched.append(m.group(1))
    # HIDEKEY — `hideKeyboard` IS the Android Back button, so it is only safe while an
    # IME is actually up to consume it. With no keyboard, that Back reaches the app and
    # pops the screen; the flow then fails somewhere else entirely, on a screen it did
    # not expect to be on. Typing is what guarantees the IME. `waitForAnimationToEnd`
    # between the two is fine — waiting does not dismiss a keyboard — and several flows
    # deliberately sit like that, so it must not be flagged.
    for i, raw in enumerate(lines, 1):
        if raw.strip() != "- hideKeyboard":
            continue
        prev = ""
        for k in range(i - 2, -1, -1):
            st = lines[k].strip()
            if st and not st.startswith("#") and st != "- waitForAnimationToEnd":
                prev = st
                break
        # TYPING BEFORE IT PROVES NOTHING — this rule used to exempt that case, and
        # the exemption is what let contact_visibility through. It ran
        # `inputText: "+93700000123"` and then `hideKeyboard` on Edit Profile,
        # and the Back press popped the screen back to Profile. Proven from
        # run-398's own hierarchy dump at the failing step: no `edit-profile-*`
        # node anywhere, "Switch to Seller Mode" present. The next three
        # commands still reported COMPLETED against the stale hierarchy, so the
        # flow failed four steps later on an assertion that looked unrelated.
        #
        # Maestro's `inputText` sets the value through the driver and does not
        # reliably raise the soft keyboard, so "typed, therefore an IME is up"
        # was never sound.
        #
        # So: EVERY hideKeyboard is flagged, and the exemption is an explicit
        # justification comment above it — the same convention CENTERELEM uses.
        # login.yaml's is safe and says why, which is exactly the shape wanted.
        # JUSTIFIED = the reasoning is written down immediately above it. Static
        # analysis cannot tell which screen a flow is on, so it cannot tell a
        # load-bearing hideKeyboard from a screen-popping one — and both exist:
        #   * report_listing.yaml:60 and publish_success.yaml:225 need it,
        #     because the IME swallows the submit tap while Maestro still
        #     reports COMPLETED (it taps the element's bounds, the touch lands
        #     on the keyboard). Both say so in a comment.
        #   * contact_visibility.yaml:84 had no comment, and its Back press
        #     popped Edit Profile to Profile.
        # So the bar is the same one CENTERELEM uses: explain it, or fix it.
        justified = any(
            lines[k].strip().startswith("#")
            and re.search(r'(?i)hideKeyboard|Back press|IME|keyboard', lines[k])
            for k in range(max(0, i - 8), i - 1)
        )
        # THE LOGIN SHAPE IS EXEMPT, and only that one. `inputText: <password>`
        # then hideKeyboard on the sign-in form is safe for a reason that does
        # not generalise: Login is the root of the auth stack, so a stray Back
        # pops nothing. ~22 flows do their sign-in inline like this and pass.
        #
        # Flagging them would make this rule 25 findings of which 22 are noise —
        # and a rule that is mostly noise is one nobody reads, which is how the
        # real one hides. Narrowed to the password shape rather than to "any
        # typing", because "any typing" is precisely the exemption that let
        # contact_visibility through.
        login_shape = bool(re.search(r'(?i)password', prev))
        if not justified and not login_shape:
            hits.append((i, "HIDEKEY",
                         f'hideKeyboard after {prev[:30]!r} — on Android this is a BACK '
                         f'PRESS with no IME guaranteed, so it can pop the screen; typing '
                         f'first does not help (see contact_visibility / run-398). Use '
                         f'`pressKey: Enter` on a single-line input, or justify it in a '
                         f'comment saying why Back is safe here'))

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

        # centerElement: true is a SMALL-SCREEN hazard.
        #
        # It asks the scroll to bring the target to the MIDDLE, which is
        # impossible when there is not enough content below it — Maestro then
        # burns the whole timeout on an element plainly on screen. Whether it can
        # be satisfied depends on VIEWPORT HEIGHT, so the same block passes at
        # 411dp (571dp tall) and fails at 360dp (400dp tall): that is exactly how
        # rtl/profile_rtl broke on 2026-09-02, and how 11 blocks scrolling to
        # profile-edit-button were order-dependent before that.
        #
        # Not an error, because it is sometimes the right tool — _helpers/
        # open_language_picker.yaml used it deliberately to keep a tap off the
        # FloatingTabBar. But it needs a reason each time, so an UNCOMMENTED use
        # is flagged. The safe alternative is to scroll PAST the target and back,
        # which lands it near the top of the viewport at any height.
        if re.search(r'^\s*centerElement:\s*true', l):
            window = "\n".join(lines[max(0, i - 9):i])
            if "centerElement" not in window or not re.search(r"#", window):
                hits.append((i, "CENTERELEM",
                             "centerElement:true cannot be satisfied when the target has "
                             "too little content below it — fails at 360dp while passing "
                             "at 411dp; scroll PAST it and back, or justify it in a comment"))

        if re.search(r'\$\{[^}]*\b(visible|selectorExists|exists)\s*\(', l):
            hits.append((i, "JSFUNC", "no such function in Maestro's JS sandbox"))

        # tapOn is included deliberately. Until this line did, every check below saw
        # only assertions and `text:` operands — so a tap on a nonexistent literal, a
        # tap on a translation key, or a tap with an unescaped `$` all went unexamined.
        mt = re.search(r'(assert(?:Not)?Visible|tapOn):\s*"([^"]+)"', l)
        mx = re.match(r'^\s*text:\s*"([^"]+)"', l)
        if mt or mx:
            lit = mt.group(2) if mt else mx.group(1)
            if mt:
                kind = mt.group(1)
            else:
                bs0, _ = block_range(lines, i)
                kind = lines[bs0].strip().lstrip("- ").split(":")[0]
            is_tap = kind.startswith("tapOn")
            # A bare `$` is a regex end-anchor, not a dollar sign. "$450" reads as
            # "end-of-string then 450" and matches nothing — create_listing_currency_usd
            # asserted exactly that. Maestro's own ${var} syntax is stripped first.
            if is_tap and lit in searched:
                bs, be = block_range(lines, i)
                if "lint: searchtap-ok" not in " ".join(lines[bs:be]):
                    hits.append((i, "SEARCHTAP",
                                 f'{lit!r} was typed into a search field — tap the row by testID'))
            probe = re.sub(r'\$\{[^}]*\}', '', lit)
            if '$' in probe and '\\$' not in probe:
                hits.append((i, "REGEXMETA",
                             f'{lit!r} has an unescaped $ — a regex end-anchor'))
            # Parentheses are grouping, not brackets. away_mode asserted
            # "Away until (YYYY-MM-DD)" — which the app really does render, brackets and
            # all — and the pattern asked for it WITHOUT them. A literal that reads
            # correctly and behaves as syntax is the whole hazard here.
            elif re.search(r'(?<!\\)[()]', probe) and \
                    "lint: regex-ok" not in " ".join(lines[block_range(lines, i)[0]:block_range(lines, i)[1]]):
                hits.append((i, "REGEXMETA",
                             f'{lit!r} has unescaped ( ) — regex grouping, not brackets'))
            elif KEYISH.match(lit) and lit in KEY_PATHS:
                hits.append((i, "KEYPATH",
                             f'{lit!r} is a translation KEY, not the rendered value'))
            elif re.fullmatch(r'"?(19|20)\d\d"?', lit):
                hits.append((i, "DATE", f'hardcoded year {lit!r}'))
            # Length floor of 3, with an ASCII exception at 2. The floor keeps short
            # non-Latin words out (Dari "من" is a substring of many longer strings and
            # is a legitimate tab label), but it also let a bare "No" through in
            # my_listings_search, which could never match. Two ASCII letters are
            # almost never a whole UI string, so those are worth flagging — except
            # digits, which are real values ("15" is a quantity, and it renders exactly).
            elif is_plain(lit) and (
                len(lit) > 2
                or (len(lit) == 2 and lit.isascii() and not lit.isdigit())
            ):
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
    need = {"ANCHORED", "DATE", "JSFUNC", "TOOTHLESS", "SELFTYPED", "ROLE", "KEYPATH", "HIDEKEY", "REGEXMETA", "SEARCHTAP"}
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

#!/usr/bin/env python3
"""Audit every testID the flows target against the testIDs the app defines.

The mirror of audit_labels.py. A flow pointing at a testID that exists nowhere can
never pass, and the failure message ("Element not found: Id matching regex: …")
looks identical to a genuine app regression.

Handles the two ways the app defines them:
  literal    testID="listing-card"
  templated  testID={`unread-badge-${item.id}`}   -> prefix "unread-badge"

Note the indexing trap this found: the app gives EVERY feed card the SAME id, so
"listing-card-0" / "save-button-1" are not ids at all. Maestro selects the Nth
match with `index:`, which is what those flows needed.
"""
import glob, re, sys
from collections import defaultdict

src = ""
for root in ('src', 'app'):
    for ext in ('ts', 'tsx'):
        for fp in glob.glob(f'{root}/**/*.{ext}', recursive=True):
            if '__tests__' in fp or '.stories.' in fp: continue
            src += open(fp, encoding='utf-8', errors='ignore').read()

# `\s*=\s*` not `=`: a component can define its id as a DEFAULT PARAMETER —
# `testID = "listing-unavailable-actions"` in the destructured props — which is a
# real, mounted handle. Requiring no spaces reported it as undefined.
# `\w*[Tt]estID` on purpose, not just `testID`: shared components FORWARD a testID
# under another prop name, and the id they receive is a real, targetable handle.
# UserIdentity takes both `testID` (the wrapper) and `nameTestID` (the name <Text>),
# and Profile.tsx passes nameTestID="profile-display-name". Matching only `testID=`
# reported that id as "defined nowhere in the app" while the login helpers guard on
# it — which sent me looking for a missing testID that had been there all along.
literal  = set(re.findall(r'\w*[Tt]estID\s*=\s*["\']([A-Za-z0-9_\-]+)["\']', src))
literal |= set(re.findall(r'\w*[Tt]estID:\s*["\']([A-Za-z0-9_\-]+)["\']', src))
literal |= set(re.findall(r'tabBarButtonTestID:\s*["\']([A-Za-z0-9_\-]+)["\']', src))
# Components that expose EXTRA handles as their own props — SearchBar offers
# container/input/clear. Matching only `testID=` reported conversations-search-clear
# as undefined when it is passed as clearTestID two lines below the container's.
literal |= set(re.findall(r'(?:input|clear|button|icon|row)TestID=["\']([A-Za-z0-9_\-]+)["\']', src))
tmpl  = set(re.findall(r'testID=\{`([A-Za-z0-9_\-]+?)-?\$\{', src))
tmpl |= set(re.findall(r'testID=\{`([A-Za-z0-9_\-]+)`\}', src))

# SUFFIXES, for the ids a shared component DERIVES from the one it was handed:
#
#     testID={testID ? `${testID}-decrement` : undefined}     (QuantityStepper)
#
# The `tmpl` patterns above need a literal PREFIX before `${`, and here there is
# none — the interpolation comes first — so every derived id looked undefined.
# That was 11 of this audit's 14 findings: buyer-picker-quantity-increment,
# -decrement, -value, -value-text, -all, -at-max-reason, sale-edit-quantity-*.
# All are real, mounted handles: the parent passes testID="buyer-picker-quantity"
# and the child appends the suffix at runtime.
#
# An id is therefore also defined when it splits into <known literal>-<known
# suffix>. That is narrow on purpose — it needs BOTH halves to be things the app
# actually contains, so it cannot bless an arbitrary string.
suffix = set(re.findall(r'[Tt]estID[^\n]{0,80}?`\$\{[^}]+\}-([A-Za-z0-9_\-]+)`', src))

# An id inside an `optional: true` step is allowed not to exist — that is what
# optional MEANS. send_photo.yaml aims at the iOS picker's bundle id
# ("com.apple.Photos") and tolerates its absence on Android, which is correct.
used = defaultdict(list)
for fp in sorted(glob.glob('maestro/**/*.yaml', recursive=True)):
    lines = open(fp).readlines()
    for i, line in enumerate(lines, 1):
        m = re.match(r'^\s*id:\s*"([^"]+)"\s*$', line)
        if not m: continue
        indent = len(line) - len(line.lstrip())
        optional = False
        for nxt in lines[i:]:                       # rest of this step's block
            ind = len(nxt) - len(nxt.lstrip())
            if nxt.strip() and ind < indent: break
            if re.match(r'^\s*optional:\s*true\s*$', nxt): optional = True; break
        # WHICH COMMAND owns this id. An id used only in `assertNotVisible` is
        # SUPPOSED to be absent from the app — that is the assertion. Reporting
        # it as a stale selector inverts the finding, and it would have sent me
        # to "fix" edit_profile_province.yaml, whose whole first section asserts
        # that the city input and province picker are GONE now that location is
        # pin-only. Two of the 14 findings were exactly that.
        cmd = ""
        for prev in reversed(lines[:i - 1]):
            cm = re.match(r'^\s*-\s*([A-Za-z]+)', prev)
            if cm:
                cmd = cm.group(1)
                break
        if not optional: used[m.group(1)].append((f'{fp}:{i}', cmd))

def defined(base, literal, tmpl, suffix):
    """Is this id a handle the app actually mounts?"""
    if base in literal:
        return True
    if any(base == t or base.startswith(t) for t in tmpl):
        return True
    # <known literal>-<known suffix>, for a component that derives its child ids.
    for sfx in suffix:
        tail = "-" + sfx
        if base.endswith(tail) and base[: -len(tail)] in literal:
            return True
    return False


missing = {}
for tid, entries in used.items():
    sites = [s for s, _ in entries]
    cmds = {c for _, c in entries}
    base = re.sub(r'\\+d\+', '', tid).rstrip('-')
    # ANDROID SYSTEM ids are not app testIDs and never will be. `android:id/button1`
    # is the positive button of a native Alert — _helpers/confirm_dialog.yaml targets
    # it precisely because confirmAlert's label often duplicates a label on the screen
    # behind it, so the text is ambiguous and the resource id is not.
    if tid.startswith(("android:id/", "com.android.")): continue

    # Asserted ABSENT everywhere it is used — absence is the point.
    if cmds and cmds <= {"assertNotVisible"}: continue

    # An ALTERNATION is a regex matcher, not one id: `(browse-search-bar|
    # my-listings-search-input)` is how the restart helpers cover both modes'
    # initial route in one step. Split it and require every branch to exist, so
    # the check stays real rather than being waved through.
    alt = re.fullmatch(r'\(([^()]+)\)', base)
    if alt and "|" in alt.group(1):
        branches = [b.strip() for b in alt.group(1).split("|")]
        if all(defined(b, literal, tmpl, suffix) for b in branches): continue
        missing[tid] = sites
        continue

    if defined(base, literal, tmpl, suffix): continue
    missing[tid] = sites

print(f'app defines {len(literal)} literal + {len(tmpl)} templated + {len(suffix)} derived-suffix testIDs; flows use {len(used)}')
print(f'\n=== used by flows, defined nowhere in the app ({len(missing)}) ===')
for tid, sites in sorted(missing.items(), key=lambda kv: -len(kv[1])):
    print(f'{len(sites):>3} uses  {tid}')
    for s in sites[:3]: print(f'          {s}')
sys.exit(1 if missing else 0)

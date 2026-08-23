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
literal  = set(re.findall(r'testID\s*=\s*["\']([A-Za-z0-9_\-]+)["\']', src))
literal |= set(re.findall(r'testID:\s*["\']([A-Za-z0-9_\-]+)["\']', src))
literal |= set(re.findall(r'tabBarButtonTestID:\s*["\']([A-Za-z0-9_\-]+)["\']', src))
# Components that expose EXTRA handles as their own props — SearchBar offers
# container/input/clear. Matching only `testID=` reported conversations-search-clear
# as undefined when it is passed as clearTestID two lines below the container's.
literal |= set(re.findall(r'(?:input|clear|button|icon|row)TestID=["\']([A-Za-z0-9_\-]+)["\']', src))
tmpl  = set(re.findall(r'testID=\{`([A-Za-z0-9_\-]+?)-?\$\{', src))
tmpl |= set(re.findall(r'testID=\{`([A-Za-z0-9_\-]+)`\}', src))

used = defaultdict(list)
for fp in sorted(glob.glob('maestro/**/*.yaml', recursive=True)):
    for i, line in enumerate(open(fp), 1):
        m = re.match(r'^\s*id:\s*"([^"]+)"\s*$', line)
        if m: used[m.group(1)].append(f'{fp}:{i}')

missing = {}
for tid, sites in used.items():
    base = re.sub(r'\\+d\+', '', tid).rstrip('-')
    if tid in literal or base in literal: continue
    if any(base == t or base.startswith(t) for t in tmpl): continue
    missing[tid] = sites

print(f'app defines {len(literal)} literal + {len(tmpl)} templated testIDs; flows use {len(used)}')
print(f'\n=== used by flows, defined nowhere in the app ({len(missing)}) ===')
for tid, sites in sorted(missing.items(), key=lambda kv: -len(kv[1])):
    print(f'{len(sites):>3} uses  {tid}')
    for s in sites[:3]: print(f'          {s}')
sys.exit(1 if missing else 0)

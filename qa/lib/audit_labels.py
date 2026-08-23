#!/usr/bin/env python3
"""Audit every literal string a flow asserts/taps against what the app can render.

Three verdicts per string:
  DEAD      - the string is a value in en locale JSON, but its key is referenced
              in no .tsx. The app can never render it, so the flow can never pass.
              This class has already broken 30+ flows ("Profile", "My Listings").
  UNKNOWN   - not found in any en locale value. Either dynamic/interpolated text,
              a substring (Maestro matches a FULL-STRING regex, so a substring
              never matches), or a hand-written string that drifted.
  OK        - a value whose key is referenced in at least one .tsx.
"""
import json, glob, os, re, sys, subprocess
from collections import defaultdict

# ── en locale corpus: value -> [key paths] ─────────────────────────────────────
val2keys = defaultdict(list)
for fp in glob.glob('src/i18n/locales/en/*.json'):
    ns = os.path.basename(fp)[:-5]
    def walk(o, pre):
        if isinstance(o, dict):
            for k, v in o.items(): walk(v, pre + [k])
        elif isinstance(o, str):
            val2keys[o].append(f'{ns}.{".".join(pre)}')
    walk(json.load(open(fp)), [])

# ── every key referenced anywhere in tsx (one grep, not one per key) ───────────
# .ts AS WELL AS .tsx. Scanning only .tsx made this audit call strings dead that
# a HOOK renders — useListingLifecycle.ts owns every seller lifecycle label and
# toast ("Listing published!", "Listing deleted", …), and it is a .ts file. That
# alone accounted for several wrong DEAD verdicts on the first run.
tsx = ""
for root in ('src', 'app'):
    for ext in ('ts', 'tsx'):
        for fp in glob.glob(f'{root}/**/*.{ext}', recursive=True):
            if '__tests__' in fp or '.stories.' in fp: continue
            tsx += open(fp, encoding='utf-8', errors='ignore').read()

def key_referenced(key):
    # t("ns.a.b"), plus plural/context suffixes t("ns.a.b", {count})
    base = re.sub(r'_(one|other|zero|two|few|many)$', '', key)
    if base in tsx:
        return True
    # DYNAMIC keys. The app very often builds the last segment at runtime:
    #   t(`listing.filter.${activeTab}`)   t(`listing.status.${listing.status}`)
    #   t(`report.reasons.${reason}`)      t(`listing.condition.${c}`)
    # A literal-key search calls all of those DEAD, which is how a first run of
    # this audit reported 35 dead strings when most render perfectly well.
    # So: treat a key as referenced if its parent path is interpolated anywhere.
    parts = base.split('.')
    for cut in range(len(parts) - 1, 0, -1):
        prefix = '.'.join(parts[:cut])
        if f'{prefix}.${{' in tsx or f'{prefix}.$' in tsx:
            return True
    return False

# ── strings the flows use ─────────────────────────────────────────────────────
uses = defaultdict(list)
pat = re.compile(r'^\s*-?\s*(?:assertVisible|assertNotVisible|tapOn|longPressOn):\s*"([^"]+)"\s*$')
patn = re.compile(r'^\s*(?:text|visible):\s*"([^"]+)"\s*$')
for fp in sorted(glob.glob('maestro/**/*.yaml', recursive=True)):
    for i, line in enumerate(open(fp), 1):
        m = pat.match(line) or patn.match(line)
        if m: uses[m.group(1)].append(f'{fp}:{i}')

dead, unknown = {}, {}
for s, sites in uses.items():
    if not re.search(r'[A-Za-z]', s): continue          # numbers, prices
    if re.search(r'[\\\[\]\(\)\|\+\*\?\{\}]', s): continue  # regexes
    keys = val2keys.get(s)
    if keys is None:
        unknown[s] = sites
    elif not any(key_referenced(k) for k in keys):
        dead[s] = (keys, sites)

print(f'=== DEAD: in the locale, rendered by nothing ({len(dead)}) ===')
for s, (keys, sites) in sorted(dead.items(), key=lambda kv: -len(kv[1][1])):
    print(f'{len(sites):>3} uses  "{s}"')
    print(f'          keys: {", ".join(keys)}')
    print(f'          e.g.  {sites[0]}')
print(f'\n=== UNKNOWN: in no en locale value ({len(unknown)}) — top 25 by use ===')
for s, sites in sorted(unknown.items(), key=lambda kv: -len(kv[1]))[:25]:
    print(f'{len(sites):>3} uses  "{s}"   e.g. {sites[0]}')

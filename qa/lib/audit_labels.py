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

# ── locale corpus: value -> [key paths] ───────────────────────────────────────
# ALL THREE locales, not just en. The rtl/ flows assert Pashto and Dari copy by
# hand ("پروفایل", "ظاهر", "خروج"), and while only en was scanned every one of
# those landed in UNKNOWN — the bucket you skim past — so a Dari assertion that
# no longer matched the Dari JSON was indistinguishable from seed data. `locales`
# records which languages a value appears in, so a ps/fa string can be told apart
# from a genuinely unknown one.
val2keys = defaultdict(list)
val2locales = defaultdict(set)
for fp in glob.glob('src/i18n/locales/*/*.json'):
    lang = os.path.basename(os.path.dirname(fp))
    ns = os.path.basename(fp)[:-5]
    def walk(o, pre, lang=lang, ns=ns):
        if isinstance(o, dict):
            for k, v in o.items(): walk(v, pre + [k])
        elif isinstance(o, str):
            key = f'{ns}.{".".join(pre)}'
            val2locales[o].add(lang)
            if lang == 'en':
                val2keys[o].append(key)
            elif key not in val2keys[o]:
                # A non-en value still needs its KEY recorded, so the
                # "is this key rendered anywhere?" check below can run on it.
                val2keys[o].append(key)
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
# SUBSTRING trap: Maestro matches the FULL string as a regex, so a flow asserting
# a PREFIX of real copy never matches it. These read as "the app didn't show it"
# when the app showed more than the flow asked for. Broken out of UNKNOWN because
# the fix is mechanical (append .*) while the rest of UNKNOWN is mostly seed data.
# Two exclusions, both learned from false positives on the first run:
#   - A string the flow TYPES is matched against the field's VALUE, so a full
#     match is correct even when the same words appear inside the placeholder
#     ("Shahr-e-Naw market" is both typed input and part of "Where? (e.g. …)").
#   - Text that is not app copy at all. The dev launcher's own "Continue" button
#     got matched against the unrelated locale string "Continue with Google".
typed = set()
for fp in glob.glob('maestro/**/*.yaml', recursive=True):
    for line in open(fp):
        m = re.match(r'^\s*-?\s*inputText:\s*"([^"]+)"\s*$', line)
        if m: typed.add(m.group(1))

NOT_APP_COPY = {'Continue', 'Close', 'Dismiss', 'Minimize', 'Allow', 'Deny'}

substr = {}
for s_, sites in list(unknown.items()):
    if len(s_) < 8: continue
    if s_ in typed or s_ in NOT_APP_COPY: continue
    hits = [v for v in val2keys if s_ != v and s_ in v]
    if hits:
        substr[s_] = (hits[0], sites)
        del unknown[s_]

print(f'\n=== SUBSTRING of real copy — can never match ({len(substr)}) ===')
for s_, (full, sites) in sorted(substr.items(), key=lambda kv: -len(kv[1][1])):
    print(f'{len(sites):>3} uses  "{s_}"')
    print(f'          full copy: "{full}"')
    print(f'          e.g.  {sites[0]}')

print(f'\n=== UNKNOWN: in no en locale value ({len(unknown)}) — top 25 by use ===')
for s_, sites in sorted(unknown.items(), key=lambda kv: -len(kv[1]))[:25]:
    print(f'{len(sites):>3} uses  "{s_}"   e.g. {sites[0]}')

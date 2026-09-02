#!/usr/bin/env python3
r"""Locale audit: the three locales must stay in lockstep, and every t() key must exist.

CLAUDE.md: "Every user-facing string must be translated into all 3 locales."
Two ways that breaks, both of which reach the user as visible text:

  GAP        a key present in en and missing from ps or fa. i18next falls back to
             English, so a Pashto or Dari user reads an English sentence in the
             middle of an RTL screen. No error, nothing in a log.

  MISSING    a `t("some.key")` with no entry in ANY locale. i18next renders the
             KEY ITSELF, so the screen literally shows `listing.detail.foo`.

Dynamic keys (`t(\`listing.status.${s}\`)`) cannot be resolved statically; their
prefixes are collected and a key is accepted if any locale key starts with one.
"""
import glob
import json
import os
import re
import sys
from collections import defaultdict

LOCALES = "src/i18n/locales"
SRC_DIRS = ("src", "app")


def flat(path):
    out = {}

    def walk(node, pre):
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, pre + [k])
        else:
            out[".".join(pre)] = node

    walk(json.load(open(path)), [])
    return out


def load():
    langs = defaultdict(dict)
    for fp in glob.glob(f"{LOCALES}/*/*.json"):
        lang = os.path.basename(os.path.dirname(fp))
        ns = os.path.basename(fp)[:-5]
        for k, v in flat(fp).items():
            langs[lang][f"{ns}.{k}"] = v
    return langs


def source_text():
    buf = []
    for root in SRC_DIRS:
        for ext in ("ts", "tsx"):
            for fp in glob.glob(f"{root}/**/*.{ext}", recursive=True):
                if "__tests__" in fp or ".stories." in fp:
                    continue
                buf.append(open(fp, encoding="utf-8", errors="ignore").read())
    return "\n".join(buf)


def main():
    langs = load()
    en, ps, fa = langs.get("en", {}), langs.get("ps", {}), langs.get("fa", {})
    findings = 0

    print(f"locales: en={len(en)} ps={len(ps)} fa={len(fa)}")

    for name, other in (("ps", ps), ("fa", fa)):
        gap = sorted(set(en) - set(other))
        orphan = sorted(set(other) - set(en))
        if gap:
            findings += 1
            print(f"\n  {len(gap)} key(s) in en but MISSING from {name} "
                  f"(falls back to English mid-screen):")
            for k in gap[:30]:
                print(f"    {k}")
        if orphan:
            findings += 1
            print(f"\n  {len(orphan)} key(s) in {name} with no en counterpart "
                  f"(dead, or en is the one missing it):")
            for k in orphan[:30]:
                print(f"    {k}")

    # Strings left identical to English. Brand names and pure-interpolation
    # templates are legitimately identical, so only flag real sentences.
    #
    # The class below therefore has to include LANGUAGE-NEUTRAL SYMBOLS. It did
    # not, so `chat.offer.quantityTotal` — '{{units}} × {{unitPrice}} = {{total}}',
    # which has no words in it to translate — was reported for both ps and fa on
    # every run. Those were the audit's only two findings, so a clean i18n state
    # read as two defects and the next real one would have had to compete with
    # them.
    #
    # Known limitation, left as it is rather than quietly widened: `\w` matches
    # letters, so a genuinely untranslated SENTENCE ("Save changes" left in
    # English) already slips through this check. What it really catches is
    # strings carrying unusual punctuation. Worth redesigning deliberately; not
    # worth pretending otherwise in passing.
    for name, other in (("ps", ps), ("fa", fa)):
        same = [
            k for k in set(en) & set(other)
            if isinstance(en[k], str) and en[k] == other[k]
            and len(en[k]) > 3
            and not re.fullmatch(r"[\s{}\w.\-—|/×=+%:,()#&*]*", en[k].replace("{{", "").replace("}}", ""))
        ]
        if same:
            findings += 1
            print(f"\n  {len(same)} string(s) identical to English in {name}:")
            for k in sorted(same)[:20]:
                print(f"    {k} = {en[k]!r}")

    # Every literal t("…") key must resolve.
    src = source_text()
    literal = set(re.findall(r"""\bt\(\s*["']([A-Za-z][\w.]*)["']""", src))
    dynamic_prefixes = set(re.findall(r"""\bt\(\s*`([A-Za-z][\w.]*)\$\{""", src))
    known = set(en) | set(ps) | set(fa)
    unresolved = sorted(
        k for k in literal
        if k not in known
        # plural / context suffixes live in the JSON as key_one / key_other
        and not any(f"{k}_{sfx}" in known for sfx in ("one", "other", "zero", "two", "few", "many"))
        and not any(k.startswith(p) for p in dynamic_prefixes)
    )
    print(f"\n  t() literal keys used: {len(literal)}; dynamic prefixes: {len(dynamic_prefixes)}")
    if unresolved:
        findings += 1
        print(f"  {len(unresolved)} t() key(s) with NO entry in any locale "
              f"(the screen shows the key itself):")
        for k in unresolved:
            print(f"    {k}")
    else:
        print("  every t() key resolves")

    print(f"\naudit_i18n: {findings} finding(s)")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())

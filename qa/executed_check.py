#!/usr/bin/env python3
"""Did this verdict describe the flow file that is on disk NOW?

`flow_sha` in results.jsonl cannot answer that. emit_result.py hashes the .yaml when
it WRITES the record — after the flow ran — so a flow edited while the run was in
flight gets a record whose sha describes the new file and whose verdict describes the
old one. Its docstring claims "the SHA-1 of the .yaml AS EXECUTED"; the code does not
do that. It cost a triage: listings/edit_listing_discard was recorded FAIL on
"lifecycle-more-action" with a sha matching a file whose only mention of that selector
is a comment explaining why it was removed.

The run's own `commands.json` IS authoritative — it is maestro's parsed command list
with helpers inlined, written at launch. So compare the selectors it actually ran
against the selectors the current file (plus the helpers it pulls in) can produce.

  ./qa/executed_check.py edit_listing_discard [more flows...]

EXECUTED-OLD means: do not triage this log, the flow has already moved on.

Scope, so this is not over-trusted: it detects RETARGETING — a testID the run really
used that the current file can no longer produce. It does NOT notice an edit that only
adds a wait or a scroll, so "selectors still live" means the verdict is worth reading,
not that the file is byte-identical to what ran.

It also cannot see a TEXT retarget, which is a common one. When a verdict names a text
selector, grep the flow for that string before triaging — if it survives only inside a
comment explaining its removal, the verdict is stale. That is how three of these were
caught by hand:

    grep -n 'Kabul' maestro/listings/create_listing_all_fields.yaml
    #  85:# and then tapped "Kabul", which is not a label anywhere in the picker
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# maestro writes selectors as idRegex / textRegex, NOT id / text. Reading the wrong
# key names made this report "matches current file" for a flow it had just been
# proven wrong about, which is worse than no check at all.
SEL = re.compile(r'"(?:idRegex|textRegex|id|text)"\s*:\s*"([^"]{2,})"')


def current_selectors(spec: pathlib.Path, seen=None) -> set:
    """Selectors reachable from a flow file, following runFlow into helpers."""
    seen = seen if seen is not None else set()
    if not spec.is_file() or spec in seen:
        return set()
    seen.add(spec)
    body = spec.read_text()
    # strip comments so a selector named only in a comment does not count as live
    live = "\n".join(l for l in body.split("\n") if not l.strip().startswith("#"))
    out = set(re.findall(r'(?:id|text):\s*"([^"]{2,})"', live))
    out |= set(re.findall(r'- (?:tapOn|assertVisible|assertNotVisible):\s*"([^"]{2,})"', live))
    # BOTH invocation forms. `- runFlow: path.yaml` and the block form, which puts the
    # path under `file:` (often beside a `when:`). Matching only the inline form made
    # this under-count what the current flow can produce, so every flow that pulls its
    # login in via the block form reported EXECUTED-OLD on helper internals it still
    # uses — user_profile_empty_listings "dropped" browse-tab, which is absurd on its
    # face and is the tell that the resolver, not the flow, is wrong.
    for rel in (re.findall(r'runFlow:\s*([^\s#]+\.yaml)', live)
                + re.findall(r'file:\s*([^\s#]+\.yaml)', live)):
        out |= current_selectors((spec.parent / rel).resolve(), seen)
    return out


def executed_selectors(flow: str):
    """Newest commands.json for this flow, and the selectors it ran."""
    cands = sorted(ROOT.glob(f"qa/reports/run-*/*/debug-{flow}/**/commands.json"),
                   key=lambda p: p.stat().st_mtime)
    if not cands:
        return None, set()
    raw = cands[-1].read_text()
    return cands[-1], set(SEL.findall(raw))


def main(flows):
    for flow in flows:
        spec = next(iter(ROOT.glob(f"maestro/*/{flow}.yaml")), None)
        if spec is None:
            print(f"  {flow:34} NO FILE")
            continue
        cj, ran = executed_selectors(flow)
        if cj is None:
            print(f"  {flow:34} NO EVIDENCE  (never executed under this rig)")
            continue
        now = current_selectors(spec)
        # TESTIDS ONLY, on purpose. I tried including text selectors, because three
        # stale verdicts in a row were missed by ids alone (create_listing_all_fields
        # retargeted off `tapOn: "Kabul"`, both my-listings tab flows off
        # `tapOn: "Sold"`). It made the tool useless: the executed list inlines shared
        # HELPERS, so strings like "Performance monitor" or "Allow Hatiwal to send you
        # notifications?" differ whenever a helper changes, and every flow reported
        # EXECUTED-OLD. A testID retarget is specific to the flow; text is not.
        testid = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$")
        gone = {s for s in ran if testid.match(s) and s not in now}
        run = re.search(r"run-\d+", str(cj)).group(0)
        if gone:
            print(f"  {flow:34} EXECUTED-OLD ({run})  dropped since: "
                  + ", ".join(sorted(gone)[:4]))
        else:
            print(f"  {flow:34} selectors still live ({run}) — triage it")


if __name__ == "__main__":
    main(sys.argv[1:] or ["edit_listing_discard"])

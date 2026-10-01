#!/usr/bin/env python3
"""
API contract snapshot + diff — proves an API change is additive-only for the
mobile builds already in the stores (v1.0.4 cannot be pointed at a local API:
its URL is baked into Hermes bytecode, so the old app is measured through the
contract it reads instead).

  snapshot.py snap  OUT.json [--base URL] [--email E] [--password P]
  snapshot.py diff  BEFORE.json AFTER.json

`snap` logs in as a seeded user and GETs every read endpoint v1.0.4 calls
(taken from the v1.0.4 source, commit 5282317, src/api/*.ts). GET only — it
never writes. One side effect is unavoidable: GET /listings/:id registers a
view, so view COUNTERS move between runs; the diff compares shape, not values.

`diff` passes only when, per endpoint:
  - the HTTP status is unchanged;
  - every key present before is present after, in the same relative order,
    with the same JSON type (null ↔ value is reported, not failed — a nullable
    field legitimately varies with data);
  - new keys are allowed (additive) and listed;
  - every array has the same length, and every list of records has the same
    `id` sequence (catches ordering and scope changes — e.g. a new ORDER BY
    key or a role-scope exclusion leaking into ordinary inboxes).
Exit status 0 = pass, 1 = contract break.
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_BASE = "http://localhost:3007/api/v1"
AUTH_KEYS = ("access-token", "client", "uid", "token-type", "expiry")
LIMIT = 8  # detail endpoints sampled per list, keeps a run under a minute


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.auth = {}

    def request(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        for k, v in self.auth.items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status, headers, raw = resp.status, resp.headers, resp.read()
        except urllib.error.HTTPError as e:
            status, headers, raw = e.code, e.headers, e.read()
        # DeviseTokenAuth rotates tokens; a " " placeholder means "keep yours".
        for k in AUTH_KEYS:
            v = (headers.get(k) or "").strip()
            if v:
                self.auth[k] = v
        try:
            payload = json.loads(raw) if raw else None
        except ValueError:
            payload = {"_non_json": raw[:200].decode(errors="replace")}
        return status, payload

    def get(self, path):
        return self.request("GET", path)


def records(payload, key):
    if isinstance(payload, dict) and isinstance(payload.get(key), list):
        return payload[key]
    return []


def snap(out, base, email, password):
    c = Client(base)
    status, _ = c.request("POST", "/auth/sign_in", {"email": email, "password": password})
    if status != 200:
        sys.exit(f"login failed for {email}: HTTP {status}")

    results = {}

    def grab(name, path):
        status, payload = c.get(path)
        results[name] = {"path": path, "status": status, "body": payload}
        return payload

    page = "page[number]=1&page[size]=50"
    inbox = grab("conversations", f"/conversations?{page}")
    grab("conversations.archived", f"/conversations?{page}&archived=true")
    grab("conversations.buying", f"/conversations?{page}&role=buying")
    grab("conversations.selling", f"/conversations?{page}&role=selling")
    for conv in records(inbox, "conversations")[:LIMIT]:
        cid = conv["id"]
        grab(f"conversation[{cid}]", f"/conversations/{cid}")
        grab(f"conversation[{cid}].messages", f"/conversations/{cid}/messages?page[number]=1&page[size]=30")

    feed = grab("listings", f"/listings?{page}")
    for listing in records(feed, "listings")[:LIMIT]:
        lid = listing["id"]
        grab(f"listing[{lid}]", f"/listings/{lid}")
        grab(f"listing[{lid}].similar", f"/listings/{lid}/similar")
        uid = (listing.get("user") or listing.get("seller") or {}).get("id")
        if uid:
            grab(f"user[{uid}].sold_listings", f"/users/{uid}/sold_listings?{page}")

    mine = grab("my.listings", f"/my/listings?{page}")
    grab("my.listings.status_counts", "/my/listings/status_counts")
    for listing in records(mine, "listings")[:LIMIT]:
        lid = listing["id"]
        grab(f"my.listing[{lid}]", f"/my/listings/{lid}")
    grab("my.saved_listings", f"/my/saved_listings?{page}")
    grab("my.viewed_listings", f"/my/viewed_listings?{page}")
    grab("my.hidden_listings", f"/my/hidden_listings?{page}")

    broken = [n for n, r in results.items() if r["status"] >= 500]
    if broken:
        print(f"WARNING: {len(broken)} endpoint(s) returned 5xx — this snapshot is not a valid baseline: {broken[:5]}")
    with open(out, "w") as f:
        json.dump({"base": base, "email": email, "endpoints": results}, f, indent=1, ensure_ascii=False)
    print(f"{len(results)} endpoints → {out}")


def jtype(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, (int, float)):
        return "number"
    return {str: "string", list: "array", dict: "object"}[type(v)]


def compare(before, after, where, breaks, notes):
    tb, ta = jtype(before), jtype(after)
    if tb != ta:
        if "null" in (tb, ta):
            notes.append(f"{where}: {tb} → {ta} (nullable)")
        else:
            breaks.append(f"{where}: type {tb} → {ta}")
        return
    if tb == "object":
        bkeys, akeys = list(before), list(after)
        missing = [k for k in bkeys if k not in after]
        for k in missing:
            breaks.append(f"{where}.{k}: REMOVED")
        added = [k for k in akeys if k not in before]
        if added:
            notes.append(f"{where}: added {added}")
        kept = [k for k in bkeys if k in after]
        if kept != [k for k in akeys if k in before]:
            breaks.append(f"{where}: key order changed")
        for k in kept:
            compare(before[k], after[k], f"{where}.{k}", breaks, notes)
    elif tb == "array":
        if len(before) != len(after):
            breaks.append(f"{where}: length {len(before)} → {len(after)}")
        ids_b = [x.get("id") for x in before if isinstance(x, dict)]
        ids_a = [x.get("id") for x in after if isinstance(x, dict)]
        if any(i is not None for i in ids_b) and ids_b != ids_a:
            breaks.append(f"{where}: id sequence {ids_b} → {ids_a}")
        for i, (b, a) in enumerate(zip(before, after)):
            compare(b, a, f"{where}[{i}]", breaks, notes)


def diff(before_path, after_path):
    before = json.load(open(before_path))["endpoints"]
    after = json.load(open(after_path))["endpoints"]
    breaks, notes = [], []
    for name in before:
        if name not in after:
            breaks.append(f"{name}: endpoint missing from AFTER run")
            continue
        b, a = before[name], after[name]
        if b["status"] >= 500:
            # A broken baseline compares nothing — an "after" that also 500s
            # would otherwise read as "unchanged" and pass.
            breaks.append(f"{name}: BASELINE INVALID — HTTP {b['status']} before the change")
            continue
        if b["status"] != a["status"]:
            breaks.append(f"{name}: HTTP {b['status']} → {a['status']}")
            continue
        compare(b["body"], a["body"], name, breaks, notes)
    for name in after:
        if name not in before:
            notes.append(f"{name}: new endpoint in AFTER run (sampling differs?)")

    # Additions repeat per record; collapse "conversations[3]: added ['kind']".
    seen, collapsed = set(), []
    for n in notes:
        key = "".join(ch if not ch.isdigit() else "#" for ch in n)
        if key not in seen:
            seen.add(key)
            collapsed.append(n)
    print(f"{len(before)} endpoints compared")
    for n in collapsed:
        print("  note  ", n)
    for b in breaks:
        print("  BREAK ", b)
    print("PASS — additive only" if not breaks else f"FAIL — {len(breaks)} contract break(s)")
    return 0 if not breaks else 1


def main(argv):
    if len(argv) >= 3 and argv[1] == "diff":
        sys.exit(diff(argv[2], argv[3]))
    if len(argv) >= 3 and argv[1] == "snap":
        opts = dict(zip(argv[3::2], argv[4::2]))
        snap(
            argv[2],
            opts.get("--base", DEFAULT_BASE),
            opts.get("--email", "ahmad@hatiwal.com"),
            opts.get("--password", "password123"),
        )
        return
    sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)

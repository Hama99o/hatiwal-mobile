#!/usr/bin/env python3
"""Cross-repo contract audit: mobile client ⇄ Rails API.

Two directions, both of which fail SILENTLY in production — no exception, no red
screen, just wrong or blank data. That is the exact class this QA campaign exists
to catch, and neither direction is visible to a Maestro flow unless the flow
happens to assert the one value that went missing.

  REQUEST   a query param the client sends that the controller never reads.
            Found `/my/listings` dropping the seller's own "Search my listings…"
            — the box worked, the list just ignored it.

  RESPONSE  a field the client's TypeScript declares that the serializer never
            emits. It is `undefined` for ever, so the UI renders blank. Found
            `Category.parentId`, declared by BOTH clients and asserted by a unit
            test against a hand-written mock, while the serializer never sent it
            — so `parentId === null` ("is this top-level?") was false for every
            category.

Run from hatiwal-mobile. Exits 1 on findings so `qa.sh audit` can gate on it.
"""
import collections
import pathlib
import re
import sys

MOBILE = pathlib.Path(__file__).resolve().parents[2]
API = MOBILE.parent / "hatiwal-api"

# Handled by paginate_blue / Pagy, never named in a controller.
PAGINATION = {"page[number]", "page[size]"}

# route -> controller, for the endpoints that take query params
CONTROLLERS = {
    "GET /listings": "api/v1/listings_controller.rb",
    "GET /my/listings": "api/v1/my/listings_controller.rb",
    "GET /my/saved_listings": "api/v1/my/saved_listings_controller.rb",
    "GET /my/hidden_listings": "api/v1/my/hidden_listings_controller.rb",
    "GET /my/viewed_listings": "api/v1/my/viewed_listings_controller.rb",
    "GET /my/transactions": "api/v1/my/transactions_controller.rb",
    "GET /my/reviews/pending": "api/v1/my/reviews_controller.rb",
    "GET /conversations": "api/v1/conversations_controller.rb",
    "GET /conversations/:id/messages": "api/v1/messages_controller.rb",
    "GET /reports": "api/v1/reports_controller.rb",
    "GET /users/:id/reviews": "api/v1/reviews_controller.rb",
}

# client interface -> serializer. A serializer is scanned WHOLE (every view),
# because the question is "can this field ever be emitted", not "in which view".
PAIRS = [
    ("listings.ts", "Listing", "listing_serializer.rb"),
    ("conversations.ts", "Conversation", "conversation_serializer.rb"),
    ("conversations.ts", "Message", "message_serializer.rb"),
    ("reports.ts", "Report", "report_serializer.rb"),
    ("reviews.ts", "Review", "review_serializer.rb"),
    ("auth.ts", "User", "user_serializer.rb"),
    ("users.ts", "PublicProfile", "user_serializer.rb"),
    ("transactions.ts", "Transaction", "transaction_serializer.rb"),
    ("categories.ts", "Category", "category_serializer.rb"),
    ("saved-searches.ts", "SavedSearch", "saved_search_serializer.rb"),
    ("warnings.ts", "UserWarning", "user_warning_serializer.rb"),
]

# Fields the client declares but deliberately does not receive. Each one needs a
# reason, or it is a bug being waved through.
RESPONSE_ALLOW = {
    # Write-only: set via PUT /users/me, never read back. Nothing reads
    # `user.pushToken` anywhere in the app.
    ("User", "pushToken"),
    # The API module maps the serializer's `full_name` onto `name` itself
    # (src/api/users.ts) before anything sees it.
    ("PublicProfile", "name"),
}


def camel_to_snake(name):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def sent_query_params():
    """Every `query.append("wire_name", …)` grouped by the request it precedes."""
    out = collections.defaultdict(set)
    for path in sorted((MOBILE / "src/api").glob("*.ts")):
        pending = []
        for line in path.read_text().split("\n"):
            pending += re.findall(r'query\.append\(\s*"([^"]+)"', line)
            m = re.search(r'http\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*[`"\']([^`"\']*)', line)
            if m:
                route = re.sub(r"\$\{[^}]*\}", ":id", m.group(2)).split("?")[0]
                out[f"{m.group(1).upper()} {route}"] |= set(pending)
                pending = []
    return out


def ts_top_level_fields(module, iface):
    src = (MOBILE / "src/api" / module).read_text()
    m = re.search(rf"(?:export )?interface {iface}\s*\{{", src)
    if not m:
        return None
    i, depth, body = m.end(), 1, []
    while i < len(src) and depth:
        depth += (src[i] == "{") - (src[i] == "}")
        body.append(src[i])
        i += 1
    fields, depth = [], 0
    for line in "".join(body[:-1]).split("\n"):
        if depth == 0:
            fm = re.match(r"([a-zA-Z_][A-Za-z0-9_]*)\??\s*:", line.strip())
            if fm:
                fields.append(fm.group(1))
        depth += line.count("{") - line.count("}")
    return fields


def serializer_fields(fname):
    """Blueprinter writes fields four ways; miss one and the audit cries wolf.

        fields :id, :kind, :read_at        # bare list, may wrap over lines
        field(:body) { |m| ... }           # parenthesised, block body
        field :share_url do |l| ... end    # unparenthesised, do-block
        association :seller, blueprint: …
    """
    src = (API / "app/serializers" / fname).read_text()
    # STRIP WHOLE-LINE COMMENTS FIRST. The `fields` regex below matches a RUN of
    # `:symbol` tokens, and a run cannot cross a comment — so a wrapped `fields`
    # list with an explanatory comment part-way down silently loses everything
    # after the comment.
    #
    # That is not hypothetical: user_serializer.rb's `view :me` wraps over five
    # lines with a two-line comment before its last three, and this audit
    # therefore reported `whatsappNumber`, `showPhonePublicly` and
    # `showAddressPublicly` as "declared, never emitted" while all three were
    # emitted one line below the comment. An audit that cries wolf about a
    # working feature is worse than no audit — it was the only finding in the
    # run, so the whole report read as a real defect.
    #
    # Only lines whose FIRST non-space character is `#` are removed, so a `#`
    # inside a string or an interpolation is untouched.
    src = re.sub(r"^[ \t]*#[^\n]*\n", "", src, flags=re.M)
    out = set()
    for m in re.finditer(r"\bfields\s+((?::[a-z_0-9]+\s*,?\s*\n?\s*)+)", src):
        out |= set(re.findall(r":([a-z_0-9]+)", m.group(1)))
    out |= set(re.findall(r"\bfield\s*\(?\s*:([a-z_0-9]+)", src))
    out |= set(re.findall(r"\bassociation\s*\(?\s*:([a-z_0-9]+)", src))
    return out


def main():
    if not API.exists():
        print(f"audit_contract: {API} not found — skipping")
        return 0

    findings = 0

    print("=== REQUEST: params the client sends that the controller never reads ===")
    for route, params in sorted(sent_query_params().items()):
        rel = CONTROLLERS.get(route)
        if not rel:
            continue
        f = API / "app/controllers" / rel
        if not f.exists():
            print(f"  {route}: controller {rel} not found")
            findings += 1
            continue
        src = f.read_text()
        unread = [p for p in sorted(params) if p not in PAGINATION and p not in src]
        if unread:
            print(f"  {route}  ->  {rel}")
            print(f"      never read: {unread}")
            findings += 1
    print("  (nothing above = every param is read)")

    print("\n=== RESPONSE: fields the client declares that no view emits ===")
    for module, iface, ser in PAIRS:
        fields = ts_top_level_fields(module, iface)
        if fields is None:
            print(f"  {iface}: interface not found in {module}")
            findings += 1
            continue
        emitted = serializer_fields(ser)
        missing = [
            f for f in fields
            if camel_to_snake(f) not in emitted
            and f not in emitted
            and (iface, f) not in RESPONSE_ALLOW
        ]
        if missing:
            print(f"  {iface} ({module} -> {ser})")
            for f in missing:
                print(f"      declared, never emitted: {f} -> {camel_to_snake(f)}")
            findings += 1
    print("  (nothing above = every declared field is emitted)")

    print(f"\naudit_contract: {findings} finding(s)")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())

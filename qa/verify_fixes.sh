#!/usr/bin/env bash
# Confirm the flow fixes that have no device run yet — in one command.
#
#   ./qa/verify_fixes.sh              # run the whole batch
#   ./qa/verify_fixes.sh --list       # just show what would run, and the shas
#
# WHY THIS EXISTS. Six flows that had never passed once were fixed on 2026-09-15
# while the only emulator was locked by a feature pass, so every fix sits
# unverified. Re-deriving "which flows, at which sha, and in what order" later is
# an afternoon's work and is exactly the sort of thing that gets half-remembered.
# This is that list, runnable.
#
# Each entry pins the sha the fix was committed at. If the file on disk no longer
# hashes to it the batch SKIPS that flow and says so, because a run against a
# different file is not evidence about this fix — the same rule the register
# applies to every verdict.
#
# A sha of "-" means the sha CANNOT pin this one. flow_sha hashes the flow file
# only, so a fix made in a HELPER leaves every caller's sha unchanged: a run from
# before the helper change and a run from after are indistinguishable by sha. The
# last four entries are exactly that — one `pressKey: Enter` added to
# search_my_shop.yaml. For those, judge by the RUN DATE against the helper's commit
# (git log -1 -- maestro/_helpers/search_my_shop.yaml), or read commands.json in
# the debug dir, which inlines helpers and is the only authoritative record of what
# actually executed.
#
# Uses patient_flow.sh, never bare `qa.sh flow`: a chain loses one flow to every
# transient RAM dip and comes back exit 3 having never run.
set -u
cd "$(cd "$(dirname "$0")" && pwd)/.." || exit 1

# flow<TAB>sha-at-fix<TAB>what it was before
FLOWS=$(cat <<'EOF'
chat/conversations_role_filter	16c1abf4ce3f	0/27 — scrolled DOWN past the bike, then DOWN again
profile/theme_switch	a42570b1c3ad	0/5 — scrolled the Bazaar feed for a Profile testID
profile/view_profile	1d643b3d484b	0/5 — asserted the top after scrolling to the bottom
browse/seller_response_rate_badge	f67ff204863b	0/5 — unwrapped regex, whole-node match
listings/edit_listing_all_fields	-	0/16 — scroll fix 07bf502, still unproven
profile/account_delete_and_restore	-	0/21 — register-scroll fix b3f5a93, still unproven
listings/create_listing_publish_blocked	cf6438eeef6a	lost the tab bar after the success sheet
listings/create_listing_quantity_edges	6a5e082bcc1c	asserted the error from the top, keyboard up
listings/draft_lifecycle	7279a69379dc	watched for the sheet; publish fires a toast
chat/unread_badge_survives_navigation	bf3303bc2371	tapped the modal to open the modal
chat/offer_in_existing_thread	4a427e87ef61	asserted Send Offer under the autofocus keyboard
seller/sales_screen_reviewed_sale_refusal	-	search_my_shop left the IME over the card actions
listings/edit_listing_remove_photo	-	same helper fix
listings/edit_listing_reorder_photos	-	same helper fix
saved/saved_listing_goes_sold	-	same helper fix
EOF
)

sha_of() { python3 -c "
import hashlib,pathlib,sys
print(hashlib.sha1(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest()[:12])" "maestro/$1.yaml"; }

if [ "${1:-}" = "--list" ]; then
  printf '%-42s %-14s %-14s %s\n' FLOW EXPECTED ON-DISK WAS
  while IFS=$'\t' read -r f want was; do
    [ -z "$f" ] && continue
    got=$(sha_of "$f" 2>/dev/null || echo MISSING)
    printf '%-42s %-14s %-14s %s\n' "$f" "$want" "$got" "$was"
  done <<< "$FLOWS"
  exit 0
fi

pass=0; fail=0; skip=0; unmeasured=0
while IFS=$'\t' read -r f want was; do
  [ -z "$f" ] && continue
  got=$(sha_of "$f" 2>/dev/null || echo MISSING)
  if [ "$want" != "-" ] && [ "$want" != "$got" ]; then
    echo "SKIP  $f — disk sha $got, fix was at $want (file changed; run would not be evidence)"
    skip=$((skip+1)); continue
  fi
  echo "RUN   $f  (sha $got)  was: $was"
  ./qa/patient_flow.sh "$f"
  rc=$?
  case $rc in
    0) echo "PASS  $f"; pass=$((pass+1)) ;;
    1) echo "FAIL  $f — a real verdict, triage it"; fail=$((fail+1)) ;;
    *) echo "UNMEASURED $f (exit $rc) — never ran, NOT a verdict"; unmeasured=$((unmeasured+1)) ;;
  esac
done <<< "$FLOWS"

echo
echo "batch done: $pass pass, $fail fail, $skip skipped, $unmeasured unmeasured"
echo "record every verdict in qa/FLOW_REGISTER.md — unmeasured is not a result"
[ "$fail" -eq 0 ] && [ "$unmeasured" -eq 0 ]

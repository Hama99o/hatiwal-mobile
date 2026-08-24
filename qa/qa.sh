#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Hatiwal mobile QA — one entrypoint for deep, per-feature testing.
#
#   ./qa/qa.sh doctor            is the rig able to test the app right now?
#   ./qa/qa.sh build             build the debug APK (run this ALONE)
#   ./qa/qa.sh up [phone|tablet] boot the emulator + install the app
#   ./qa/qa.sh seed              reset backend e2e data
#   ./qa/qa.sh list              show the feature manifest
#   ./qa/qa.sh smoke             every feature's smoke flows (~20 flows)
#   ./qa/qa.sh feature <name>    DEEP pass on one feature (flows + jest)
#   ./qa/qa.sh flow <area>/<name> ONE flow — the fix→retest loop
#   ./qa/qa.sh all               every flow of every feature (214)
#   ./qa/qa.sh jest <name>       just the unit layer for one feature
#   ./qa/qa.sh net [--write]     sync .env to the network you are on now
#                                (real-device testing only — emulator uses 10.0.2.2)
#   ./qa/qa.sh register          refresh qa/FLOW_REGISTER.md (the QA board)
#   ./qa/qa.sh triage            re-print the last run's report
#   ./qa/qa.sh down              stop the emulator
# ─────────────────────────────────────────────────────────────────────────
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/lib/common.sh"
source "$HERE/lib/emulator.sh"
source "$HERE/lib/app.sh"
source "$HERE/lib/seed.sh"
source "$HERE/lib/flows.sh"

MANIFEST="$HERE/features.yaml"

feature_flows() {  # <feature> <smoke|all>
  python3 - "$MANIFEST" "$MOBILE_DIR" "$1" "$2" <<'PY'
import yaml,sys,glob,os
mf,root,feat,tier = sys.argv[1:5]
m = yaml.safe_load(open(mf))['features']
if feat not in m: sys.exit(f"unknown feature '{feat}'")
d = os.path.join(root,'maestro',m[feat]['flows'])
if tier == 'smoke':
    print("\n".join(os.path.join(d,f+'.yaml') for f in m[feat].get('smoke',[])))
else:
    print("\n".join(sorted(glob.glob(d+'/*.yaml'))))
PY
}

new_run() {
  # DIRECTORIES named run-<digits>, and nothing else. `max()` over everything in
  # reports/ that merely STARTS WITH "run-" picked up a log file: with
  # reports/run-report-fix.log present, "run-report-fix.log" sorts above
  # "run-171", `[4:]` yielded "report-fix.log", the `10#` arithmetic failed, and
  # the run wrote to a directory literally named "run-" — which the next run then
  # collided with. Costly to notice, because results still landed somewhere.
  RUN_ID="$(cd "$HERE" && python3 -c "
import os, re
ns = [int(m.group(1)) for d in os.listdir('reports')
      if os.path.isdir(os.path.join('reports', d))
      for m in [re.fullmatch(r'run-(\d+)', d)] if m]
print(max(ns) if ns else 0)" 2>/dev/null)"
  RUN_ID="run-$(printf '%03d' $((10#${RUN_ID:-0} + 1)))"
  RUN_DIR="$REPORTS_DIR/$RUN_ID"; mkdir -p "$RUN_DIR"; echo "$RUN_DIR"
}

# ── One emulator, one driver ────────────────────────────────────────────
# Several agents share this checkout, and two Maestro instances driving the same
# emulator tear down each other's on-device driver. The signature is a flow that
# "fails" in ~0s having run nothing — which reads as an app failure and has
# already produced whole runs of meaningless red. Serialize device access.
DEVICE_LOCK="$REPORTS_DIR/.device.lock"

hold_device_lock() {
  exec 9>"$DEVICE_LOCK"
  if ! flock -n 9; then
    err "another QA run is driving the emulator right now"
    say "two Maestro instances on one device kill each other's driver."
    say "waiting for it to finish (Ctrl-C to give up)…"
    flock 9 || die "could not acquire the device lock"
  fi
  # Record who holds it, so a stale lock is diagnosable.
  echo "pid=$$ cmd=${QA_CMD:-?} started=$(cat /proc/uptime | cut -d' ' -f1)" >&9
}

require_rig() {
  bash "$HERE/lib/doctor.sh" > "$REPORTS_DIR/last-doctor.log" 2>&1 && return 0
  err "preflight failed — flow results would be meaningless"
  say "full output: qa/reports/last-doctor.log"
  grep -E "FAIL|WARN" "$REPORTS_DIR/last-doctor.log" | head -12 | sed 's/^/    /'
  return 1
}

cmd="${1:-doctor}"; shift 2>/dev/null || true

case "$cmd" in
  doctor)  bash "$HERE/lib/doctor.sh" ;;

  build)   app_build ;;

  up)      QA_CMD=up hold_device_lock
           # No argument => this SESSION's device (QA_AVD_n from qa.config.sh),
           # not a hardcoded phone. `up` used to default to the phone for every
           # session, so `QA_SESSION=1 up` silently booted qa_phone even with
           # QA_AVD_1=qa_tablet set, and session 2 then collided on the same AVD.
           # An explicit `up phone` / `up tablet` still wins.
           case "${1:-}" in
             tablet) avd="$AVD_TABLET" ;;
             phone)  avd="$AVD_PHONE" ;;
             "")     avd="$QA_AVD" ;;
             *)      avd="$1" ;;
           esac
           emulator_boot "$avd" && app_install ;;

  down)    emulator_stop ;;

  seed)    seed_reset ;;

  list)    python3 - "$MANIFEST" "$MOBILE_DIR" <<'PY'
import yaml,sys,glob,os
mf,root = sys.argv[1:3]
m = yaml.safe_load(open(mf))['features']
print(f"{'FEATURE':13} {'FLOWS':>5} {'SMOKE':>5}  TITLE")
tot=0
for k,v in m.items():
    n=len(glob.glob(os.path.join(root,'maestro',v['flows'],'*.yaml'))); tot+=n
    print(f"{k:13} {n:5} {len(v.get('smoke',[])):5}  {v['title'][:64]}")
print(f"\n{len(m)} features, {tot} flows total")
PY
           ;;

  jest)    feat="${1:?feature name required}"
           pats=$(python3 -c "
import yaml;m=yaml.safe_load(open('$MANIFEST'))['features']
print(' '.join(m['$feat'].get('jest',[])))")
           [ -z "$pats" ] && { warn "$feat has no jest layer mapped"; exit 0; }
           say "jest: $pats"
           npx jest --watchAll=false $pats ;;

  smoke)   QA_CMD=smoke hold_device_lock
           require_rig || exit 1
           RUN_DIR="$(new_run)"; step "SMOKE — every feature's fastest flows"
           for f in $(python3 -c "
import yaml;print(' '.join(yaml.safe_load(open('$MANIFEST'))['features']))"); do
             mapfile -t flows < <(feature_flows "$f" smoke | grep -v '^$')
             [ ${#flows[@]} -eq 0 ] && continue
             run_feature "$f" "$RUN_DIR" "${flows[@]}"
           done
           step "report"; python3 "$HERE/lib/report.py" "$RUN_DIR"
           step "flow register"; python3 "$HERE/lib/register.py" "$REPORTS_DIR" ;;

  feature) feat="${1:?feature name required}"
           QA_CMD=feature hold_device_lock
           require_rig || exit 1
           RUN_DIR="$(new_run)"
           step "DEEP QA — $feat"
           mapfile -t flows < <(feature_flows "$feat" all | grep -v '^$')
           say "${#flows[@]} flows"
           run_feature "$feat" "$RUN_DIR" "${flows[@]}"
           step "unit layer"
           bash "$0" jest "$feat" 2>&1 | tail -12
           step "report"; python3 "$HERE/lib/report.py" "$RUN_DIR"
           step "flow register"; python3 "$HERE/lib/register.py" "$REPORTS_DIR" ;;

  all)     QA_CMD=all hold_device_lock
           require_rig || exit 1
           RUN_DIR="$(new_run)"; step "FULL SUITE — all features, all flows"
           for f in $(python3 -c "
import yaml;print(' '.join(yaml.safe_load(open('$MANIFEST'))['features']))"); do
             mapfile -t flows < <(feature_flows "$f" all | grep -v '^$')
             [ ${#flows[@]} -eq 0 ] && continue
             printf '\n'; say "$f (${#flows[@]} flows)"
             run_feature "$f" "$RUN_DIR" "${flows[@]}"
           done
           step "report"; python3 "$HERE/lib/report.py" "$RUN_DIR"
           step "flow register"; python3 "$HERE/lib/register.py" "$REPORTS_DIR" ;;

  flow)    spec="${1:?flow required, e.g. chat/send_message}"
           QA_CMD=flow hold_device_lock
           f="$MOBILE_DIR/maestro/${spec%.yaml}.yaml"
           [ -f "$f" ] || die "no such flow: $f"
           require_rig || exit 1
           RUN_DIR="$(new_run)"
           step "SINGLE FLOW — $spec"
           run_feature "$(dirname "$spec")" "$RUN_DIR" "$f"
           python3 "$HERE/lib/report.py" "$RUN_DIR"
           python3 "$HERE/lib/register.py" "$REPORTS_DIR" ;;

  profile) # Simulate a different form factor on THIS session's device.
           #
           # Real AVDs are better (real DPI, real system UI) but you only have as
           # many as you create. These overrides give extra form factors for free
           # and are exactly what `wm size`/`wm density` exist for — enough to
           # catch the class of bug we already found twice: a layout that only
           # ever ran at one width (the grid was hardcoded to 2 columns; chat
           # bubbles were capped only as a percentage).
           #
           # `reset` restores the device's own values. ALWAYS reset when done —
           # an override persists across reboots and would silently skew every
           # later run on that device.
           resolve_device || die "no emulator for session $QA_SESSION — run: QA_SESSION=$QA_SESSION $0 up"
           case "${1:-}" in
             small)  adb_qa shell wm size 720x1280  >/dev/null; adb_qa shell wm density 320 >/dev/null
                     ok "session $QA_SESSION ($QA_SERIAL) → small phone 720x1280 @320dpi (360dp wide)" ;;
             phone)  adb_qa shell wm size 1080x2400 >/dev/null; adb_qa shell wm density 420 >/dev/null
                     ok "session $QA_SESSION ($QA_SERIAL) → phone 1080x2400 @420dpi (411dp wide)" ;;
             large)  adb_qa shell wm size 1284x2778 >/dev/null; adb_qa shell wm density 458 >/dev/null
                     ok "session $QA_SESSION ($QA_SERIAL) → large phone 1284x2778 @458dpi (448dp wide)" ;;
             tablet) adb_qa shell wm size 2560x1600 >/dev/null; adb_qa shell wm density 320 >/dev/null
                     ok "session $QA_SESSION ($QA_SERIAL) → tablet 2560x1600 @320dpi (1280dp wide)" ;;
             reset)  adb_qa shell wm size reset >/dev/null; adb_qa shell wm density reset >/dev/null
                     ok "session $QA_SESSION ($QA_SERIAL) → restored to the AVD's own size/density" ;;
             *)      die "usage: [QA_SESSION=n] $0 profile small|phone|large|tablet|reset" ;;
           esac
           say "dp width is what drives layout — re-run flows after changing it" ;;

  # ── Work claiming: N sessions, no feature tested twice ──────────────────
  #
  # `claim` prints the next UNCLAIMED feature and records it atomically, so any
  # number of sessions can run
  #
  #     while f=$(./qa/qa.sh claim); do ./qa/qa.sh feature "$f"; done
  #
  # and between them cover every feature exactly once. Without this, parallel
  # sessions duplicate work — two emulators spending two hours on the same 42
  # chat flows is half the fleet wasted, and it is not obvious from the logs that
  # it happened.
  #
  # The lock is what makes it safe: two sessions calling `claim` in the same
  # instant must not both get `browse`. flock serialises the read-modify-write.
  # Exits 1 with no output when the board is empty, which ends the caller's loop.
  claim)
           mkdir -p "$REPORTS_DIR"
           claims="$QA_DIR/reports/.claims"          # shared across sessions
           exec 8>"$QA_DIR/reports/.claims.lock"
           flock 8
           got=""
           for f in $(python3 -c "
import yaml
print(' '.join(sorted(yaml.safe_load(open('$MANIFEST'))['features'])))
"); do
             grep -qx "$f" "$claims" 2>/dev/null && continue
             echo "$f" >> "$claims"; got="$f"; break
           done
           flock -u 8
           [ -n "$got" ] || exit 1
           printf '%s\n' "$got" ;;

  # Start a new cycle: forget every claim so the fleet can sweep again.
  claim-reset)
           rm -f "$QA_DIR/reports/.claims"
           ok "claims cleared — the next `claim` starts a fresh sweep" ;;

  # What has been claimed so far, and by whom is implicit in the run reports.
  claims)  cat "$QA_DIR/reports/.claims" 2>/dev/null | tr '\n' ' '; echo ;;

  # Move THIS session's device. `qa.sh geo` with no argument returns it to the
  # configured default (Kabul).
  #
  # Needed because "the device is somewhere else" is a real test case, not a
  # curiosity: a seller travelling, or anyone whose GPS puts them outside
  # Afghanistan, must NOT be blocked from setting a location. The place search is
  # deliberately scoped to Afghanistan (countrycodes=af), so it is easy to assume
  # the whole feature is — it is not, and this command is how that stays proven.
  #
  #   ./qa/qa.sh geo 48.8566 2.3522    # Paris
  #   ./qa/qa.sh geo                   # back to Kabul
  geo)     resolve_device || die "no emulator for session $QA_SESSION"
           lat="${1:-$QA_GEO_LAT}"; lon="${2:-$QA_GEO_LON}"
           adb_qa emu geo fix "$lon" "$lat" >/dev/null 2>&1 \
             && ok "session $QA_SESSION device is now at $lat, $lon" \
             || die "could not set the device location" ;;

  # Grant or revoke a runtime permission for the app under test.
  #
  # NEEDED because `launchApp: clearState: true` does NOT reset runtime
  # permissions — verified with `dumpsys package`: after several clearState flows,
  # ACCESS_FINE_LOCATION was still granted=true. So a flow that means to see the
  # permission dialog cannot rely on clearState to produce it, and a flow that
  # means to skip the dialog cannot rely on it either. Set the state explicitly:
  #
  #   ./qa/qa.sh perm reset             # never-asked: a flow WILL see the prompt
  #   ./qa/qa.sh perm grant location    # already granted: it will NOT prompt
  #   ./qa/qa.sh perm revoke location   # denied AND user-fixed: it will not prompt either
  #
  # USE `reset` FOR PROMPT TESTS, NOT `revoke`. `pm revoke` marks the permission
  # user-fixed — "don't ask again" — so Android never shows the dialog and
  # requestForegroundPermissionsAsync returns denied immediately. Two flows failed
  # waiting 30s for a dialog that was never going to appear.
  # `pm reset-permissions` restores the never-asked state (granted=false with NO
  # USER_FIXED flag), which is the only state in which the OS actually asks. It is
  # device-wide rather than per-app, which is fine here — the emulator runs one app.
  perm)    resolve_device || die "no emulator for session $QA_SESSION"
           action="${1:?usage: perm <grant|revoke|reset> [location|camera|storage]}"
           if [ "$action" = "reset" ]; then
             adb_qa shell pm reset-permissions >/dev/null 2>&1 \
               && ok "runtime permissions reset to never-asked on session $QA_SESSION" \
               || die "could not reset permissions"
             exit 0
           fi
           group="${2:-location}"
           case "$group" in
             location) perms=(android.permission.ACCESS_FINE_LOCATION android.permission.ACCESS_COARSE_LOCATION) ;;
             camera)   perms=(android.permission.CAMERA) ;;
             storage)  perms=(android.permission.READ_EXTERNAL_STORAGE android.permission.READ_MEDIA_IMAGES) ;;
             *)        die "unknown permission group '$group' (location|camera|storage)" ;;
           esac
           case "$action" in grant|revoke) ;; *) die "action must be grant or revoke" ;; esac
           for p in "${perms[@]}"; do
             adb_qa shell pm "$action" "$APP_ID" "$p" >/dev/null 2>&1
           done
           ok "$action ${group} for $APP_ID on session $QA_SESSION" ;;

  net)     python3 "$HERE/lib/net.py" "$@" ;;

  register)
           python3 "$HERE/lib/register.py" "$REPORTS_DIR" ;;

  # Static audits — no device, no emulator, seconds to run. They catch the class
  # of failure that is IMPOSSIBLE BY CONSTRUCTION rather than caused by a
  # regression: an assertion on copy the app never renders, or a testID that
  # exists nowhere. Both read exactly like app bugs in a flow log, and between
  # them they accounted for 37 assertions that could never have passed.
  #
  # Worth running before any long sweep, and after any copy or testID rename.
  # audit_structure is the third: a flow can PARSE fine and still be nonsense —
  # a `tapOn: {index: 0}` with no selector, or a `visible:` whose selector got
  # orphaned one indent level up by a bulk edit. Both are invisible to a YAML
  # parse check, and both fail on the step AFTER them, so they read as app bugs.
  audit)   echo; python3 "$HERE/lib/audit_labels.py"
           echo; python3 "$HERE/lib/audit_testids.py"
           echo; python3 "$HERE/lib/audit_structure.py" "$HERE/../maestro"
           # The fourth reaches across repos: a param the client sends that the
           # controller never reads, or a field the client's TS declares that no
           # serializer view emits. Both are silent in production — wrong or
           # blank data, no error — and invisible to a flow unless it happens to
           # assert the one value that went missing.
           echo; python3 "$HERE/lib/audit_contract.py"
           # And the fifth guards the 3-locale rule: a key missing from ps or fa
           # falls back to ENGLISH mid-RTL-screen, and a t() key that exists
           # nowhere renders the key itself. Both are visible to the user and
           # invisible to every log.
           echo; python3 "$HERE/lib/audit_i18n.py" ;;

  # Drop old run artifacts. They grow without bound — a debug dir, screenshots,
  # a hierarchy dump and a logcat per flow — and hit 9.6GB across 185 runs here
  # while the disk was 99% full. A full disk kills the emulator mid-flow and
  # reads like an app failure.
  #
  # Keeps the newest N per session (default 20), which is far more than triage
  # needs. Two things to do FIRST, both learned the hard way:
  #
  #   1. Screenshots that DOCUMENT a finding belong in qa/evidence/ — copy them
  #      there before pruning, because UI_FINDINGS.md cites them by path.
  #   2. `qa.sh register` and commit it. Each run dir holds its own
  #      results.jsonl, and the register is REGENERATED from those, so pruning
  #      drops verdict history for every flow whose last run is removed. The
  #      committed FLOW_REGISTER.md is then the only record that those flows ever
  #      ran. (Observed: the tracked-flow count fell from 209 to 127 after a
  #      prune, which looks like a coverage collapse and is not one.)
  prune)   keep="${1:-20}"
           # ARCHIVE FIRST, always. Each run dir holds its own results.jsonl and
           # the register is REGENERATED from those, so deleting run dirs deletes
           # verdict history — a previous prune took the tracked-flow count from
           # 209 to 127 and the campaign lost its record of what had already been
           # triaged. This also copies the screenshots the register cites, whose
           # links rot at the same moment. Idempotent, so it is safe to re-run.
           #
           # It globs reports/sN/run-* as well as reports/run-*: an ad-hoc archive
           # that scanned only the top level missed 200 verdicts belonging to the
           # other sessions.
           python3 "$HERE/lib/archive_results.py" || die "archive failed — refusing to prune"
           before=$(du -sm "$REPORTS_DIR/.." 2>/dev/null | cut -f1)
           for base in "$QA_DIR/reports" "$QA_DIR/reports/s2" "$QA_DIR/reports/s3" \
                       "$QA_DIR/reports/s4" "$QA_DIR/reports/s5"; do
             [ -d "$base" ] || continue
             ls -dt "$base"/run-* 2>/dev/null | tail -n +$((keep + 1)) | xargs -r rm -rf
           done
           after=$(du -sm "$QA_DIR/reports" 2>/dev/null | cut -f1)
           ok "reports pruned to newest $keep per session (${before}MB -> ${after}MB)"
           say "disk now: $(df -h / | tail -1 | tr -s ' ' | cut -d' ' -f4) free" ;;

  # How much of the suite is actually tested, read from qa/history.jsonl rather
  # than the surviving run dirs — so pruning cannot move the number. Reports
  # written / executed / passing separately, and says outright how many verdicts
  # are too old to trust.
  coverage) python3 "$HERE/lib/coverage.py" ;;

  triage)  last="$(ls -d "$REPORTS_DIR"/run-* 2>/dev/null | tail -1)"
           [ -n "$last" ] || die "no runs yet"
           python3 "$HERE/lib/report.py" "$last" ;;

  *)       sed -n '3,20p' "$0" | sed 's/^# \?//' ;;
esac

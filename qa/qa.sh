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
  RUN_ID="$(cd "$HERE" && python3 -c "import os;print(max([d for d in os.listdir('reports') if d.startswith('run-')]+['run-000'])[4:])" 2>/dev/null)"
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

  net)     python3 "$HERE/lib/net.py" "$@" ;;

  register)
           python3 "$HERE/lib/register.py" "$REPORTS_DIR" ;;

  triage)  last="$(ls -d "$REPORTS_DIR"/run-* 2>/dev/null | tail -1)"
           [ -n "$last" ] || die "no runs yet"
           python3 "$HERE/lib/report.py" "$last" ;;

  *)       sed -n '3,20p' "$0" | sed 's/^# \?//' ;;
esac

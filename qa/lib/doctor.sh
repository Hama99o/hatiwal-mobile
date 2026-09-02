#!/usr/bin/env bash
# Preflight — is the rig actually able to test the app right now?
# Every check below has already caused a false "the feature is broken" once.
# Blocks (exit 1) on anything that would make flow results meaningless.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

FAILED=0
BLOCK() { err "$*"; FAILED=$((FAILED+1)); }

step "1/8 tooling"
for tool in "$ADB:adb" "$EMULATOR_BIN:emulator" "$MAESTRO:maestro"; do
  bin="${tool%%:*}"; name="${tool##*:}"
  [ -x "$bin" ] && ok "$name" || BLOCK "$name not found at $bin"
done
java -version >/dev/null 2>&1 && ok "java $(java -version 2>&1 | head -1 | grep -oP '"\K[0-9]+')" || BLOCK "java missing (Maestro needs 17+)"
if [ -x "$QA_NODE_DIR/node" ]; then ok "node $("$QA_NODE_DIR/node" -v) for Metro"
else warn "node 20 not at $QA_NODE_DIR — Metro on node 18 crashes on toReversed"; fi

step "2/8 host capacity"
# THE lesson from the first run: a saturated host makes the emulator freeze
# ("Emulator is not responding") and every flow then fails for no app reason.
CORES=$(nproc)
LOAD=$(awk '{printf "%.0f", $1}' /proc/loadavg)
if [ "$LOAD" -gt "$CORES" ]; then
  # WARN, not BLOCK: load is only a proxy. Step 3 measures the consequence we
  # actually care about (does the emulator still answer?) and blocks on that.
  # Renicing a runaway process to 19 can keep the rig usable at high load.
  warn "load $LOAD > $CORES cores — flows will be slow; renice or kill the hogs"
  say  "top CPU consumers:"
  ps -eo pcpu,pid,args --sort=-pcpu | sed -n '2,6p' | sed 's/^/      /' | cut -c1-110
  say  "kill runaway processes, or run: qa.sh build   (build alone, THEN boot)"
elif [ "$LOAD" -gt $((CORES / 2)) ]; then
  warn "load $LOAD of $CORES cores — expect slow, flaky flows"
else ok "load $LOAD of $CORES cores"; fi
SWAP_USED=$(free | awk '/Swap:/{if($2>0) printf "%.0f", $3/$2*100; else print 0}')
[ "${SWAP_USED:-0}" -gt 90 ] && warn "swap ${SWAP_USED}% full — the emulator will thrash" || ok "swap ${SWAP_USED:-0}%"
MEM_AVAIL=$(free -g | awk '/Mem:/{print $7}')
[ "$MEM_AVAIL" -lt 4 ] && BLOCK "only ${MEM_AVAIL}GB RAM available (emulator needs ~3GB)" || ok "${MEM_AVAIL}GB RAM available"

# DISK. Run artifacts grow without bound — screenshots, hierarchy dumps, logcats
# and a debug dir per flow — and reached 9.6GB across 185 runs on this machine
# while the disk sat at 99% full with 7GB free. A full disk kills the emulator
# (seen: "device 'emulator-5580' not found" mid-flow) and Docker with it, and it
# looks like an app failure. `qa.sh prune` clears old runs.
DISK_FREE=$(df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9')
REPORTS_GB=$(du -sBG "$QA_DIR/reports" 2>/dev/null | cut -f1 | tr -dc '0-9')
# `reports` is NOT the whole story, and reporting only it sent me looking in the
# wrong place when the disk filled: Maestro keeps its own artifact tree per run
# under ~/.maestro/tests (screenshots + a hierarchy dump per STEP), and Docker
# holds unused images and volumes. When this last filled up, reports were ~2GB
# while those two held ~14GB and ~38GB. Name them so the cleanup goes where the
# space actually went.
MAESTRO_GB=$(du -sBG "$HOME/.maestro/tests" 2>/dev/null | cut -f1 | tr -dc '0-9')
DOCKER_GB=$(docker system df --format '{{.Reclaimable}}' 2>/dev/null \
  | grep -oE '^[0-9]+' | paste -sd+ | bc 2>/dev/null)
if [ "${DISK_FREE:-99}" -lt 8 ]; then
  BLOCK "only ${DISK_FREE}GB disk free — the emulator will die mid-flow. Run: ./qa/qa.sh prune"
elif [ "${DISK_FREE:-99}" -lt 20 ]; then
  warn "${DISK_FREE}GB disk free — reports ${REPORTS_GB:-?}GB, maestro artifacts ${MAESTRO_GB:-?}GB, docker reclaimable ${DOCKER_GB:-?}GB"
  warn "  ./qa/qa.sh prune  |  rm -rf ~/.maestro/tests  |  docker builder prune -af"
else
  ok "${DISK_FREE}GB disk free (reports ${REPORTS_GB:-?}GB, maestro ${MAESTRO_GB:-?}GB)"
fi

step "3/8 emulator"
if resolve_device; then
  ok "device $QA_SERIAL"
  # FORM FACTOR, stated out loud. The rig ran the whole suite on `qa_tablet` for
  # cycles on end because qa.config.sh gave session 1 — the DEFAULT session — the
  # tablet, and nothing ever printed which device was under test. At 2560x1600 the
  # tab bar, every bottom sheet and every RTL layout differ from the phone, so the
  # failures read as app bugs (seller 0/8, rtl 0/8, reviews 0/3, safety 0/2) and
  # the phone, which is the product's only real target, was never exercised.
  _AVD_NAME="$(adb_qa_t 25 emu avd name 2>/dev/null | head -1 | tr -d '\r')"
  _WM="$(adb_qa_t 25 shell wm size 2>/dev/null | tr -d '\r' | grep -oE '[0-9]+x[0-9]+' | tail -1)"
  _DEN="$(adb_qa_t 25 shell wm density 2>/dev/null | tr -d '\r' | grep -oE '[0-9]+' | tail -1)"
  if [ -n "$_WM" ] && [ -n "$_DEN" ] && [ "$_DEN" -gt 0 ] 2>/dev/null; then
    _W=${_WM%x*}; _H=${_WM#*x}
    _SHORT=$_W; [ "$_H" -lt "$_W" ] && _SHORT=$_H
    _DP=$(( _SHORT * 160 / _DEN ))
    if [ "$_DP" -ge 600 ]; then
      warn "${_AVD_NAME:-?} is a TABLET (${_WM} @${_DEN}dpi = ${_DP}dp) — Hatiwal is mobile-first; phone layout is NOT being tested"
    else
      ok "${_AVD_NAME:-?} phone form factor (${_WM} @${_DEN}dpi = ${_DP}dp)"
    fi
  fi
  [ "$(adb_qa_t 25 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] \
    && ok "boot completed" || BLOCK "device present but not finished booting"
  # Responsiveness: a starved emulator answers adb but not the UI. Probe the
  # system server with a CHEAP call — a full `dumpsys window` is a large dump
  # that can exceed its budget on a loaded host even when the UI is healthy,
  # which turns a working rig into a false block.
  # Retry: this is a NOISY signal. On a loaded host a single probe can time out
  # while the device is fine (measured healthy at 83ms moments later). Blocking
  # the entire rig on one sample produced a false "emulator wedged" verdict.
  UI_OK=0
  for _try in 1 2 3; do
    if adb_qa_t 30 shell dumpsys window displays >/dev/null 2>&1; then UI_OK=1; break; fi
    sleep 3
  done
  [ "$UI_OK" = "1" ] && ok "UI responsive" \
    || BLOCK "system server did not answer in 3 attempts — emulator wedged or starved"
else
  BLOCK "no booted emulator — run: qa.sh up"
fi

step "4/8 metro bundler"
# A BUNDLED APK carries its own JS and must NOT be handed Metro.
#
# `qa.sh build bundled` embeds assets/index.android.bundle, which is the whole
# point: the code under test is frozen at build time, so a source edit cannot
# hot-reload into a flow that is mid-run (that invalidated several runs on
# 2026-09-02, one of them by delivering a briefly broken bundle). But an RN debug
# build still PREFERS the dev server when it can reach it — so leaving the
# `adb reverse` in place would quietly un-freeze it. The forward is therefore
# actively REMOVED, not merely skipped, in case an earlier run set it up.
APK_BUNDLED=0
if [ -f "$MOBILE_DIR/android/app/build/outputs/apk/debug/apk-provenance.txt" ] \
   && grep -q "^bundled: 1" "$MOBILE_DIR/android/app/build/outputs/apk/debug/apk-provenance.txt" 2>/dev/null; then
  APK_BUNDLED=1
fi

if [ "$APK_BUNDLED" = "1" ]; then
  ok "APK has its JS EMBEDDED — Metro not required for this run"
  if [ -n "${QA_SERIAL:-}" ]; then
    adb_qa_t 25 reverse --remove tcp:8081 >/dev/null 2>&1 \
      && ok "adb reverse 8081 removed — the app cannot fall back to live JS" \
      || ok "no adb reverse to remove"
  fi
  say "built from: $(grep -m1 '^commit:' "$MOBILE_DIR/android/app/build/outputs/apk/debug/apk-provenance.txt" | cut -c1-58)"
else
  METRO_STATUS=$(curl -s -m 5 "http://localhost:$METRO_PORT/status" 2>/dev/null)
  if [ "$METRO_STATUS" = "packager-status:running" ]; then
    ok "metro on :$METRO_PORT"
    # A non-bundled debug build loads its JS from Metro on device-localhost:8081.
    if [ -n "${QA_SERIAL:-}" ]; then
      adb_qa_t 25 reverse tcp:8081 "tcp:$METRO_PORT" >/dev/null 2>&1 \
        && ok "adb reverse 8081 → host :$METRO_PORT" || warn "adb reverse failed"
    fi
  else
    BLOCK "metro not serving on :$METRO_PORT — an UNBUNDLED debug build has no JS without it"
  fi
fi

# A COMPETING Metro is the nastiest failure mode found so far: the dev-client
# launcher auto-discovers 10.0.2.2:8081, and 10.0.2.2 addresses the host
# DIRECTLY — adb reverse does not intercept it. If another Expo project holds
# host :8081, its JS bundle gets loaded into THIS app's native shell. Observed:
# the dev menu read "Madares" and the app died with "Cannot find native module
# 'ExpoLocalization'" — a module that app imports and this APK does not contain.
# It looks exactly like a Hatiwal bug and is not one.
OTHER=$(curl -s -m 4 "http://localhost:8081/status" 2>/dev/null)
if [ "$OTHER" = "packager-status:running" ] && [ "$METRO_PORT" != "8081" ]; then
  OTHER_APP=$(curl -s -m 6 "http://localhost:8081/" 2>/dev/null | grep -oE '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$OTHER_APP" ] && [ "$OTHER_APP" != "Hatiwal" ]; then
    BLOCK "another Expo project ('$OTHER_APP') is serving Metro on host :8081"
    say "the dev-client launcher auto-picks 10.0.2.2:8081 and would load '$OTHER_APP''s"
    say "bundle into the Hatiwal APK. Stop it, or make the flow enter :$METRO_PORT explicitly:"
    say "  docker stop \$(docker ps --format '{{.Names}}' | grep -v \"\$QA_PROJECT_TAG\" | grep mobile)"
  else
    warn "something is serving Metro on :8081 — verify the launcher picks Hatiwal"
  fi
else
  ok "no competing Metro on :8081"
fi

step "5/8 backend"
API_CODE=$(curl -s -o /dev/null -m 8 -w '%{http_code}' "$API_URL_LOCAL/categories" 2>/dev/null)
[ "$API_CODE" = "200" ] && ok "api reachable via $API_URL_LOCAL ($API_CODE)" \
  || BLOCK "api $API_URL_LOCAL returned '$API_CODE'"
# The URL must be reachable FROM THE EMULATOR, not just from this shell.
# What the BUNDLE points at is what actually matters — Metro inlines it.
#
# READ `.env` FIRST, NOT JUST THE CONTAINER ENVIRONMENT (run-268).
#
# `babel-preset-expo` inlines `process.env.EXPO_PUBLIC_*` from the project's
# `.env` FILE, and `/app/.env` is bind-mounted from the host — so a `.env` value
# WINS over the container's own environment variable. This check read only
# `printenv`, which made it possible to "fix" the address with
# `HOST_IP=10.0.2.2 docker compose up -d mobile`, see this step report
# `bundle API is emulator-stable (http://10.0.2.2:3007/api/v1)`, and still have
# the app talking to the LAN IP from `.env`. That is exactly what happened here:
# the served bundle carried BOTH strings, and the Rails access log showed every
# request arriving from `192.168.1.24` — a false OK on a provenance check, which
# is the worst kind.
#
# So: prefer `.env`, and say which source the answer came from.
BUNDLE_API=$(docker exec "$QA_METRO_CONTAINER" sh -c \
  'grep -m1 -E "^[[:space:]]*EXPO_PUBLIC_API_URL=" /app/.env 2>/dev/null | cut -d= -f2- | tr -d "\"'"'"' \r"' 2>/dev/null)
BUNDLE_API_SRC=".env (wins — babel inlines it)"
if [ -z "$BUNDLE_API" ]; then
  BUNDLE_API=$(docker exec "$QA_METRO_CONTAINER" printenv EXPO_PUBLIC_API_URL 2>/dev/null)
  BUNDLE_API_SRC="container env (no .env override)"
fi
[ -n "$BUNDLE_API" ] && say "  bundle API source: $BUNDLE_API_SRC"
case "$BUNDLE_API" in
  *10.0.2.2*) ok "bundle API is emulator-stable ($BUNDLE_API)";;
  "")         warn "could not read EXPO_PUBLIC_API_URL from the metro container";;
  *localhost*|*127.0.0.1*)
    BLOCK "bundle API is '$BUNDLE_API' — localhost inside the emulator is the EMULATOR, not your machine";;
  *) # WARN, not BLOCK. A LAN IP is what a PHYSICAL device needs — testing on Expo
     # Go requires it — and the emulator can reach it too (verified: `toybox netcat
     # 192.168.1.24 3007` from inside the device returns 0). Blocking it on sight
     # refused a configuration that works and that the developer needs for on-device
     # testing.
     #
     # The real gate is the on-device probe below: it asks whether THIS emulator can
     # open THIS address, which is the only question that matters. The remaining risk
     # of a LAN IP is that it changes with the network, so it is worth saying out
     # loud — but the probe catches that the moment it happens.
     warn "bundle API is a LAN IP ('$BUNDLE_API') — needed for a physical device, but it changes with the network"
     say "for emulator-only runs: HOST_IP=10.0.2.2 docker compose up -d mobile";;
esac

# ── And can the EMULATOR actually open that port? ───────────────────────────
# The check above only inspects the URL STRING, and the one above that probes
# from this shell. Neither says the device can reach the API, and that is the
# path every request in every flow takes.
#
# It cost a whole run of false failures: 8 report/ flows died at the login gate
# with `Assertion is false: id: profile-tab is visible`, the login screen showing
# "Error", while the API answered the HOST in 49ms and returned 200 for
# buyer@hatiwal.test. logcat had `[UniversalList] fetch error, [AxiosError:
# Network Error]` — the emulator's own networking stalling under host load, with
# the bundle still loading fine because that arrives over `adb reverse`, a
# different path entirely.
#
# A TCP connect is the right depth here: no HTTP client is guaranteed to exist on
# the device image (there is no curl, and toybox has no wget), and connect/refuse
# is exactly the distinction that matters.
if [ -n "${QA_SERIAL:-}" ]; then
  API_HOSTPORT="$(printf '%s' "$BUNDLE_API" | sed -E 's#^[a-z]+://([^/]+).*#\1#')"
  API_H="${API_HOSTPORT%%:*}"; API_P="${API_HOSTPORT##*:}"
  if [ -n "$API_H" ] && [ -n "$API_P" ]; then
    # RETRIED, because a single probe lies right after a boot. The emulator's
    # network stack is not up the instant adb reports `device`: the same address
    # answered rc=1 fifteen seconds after attach and rc=0 a minute later. A
    # one-shot probe there would BLOCK a perfectly good rig — and this check exists
    # to stop false failures, not to create them.
    DEV_RC=1
    for _try in 1 2 3; do
      DEV_RC=$(adb_qa_t 25 shell "toybox netcat -w 4 $API_H $API_P </dev/null >/dev/null 2>&1; echo \$?" 2>/dev/null | tr -d '\r')
      [ "$DEV_RC" = "0" ] && break
      sleep 5
    done
    case "$DEV_RC" in
      0) ok "emulator can open $API_H:$API_P";;
      "") warn "could not run the on-device API probe (no toybox netcat?)";;
      *)  BLOCK "the EMULATOR cannot open $API_H:$API_P (rc=$DEV_RC) — every flow will fail at login"
          say "the host may still answer fine; this is the device's own path"
          say "usually host load or a wedged emulator: ./qa/qa.sh down && ./qa/qa.sh up";;
    esac
  fi
fi

step "6/8 e2e seed data"
LOGIN=$(curl -s -m 10 -X POST "$API_URL_LOCAL/auth/sign_in" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$QA_BUYER_EMAIL\",\"password\":\"$QA_PASSWORD\"}" 2>/dev/null)
if echo "$LOGIN" | grep -q '"email"'; then
  ok "$QA_BUYER_EMAIL can log in"
else
  BLOCK "$QA_BUYER_EMAIL cannot log in — every flow using _helpers/login.yaml will fail at step 1"
  say "fix with: qa.sh seed   (rake db:seed:reset_e2e)"
fi

step "7/8 app installed"
if [ -n "${QA_SERIAL:-}" ]; then
  if adb_qa_t 25 shell pm list packages 2>/dev/null | grep -q "$APP_ID"; then
    VER=$(adb_qa_t 25 shell dumpsys package "$APP_ID" 2>/dev/null | grep -m1 versionName | tr -d ' \r')
    ok "$APP_ID installed ($VER)"
  else
    BLOCK "$APP_ID not installed — run: qa.sh build"
  fi
fi

step "8/8 clean launch"
if [ -n "${QA_SERIAL:-}" ] && adb_qa_t 25 shell pm list packages 2>/dev/null | grep -q "$APP_ID"; then
  adb_qa_t 25 logcat -c >/dev/null 2>&1
  adb_qa_t 25 shell am force-stop "$APP_ID" >/dev/null 2>&1
  # Marker BEFORE the launch, in the API container's OWN clock — `docker logs
  # --since` below reads that clock, and this host's and the container's can
  # drift. `date -u --iso-8601=seconds` matches what --since accepts.
  LAUNCH_MARK="$(docker exec "$QA_API_CONTAINER" date -u '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u '+%Y-%m-%dT%H:%M:%S')"
  adb_qa_t 25 shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 12
  CRASH=$(adb_qa_t 60 logcat -d 2>/dev/null | grep -iE "FATAL EXCEPTION|AndroidRuntime.*$APP_ID|Could not connect to development server|Unable to load script" | head -3)
  if [ -n "$CRASH" ]; then
    BLOCK "app crashed or could not load its bundle on launch:"
    echo "$CRASH" | sed 's/^/      /' | cut -c1-120
  else
    adb_qa_t 25 shell pidof "$APP_ID" >/dev/null 2>&1 && ok "app launched and stayed up" \
      || BLOCK "app is not running after launch"
  fi

  # ── THE HARD GATE (card #296/SF-QA1) ────────────────────────────────────
  # "The app opened" and even "no crash" are NOT evidence the RIGHT bundle
  # loaded: :8081 can silently serve a DIFFERENT Expo project's JS into this
  # exact APK (the competing-Metro check above only warns/blocks on what IT
  # can see — a stale adb-reverse tunnel or a race at boot could still slip
  # through). A wrong bundle can render SOMETHING and stay crash-free while
  # never once talking to hatiwal-api, because it has no reason to. Splash's
  # own auth bootstrap and the Bazaar feed both fire a request within a
  # couple of seconds of a real Hatiwal launch — so tailing hatiwal-api's OWN
  # request log for a hit DURING THIS EXACT LAUNCH is the one signal a wrong
  # bundle cannot fake by accident.
  if docker inspect "$QA_API_CONTAINER" >/dev/null 2>&1; then
    HIT=$(docker logs --since "$LAUNCH_MARK" "$QA_API_CONTAINER" 2>&1 | grep -m1 '^Started ')
    if [ -n "$HIT" ]; then
      ok "hatiwal-api saw a request from this launch: ${HIT:0:100}"
    else
      BLOCK "no request reached hatiwal-api during this launch — the app may be running a DIFFERENT project's bundle (see the :8081 check above), or the emulator cannot reach the API at all"
      say "compare against: docker logs --since $LAUNCH_MARK $QA_API_CONTAINER | grep '^Started '"
    fi
  else
    warn "container $QA_API_CONTAINER not found — skipping the request-landed hard gate"
  fi
fi

step "verdict"
if [ "$FAILED" -eq 0 ]; then
  ok "rig is testable — flow failures now mean real app bugs"
  exit 0
else
  err "$FAILED blocking problem(s) — fix these BEFORE trusting any flow result"
  exit 1
fi

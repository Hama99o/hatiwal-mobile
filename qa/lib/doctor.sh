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

step "3/8 emulator"
if resolve_device; then
  ok "device $QA_SERIAL"
  [ "$(adb_qa shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] \
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
METRO_STATUS=$(curl -s -m 5 "http://localhost:$METRO_PORT/status" 2>/dev/null)
if [ "$METRO_STATUS" = "packager-status:running" ]; then
  ok "metro on :$METRO_PORT"
  # A debug build loads its JS from Metro on localhost:8081 inside the device.
  if [ -n "${QA_SERIAL:-}" ]; then
    adb_qa reverse tcp:8081 "tcp:$METRO_PORT" >/dev/null 2>&1 \
      && ok "adb reverse 8081 → host :$METRO_PORT" || warn "adb reverse failed"
  fi
else
  BLOCK "metro not serving on :$METRO_PORT — a debug build has no JS without it"
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
BUNDLE_API=$(docker exec "$QA_METRO_CONTAINER" printenv EXPO_PUBLIC_API_URL 2>/dev/null)
case "$BUNDLE_API" in
  *10.0.2.2*) ok "bundle API is emulator-stable ($BUNDLE_API)";;
  "")         warn "could not read EXPO_PUBLIC_API_URL from the metro container";;
  *localhost*|*127.0.0.1*)
    BLOCK "bundle API is '$BUNDLE_API' — localhost inside the emulator is the EMULATOR, not your machine";;
  *) BLOCK "bundle API is '$BUNDLE_API' — a LAN IP breaks the moment the network changes"
     say "fix: HOST_IP=10.0.2.2 docker compose up -d mobile";;
esac

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
  if adb_qa shell pm list packages 2>/dev/null | grep -q "$APP_ID"; then
    VER=$(adb_qa shell dumpsys package "$APP_ID" 2>/dev/null | grep -m1 versionName | tr -d ' \r')
    ok "$APP_ID installed ($VER)"
  else
    BLOCK "$APP_ID not installed — run: qa.sh build"
  fi
fi

step "8/8 clean launch"
if [ -n "${QA_SERIAL:-}" ] && adb_qa shell pm list packages 2>/dev/null | grep -q "$APP_ID"; then
  adb_qa logcat -c >/dev/null 2>&1
  adb_qa shell am force-stop "$APP_ID" >/dev/null 2>&1
  adb_qa shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 12
  CRASH=$(adb_qa logcat -d 2>/dev/null | grep -iE "FATAL EXCEPTION|AndroidRuntime.*$APP_ID|Could not connect to development server|Unable to load script" | head -3)
  if [ -n "$CRASH" ]; then
    BLOCK "app crashed or could not load its bundle on launch:"
    echo "$CRASH" | sed 's/^/      /' | cut -c1-120
  else
    adb_qa shell pidof "$APP_ID" >/dev/null 2>&1 && ok "app launched and stayed up" \
      || BLOCK "app is not running after launch"
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

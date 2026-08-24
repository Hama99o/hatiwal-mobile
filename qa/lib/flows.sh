#!/usr/bin/env bash
# Run Maestro flows for one feature and classify every failure.
#
# The point of this file: a red flow is NOT automatically an app bug. It is one
# of four things, and the report must say which — otherwise triage is guesswork.
#   app_bug   — the app did the wrong thing (this is what we are hunting)
#   app_crash — the app died (logcat has a FATAL EXCEPTION)
#   rig_fail  — metro/emulator/backend broke mid-run; result is meaningless
#   flow_bug  — the flow's selector/expectation is wrong, not the app
# 214 flows in this repo have never once been executed, so flow_bug is the
# expected majority on the first run. Do not "fix" the app because of one.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
# For the self-heal path in run_feature: when the emulator dies mid-suite this
# file boots it and reinstalls the APK rather than abandoning the run. qa.sh
# already sources both before this file, so these are belt-and-braces for anyone
# sourcing flows.sh on its own.
source "$(dirname "${BASH_SOURCE[0]}")/emulator.sh"
source "$(dirname "${BASH_SOURCE[0]}")/app.sh"

# Per-flow wall clock. 240s was too tight and produced RIG-classified failures
# with an EMPTY log — the timeout killed Maestro before it wrote anything, which
# is the least diagnosable failure the rig can emit. A cold start pays the
# expo-dev-launcher URL entry plus a full Metro bundle transform (capped at 180s
# in _helpers/open_bundle.yaml) before the flow body has run a single step, and
# with a second session (QA_SESSION=2) competing for the same Metro and the same
# host cores it lands well past 240s on a tablet. Sized to fit the worst legal
# case rather than the typical one; a genuinely hung flow still gets caught.
# 600s, raised from 480 after create_listing_price_edges timed out at 481s. The
# validation edge flows are legitimately long: each attempt taps Save Draft, waits
# for the form to validate, and asserts both the error that should appear AND the
# one that should not — three attempts each, on top of the ~150s a cold start costs
# before the flow body begins. A timeout is reported as rig_fail with an empty log,
# which is the least useful failure the rig can emit, so it is worth sizing
# generously; a genuinely hung flow is still caught.
FLOW_TIMEOUT="${FLOW_TIMEOUT:-600}"

# Backend errors the UI may have swallowed. A flow that PASSES while the API was
# erroring is a SILENT FAILURE — the app looked fine and told the user nothing.
# Assertions cannot see that class of bug, so it is detected from logcat.
API_ERR_RE='AxiosError|Network request failed|Request failed with status code|Unhandled promise rejection|Possible Unhandled Promise'

# Failures the app handles ON PURPOSE, and whose handling is the DESIGNED
# behaviour rather than a swallowed error. Counting these as SILENT accuses the
# app of hiding something it deliberately and correctly rode out.
#
# `[UniversalList] background refresh error` is the one that matters: when a
# refresh of an already-loaded list fails, blanking a perfectly usable list is
# worse for the user than keeping it, so the component logs a warn and leaves the
# list alone (UniversalList.tsx, and it is why that line is `console.warn` — a
# `console.error` raised a full-screen LogBox that blanked the list anyway).
# browse_sort_most_viewed was marked SILENT on exactly this.
#
# An INITIAL fetch failure is NOT here: that one renders the inline error state
# with a retry, and a flow passing its assertions while that state is on screen
# genuinely is worth knowing about.
API_TOLERATED_RE='UniversalList\] background refresh error'
# Filter by LINE first, then extract. `grep -o` yields the match onwards — for
# `'[UniversalList] background refresh error', [AxiosError: Network Error]` that
# is "AxiosError: Network Error]", with the prefix that identifies it as tolerated
# already cut off. Excluding after extraction can therefore never match, which is
# how a first attempt at this filter left the count unchanged at 2.
scan_api_errors() {
  grep -iE "$API_ERR_RE" "$1" 2>/dev/null \
    | grep -viE "$API_TOLERATED_RE" \
    | grep -oiE "$API_ERR_RE.{0,110}"
}

# Is the rig still healthy? Metro dies with OOM (exit 137) on long runs, and
# every flow after that point fails for no app reason.
_rig_probe() {
  [ "$(curl -s -m 10 "http://localhost:$METRO_PORT/status" 2>/dev/null)" = "packager-status:running" ] || return 1
  adb_qa_t 20 shell true >/dev/null 2>&1 || return 2
  [ "$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$API_URL_LOCAL/categories" 2>/dev/null)" = "200" ] || return 3
  return 0
}

# Is the rig still healthy? Metro dies with OOM (exit 137) on long runs, and
# every flow after that point fails for no app reason.
#
# RETRIED ONCE, deliberately. A single slow response here ABORTS THE WHOLE
# FEATURE, and with several sessions running (QA_SESSION=n) two emulators
# launching apps at the same time spike the host enough to miss a tight timeout —
# which killed two concurrent runs that were both perfectly healthy a second
# later. The timeouts are also more generous than the original 5s/15s/8s for the
# same reason. A genuinely dead Metro still fails both probes and still aborts;
# this only stops a blip from being reported as a dead rig.
rig_healthy() {
  local rc
  _rig_probe && return 0
  rc=$?
  sleep 3
  _rig_probe && return 0
  return $rc
}

# classify <exit_code> <flow_log> <logcat_file>
classify() {
  local code="$1" log="$2" lc="$3"
  grep -qiE "FATAL EXCEPTION|AndroidRuntime.*FATAL" "$lc" 2>/dev/null && { echo app_crash; return; }
  # A red box (LogBox) means the JS threw or logged an error. It is a real app
  # error even when an assertion happened to pass, and it covers the screen so
  # everything after it fails for the wrong reason.
  grep -qiE "ReactNativeJS.*(Console Error|Uncaught Error)|LogBox" "$lc" 2>/dev/null && { echo app_error; return; }
  grep -qiE "Could not connect to development server|Unable to load script|Metro" "$log" 2>/dev/null && { echo rig_fail; return; }
  [ "$code" = "124" ] && { echo rig_fail; return; }   # our timeout fired
  # Maestro says which step failed; an assertion/selector miss is the common case
  grep -qiE "Assertion is false|Element not found|not visible" "$log" 2>/dev/null && { echo app_bug_or_flow; return; }
  echo "unknown"
}

# run_feature <feature> <run_dir> <flow_file...>
run_feature() {
  local feature="$1" run_dir="$2"; shift 2
  local out="$run_dir/$feature"; mkdir -p "$out"
  local pass=0 fail=0

  # Start from a clean block table. A block hides the blocked user's listings
  # from the blocker's feed, so one leftover block silently removes fixtures that
  # later flows assert on — four report/ flows died together on
  # `No visible element found: "Wool Blanket Handmade King Size"` for a listing
  # that was present and merely hidden.
  bash "$QA_DIR/lib/clear_blocks.sh"

  # Resolve THIS session's serial before the health gate runs.
  #
  # Not optional once more than one emulator can be attached: `adb_qa` falls back
  # to a bare `adb` when QA_SERIAL is empty, and a bare `adb shell true` fails
  # with "more than one device/emulator". The health gate then returns 2 and
  # every flow is reported as "rig unhealthy — aborting feature" while both
  # emulators are perfectly fine.
  #
  # It was empty here because `require_rig` runs doctor in a SUBPROCESS, so the
  # QA_SERIAL it exports never reaches this shell. Single-device rigs never
  # noticed, because bare adb happened to pick the only device.
  resolve_device || { err "no emulator for session $QA_SESSION"; return 1; }

  for flow in "$@"; do
    local name; name="$(basename "$flow" .yaml)"
    local log="$out/$name.log" lc="$out/$name.logcat"

    # Health gate BEFORE each flow so a dead rig is reported as a rig problem
    # instead of silently turning the rest of the suite red.
    rig_healthy; local rc=$?
    if [ "$rc" -ne 0 ]; then
      # NOTE: capture the status explicitly. `if ! rig_healthy` would reset $?
      # to 0 inside the branch, making the metro-restart path unreachable.
      case "$rc" in
        1) warn "metro died — attempting restart"; metro_restart || true ;;
        2) # The EMULATOR is gone. Boot it rather than abandoning the run.
           #
           # This rig is meant to test unattended for days, and an emulator that
           # dies at 3am used to end the night: the feature aborted and every
           # remaining flow was recorded as rig_fail. It happened repeatedly, with
           # no OOM kill in the kernel log and 13GB free, so the cause is not
           # something the rig can prevent — but it can recover. One attempt, then
           # give up honestly.
           warn "emulator gone — attempting to boot it"
           if emulator_boot "$QA_AVD" && app_install && rig_healthy; then
             ok "emulator recovered — continuing with '$name'"
           else
             err "could not recover the emulator — aborting feature '$feature'"
             echo "{\"feature\":\"$feature\",\"flow\":\"$name\",\"result\":\"rig_fail\",\"reason\":\"emulator died and could not be rebooted\"}" >> "$run_dir/results.jsonl"
             return 1
           fi ;;
        *) err "rig unhealthy before '$name' — aborting feature '$feature'"
           echo "{\"feature\":\"$feature\",\"flow\":\"$name\",\"result\":\"rig_fail\",\"reason\":\"rig unhealthy before start\"}" >> "$run_dir/results.jsonl"
           return 1 ;;
      esac
    fi

    # ── Clear airplane mode left behind by an earlier flow ────────────────
    # Airplane mode is a DEVICE-WIDE setting that outlives the flow that set it.
    # Two flows toggle it to test offline behaviour (chat/send_message_offline,
    # profile/view_profile_error) and both do disable it again at the end — but a
    # flow that FAILS never reaches its own cleanup, and then every flow after it
    # on that device cannot reach Metro. The dev-launcher shows "Failed to connect
    # to /10.0.2.2:3008" and the flows fail on things like `"Me" is visible`, so it
    # reads as a broken login, or a broken app, rather than a radio that is still
    # off. It cost a whole confirmation batch before the screenshot showed the
    # little aeroplane in the status bar.
    if [ "$(adb_qa shell settings get global airplane_mode_on 2>/dev/null | tr -d "\r")" = "1" ]; then
      warn "airplane mode was left ON by an earlier flow — clearing it"
      adb_qa shell cmd connectivity airplane-mode disable >/dev/null 2>&1
      sleep 4   # the radios need a moment before Metro is reachable again
    fi

    # ── Re-send the GPS fix ───────────────────────────────────────────────
    # `adb emu geo fix` is a ONE-SHOT location, not a standing setting: the
    # provider reports it and then goes stale, so a flow that asks for the
    # CURRENT position minutes after boot gets nothing and the app correctly
    # shows "Couldn't determine your location. Please try again." Seeding it only
    # at boot (emulator.sh) is therefore not enough for a long suite — the later
    # a location flow runs, the more likely it fails for a device reason.
    #
    # Cheap enough to do before every flow, and it makes nearest-sort, distance
    # filters and the map pickers deterministic instead of order-dependent.
    adb_qa emu geo fix "$QA_GEO_LON" "$QA_GEO_LAT" >/dev/null 2>&1

    # ── And KEEP sending it for the duration of the flow ──────────────────
    # One fix before the flow is not enough, and the reason is sharper than
    # "it goes stale": the emulator DISCARDS a fix when nothing is listening.
    # Verified on device — `emu geo fix` answers OK while
    # `dumpsys location` still reports `gps provider: ProviderRequest[OFF],
    # last location=null`. The app only registers a listener when the user asks
    # for their location, which is minutes after the preflight ran, so by then
    # there is nothing to hand it and the app correctly falls back to Kabul.
    #
    # That silently defeated the one flow whose whole subject is a location
    # ABROAD: map_location_outside_afghanistan set the device to Paris, got Kabul,
    # and saved a listing in Kabul while asserting nothing about it.
    #
    # A pump every 2s means a fresh fix is always available whenever the app
    # starts listening. Killed after the flow, so it never leaks into the next.
    ( while :; do
        adb_qa emu geo fix "$QA_GEO_LON" "$QA_GEO_LAT" >/dev/null 2>&1
        sleep 2
      done ) &
    local geo_pump=$!

    adb_qa logcat -c >/dev/null 2>&1
    printf '  %-46s ' "$name"
    local start; start=$(cut -d' ' -f1 /proc/uptime)

    stop_geo_pump() { [ -n "${geo_pump:-}" ] && kill "$geo_pump" 2>/dev/null; geo_pump=""; }

    run_maestro() {
      local extra="$1"
      timeout "$FLOW_TIMEOUT" "$MAESTRO" ${QA_SERIAL:+--device "$QA_SERIAL"} test $extra "$flow" \
        --format JUNIT --output "$out/$name.xml" \
        --debug-output "$out/debug-$name" \
        --env EMAIL="$QA_BUYER_EMAIL" --env PASSWORD="$QA_PASSWORD" \
        --no-ansi > "$log" 2>&1
    }

    run_maestro ""
    local code=$?

    # Maestro's ON-DEVICE driver dies fairly often (DeviceServerDiedException,
    # "Command failed (tcp:NNNNN): closed"), especially after a previous run was
    # interrupted. The signature is unmistakable: the flow "fails" in ~0s having
    # executed nothing. That is a RIG failure, and counting it as an app failure
    # has already produced whole runs of meaningless red.
    #
    # Recover once, automatically, rather than requiring a human to notice.
    if [ "$code" -ne 0 ] && grep -qE "\((0s|[0-4]s)\)|DeviceServerDied|Device server died" "$log" 2>/dev/null; then
      warn "maestro driver died on '$name' — reinstalling and retrying once"
      run_maestro "--reinstall-driver"
      code=$?
    fi
    stop_geo_pump   # the flow is over; never let the pump leak into the next one
    local secs; secs=$(awk -v a="$start" -v b="$(cut -d' ' -f1 /proc/uptime)" 'BEGIN{printf "%.0f", b-a}')
    adb_qa logcat -d > "$lc" 2>/dev/null

    # Every flow gets a screenshot, pass or fail — the UI/UX review reads these.
    mkdir -p "$out/screens"
    adb_qa exec-out screencap -p > "$out/screens/$name.png" 2>/dev/null

    local api_n api_sample kind why
    api_n="$(scan_api_errors "$lc" | wc -l)"
    api_sample="$(scan_api_errors "$lc" | head -2 | tr '\n' ' ' | tr -d '\r' | cut -c1-200)"

    if [ "$code" -eq 0 ]; then
      # A flow whose SUBJECT is an error path will always log one. `SILENT` means
      # "the screen looked right while a request failed" — it cannot mean that when
      # the failing request is the thing being tested. login_wrong_password was
      # marked SILENT for the 401 it exists to provoke.
      #
      # Opt-in by marker rather than inference: guessing from "does the flow assert
      # an error string" would quietly excuse real silent failures in flows that
      # happen to check an error somewhere.
      if grep -q "qa:expect-api-error" "$flow" 2>/dev/null; then
        api_n=0
      fi
      if [ "$api_n" -gt 0 ]; then
        # Assertions passed while the backend was failing underneath.
        kind="silent_api_error"; why="$api_sample"
        _c ylw; printf 'PASS*'; _r; printf ' %ss  [silent api error x%s]\n' "$secs" "$api_n"
      else
        kind=""; why=""
        _c grn; printf 'PASS'; _r; printf ' %ss\n' "$secs"
      fi
      pass=$((pass+1))
      rm -rf "$out/debug-$name"   # heavy evidence kept for failures only
    else
      kind="$(classify "$code" "$log" "$lc")"
      why="$(grep -m1 -iE "Assertion is false|Element not found|not visible|FAILED" "$log" | tr -d '\r' | cut -c1-160)"
      [ -n "$api_sample" ] && why="$why  ||  api: $api_sample"
      _c red; printf 'FAIL'; _r; printf ' %ss  [%s]\n' "$secs" "$kind"; fail=$((fail+1))
    fi

    # Single emit path for both outcomes — one record shape, no duplication.
    python3 "$QA_DIR/lib/emit_result.py" "$run_dir/results.jsonl" "$feature" "$name" \
      "$([ "$code" -eq 0 ] && echo pass || echo fail)" "$kind" "$secs" "$why" "$api_n"

    # A block flow that fails before its unblock step leaves the block in place.
    # Clear it here rather than per-flow: this is the only place it can leak, and
    # the call costs ~4s of Rails boot, which is not worth paying 252 times.
    case "$name" in
      *block*) bash "$QA_DIR/lib/clear_blocks.sh" ;;
    esac
  done

  printf '  '; _c dim; printf '%s: %s passed, %s failed\n' "$feature" "$pass" "$fail"; _r
  return 0
}

metro_restart() {
  # The Metro serving :3008 runs in the docker `mobile` service.
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "$QA_PROJECT_TAG"; then
    say "restarting docker metro…"
    docker restart "$(docker ps --format '{{.Names}}' | grep "$QA_PROJECT_TAG" | head -1)" >/dev/null 2>&1
    local w=0; while [ $w -lt 90 ]; do
      [ "$(curl -s -m 3 "http://localhost:$METRO_PORT/status" 2>/dev/null)" = "packager-status:running" ] && { ok "metro back"; return 0; }
      sleep 5; w=$((w+5))
    done
  fi
  err "could not restart metro"; return 1
}

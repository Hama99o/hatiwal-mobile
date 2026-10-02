#!/usr/bin/env bash
# The DEMO device — a persistent emulator kept for screen recordings.
#
# It is NOT the QA rig. The rig wipes and reseeds; this one KEEPS everything:
# the signed-in session, the gallery photos, caches. Boot it, use it, shut it
# down cleanly, and next time it comes back exactly as you left it.
#
#   ./qa/demo_device.sh up          boot it (windowed; DEMO_HEADLESS=1 for none)
#   ./qa/demo_device.sh install     (re)install the Hatiwal APK
#   ./qa/demo_device.sh photos DIR  copy item photos into its gallery
#   ./qa/demo_device.sh status      what is on it right now
#   ./qa/demo_device.sh down        CLEAN shutdown so state is saved
#
# NEVER pass -wipe-data to this AVD and never run `qa.sh` against it.
set -uo pipefail
export LC_ALL=C
SDK="$HOME/Android/Sdk"; A="$SDK/platform-tools/adb"; EMU="$SDK/emulator/emulator"
AVD=hatiwal_demo
PORT=5596                       # clear of 5580 (QA rig) and 5584 (edu-safi)
SER="emulator-$PORT"
MOBILE="$HOME/Apps/Personal/Hatiwal/hatiwal-mobile"
APK="$MOBILE/android/app/build/outputs/apk/debug/app-debug.apk"
PKG=com.hatiwal.app

die(){ echo "  ERROR: $*" >&2; exit 1; }
ours(){ [ "$(timeout 15 "$A" -s "$SER" emu avd name 2>/dev/null | head -1 | tr -d '\r')" = "$AVD" ]; }
alive(){ timeout 10 "$A" devices 2>/dev/null | grep -q "^$SER[[:space:]]*device$"; }

case "${1:-status}" in
up)
  alive && ours && { echo "  already up ($SER = $AVD)"; exit 0; }
  win=(); [ "${DEMO_HEADLESS:-0}" = 1 ] && win=(-no-window)
  echo "  booting $AVD on $PORT (data is PERSISTENT — no wipe)"
  setsid "$EMU" -avd "$AVD" -port "$PORT" -no-boot-anim -gpu host -memory 4096 -cores 4 \
    "${win[@]}" </dev/null >"$MOBILE/qa/reports/demo-emulator.log" 2>&1 &
  for i in $(seq 1 120); do
    if alive && [ "$(timeout 15 "$A" -s "$SER" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; then
      ours || die "$SER is NOT $AVD — refusing to touch it"
      echo "  booted in ${i}0s"; break
    fi; sleep 5
  done
  alive || die "did not boot — see qa/reports/demo-emulator.log"
  # recording-friendly: real animations, visible taps, clean status bar
  for s in window_animation_scale transition_animation_scale animator_duration_scale; do
    timeout 15 "$A" -s "$SER" shell settings put global $s 1.0 >/dev/null
  done
  timeout 15 "$A" -s "$SER" shell settings put system show_touches 1 >/dev/null
  timeout 15 "$A" -s "$SER" shell settings put global sysui_demo_allowed 1 >/dev/null
  for c in "enter" "clock -e hhmm 1000" "battery -e level 100 -e plugged false" \
           "network -e wifi show -e level 4 -e fully true" "notifications -e visible false"; do
    timeout 15 "$A" -s "$SER" shell am broadcast -a com.android.systemui.demo -e command $c >/dev/null 2>&1
  done
  # the dev build fetches its JS from Metro on the host
  timeout 15 "$A" -s "$SER" reverse tcp:8081 tcp:3008 >/dev/null 2>&1
  echo "  ready: taps visible, animations on, clean status bar"
  ;;
install)
  alive && ours || die "not up — run: $0 up"
  [ -f "$APK" ] || die "no APK at $APK"
  echo "  installing $(du -h "$APK" | cut -f1) …"
  timeout 600 "$A" -s "$SER" install -r -d "$APK" 2>&1 | tail -2 | sed 's/^/  /'
  ;;
photos)
  alive && ours || die "not up — run: $0 up"
  d="${2:?usage: $0 photos <dir>}"; [ -d "$d" ] || die "no such dir: $d"
  n=0
  timeout 20 "$A" -s "$SER" shell mkdir -p /sdcard/Pictures/Hatiwal >/dev/null 2>&1
  while IFS= read -r f; do
    timeout 60 "$A" -s "$SER" push "$f" "/sdcard/Pictures/Hatiwal/$(basename "$f")" >/dev/null 2>&1 && n=$((n+1))
  done < <(find "$d" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \))
  timeout 60 "$A" -s "$SER" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
    -d file:///sdcard/Pictures/Hatiwal >/dev/null 2>&1
  timeout 60 "$A" -s "$SER" shell "content call --uri content://media/external/file --method scan_volume" >/dev/null 2>&1
  echo "  pushed $n photo(s) to /sdcard/Pictures/Hatiwal"
  timeout 20 "$A" -s "$SER" shell ls /sdcard/Pictures/Hatiwal | head -12 | sed 's/^/    /'
  ;;
status)
  if alive && ours; then
    echo "  device : $SER ($AVD) UP"
    echo "  app    : $(timeout 15 "$A" -s "$SER" shell pm list packages 2>/dev/null | grep -c "$PKG") installed"
    echo "  photos : $(timeout 15 "$A" -s "$SER" shell ls /sdcard/Pictures/Hatiwal 2>/dev/null | wc -l) in gallery"
    echo "  taps   : show_touches=$(timeout 15 "$A" -s "$SER" shell settings get system show_touches 2>/dev/null | tr -d '\r')"
    echo "  focus  : $(timeout 15 "$A" -s "$SER" shell dumpsys window 2>/dev/null | grep -m1 mCurrentFocus | sed 's/.*\///;s/}.*//')"
  else
    echo "  device : DOWN (run: $0 up)"
  fi
  echo "  metro  : $(ss -ltn 2>/dev/null | grep -q ':3008' && echo 'up on 3008' || echo 'DOWN — the dev build needs it')"
  echo "  api    : $(curl -s -o /dev/null -w '%{http_code}' -m 6 http://localhost:3007/api/v1/categories)"
  ;;
down)
  alive || { echo "  already down"; exit 0; }
  ours || die "$SER is not $AVD — refusing"
  echo "  shutting down cleanly (state is saved)…"
  timeout 60 "$A" -s "$SER" emu kill >/dev/null 2>&1
  for i in $(seq 1 20); do alive || break; sleep 2; done
  alive && die "still up" || echo "  down — session, photos and caches kept"
  ;;
*) sed -n '2,18p' "$0" | sed 's/^# \?//' ;;
esac

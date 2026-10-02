#!/usr/bin/env bash
# Record the Hatiwal how-to tutorial on the PERSISTENT demo device.
#
# One screenrecord PER BEAT, not one for the whole take. Two reasons:
#   * `adb screenrecord` hard-caps at 180s; a full take ran 301s and lost beats 6-7.
#   * Maestro's JVM startup between beats (~5s each) lands OUTSIDE the clips, so the
#     dead time never reaches the edit and no timing file has to be parsed.
set -uo pipefail
export LC_ALL=C
A="$HOME/Android/Sdk/platform-tools/adb"
MAESTRO="$HOME/.maestro/bin/maestro"
M="$HOME/Apps/Personal/Hatiwal/hatiwal-mobile/maestro"
SER=emulator-5596
AVD=hatiwal_demo
OUT="${1:?usage: record_demo.sh <outdir>}"
mkdir -p "$OUT"

[ "$(timeout 15 "$A" -s "$SER" emu avd name 2>/dev/null | head -1 | tr -d '\r')" = "$AVD" ] \
  || { echo "  ERROR: $SER is not $AVD — refusing"; exit 1; }

echo "── back to the start (session kept) ──────────────"
timeout 20 "$A" -s "$SER" shell am force-stop com.hatiwal.app >/dev/null 2>&1
timeout 30 "$A" -s "$SER" shell am start -a android.intent.action.VIEW \
  -d "hatiwal://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A3008" >/dev/null 2>&1
for i in $(seq 1 40); do
  [ "$(timeout 10 "$A" -s "$SER" shell dumpsys window 2>/dev/null | grep -c MainActivity)" -gt 0 ] && break
  sleep 3
done
sleep 6
"$MAESTRO" --device "$SER" test "$M/demo/buy_start.yaml" >"$OUT/start.log" 2>&1 \
  || { echo "  could not reach the Bazaar in buyer mode — see $OUT/start.log"; tail -15 "$OUT/start.log"; exit 1; }
echo "  ok"

# filming conditions (they survive reboots, but re-assert cheaply)
for s in window_animation_scale transition_animation_scale animator_duration_scale; do
  timeout 15 "$A" -s "$SER" shell settings put global $s 1.0 >/dev/null
done
timeout 15 "$A" -s "$SER" shell settings put system show_touches 1 >/dev/null
for c in "enter" "clock -e hhmm 1000" "battery -e level 100 -e plugged false" \
         "network -e wifi show -e level 4 -e fully true" "notifications -e visible false"; do
  timeout 15 "$A" -s "$SER" shell am broadcast -a com.android.systemui.demo -e command $c >/dev/null 2>&1
done

echo "── beats ─────────────────────────────────────────"
FAILED=0
for f in "$M"/demo/buy/*.yaml; do
  id=$(basename "$f" .yaml)
  timeout 20 "$A" -s "$SER" shell rm -f /sdcard/beat.mp4 >/dev/null 2>&1
  # NO `timeout` wrapper here. It used to be `timeout 20 adb shell screenrecord`,
  # which killed adb 20s in; the on-device recorder was then orphaned, never wrote
  # its moov atom, and the pulled file had a size but NO duration. That is what
  # made beat 02 come back as 0.0s twice.
  "$A" -s "$SER" shell screenrecord --bit-rate 12000000 --time-limit 170 /sdcard/beat.mp4 &
  REC=$!
  sleep 2
  if "$MAESTRO" --device "$SER" test "$f" >>"$OUT/beats.log" 2>&1; then st=ok; else st=FAIL; FAILED=1; fi
  sleep 2
  # Stop the recorder ON THE DEVICE so it finalises the file. Killing the host-side
  # adb client does not reliably do that. `pkill` by name is safe here and only
  # here: this is our own emulator (identity checked above) and screenrecord is the
  # only such process on it — the host-side ban on killing by name does not apply.
  timeout 20 "$A" -s "$SER" shell pkill -INT screenrecord >/dev/null 2>&1
  wait $REC 2>/dev/null
  # screenrecord has to write the moov atom before the file is playable. Pulling
  # too early yields a non-zero file with NO duration — beat 02 came back as
  # 69KB / "N/A" that way. Wait for the size on device to stop growing, then pull,
  # and re-pull if ffprobe still cannot read a duration.
  prev=-1
  for w in 1 2 3 4 5 6; do
    cur=$(timeout 20 "$A" -s "$SER" shell stat -c %s /sdcard/beat.mp4 2>/dev/null | tr -d '\r')
    [ "${cur:-0}" = "$prev" ] && [ "${cur:-0}" != "0" ] && break
    prev="${cur:-0}"; sleep 2
  done
  d=""
  for try in 1 2 3; do
    timeout 120 "$A" -s "$SER" pull /sdcard/beat.mp4 "$OUT/$id.mp4" >/dev/null 2>&1
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$id.mp4" 2>/dev/null | grep -E '^[0-9]')
    [ -n "$d" ] && break
    sleep 3
  done
  timeout 20 "$A" -s "$SER" shell rm -f /sdcard/beat.mp4 >/dev/null 2>&1
  if [ -z "$d" ]; then st=FAIL; FAILED=1; d=0; fi
  printf '  %-18s %-4s %5.1fs\n' "$id" "$st" "$d"
  [ "$st" = FAIL ] && { echo "  ↑ stopping"; break; }
done
[ "$FAILED" = 1 ] && { echo "  SOME BEATS FAILED — see $OUT/beats.log"; exit 2; }
echo "  all beats recorded"

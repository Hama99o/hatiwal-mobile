#!/usr/bin/env bash
# Boot / stop the QA emulator. Never runs concurrently with an APK build —
# a saturated host makes the emulator hang on boot (see doctor.sh step 2).
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

emulator_boot() {
  local avd="${1:-$QA_AVD}"
  if resolve_device; then ok "emulator already up ($QA_SERIAL)"; return 0; fi

  # Refuse a same-AVD collision EXPLICITLY rather than letting the emulator fail
  # with "Another emulator instance is running", which sounds like a stale lock
  # and sends you looking in the wrong place. Two sessions must drive two
  # different AVDs; pin them with QA_AVD_1 / QA_AVD_2 in qa.config.sh.
  local other
  other="$(pgrep -af "qemu-system.*-avd[= ]$avd\\b" | head -1)"
  if [ -n "$other" ]; then
    err "AVD '$avd' is already running — another session has it"
    say "give this session its own device: QA_AVD_$QA_SESSION=<other-avd> (see qa.config.example.sh)"
    return 1
  fi

  local cores load
  cores=$(nproc); load=$(awk '{printf "%.0f", $1}' /proc/loadavg)
  if [ "$load" -gt "$cores" ]; then
    err "load $load > $cores cores — refusing to boot; the emulator would hang"
    say "free the machine first (see: qa.sh doctor), then retry"
    return 1
  fi

  # GPU: swiftshader renders in SOFTWARE, i.e. it burns host CPU — which is what
  # made the emulator ANR ("System UI isn't responding") on a busy machine. Use
  # the real GPU when the host has one, and fall back only when it does not.
  local gpu="swiftshader_indirect"
  [ -e /dev/dri/renderD128 ] && gpu="host"

  # ── One emulator per session ────────────────────────────────────────────
  # `-port` pins this instance to the session's own serial, so resolve_device
  # can target it instead of grabbing whatever adb lists first.
  #
  # `-read-only` for sessions 2+: an AVD directory carries a lock, so a second
  # `emulator -avd qa_phone` normally fails outright. Read-only mode lets ONE AVD
  # back several running instances — which is the whole point, since every
  # session installs the same APK and wants the same device definition. The cost
  # is that those instances cannot write a boot snapshot, so they always cold
  # boot (~2 min); session 1 keeps snapshotting and stays fast.
  local ro=()
  [ "$QA_SESSION" -gt 1 ] && ro=(-read-only)

  # ── Clear STALE locks left by an emulator that died uncleanly ───────────
  # An AVD directory holds `hardware-qemu.ini.lock` and `multiinstance.lock`.
  # They are removed on a clean shutdown, but a killed emulator — a host reboot,
  # an OOM, or a session teardown that takes the process group with it — leaves
  # them behind, and the next boot dies with "Another emulator instance is
  # running. Please close it or run all emulators with -read-only flag." That
  # message names the wrong cause: nothing is running. This rig is meant to test
  # unattended for days, so it has to recover from its own crashes instead of
  # waiting for a human to delete two directories.
  #
  # Guarded on there being NO live qemu process for this AVD, so a genuinely
  # running emulator is never disturbed — that check is what makes the removal
  # safe, and it is the reason this is not simply `rm -rf` on every boot.
  if ! pgrep -af "qemu-system.*-avd[= ]$avd\\b" >/dev/null 2>&1; then
    local lock stale=0
    for lock in "$AVD_HOME/$avd.avd/hardware-qemu.ini.lock" \
                "$AVD_HOME/$avd.avd/multiinstance.lock"; do
      [ -e "$lock" ] || continue
      rm -rf -- "$lock" && stale=1
    done
    [ "$stale" = 1 ] && warn "cleared stale lock(s) for $avd (no live emulator held them)"
  fi

  # Snapshot: saving one turns the next boot from ~105s into a few seconds.
  say "booting $avd as session $QA_SESSION on port $QA_PORT (gpu=$gpu)…"
  # `9>&-` CLOSES THE DEVICE-LOCK FD IN THE CHILD — do not remove it.
  #
  # `hold_device_lock` takes flock on fd 9 in the calling shell. A background
  # child inherits open fds, so without this the EMULATOR ends up holding the
  # lock for as long as it lives — and since flock is released only when every
  # holder closes it, every later command on that session blocks forever on
  # "another QA run is driving the emulator", waiting for the very emulator it
  # is supposed to drive.
  #
  # This was not theoretical: it silently consumed a 50-minute `feature browse`
  # run that produced zero results, and made `up tablet` claim another run was
  # in progress when nothing was.
  setsid "$EMULATOR_BIN" -avd "$avd" -no-boot-anim -port "$QA_PORT" "${ro[@]}" \
    -gpu "$gpu" -memory "$QA_EMU_MEMORY" -cores "$QA_EMU_CORES" \
    < /dev/null > "$REPORTS_DIR/emulator.log" 2>&1 9>&- &

  local waited=0
  while [ "$waited" -lt 300 ]; do
    if resolve_device && [ "$(adb_qa shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
      ok "booted in ${waited}s ($QA_SERIAL)"
      adb_qa shell settings put global window_animation_scale 0 >/dev/null 2>&1
      adb_qa shell settings put global transition_animation_scale 0 >/dev/null 2>&1

      # ── Give the device a LOCATION ──────────────────────────────────────
      # A fresh emulator has no GPS fix at all, so anything that calls
      # getCurrentPositionAsync times out and the app shows "Couldn't determine
      # your location. Please try again." That is the app behaving correctly, but
      # it means every location-dependent flow fails for a reason that has nothing
      # to do with the app: "Nearest first" sorting, distance filters, the map
      # picker, "use my current location".
      #
      # Kabul, because the fixtures are Afghan cities and a distance sort against
      # Mountain View would order them meaninglessly.
      adb_qa emu geo fix "$QA_GEO_LON" "$QA_GEO_LAT" >/dev/null 2>&1 \
        && ok "location seeded ($QA_GEO_LAT, $QA_GEO_LON)" \
        || warn "could not seed a device location — distance/nearest flows will fail"

      # ── Put photos in the GALLERY ───────────────────────────────────────
      # A fresh emulator's gallery is EMPTY. So every "add photos to a listing"
      # flow opens the system picker, finds nothing to select, and then fails on
      # the cover-photo badge — `Assertion is false: "Cover" is visible` — with
      # nothing whatsoever wrong with the app. Four create-listing flows and the
      # whole gallery/ area were unpassable for this reason alone.
      #
      # MEDIA_SCANNER_SCAN_FILE is deprecated for apps but still works from adb
      # shell, and it is what makes the files visible to the picker rather than
      # merely present on disk (verified: the media store lists them afterwards).
      if [ -f "$QA_GALLERY_IMAGE" ]; then
        local n
        adb_qa shell mkdir -p /sdcard/Pictures/QA >/dev/null 2>&1
        for n in 1 2 3 4; do
          adb_qa push "$QA_GALLERY_IMAGE" "/sdcard/Pictures/QA/qa_photo_$n.png" >/dev/null 2>&1
          adb_qa shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
            -d "file:///sdcard/Pictures/QA/qa_photo_$n.png" >/dev/null 2>&1
        done
        ok "gallery seeded (4 photos)"
      else
        warn "no seed image at $QA_GALLERY_IMAGE — photo-picker flows will fail"
      fi
      adb_qa shell settings put global animator_duration_scale 0 >/dev/null 2>&1
      ok "animations disabled (flows run faster and flake less)"
      return 0
    fi
    sleep 5; waited=$((waited+5))
  done
  err "emulator did not finish booting in 300s — see $REPORTS_DIR/emulator.log"
  return 1
}

emulator_stop() {
  # `emu kill` shuts down cleanly and saves the boot snapshot; kill -9 does not,
  # which is why a wedged emulator always costs a full cold boot afterwards.
  resolve_device && { adb_qa emu kill >/dev/null 2>&1; ok "emulator stopped (snapshot saved)"; } \
    || warn "no emulator running"
}

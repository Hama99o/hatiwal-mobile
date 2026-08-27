#!/usr/bin/env bash
# Shared environment + helpers for the Hatiwal mobile QA rig.
# Sourced by every qa/lib/*.sh script — never duplicate this logic.

set -uo pipefail

QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$(cd "$QA_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$MOBILE_DIR/.." && pwd)"

# ── PER-PROJECT CONFIG ─────────────────────────────────────────────────
# Everything app-specific lives in ONE optional file so this rig can be dropped
# into another React Native project without editing the machinery:
#
#   qa/qa.config.sh   — app id, AVDs, ports, backend, seed command, accounts
#
# It is sourced FIRST, and every setting below is `${VAR:-default}`, so the
# config only needs the values that differ. Copy qa/qa.config.example.sh to
# qa/qa.config.sh and edit. Without it, the defaults describe this project.
[ -f "$QA_DIR/qa.config.sh" ] && source "$QA_DIR/qa.config.sh"

# The sibling backend directory, if the project has one. Only used by `seed`
# and by doctor's backend check — a project with no local backend can leave
# QA_SEED_CMD empty and this is then irrelevant.
API_DIR="${API_DIR:-$WORKSPACE_DIR/hatiwal-api}"

# How to reset test data. Rails here; another project might use
# `npm run seed:e2e` or a curl against a fixtures endpoint. Empty = skip.
QA_SEED_CMD="${QA_SEED_CMD:-bundle exec rake db:seed:reset_e2e}"

# The Docker container serving Metro, if Metro runs in Docker. Used only to
# restart it when it OOMs mid-suite. Empty = Metro is not containerized.
QA_METRO_CONTAINER="${QA_METRO_CONTAINER:-hatiwal-mobile-mobile-1}"
# Substring identifying THIS project's Metro containers, so doctor can tell a
# competing project's Metro on :8081 apart from ours.
QA_PROJECT_TAG="${QA_PROJECT_TAG:-hatiwal}"
# The Docker container running the Rails API — used by clear_blocks.sh AND by
# doctor's card #296/SF-QA1 hard gate (step 8): "the app opened" is not
# evidence the RIGHT bundle loaded, since :8081 can silently serve a different
# Expo project's JS into this same APK (see the competing-Metro check above).
# Tailing THIS container's own request log for a hit during THIS launch is the
# one signal that cannot be faked by a wrong bundle rendering unrelated UI.
QA_API_CONTAINER="${QA_API_CONTAINER:-hatiwal-api-web-1}"

# ── Android / tooling ──────────────────────────────────────────────────
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR_BIN="$ANDROID_HOME/emulator/emulator"
MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"

# Metro needs Node 20+ — Node 18 crashes on `toReversed` inside metro.
QA_NODE_DIR="${QA_NODE_DIR:-$HOME/.nvm/versions/node/v20.19.0/bin}"

# ── App / backend ──────────────────────────────────────────────────────
APP_ID="${APP_ID:-com.hatiwal.app}"
AVD_PHONE="${AVD_PHONE:-qa_phone}"
AVD_TABLET="${AVD_TABLET:-qa_tablet}"
# Where the AVD directories live, so stale-lock recovery can find them.
# Honours ANDROID_AVD_HOME when the SDK is configured with a custom location.
AVD_HOME="${AVD_HOME:-${ANDROID_AVD_HOME:-$HOME/.android/avd}}"

# Device location seeded at boot. A fresh emulator has NO GPS fix, so every
# location-dependent flow fails on "Couldn't determine your location". Defaults to
# Kabul so distance sorting against the Afghan fixtures is meaningful.
QA_GEO_LAT="${QA_GEO_LAT:-34.5553}"
QA_GEO_LON="${QA_GEO_LON:-69.2075}"

# Image copied into the device gallery at boot. A fresh emulator has NO photos, so
# every flow that adds a photo to a listing opens an empty system picker and then
# fails on the cover badge. Any real image will do; the app only needs something
# selectable.
QA_GALLERY_IMAGE="${QA_GALLERY_IMAGE:-$MOBILE_DIR/assets/icon.png}"

# Cores and RAM per emulator. THIS is what bounds how many sessions a host can
# actually run, and getting it wrong is expensive in a way that is easy to
# misread: four emulators at 4 cores each request all 16 cores of this machine,
# leaving nothing for adb, Maestro, Metro or the app's own startup. The emulators
# then cannot boot the bundle in time and EVERY flow on the newer sessions fails
# with `"Development Build" is not visible` — which looks like a Metro problem,
# except Metro sits at 0.8% CPU because it is never reached.
#
# Rule of thumb: keep (sessions x QA_EMU_CORES) at roughly half the host's cores.
QA_EMU_CORES="${QA_EMU_CORES:-4}"
QA_EMU_MEMORY="${QA_EMU_MEMORY:-3072}"

METRO_PORT="${METRO_PORT:-3008}"
API_PORT="${API_PORT:-3007}"

# ALWAYS 10.0.2.2 for emulator QA — never the LAN IP.
#
# From inside an Android emulator, 10.0.2.2 is the host, full stop: it does not
# change when the machine moves between WiFi and a hotspot, and it works with no
# network at all. A LAN IP does change — this repo's .env carries two (office
# 192.168.1.24 / hotspot 172.20.10.12) and the wrong one makes EVERY flow fail
# with network errors that look like app bugs.
#
# The bundle must agree, because Metro inlines EXPO_PUBLIC_API_URL at build time.
# Start Metro accordingly:  HOST_IP=10.0.2.2 docker compose up -d mobile
HOST_IP="${HOST_IP:-10.0.2.2}"
API_URL="${API_URL:-http://${HOST_IP}:${API_PORT}/api/v1}"

# ...but this shell cannot reach 10.0.2.2 (that address only means anything to
# the emulator), so preflight checks the SAME backend over localhost.
API_URL_LOCAL="${API_URL_LOCAL:-http://localhost:${API_PORT}/api/v1}"

# ── QA test accounts (db/seeds/e2e.rb) ─────────────────────────────────
QA_BUYER_EMAIL="${QA_BUYER_EMAIL:-buyer@hatiwal.test}"
QA_SELLER_EMAIL="${QA_SELLER_EMAIL:-seller@hatiwal.test}"
QA_PASSWORD="${QA_PASSWORD:-Password123!}"

# ── SESSIONS: several QA runs at once, one emulator each ───────────────
#
# One emulator can only be driven by ONE Maestro at a time — two tear down each
# other's on-device driver and the flow "fails" in ~0s having run nothing. That
# used to mean a second QA session was simply blocked (and, worse, its launcher
# failures looked like app bugs — see qa/UI_FINDINGS.md RIG-001).
#
# So each session gets its OWN emulator instance, and everything that can collide
# is namespaced by session id: the serial it drives, the device lock it holds, and
# the reports directory it writes.
#
#   QA_SESSION=1 ./qa/qa.sh up          # emulator-5554, reports/
#   QA_SESSION=2 ./qa/qa.sh up          # emulator-5556, reports/s2/
#   QA_SESSION=3 ./qa/qa.sh feature chat  # emulator-5558, reports/s3/
#
# Session 1 keeps the original serial and reports path, so existing habits, docs
# and report links do not move.
#
# SAME APK, SAME AVD: instances 2+ boot the AVD with `-read-only`, which is what
# lets one AVD back several running emulators (without it the second boot fails on
# the AVD lock). They install the same built APK, so there is nothing to keep in
# sync between sessions.
QA_SESSION="${QA_SESSION:-1}"
case "$QA_SESSION" in
  ''|*[!0-9]*) echo "QA_SESSION must be a positive integer (got '$QA_SESSION')" >&2; exit 1;;
esac
[ "$QA_SESSION" -ge 1 ] || { echo "QA_SESSION must be >= 1" >&2; exit 1; }

# Emulator console ports go up in TWOS (5554, 5556, 5558…) — the odd port in each
# pair is the adb channel, so stepping by one would collide with the previous
# instance's adb.
# Emulator console ports. Base is configurable because another project's QA rig on
# this machine also starts at 5554 — see _device_is_ours. Moving this session's
# range is the clean way out of a collision.
QA_PORT_BASE="${QA_PORT_BASE:-5554}"
QA_PORT=$(( QA_PORT_BASE + 2 * (QA_SESSION - 1) ))
QA_WANT_SERIAL="emulator-$QA_PORT"

# ── Which AVD belongs to THIS session ──────────────────────────────────────
# Set QA_AVD_1, QA_AVD_2, … in qa.config.sh to pin a form factor per session —
# that is the whole point of running several: one drives a tablet, another a
# phone, a third a small phone. Without it, `qa.sh up` defaulted to the phone for
# EVERY session, so two sessions booted the SAME AVD and the second died with
# "Another emulator instance is running", which names the wrong cause.
#
# MUST come after the QA_SESSION default above: this reads QA_SESSION, and under
# `set -u` an unset QA_SESSION aborts every command in the rig — which is exactly
# what happened when it was declared higher up, and it only went unnoticed because
# every invocation had been passing QA_SESSION explicitly.
_qa_avd_var="QA_AVD_${QA_SESSION}"
QA_AVD="${!_qa_avd_var:-$AVD_PHONE}"

# ── Run bookkeeping ────────────────────────────────────────────────────
RUN_ID="${RUN_ID:-}"
REPORTS_DIR="$QA_DIR/reports"
[ "$QA_SESSION" -gt 1 ] && REPORTS_DIR="$QA_DIR/reports/s$QA_SESSION"
# Created HERE, not at first write: the device lock lives in this directory and
# is opened before anything else, so a missing directory turned into
# "flock: Bad file descriptor" → "another QA run is driving the emulator",
# which is a maximally misleading way to say "mkdir".
mkdir -p "$REPORTS_DIR"

# ── Logging ────────────────────────────────────────────────────────────
_c() { case "$1" in red) printf '\033[31m';; grn) printf '\033[32m';; ylw) printf '\033[33m';; blu) printf '\033[36m';; dim) printf '\033[2m';; *) printf '';; esac; }
_r() { printf '\033[0m'; }
say()  { _c blu; printf '  %s\n' "$*"; _r; }
ok()   { _c grn; printf '  OK    %s\n' "$*"; _r; }
warn() { _c ylw; printf '  WARN  %s\n' "$*"; _r; }
err()  { _c red; printf '  FAIL  %s\n' "$*"; _r; }
step() { printf '\n'; _c blu; printf '── %s %s\n' "$*" "$(printf '─%.0s' $(seq 1 $((60 - ${#1}))))"; _r; }
die()  { err "$*"; exit 1; }

# adb against the one QA device, whichever it is
# `9>&-` CLOSES THE DEVICE-LOCK FD — every adb call, not just the emulator launch.
#
# hold_device_lock takes flock on fd 9, and every child inherits open fds. flock is
# released only when the LAST holder closes it, so any adb process that hangs keeps
# the session's lock forever. That is not hypothetical: an
# `adb -s emulator-5556 logcat -d` was found still holding session 2's lock long
# after emulator-5556 had died, and every later `qa.sh up` for that session
# reported "another QA run is driving the emulator" with no such run in existence.
# emulator.sh already did this for the emulator itself; adb needed it just as much,
# because a dead device makes adb block indefinitely.
adb_qa() { "$ADB" ${QA_SERIAL:+-s "$QA_SERIAL"} "$@" 9>&-; }

# Same thing, but time-bounded. NOTE: `timeout` execs a binary and therefore
# CANNOT run a shell function — `timeout 30 adb_qa ...` fails with exit 127
# ("No such file or directory"), which silently reads as "the device is wedged".
# Always use this wrapper when a time limit is needed.
adb_qa_t() { local t="$1"; shift; timeout "$t" "$ADB" ${QA_SERIAL:+-s "$QA_SERIAL"} "$@" 9>&-; }

# Resolve THIS SESSION's emulator serial into QA_SERIAL.
#
# Pinned to the session's own port rather than "the first device adb lists".
# With several emulators up, first-match would hand two sessions the same device
# — which is the exact collision the session split exists to prevent, and it
# would be invisible: both sessions would appear to work while corrupting each
# other's runs.
# Is the emulator on this serial OURS? Compares the running AVD name.
#
# NOT paranoia — this machine runs more than one project's QA rig, and they pick
# emulator ports the same way. `emulator-5554` was found running `qa_edu_phone`
# (the edu-safi project's AVD) while this rig happily reported "session 1 already
# up" and installed Hatiwal onto it. Driving another project's emulator is bad in
# both directions: our results are meaningless, and we trample their run.
#
# Empty QA_AVD (or an emulator that will not answer) is treated as a match, so a
# hand-booted device is still usable — the check only rejects a device that
# positively identifies as a DIFFERENT AVD.
_device_is_ours() {
  local serial="$1" name
  [ -n "${QA_AVD:-}" ] || return 0
  name="$("$ADB" -s "$serial" emu avd name 2>/dev/null | head -1 | tr -d '\r')"
  [ -n "$name" ] || return 0
  [ "$name" = "$QA_AVD" ]
}

resolve_device() {
  if "$ADB" devices | grep -q "^${QA_WANT_SERIAL}[[:space:]]*device$"; then
    if _device_is_ours "$QA_WANT_SERIAL"; then
      QA_SERIAL="$QA_WANT_SERIAL"
      export QA_SERIAL
      return 0
    fi
    warn "$QA_WANT_SERIAL is running another project's AVD ($("$ADB" -s "$QA_WANT_SERIAL" emu avd name 2>/dev/null | head -1 | tr -d '\r')) — not ours"
    say "set QA_PORT_BASE to move this session off the contended port range"
    return 1
  fi
  # Session 1 also accepts a single emulator on a non-standard port: an emulator
  # someone booted by hand is still usable, and refusing it would be unhelpful.
  if [ "$QA_SESSION" = "1" ]; then
    local only
    only="$("$ADB" devices | awk '/emulator-[0-9]+\tdevice/{print $1}' | head -2)"
    # MUST verify identity here too. This convenience path is how session 1 adopted
    # another project's emulator twice: the only device attached was
    # `emulator-5584` running `qa_edu_phone` (edu-safi), and because it was the
    # only one, this branch accepted it and app_install pushed Hatiwal onto their
    # device. The port check above rejected it; this fallback happily did not.
    if [ "$(printf '%s\n' "$only" | grep -c .)" = "1" ] && _device_is_ours "$only"; then
      QA_SERIAL="$only"; export QA_SERIAL; return 0
    fi
  fi
  return 1
}

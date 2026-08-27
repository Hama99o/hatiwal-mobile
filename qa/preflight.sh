#!/usr/bin/env bash
# Mobile QA preflight — verify the app is actually testable before running flows:
# tools, emulator, env/config, backend reachability, app install, clean launch.
# Prints a checklist; exits non-zero on any blocker.
#
# Usage:  APP_ID=com.yourorg.app API_URL=http://10.0.2.2:3000 ./preflight.sh
#
# ─────────────────────────────────────────────────────────────────────────
# Card #296 / SF-QA1 — copied into this repo from
# ~/.claude/skills/qa-sweep/assets/maestro/preflight.sh (a generic,
# cross-project skill asset — that file is OUTSIDE this repo and is never
# edited directly) so the fix below travels WITH the codebase instead of
# living only on one machine's home directory.
#
# THE BUG, as shipped: step 7's logcat scan grepped bare `AndroidRuntime` —
# every line tagged AndroidRuntime, at ANY log level, for ANY process. That
# includes `monkey`'s OWN launcher output, used by this very script to start
# the app:
#
#   D AndroidRuntime: Calling main entry com.android.commands.monkey.Monkey
#   I AndroidRuntime: VM exiting with result code 0.
#
# "VM exiting with result code 0" is monkey's SUCCESS message — the launch
# worked. Grepping it as a crash signature means this check fails on every
# app, every time, which is worse than not checking at all: a real crash
# reads identically to a clean launch in the report, and the whole night's
# results would need re-verifying by hand.
#
# THE FIX: match only signals that a real problem — never monkey's own
# announcement — produces:
#   - FATAL EXCEPTION                              (an uncaught Java crash)
#   - ReactNativeJS.*[Ee]rror                       (a red-box / uncaught JS error)
#   - Could not connect to development server       (Metro unreachable)
#   - Unable to load script                         (bundle fetch/parse failure)
#   - Invariant Violation / Unhandled JS Exception   (RN's own redbox markers)
# `AndroidRuntime` alone is DROPPED — a genuine native crash always ALSO
# prints "FATAL EXCEPTION" in the same logcat block, so nothing real is lost.
#
# Verified 2026-08-27 against a live emulator (emulator-5554, qa_phone,
# Android 15) running com.hatiwal.app: the shipped regex FAILED (caught
# monkey's own launcher lines); this narrowed version PASSES on the exact
# same launch.
# ─────────────────────────────────────────────────────────────────────────
set -uo pipefail
APP_ID="${APP_ID:-com.hatiwal.app}"
# NOT 10.0.2.2 by default: that address means something only from INSIDE the
# emulator, and this check curls it from the HOST shell — a curl against it
# from here fails silently and this script used to (mis)report that as "ok"
# ("-> HTTP 000000", curl's own no-response code, which is NOT "000" and so
# slipped past the `!= 000` guard). localhost is what the HOST can actually
# reach; override with the app's own 10.0.2.2 URL only if you want to prove
# the STRING matches, not that the backend answers.
API_URL="${API_URL:-http://localhost:3007/api/v1}"     # backend base URL, reachable FROM THIS SHELL
fail=0
ok(){   echo "  ok    $1"; }
bad(){  echo "  FAIL  $1"; fail=1; }
warn(){ echo "  warn  $1"; }

echo "== Mobile QA preflight (Hatiwal copy, card #296/SF-QA1) =="

# 1. Tooling
command -v adb     >/dev/null 2>&1 && ok "adb present"     || bad "adb not found (Android Studio platform-tools)"
# maestro is NOT on the default PATH on this host — ~/.maestro/bin/maestro.
MAESTRO_BIN="$(command -v maestro 2>/dev/null || echo "$HOME/.maestro/bin/maestro")"
[ -x "$MAESTRO_BIN" ] && ok "maestro present ($MAESTRO_BIN)" \
                       || bad "maestro not installed (curl -fsSL https://get.maestro.mobile.dev | bash)"

# 2. Emulator / device online
if adb devices 2>/dev/null | awk 'NR>1 && $2=="device"{f=1} END{exit !f}'; then
  ok "emulator/device online ($(adb devices | awk 'NR>1 && $2=="device"{print $1}' | head -1))"
else
  bad "no Android emulator/device online — start an AVD in Android Studio"
fi

# 3. Env / config sanity (the classic emulator networking trap)
[ -f .env ] && ok ".env present" || warn "no .env at repo root"
cfg="$( { grep -RhoE '(API|BASE|BACKEND)[A-Z_]*=.*' .env .env.* 2>/dev/null; \
          grep -RhoE '"?(apiUrl|baseUrl|API_URL|host)"?[[:space:]]*[:=].*' app.json app.config.* 2>/dev/null; } || true )"
if echo "$cfg" | grep -qiE '127\.0\.0\.1|localhost'; then
  warn "API URL uses localhost/127.0.0.1 — from an Android emulator that means the EMULATOR itself."
  warn "  Use 10.0.2.2 to reach the host machine's localhost, or your LAN IP for a real device."
fi

# 4. Metro bundler (Expo / RN dev build needs it)
#
# THE TRAP (card #296/SF-QA1, measured on this host): :8081 can be serving a
# COMPLETELY DIFFERENT project. Verified here — :8081 answers
# `packager-status:running` for /home/hama99o/Apps/Seven/openaleph-mobile,
# not Hatiwal, and 404s on every Hatiwal module path. A dev build defaults to
# 8081, so "Metro is running on :8081" is NOT evidence THIS app's Metro is up
# — it can just as easily mean the wrong app's bundle is one launch away from
# loading into this APK. Hatiwal's own Metro is :3008 (docker container
# hatiwal-mobile-mobile-1) — checked FIRST and explicitly, with :8081 only a
# secondary/legacy fallback for a non-Hatiwal project using this same script.
METRO_PORT="${METRO_PORT:-3008}"
if curl -s --max-time 2 "http://localhost:$METRO_PORT/status" 2>/dev/null | grep -qi running; then
  ok "Hatiwal's own Metro running (:$METRO_PORT)"
else
  warn "Metro not detected on :$METRO_PORT — run 'docker compose up -d mobile' (or 'npx expo start') if this is a dev build"
fi
OTHER_8081=$(curl -s --max-time 2 http://localhost:8081/status 2>/dev/null)
if [ "$OTHER_8081" = "packager-status:running" ] && [ "$METRO_PORT" != "8081" ]; then
  OTHER_NAME=$(curl -s --max-time 4 http://localhost:8081/ 2>/dev/null | grep -oE '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  warn "ANOTHER project ('${OTHER_NAME:-unknown}') is serving Metro on host :8081"
  warn "  the dev-client launcher auto-picks 10.0.2.2:8081 from INSIDE the emulator —"
  warn "  make sure the app is pointed at :$METRO_PORT explicitly before trusting any flow"
fi

# 5. Backend reachable from host
if [ -n "$API_URL" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$API_URL" 2>/dev/null || echo 000)
  [ "$code" != 000 ] && ok "backend reachable from host ($API_URL -> HTTP $code)" \
                      || bad "backend NOT reachable at $API_URL — start it before testing"
else
  warn "API_URL not set — skipping backend check (set API_URL to the URL the app uses, e.g. http://10.0.2.2:3007)"
fi

# 6. App installed?
installed=0
if [ -n "$APP_ID" ]; then
  if adb shell pm list packages 2>/dev/null | grep -q "$APP_ID"; then installed=1; ok "app installed ($APP_ID)";
  else bad "app $APP_ID not installed — build & install a dev build: npx expo run:android"; fi
else
  bad "APP_ID not set (app.json -> android.package)"
fi

# 7. Clean launch — no red-box / native crash right after start
#
# NARROWED (card #296/SF-QA1) — see the header comment for why bare
# `AndroidRuntime` is gone. Every remaining term is a signal a real problem
# produces and monkey's own launcher output never does.
if [ "$installed" = 1 ]; then
  adb logcat -c >/dev/null 2>&1
  adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 6
  crash=$(adb logcat -d 2>/dev/null | grep -iE 'FATAL EXCEPTION|ReactNativeJS.*[Ee]rror|Could not connect to development server|Unable to load script|Invariant Violation|Unhandled JS Exception' | head -5)
  [ -z "$crash" ] && ok "app launched, no fatal errors in logcat" \
                   || { bad "errors after launch:"; echo "$crash" | sed 's/^/        /'; }
fi

echo
if [ $fail -eq 0 ]; then echo "PREFLIGHT PASSED — safe to run flows"; else echo "PREFLIGHT FAILED — fix the blockers above first"; fi
exit $fail

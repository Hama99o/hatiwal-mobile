#!/usr/bin/env bash
# Build + install the app under test.
#
# WHY A DEBUG BUILD: src/api/http.ts throws at startup when a non-__DEV__ build
# points at a local/http API. So a release APK can never be used against the
# local Rails — QA against local seed data REQUIRES a debug build + Metro.
# (The preview/production APKs point at the LIVE api; running write-flows with
# one of those would create test listings in production.)
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

APK_PATH="$MOBILE_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

app_build() {
  local cores load
  cores=$(nproc); load=$(awk '{printf "%.0f", $1}' /proc/loadavg)
  if [ "$load" -gt $((cores * 3 / 2)) ]; then
    err "load $load is too high to build (has $cores cores)"
    say "gradle will thrash swap and stall. Free the machine, then retry."
    return 1
  fi

  say "building debug APK (first build 10-20 min, then incremental)…"
  # Leave headroom so the machine stays usable and the build cannot starve
  # anything else — this is what made the first attempt unusable.
  local workers=$(( cores / 2 )); [ "$workers" -lt 2 ] && workers=2
  ( cd "$MOBILE_DIR/android" && \
    PATH="$QA_NODE_DIR:$ANDROID_HOME/platform-tools:$PATH" \
    nice -n 10 ./gradlew assembleDebug --console=plain --max-workers="$workers" ) \
    2>&1 | tee "$QA_DIR/reports/build.log" | grep -E "^> Task|BUILD|FAILURE|error:" | tail -20

  [ -f "$APK_PATH" ] && ok "APK: $APK_PATH ($(du -h "$APK_PATH" | cut -f1))" \
    || { err "build produced no APK — see $QA_DIR/reports/build.log"; return 1; }
}

app_install() {
  resolve_device || { err "no emulator — run: qa.sh up"; return 1; }
  [ -f "$APK_PATH" ] || { err "no debug APK — run: qa.sh build"; return 1; }
  say "installing $APP_ID…"
  adb_qa install -r -d "$APK_PATH" 2>&1 | tail -2
  adb_qa shell pm list packages | grep -q "$APP_ID" && ok "installed" || { err "install failed"; return 1; }
  # A debug build fetches its JS bundle from localhost:8081 inside the device.
  adb_qa reverse tcp:8081 "tcp:$METRO_PORT" >/dev/null 2>&1 && ok "adb reverse 8081 → :$METRO_PORT"
}

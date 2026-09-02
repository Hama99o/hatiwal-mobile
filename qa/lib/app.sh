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

  # QA_BUNDLED=1 embeds the JS bundle in the APK instead of fetching it from
  # Metro at runtime. Owner, 2026-09-02: "reset the qa test, they use the real
  # app, we should use apk".
  #
  # It freezes the code under test at BUILD time, which fixes two things that
  # cost real runs today: a source edit hot-reloading into a flow that is
  # mid-run (a result then belongs to two versions of the code — one run even
  # received a briefly broken bundle), and having no answer to "which code did
  # this pass?", because an APK's date says nothing about the JS inside it.
  #
  # Still a DEBUG build: src/api/http.ts throws at startup when a non-__DEV__
  # build points at a local/http API, so release can never be used against the
  # local Rails (see this file's header).
  local gradle_args=(assembleDebug)
  if [ "${QA_BUNDLED:-0}" = "1" ]; then
    gradle_args+=(-PqaBundledDebug=true)
    say "building BUNDLED debug APK (JS embedded — no Metro at runtime)…"
  else
  say "building debug APK (first build 10-20 min, then incremental)…"
  fi
  # Leave headroom so the machine stays usable and the build cannot starve
  # anything else — this is what made the first attempt unusable.
  local workers=$(( cores / 2 )); [ "$workers" -lt 2 ] && workers=2
  ( cd "$MOBILE_DIR/android" && \
    PATH="$QA_NODE_DIR:$ANDROID_HOME/platform-tools:$PATH" \
    nice -n 10 ./gradlew "${gradle_args[@]}" --console=plain --max-workers="$workers" ) \
    2>&1 | tee "$QA_DIR/reports/build.log" | grep -E "^> Task|BUILD|FAILURE|error:" | tail -20

  # Stop the Gradle daemon. It survives the build holding ~1.7GB for nothing, and
  # the very next thing this rig does is boot 3GB emulators — so the memory it
  # keeps is memory the emulators need. It cost a real failure: `doctor` refused a
  # run with "only 3GB RAM available" and "swap 98% full" while the single largest
  # reclaimable chunk was an idle daemon from a build that had finished an hour
  # earlier. Keeping it would only pay off for a second build, and this rig builds
  # once and then tests for hours.
  ( cd "$MOBILE_DIR/android" && \
    PATH="$QA_NODE_DIR:$ANDROID_HOME/platform-tools:$PATH" \
    ./gradlew --stop >/dev/null 2>&1 ) || true

  # Stamp WHAT was built, beside the APK. With an embedded bundle the APK IS the
  # code under test, so a run becomes attributable to a commit — the question an
  # APK's mtime cannot answer, and answered wrongly today: a 10-day-old APK was
  # blamed for a bug while Metro was quietly serving current code.
  if [ -f "$APK_PATH" ]; then
    {
      echo "built:   $(date -Is)"
      echo "commit:  $(git -C "$MOBILE_DIR" rev-parse HEAD 2>/dev/null)"
      echo "subject: $(git -C "$MOBILE_DIR" log -1 --pretty=%s 2>/dev/null)"
      echo "bundled: ${QA_BUNDLED:-0}"
      echo "dirty:   $(git -C "$MOBILE_DIR" status --porcelain -- src app 2>/dev/null | wc -l) uncommitted file(s) under src/ or app/"
    } > "$(dirname "$APK_PATH")/apk-provenance.txt"
    ok "provenance: $(git -C "$MOBILE_DIR" rev-parse --short HEAD 2>/dev/null) bundled=${QA_BUNDLED:-0}"
  fi

  [ -f "$APK_PATH" ] && ok "APK: $APK_PATH ($(du -h "$APK_PATH" | cut -f1))" \
    || { err "build produced no APK — see $QA_DIR/reports/build.log"; return 1; }
}

app_install() {
  resolve_device || { err "no emulator — run: qa.sh up"; return 1; }
  [ -f "$APK_PATH" ] || { err "no debug APK — run: qa.sh build"; return 1; }
  say "installing $APP_ID…"
  adb_qa_t 300 install -r -d "$APK_PATH" 2>&1 | tail -2
  adb_qa_t 25 shell pm list packages | grep -q "$APP_ID" && ok "installed" || { err "install failed"; return 1; }
  # A debug build fetches its JS bundle from localhost:8081 inside the device.
  adb_qa_t 25 reverse tcp:8081 "tcp:$METRO_PORT" >/dev/null 2>&1 && ok "adb reverse 8081 → :$METRO_PORT"
}

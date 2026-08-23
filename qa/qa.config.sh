#!/usr/bin/env bash
# Live per-machine QA config (gitignored-by-intent: it describes THIS host).
# Copy of qa.config.example.sh with the values this machine actually needs.

# ── Fleet: one AVD per session, one form factor each ───────────────────────
export QA_AVD_1="qa_tablet"      # 1280dp tablet
export QA_AVD_2="qa_phone"       # 411dp phone
export QA_AVD_3="qa_phone2"      # 360dp small phone (set via `qa.sh profile small`)
export QA_AVD_4="qa_phone3"      # 448dp large phone (`qa.sh profile large`)
export QA_AVD_5="qa_phone4"      # 411dp phone

# ── Cores per emulator — THE knob that decides how many sessions fit ──────
# 16 cores on this host. At the default 4 cores each, FOUR emulators claim every
# core and starve adb, Maestro and the app's own startup: whole sessions then fail
# with "Development Build is not visible" while Metro sits at 0.8% CPU because
# nothing ever reaches it.
#
# At 2 cores each, five emulators use 10 and leave 6 for Metro, adb, Maestro and
# the OS. An emulator with 2 cores boots and renders a little slower, which is a
# far better trade than a session producing fiction.
# TWO SESSIONS is the working configuration on this host, tried and measured:
#
#   5 sessions @ 2 cores — 0 passes out of 8 flows. Load pinned at 16/16, memory
#                          down to 5GB, and flows failing before they began.
#   4 sessions @ 4 cores — whole sessions red with "Development Build is not
#                          visible" while Metro sat at 0.8% CPU, never reached.
#   2 sessions @ 4 cores — real results, ~150s per flow.
#
# The limit is not AVDs or RAM, it is that an emulator needs real CPU to boot a JS
# bundle. Past two, the extra sessions do not just run slower — they produce
# failures that LOOK like app bugs, which is worse than no coverage at all.
export QA_EMU_CORES=4
export QA_EMU_MEMORY=3072

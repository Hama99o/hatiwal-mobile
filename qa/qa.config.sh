#!/usr/bin/env bash
# Live per-machine QA config (gitignored-by-intent: it describes THIS host).
# Copy of qa.config.example.sh with the values this machine actually needs.

# ── Fleet: one AVD per session, one form factor each ───────────────────────
export QA_AVD_1="qa_phone"       # 411dp phone — THE primary target. Was qa_tablet:
#   session 1 is the DEFAULT session, so "one form factor per session" quietly meant
#   the entire suite was judged on a 2560x1600 landscape tablet and the phone was
#   never tested at all. Bottom sheets, the tab bar and every RTL layout differ
#   there, which is where seller 0/8, rtl 0/8, reviews 0/3 and safety 0/2 came from.
export QA_AVD_2="qa_phone4"      # 411dp phone — distinct AVD; two sessions on one AVD dies with "Another emulator instance is running"
export QA_AVD_3="qa_phone2"      # 360dp small phone (set via `qa.sh profile small`)
export QA_AVD_4="qa_phone3"      # 448dp large phone (`qa.sh profile large`)
export QA_AVD_5="qa_tablet"      # tablet — explicit form-factor passes only, never the default

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

# ── Emulator console ports ─────────────────────────────────────────────────
# Moved off 5554 because ANOTHER project's QA rig on this machine starts there:
# emulator-5554 was found running `qa_edu_phone` (edu-safi) while this rig
# reported "session 1 already up" and installed Hatiwal onto it. Sessions here now
# use 5580, 5582, … and lib/common.sh additionally verifies the AVD name before
# driving any device, so a future collision is refused rather than adopted.
export QA_PORT_BASE=5580

#!/usr/bin/env bash
# Stop the kernel OOM-killer picking the emulator first.
#
# The emulator was dying FIVE times in one day, each death taking the running
# feature with it and once deadlocking the whole cycle (the run held the device
# lock with nothing to drive, while the reboot waited for that lock). It read like
# a flaky emulator. It was not:
#
#   Out of memory: Killed process (qemu-system-x86) anon-rss:4692376kB
#                  ... oom_score_adj:200
#   chrome invoked oom-killer ... Killed process (qemu-system-x86)
#
# qemu runs with oom_score_adj=200 — a POSITIVE adjustment, so the kernel chooses
# it before anything else on the machine whenever memory is tight. A browser tab
# opening was enough to take the test rig out.
#
# This lowers that score so ordinary desktop memory pressure lands somewhere else.
# It does NOT create memory: if the machine genuinely runs out, something still
# dies. It stops the emulator being the automatic first choice.
#
# Best-effort and silent on failure: a negative score needs privileges, and the rig
# must not refuse to run just because it could not get them.
set -u
SUDO_PW="${QA_SUDO_PW:-}"
TARGET_SCORE="${QA_EMULATOR_OOM_SCORE:--500}"

protected=0
for pid in $(pgrep -f "qemu-system-x86" 2>/dev/null); do
  if [ -n "$SUDO_PW" ]; then
    echo "$SUDO_PW" | sudo -S sh -c "echo $TARGET_SCORE > /proc/$pid/oom_score_adj" 2>/dev/null \
      && protected=$((protected + 1))
  else
    # Without privileges only a HIGHER score can be set, which is the wrong
    # direction — so do not pretend. Report and move on.
    :
  fi
done

if [ "$protected" -gt 0 ]; then
  echo "  protected $protected emulator process(es) from the OOM killer (oom_score_adj=$TARGET_SCORE)"
else
  echo "  could not lower the emulator's OOM score — it stays the kernel's first pick under memory pressure"
fi

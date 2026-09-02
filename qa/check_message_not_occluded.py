#!/usr/bin/env python3
"""Is the newest message actually UNCOVERED, or merely on screen?

Maestro cannot answer this. Its visibility test uses an element's own bounds
against the screen, so a bubble sitting UNDERNEATH the absolutely-positioned
composer bar still reports as visible — which is exactly the failure the owner
reported by eye on 2026-09-02 ("the send message input and default message text
proposal hide the latest message").

So this reads the real view hierarchy from the device and compares edges:

    bottom of the target message  <=  top of the composer bar

Run it while the app is sitting on a conversation thread, e.g. straight after
maestro/chat/scroll_to_latest.yaml:

    python3 qa/check_message_not_occluded.py "Scroll target check"

Exit 0 = uncovered. Exit 1 = covered (or not found), with the numbers.
"""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

TARGET = sys.argv[1] if len(sys.argv) > 1 else "Scroll target check"
SERIAL = sys.argv[2] if len(sys.argv) > 2 else "emulator-5580"
# The composer's placeholder is the most reliable handle on the bar: it is the
# one node guaranteed present whenever a thread is message-able.
COMPOSER_HINTS = ("Type a message", "Send")


def hierarchy(serial: str) -> ET.Element:
    subprocess.run(["adb", "-s", serial, "shell", "uiautomator", "dump", "/sdcard/h.xml"],
                   check=True, capture_output=True, timeout=60)
    xml = subprocess.run(["adb", "-s", serial, "shell", "cat", "/sdcard/h.xml"],
                         check=True, capture_output=True, timeout=60).stdout
    return ET.fromstring(xml)


def bounds(node) -> tuple[int, int, int, int]:
    m = re.match(r"\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]", node.get("bounds", ""))
    return tuple(int(g) for g in m.groups()) if m else (0, 0, 0, 0)


def find(root, predicate):
    return [n for n in root.iter("node") if predicate(n)]


def main() -> int:
    root = hierarchy(SERIAL)
    text_of = lambda n: (n.get("text") or "") + " " + (n.get("content-desc") or "")

    targets = find(root, lambda n: TARGET.lower() in text_of(n).lower())
    if not targets:
        print(f"  FAIL  {TARGET!r} is not in the hierarchy at all")
        return 1
    # The lowest match on screen is the newest bubble.
    target = max(targets, key=lambda n: bounds(n)[3])
    t_left, t_top, t_right, t_bottom = bounds(target)

    bars = [n for h in COMPOSER_HINTS for n in find(root, lambda n, h=h: h.lower() in text_of(n).lower())]
    if not bars:
        print("  SKIP  no composer bar on screen — is this a message-able thread?")
        return 1
    bar_top = min(bounds(n)[1] for n in bars)

    print(f"  message {TARGET!r} bottom edge = {t_bottom}")
    print(f"  composer bar top edge        = {bar_top}")
    if t_bottom <= bar_top:
        print(f"  PASS  uncovered by {bar_top - t_bottom}px")
        return 0
    print(f"  FAIL  the newest message is {t_bottom - bar_top}px BEHIND the composer bar "
          f"— this is the reported bug, not a near miss")
    return 1


if __name__ == "__main__":
    sys.exit(main())

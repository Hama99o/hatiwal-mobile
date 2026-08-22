#!/usr/bin/env python3
"""Point .env at the network this machine is on RIGHT NOW.

Why this exists: this laptop moves between office WiFi and a home hotspot, and
.env carries one commented-out block per network. Swapping them by hand is easy
to forget, and a stale LAN IP makes every request fail in a way that looks like
an app bug.

Scope: this only matters for testing on a REAL PHONE, which must reach Metro and
Rails over the LAN. Emulator QA does not use these values at all — it uses
10.0.2.2, which always means "the host" no matter what the network is doing.

Usage:  net.py [--write]     (default: report only)
"""
import os
import re
import shutil
import subprocess
import sys

ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", ".env")
ENV = os.path.normpath(ENV)
KEYS = ("HOST_IP", "EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_CABLE_URL")


def current_ip():
    try:
        out = subprocess.run(["ip", "route", "get", "1.1.1.1"], capture_output=True, text=True, timeout=5).stdout
        m = re.search(r"src (\d+\.\d+\.\d+\.\d+)", out)
        return m.group(1) if m else None
    except Exception:
        return None


def main(write):
    ip = current_ip()
    if not ip:
        print("  could not detect a LAN IP (offline?)")
        return 1
    print(f"  this machine is on: {ip}")

    if not os.path.exists(ENV):
        print(f"  no .env at {ENV}")
        return 1
    lines = open(ENV).read().split("\n")

    stale, out = [], []
    for line in lines:
        m = re.match(r"^(\s*)(" + "|".join(KEYS) + r")=(\S*)", line)
        if not m:
            out.append(line)
            continue
        indent, key, val = m.groups()
        newval = re.sub(r"\d+\.\d+\.\d+\.\d+", ip, val)
        if newval != val:
            stale.append((key, val, newval))
            out.append(f"{indent}{key}={newval}")
        else:
            out.append(line)

    if not stale:
        print("  .env already matches this network — nothing to do")
        return 0

    print(f"  {len(stale)} stale value(s) in .env:")
    for key, old, new in stale:
        print(f"    {key}")
        print(f"      was {old}")
        print(f"      now {new}")

    if not write:
        print("\n  report only — rerun with:  ./qa/qa.sh net --write")
        return 0

    shutil.copy(ENV, ENV + ".bak")
    open(ENV, "w").write("\n".join(out))
    print(f"\n  .env updated (backup at .env.bak)")
    print("  restart Metro for a real-device test:")
    print(f"    HOST_IP={ip} docker compose up -d mobile")
    print("  (emulator QA needs no restart — it uses 10.0.2.2)")
    return 0


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))

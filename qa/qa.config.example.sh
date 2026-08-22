#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PER-PROJECT QA CONFIG — copy to qa/qa.config.sh and edit.
#
# The rig itself is generic: everything app-specific lives here. Dropping qa/
# into another React Native project should need NO changes to qa/qa.sh or
# qa/lib/*.sh — only this file and qa/features.yaml.
#
# Every value is optional. Anything you omit keeps the built-in default, which
# describes the project this rig was written in (Hatiwal).
# ─────────────────────────────────────────────────────────────────────────────

# ── The app ────────────────────────────────────────────────────────────
# Must match app.json's android.package AND maestro/config.yaml's appId.
# export APP_ID="com.example.app"

# ── Emulators ──────────────────────────────────────────────────────────
# AVD names as `emulator -list-avds` prints them. Create per form factor —
# testing a phone-only layout is how tablet bugs ship (we found two that way).
# export AVD_PHONE="qa_phone"
# export AVD_TABLET="qa_tablet"

# ── One device per session (multi-session QA) ──────────────────────────────
# QA_SESSION=n picks port 5554+2(n-1) and its own reports/sN/ directory. Give
# each session its OWN AVD here, so several can run at once without fighting:
# two sessions on the same AVD cannot both boot, and the failure reads as a
# stale lock rather than a collision.
#
# This is how you cover form factors in parallel — a tablet and a phone finding
# different bugs in the same flow on the same APK, which is exactly how the
# landscape-tablet listing-detail bug was found.
# export QA_AVD_1="qa_tablet"
# export QA_AVD_2="qa_phone"
# export QA_AVD_3="qa_phone_small"

# ── Device location (seeded at boot) ──────────────────────────────────────
# A fresh emulator has NO GPS fix, so anything calling getCurrentPositionAsync
# times out and the app reports "Couldn't determine your location" — correct
# behaviour, but it fails every distance/nearest/map flow for a non-app reason.
# Set this to somewhere your fixtures are, or distance sorting is meaningless.
# export QA_GEO_LAT="34.5553"     # Kabul
# export QA_GEO_LON="69.2075"

# ── Device gallery (seeded at boot) ───────────────────────────────────────
# A fresh emulator has NO photos, so any flow that adds a photo to a listing
# opens an empty system picker, selects nothing, and fails on the cover badge.
# Four images are copied in at boot. Any real image works.
# export QA_GALLERY_IMAGE="assets/icon.png"
#
# Optional extra profiles. `qa.sh up <name>` accepts any key defined here.
# export AVD_SMALL="qa_phone_small"    # e.g. 5.0" 720x1280 — cramped layouts
# export AVD_LARGE="qa_phone_large"    # e.g. 6.7" 1284x2778 — tall layouts

# ── Metro / bundler ────────────────────────────────────────────────────
# export METRO_PORT="3008"
# Container serving Metro, if containerized — used only to restart it when it
# OOMs mid-suite. Leave empty if Metro runs on the host.
# export QA_METRO_CONTAINER="myapp-mobile-1"
# Substring identifying THIS project's containers, so doctor can tell a
# competing project's Metro on :8081 apart from ours.
# export QA_PROJECT_TAG="myapp"

# ── Backend ────────────────────────────────────────────────────────────
# export API_PORT="3007"
# export API_DIR="$WORKSPACE_DIR/myapp-api"
#
# ALWAYS 10.0.2.2 for emulator QA: inside an emulator that is the host, full
# stop, and unlike a LAN IP it survives WiFi/hotspot switches and works offline.
# export HOST_IP="10.0.2.2"

# ── Test data ──────────────────────────────────────────────────────────
# How to reset to a known state. Rails here; could be `npm run seed:e2e`, a
# curl against a fixtures endpoint, or empty to skip seeding entirely.
# export QA_SEED_CMD="bundle exec rake db:seed:reset_e2e"
#
# The account doctor logs in with to prove the seed worked. If this account is
# missing, nearly every flow fails at step 1 for a reason unrelated to its
# feature — which is why doctor checks it before anything runs.
# export QA_BUYER_EMAIL="buyer@example.test"
# export QA_SELLER_EMAIL="seller@example.test"
# export QA_PASSWORD="Password123!"

# ── Toolchain ──────────────────────────────────────────────────────────
# Metro needs Node 20+ (Node 18 crashes on `toReversed` inside metro).
# export QA_NODE_DIR="$HOME/.nvm/versions/node/v20.19.0/bin"

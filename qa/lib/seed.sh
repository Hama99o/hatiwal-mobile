#!/usr/bin/env bash
# Reset the backend to a known QA state.
# 190 of the 214 flows start from _helpers/login.yaml, so if the e2e accounts
# are missing EVERY flow fails at step 1 for a reason that has nothing to do
# with the feature under test. Seed first, always.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

seed_reset() {
  # QA_SEED_CMD is per-project (qa/qa.config.sh). Empty means the project has no
  # local seed step — verify the account still works and carry on rather than
  # failing a rig that simply does not need seeding.
  if [ -z "${QA_SEED_CMD:-}" ]; then
    say "no QA_SEED_CMD configured — skipping reset, verifying login only"
    seed_verify
    return $?
  fi
  [ -d "$API_DIR" ] || { err "backend not found at $API_DIR (set API_DIR in qa/qa.config.sh)"; return 1; }
  say "$QA_SEED_CMD (wipes + reseeds e2e accounts only)…"
  ( cd "$API_DIR" && eval "$QA_SEED_CMD" ) 2>&1 | tail -12
  seed_verify
}

seed_verify() {
  local resp
  resp=$(curl -s -m 10 -X POST "$API_URL_LOCAL/auth/sign_in" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$QA_BUYER_EMAIL\",\"password\":\"$QA_PASSWORD\"}" 2>/dev/null)
  echo "$resp" | grep -q '"email"' \
    && ok "seed verified — $QA_BUYER_EMAIL can log in" \
    || { err "seed failed — $QA_BUYER_EMAIL cannot log in"; return 1; }
}

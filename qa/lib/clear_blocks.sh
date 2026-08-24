#!/usr/bin/env bash
# Remove any block between the two e2e accounts.
#
# A block HIDES the blocked user's listings from the blocker's feed, so a block
# flow that fails before its unblock step poisons every later flow that needs one
# of those listings. In one report/ run it took out four flows at once, each
# reporting `No visible element found: "Wool Blanket Handmade King Size"` — a
# missing-fixture message for a fixture that was present and merely hidden.
#
# The seed clears these too, but a seed runs BETWEEN runs and the damage happens
# WITHIN one. Called per flow instead, which is where the leak actually occurs.
#
# Silent and best-effort on purpose: this is hygiene, not a gate. If the API
# container is not up, the flow's own preflight is what should complain.
set -u
CONTAINER="${QA_API_CONTAINER:-hatiwal-api-web-1}"
docker exec "$CONTAINER" bin/rails runner '
ids = User.where(email: %w[buyer@hatiwal.test seller@hatiwal.test]).pluck(:id)
Block.where(blocker_id: ids).or(Block.where(blocked_id: ids)).destroy_all
' >/dev/null 2>&1 || true

/**
 * Contract: the composer's message cap must match the API's.
 *
 * hatiwal-api enforces `validates :body, length: { maximum: 1000 }`. The
 * composer enforced nothing, so a longer message could only fail at send time
 * as a 422 — the user typed the whole thing and then lost the send for a reason
 * nothing on screen had warned about. `maxLength` now prevents that.
 *
 * The real risk from here on is DRIFT: someone raises the server limit and the
 * client silently keeps truncating at the old one (or vice versa, which puts the
 * 422 straight back). So this test reads the Rails model rather than restating a
 * number, and fails loudly when the two disagree.
 *
 * Both repos live in the same workspace (see the root CLAUDE.md). If the API is
 * not checked out, the test skips instead of failing — it must never be a false
 * red in an environment that simply lacks the sibling repo.
 */
import fs from "fs";
import path from "path";

import { MESSAGE_MAX_LENGTH } from "../messageLimits";

const MESSAGE_MODEL = path.resolve(
  __dirname,
  "../../../../../hatiwal-api/app/models/message.rb"
);

/** The `maximum:` from `validates :body, ... length: { maximum: N }`. */
function apiBodyLimit(): number | null {
  if (!fs.existsSync(MESSAGE_MODEL)) return null;
  const src = fs.readFileSync(MESSAGE_MODEL, "utf8");
  const line = src
    .split("\n")
    .find((l) => /validates\s+:body\b/.test(l) && /maximum:/.test(l));
  if (!line) return null;
  const m = line.match(/maximum:\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

describe("message length contract (mobile ↔ hatiwal-api)", () => {
  it("caps the composer at exactly the API's limit", () => {
    const apiLimit = apiBodyLimit();

    if (apiLimit === null) {
      console.warn(
        "hatiwal-api/app/models/message.rb not found or has no body length validation — skipping the cross-repo contract check"
      );
      return;
    }

    expect(MESSAGE_MAX_LENGTH).toBe(apiLimit);
  });

  it("is a sane positive cap", () => {
    expect(Number.isInteger(MESSAGE_MAX_LENGTH)).toBe(true);
    expect(MESSAGE_MAX_LENGTH).toBeGreaterThan(0);
  });
});

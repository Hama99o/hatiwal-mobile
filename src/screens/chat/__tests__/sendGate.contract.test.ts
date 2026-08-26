/**
 * Contract: the composer may only be live when the API would accept a send.
 *
 * hatiwal-api gates sending in one place:
 *
 *     def send_message? = participant? && record.open? && !blocked_pair?
 *
 * The composer used to gate on `isClosed` but NOT on blocked state, so after
 * blocking someone the input stayed fully live and the send could only come back
 * 403 — the user typed the whole message before anything told them it was
 * impossible. Same failure shape as the message-length contract next door.
 *
 * This test does not restate the rule; it reads BOTH sides and fails when they
 * drift. A new condition added to the policy (or a term dropped from `canSend`)
 * breaks it, which is the point — the two are far apart in two repos and nothing
 * else would notice.
 *
 * Skips rather than fails when hatiwal-api is not checked out, so it is never a
 * false red in an environment that simply lacks the sibling repo.
 */
import fs from "fs";
import path from "path";

const POLICY = path.resolve(
  __dirname,
  "../../../../../hatiwal-api/app/policies/conversation_policy.rb"
);
const SCREEN = path.resolve(__dirname, "../Conversation.tsx");

/** The right-hand side of `def send_message?  = ...`. */
function policySendGate(): string | null {
  if (!fs.existsSync(POLICY)) return null;
  const line = fs
    .readFileSync(POLICY, "utf8")
    .split("\n")
    .find((l) => /def\s+send_message\?/.test(l));
  if (!line) return null;
  const m = line.match(/=\s*(.+)$/);
  return m ? m[1].trim() : null;
}

/** The right-hand side of `const canSend = ...;`. */
function clientSendGate(): string {
  const line = fs
    .readFileSync(SCREEN, "utf8")
    .split("\n")
    .find((l) => /const\s+canSend\s*=/.test(l));
  if (!line) throw new Error("Conversation.tsx no longer declares `canSend`");
  return line.replace(/^.*const\s+canSend\s*=\s*/, "").replace(/;.*$/, "");
}

/**
 * Each server-side condition and the client term that must mirror it.
 * `participant?` has no client term: the app only renders a thread it is a
 * participant of, and the policy would 403 anyway — there is nothing to warn
 * the user about ahead of time.
 */
const MIRRORED: Array<{ server: string; client: RegExp; why: string }> = [
  {
    server: "record.open?",
    client: /!isClosed/,
    why: "a closed conversation shows the closed banner instead of the composer",
  },
  {
    server: "!blocked_pair?",
    client: /!isBlocked/,
    why: "a blocked pair shows the messaging-unavailable notice (UI-046)",
  },
];

describe("send gate contract (mobile ↔ hatiwal-api)", () => {
  const server = policySendGate();

  it("still finds the policy rule it is written against", () => {
    if (server === null) {
      console.warn(
        "hatiwal-api conversation_policy.rb not found — skipping send gate contract"
      );
      return;
    }
    expect(server).toContain("participant?");
  });

  it.each(MIRRORED)(
    "mirrors the policy's $server on the client ($why)",
    ({ server: cond, client }) => {
      if (server === null) return; // sibling repo absent — see above
      expect(server).toContain(cond);
      expect(clientSendGate()).toMatch(client);
    }
  );

  it("has no unmirrored condition left in the policy", () => {
    if (server === null) return;
    // Split the policy expression into its && terms and account for every one,
    // so ADDING a condition server-side fails here instead of silently letting
    // the composer promise a send the API will refuse.
    const terms = server.split("&&").map((t) => t.trim());
    const accounted = new Set([
      "participant?",
      ...MIRRORED.map((m) => m.server),
    ]);
    expect(terms.filter((t) => !accounted.has(t))).toEqual([]);
  });
});

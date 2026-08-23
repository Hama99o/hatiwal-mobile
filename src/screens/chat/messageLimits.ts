/**
 * Message limits shared by the chat composers.
 *
 * Its own module (rather than a const inside Conversation.tsx) so it can be
 * imported without dragging in the whole screen — the screen pulls native
 * modules, which makes it unimportable from a plain unit test.
 */

/**
 * Longest message the backend accepts. Mirrors
 * hatiwal-api/app/models/message.rb — `validates :body, length: { maximum: 1000 }`.
 *
 * The composer enforces this with `maxLength`, so an over-long message can never
 * be typed and then rejected at send time as a 422 the user was never warned
 * about. `messageLength.contract.test.ts` fails if the two ever drift apart.
 */
export const MESSAGE_MAX_LENGTH = 1000;

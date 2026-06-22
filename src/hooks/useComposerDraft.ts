/**
 * useComposerDraft
 *
 * Persists the chat composer's unsent text to AsyncStorage, keyed per
 * conversation. Drafts are independent per conversation id and never leak
 * across threads. Storage failures never throw — the composer keeps working.
 *
 * Usage:
 *   const { draft, setDraft, clearDraft } = useComposerDraft(conversationId);
 *
 * - `draft`      — the current text value (hydrated from storage on mount)
 * - `setDraft`   — call on every onChangeText; debounces the write (~400ms)
 * - `clearDraft` — call after a successful send; removes the stored key
 *
 * The hook is intentionally storage-only. It owns the persisted copy; the
 * caller owns the React state. To wire them together, initialise your input
 * state with `draft` and forward `onChangeText` to both `setMessageText` and
 * `setDraft` (or just replace `setMessageText` with `setDraft` if you let the
 * hook own the value).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_PREFIX = "hatiwal:chat-draft:";
const DEBOUNCE_MS = 400;

/** Returns the AsyncStorage key for a given conversation id. */
export function composerDraftKey(conversationId: number): string {
  return `${DRAFT_PREFIX}${conversationId}`;
}

export interface UseComposerDraftResult {
  /** The current draft text (starts as "" until storage is hydrated). */
  draft: string;
  /**
   * Update the draft. Call this on every onChangeText event.
   * The actual AsyncStorage write is debounced by ~400 ms.
   */
  setDraft: (text: string) => void;
  /**
   * Permanently remove the stored draft for this conversation.
   * Call after a successful send. A failed send must NOT call this.
   */
  clearDraft: () => void;
}

/**
 * @param conversationId - Pass `null` while the conversation hasn't been
 *   created yet (start-conversation flow). The hook is a no-op in that case.
 */
export function useComposerDraft(
  conversationId: number | null
): UseComposerDraftResult {
  const [draft, setDraftState] = useState<string>("");

  // Whether we have already read from storage for this conversationId.
  const hydratedRef = useRef<number | null>(null);

  // Debounce timer handle.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate on mount / conversationId change ────────────────────────────
  useEffect(() => {
    if (conversationId === null) return;
    // Avoid re-hydrating the same conversation twice.
    if (hydratedRef.current === conversationId) return;
    hydratedRef.current = conversationId;

    const key = composerDraftKey(conversationId);
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored !== null) {
          // Only restore when the user hasn't already started typing.
          // We check the ref — if the caller seeded the state with an
          // initialMessage before this effect ran, we keep their value.
          setDraftState((current) => (current === "" ? stored : current));
        }
      } catch {
        // Storage failure — silently ignore; composer still works.
      }
    })();
  }, [conversationId]);

  // ── Reset internal state when switching conversations ───────────────────
  useEffect(() => {
    setDraftState("");
  }, [conversationId]);

  // ── Debounced persist ────────────────────────────────────────────────────
  const setDraft = useCallback(
    (text: string) => {
      setDraftState(text);

      if (conversationId === null) return;

      // Cancel any pending write.
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const key = composerDraftKey(conversationId);

      if (text.length === 0) {
        // Remove immediately (not debounced) so that clearing the field and
        // navigating away within the debounce window does not leave a stale
        // draft in storage that would be re-hydrated on reopen.
        AsyncStorage.removeItem(key).catch(() => {
          // Storage failure — silently ignore; composer still works.
        });
        return;
      }

      debounceRef.current = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(key, text);
        } catch {
          // Storage failure — silently ignore; composer still works.
        }
      }, DEBOUNCE_MS);
    },
    [conversationId]
  );

  // ── Clear draft (call after successful send) ─────────────────────────────
  const clearDraft = useCallback(() => {
    if (conversationId === null) return;
    // Cancel any pending debounced write first.
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const key = composerDraftKey(conversationId);
    AsyncStorage.removeItem(key).catch(() => {
      // Storage failure — silently ignore.
    });
  }, [conversationId]);

  // ── Cleanup timer on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { draft, setDraft, clearDraft };
}

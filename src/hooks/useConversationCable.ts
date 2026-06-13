/**
 * useConversationCable — subscribes to ConversationChannel for live messages.
 * Thin domain wrapper around useCableChannel.
 */

import { useCallback } from "react";
import { useCableChannel } from "@/hooks/useCableChannel";
import type { Message } from "@/api/conversations";
import { convertKeysToCamel } from "@/utils/case-styles";

export function useConversationCable(
  conversationId: number | null,
  onNewMessage: (message: Message) => void
) {
  const params = conversationId
    ? { channel: "ConversationChannel", conversation_id: conversationId }
    : null;

  const handlePayload = useCallback(
    (payload: Record<string, unknown>) => {
      if (!payload.message) return;
      const msg = convertKeysToCamel(
        payload.message as Record<string, unknown>
      ) as Message;
      onNewMessage(msg);
    },
    [onNewMessage]
  );

  useCableChannel(params, handlePayload);
}

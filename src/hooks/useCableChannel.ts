/**
 * useCableChannel — generic React hook for any ActionCable channel.
 *
 * Subscribes on mount, unsubscribes on unmount.
 * Resubscribes automatically if channelParams change.
 * Keeps the handler ref stable so changing the callback doesn't reconnect.
 *
 * @example — conversation messages
 *   useCableChannel(
 *     { channel: "ConversationChannel", conversation_id: 42 },
 *     (payload) => console.log(payload)
 *   );
 *
 * @example — user notifications
 *   useCableChannel(
 *     { channel: "NotificationChannel" },
 *     (payload) => showBanner(payload.notification)
 *   );
 */

import { useEffect, useRef } from "react";
import { cableClient, type CablePayload, type MessageHandler } from "@/utils/cable";

export function useCableChannel(
  channelParams: Record<string, unknown> | null,
  onMessage: MessageHandler
) {
  // Stable ref so the handler can change without triggering a reconnect
  const handlerRef = useRef<MessageHandler>(onMessage);
  useEffect(() => { handlerRef.current = onMessage; }, [onMessage]);

  // Stable wrapper that always calls the latest handler
  const stableHandler = useRef<MessageHandler>((payload: CablePayload) => {
    handlerRef.current(payload);
  }).current;

  // Serialise params for the dependency array (objects aren't stable by identity)
  const paramsKey = channelParams ? JSON.stringify(channelParams) : null;

  useEffect(() => {
    if (!channelParams) return;

    const unsub = cableClient.subscribe(channelParams, stableHandler);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
}

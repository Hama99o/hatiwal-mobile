/**
 * Push-notification foreground behavior + tap routing.
 *
 * The token side (permission + registration) lives in utils/push-token.ts. This
 * module handles the OTHER half: showing the notification while the app is in
 * the foreground, and — when the user taps a message notification — opening the
 * relevant conversation, whether the app was already running or cold-started by
 * the tap.
 *
 * Backend payload (SendMessagePushJob): data = { type: "message",
 * conversationId, messageId }.
 */

import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter, type Router } from "expo-router";

// Show the banner/sound even when the app is open (default would suppress it).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface MessageNotificationData {
  type?: string;
  conversationId?: number | string;
}

/** Navigate to the conversation a message notification points at. */
function routeFromNotificationData(data: unknown, router: Router) {
  const payload = (data ?? {}) as MessageNotificationData;
  if (payload.type === "message" && payload.conversationId != null) {
    router.push(`/(main)/conversation/${payload.conversationId}` as never);
  }
}

/**
 * Mount once inside the authenticated navigator (e.g. (main)/_layout). Handles:
 *   • cold start  — app launched by tapping a notification (getLastNotificationResponseAsync)
 *   • warm tap    — notification tapped while running/backgrounded (listener)
 */
export function useNotificationObserver() {
  const router = useRouter();
  const handledColdStart = useRef(false);

  useEffect(() => {
    let active = true;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || handledColdStart.current || !response) return;
      handledColdStart.current = true;
      routeFromNotificationData(response.notification.request.content.data, router);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotificationData(response.notification.request.content.data, router);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);
}

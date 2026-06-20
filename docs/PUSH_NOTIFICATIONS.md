# Push Notifications (messages)

When someone sends a message, the recipient gets a push notification — even with
the app closed — and tapping it opens that conversation. Built on **Expo push**.

## What's implemented (code — done)

**Mobile**
- `src/utils/push-token.ts` — asks permission, gets the Expo push token, PUTs it
  to `/users/me` on login/register; cached so it isn't re-sent.
- `src/lib/notifications.ts` — foreground display handler + `useNotificationObserver()`
  (mounted in `app/(main)/_layout.tsx`) that opens `/(main)/conversation/[id]`
  when a message notification is tapped (cold-start and while-running).

**Backend**
- `push_token` column on `users` (stored from `/users/me`).
- `Notifications::ExpoPushService` — POSTs to the Expo Push API; resilient
  (never raises); reports `DeviceNotRegistered` so dead tokens get dropped.
- `SendMessagePushJob` — enqueued from `MessagesController#create` (solid_queue).
  Sends to the *other* participant. Skips: sender's own device, no token,
  suspended/banned recipient, blocked pairs, and server `:system` messages.
  Body = the message text (or a localized label for offer/meetup/photo/document,
  in the recipient's `preferred_language`).
- Specs: `spec/services/notifications/expo_push_service_spec.rb`,
  `spec/jobs/send_message_push_job_spec.rb`.

## What YOU must set up before it works on real phones (ops — not code)

1. **EAS project id** — add `extra.eas.projectId` to `app.json` (run `eas init`).
   Without it, `getExpoPushTokenAsync` returns nothing and no token is stored, so
   nothing can be delivered.
2. **Push credentials** via `eas credentials`:
   - **iOS**: an APNs key (Apple Developer account).
   - **Android**: FCM (the Firebase server key / `google-services.json`).
3. **Build** — use a dev/production build (`eas build`). Push is unreliable in a
   bare Expo Go for production use.
4. **Test on a REAL device** — iOS Simulator / Android emulator do **not**
   receive push notifications.

## How to verify quickly
- Confirm the token reaches the backend: after login on a real device, check the
  user row has a non-null `push_token` starting with `ExponentPushToken[`.
- Send a message from another account → the device should show the notification;
  tapping it opens the conversation.

## Notes / future
- Single token per user (last device wins). For multi-device, add a
  `device_tokens` table and send to all.
- No badge counts / no notification when the recipient is actively viewing that
  thread — possible refinements.

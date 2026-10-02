# QA — everything changed since 1.1.0, before the 1.1.2 store builds

2026-10-02 · hatiwal-mobile `main` (SDK 54) from `b167c8b` → fixes on top · hatiwal-api `f5e1fed` local
→ `ba6cd39` · hatiwal-web at HEAD `afb1c38` (plus someone's uncommitted font edits in
`layout.tsx` / `globals.css`, which were served during the web checks).

Evidence paths are relative to `qa/evidence/qa-1.1.2/` and live on the QA machine only — `qa/evidence/` is gitignored (screenshots), only this file is committed.

Android only: an emulator (`qa_phone`, API 35 google_apis, 1080×2400) against the
**local** API on :3007. No production writes. Test accounts `buyer@` / `seller@hatiwal.test`.
**MEASURED** = observed in this pass (device flow, spec, HTTP, DB row, screenshot).
**INFERRED** = argued from code or unit tests and not observed on a device.

## Build under test

The rig's previous debug APK dated from 2026-09-14 and had no Firebase config and no
embedded fonts, so results from it would have described old native code. I rebuilt it:
`expo prebuild` (android, no `--clean`) then a bundled debug APK at `b167c8b`. The APK
contains `google-services.json` + the gms plugin, `res/font` Rubik / Zain / Noto Sans
Arabic (400 + 700), and versionName 1.1.2. MEASURED (APK listing,
`qa/reports/apk-build-1.1.2.log`). JS was served by Metro from the working tree.

## Results per item

| # | Item | Verdict | How | Evidence |
|---|---|---|---|---|
| 1a | UniversalList: focus refetch is silent — no skeleton or blank after first load (Bazaar ↔ Chats ×4) | **PASS** (Android) | MEASURED, flow | `chat/focus_refetch_silent` run-590 · `device/run-590_focus_refetch_silent.png` |
| 1b | iOS blank band in the inbox (the original report) | **NOT TESTED** | iOS-only, cannot be reproduced on Android | — |
| 1c | No duplicate row when a new item shifts offset pages | **PASS by unit test only** | INFERRED — Jest `UniversalList.test.tsx:878`; `pagination/conversations_pagination` and `pagination/browse_pagination` pass on device, but the shift-mid-scroll case was NOT staged on a device | `device/run-596_conversations_pagination.png` |
| 2 | Contact Support: row at the top of Messages, opens the Support thread, send works; Profile entry | **PASS** | MEASURED, flows `chat/support_entry_row` (run-597), `profile/contact_support_profile` (run-589); the entry-row variant opened a new thread in run-588 (steps 65–67) | `device/run-589_contact_support_profile.png`, `device/rtl_*/rtl_support_thread_*.png` |
| 2b | Support thread UI: no report/block/listing controls, "Hatiwal Support" + verified tick + note | **PASS** | MEASURED (asserts in run-597 + screenshots) | `device/rtl_ur/rtl_support_thread_ur.png` |
| 3 | RTL: send icon visible, Support label not clipped, compact inbox tabs (ps, fa, ur) | **PASS**, with one cosmetic finding | MEASURED, direct Maestro runs `rtl/support_rtl_{ps,fa,ur}` (all rc=0) + screenshots | `device/rtl_ps/`, `device/rtl_fa/`, `device/rtl_ur/` |
| 3b | ↳ RTL chip-row scroll hint covers the selected "All" chip and points the wrong way | **OPEN — UI-053** (cosmetic, not fixed: iOS geometry unverifiable here) | MEASURED | `device/rtl_fa/rtl_inbox_fa.png` vs `device/run-595_conversations_list.png` |
| 3c | ↳ the send icon in a MARKETPLACE thread with text typed | **NOT CAPTURED** | the flow's composer step did not land on that screen; the composer is shared with the Support thread, where the icon is visible in all three locales | — |
| 4 | Pashto / Dari / Urdu fonts embedded — labels keep all their words | **PASS** | MEASURED by screenshot: "د هتیوال ملاتړ", "پشتیبانی هتیوال", "ہتیوال سپورٹ" drawn in full in the inbox row and the thread header | `device/rtl_*/` |
| 5 | Android push registers an Expo token (Firebase); failures reported to the server | **PASS** (registration) | MEASURED: buyer row got `ExponentPushToken[5Y44hsMWimQA5H_vNFi3XX]`, `push_registration_error` nil, on the emulator with POST_NOTIFICATIONS granted. Failure reporting: Jest `push-token.test.ts` + API specs only (INFERRED on device) | `device/server_version_push_columns.txt` |
| 6 | X-App-Version / X-App-Platform on every request | **PASS** | MEASURED: buyer `last_app_version` went `1.1.0` (2026-10-01) → `1.1.2` / `android` (2026-10-02 10:15 UTC) from this session's requests | `device/server_version_push_columns.txt` |
| 7 | app.json version 1.1.2 | **PASS** | MEASURED (app.json, APK versionName, server-reported version) | as above |
| 8 | Admin Messages: send mail / message / bulk ×2, `/admin/messages/:id` full view, bulk "What was sent" | **PASS** (specs + rendering) | MEASURED: 241 examples green across admin messages / bulk / support + API support specs; pages render. "Send mail" NOT clicked — local dev SMTP sends real Gmail | `admin/desktop_admin_messages_2.png`, `admin-after/desktop_admin_bulk_emails_2.png` |
| 8b | ↳ in-app-only bulk page showed an empty header-only email table | **FIXED** `ba6cd39` (api) | MEASURED before/after + new spec | `admin/` vs `admin-after/` |
| 9 | Admin support inbox; user ⇄ Support threads; archived thread returns on a new message; SUPPORT_ADMIN_INITIATE | **PASS** (specs) | MEASURED by spec (`support_conversations_spec` "brings an archived thread back…", `support_gate_spec`, `send_message_spec`); the flag is off in the local container, so not clicked through | — |
| 10 | Admin CSS prefix ad- → hw-: every admin page renders its cards | **PASS** | MEASURED: 22 pages × phone + desktop, all 200, 0 console errors, no class or id an ad-block list would match | `admin/`, `admin-after/` |
| 10b | ↳ "Edit <long title>" header button overflowed its card at 390px | **FIXED** `ba6cd39` (api) | MEASURED (`overflowX` true → false) | `admin/phone_admin_listings_5189.png` |
| W1 | Web `/download` device detection + escape hatch | **PASS** 8/8 | MEASURED (iPhone, iPad desktop-UA, Android, Mac × en/ps; store links 200) | `web/download-*.png` |
| W2 | Web inbox doesn't crash on a removed listing | **PASS** 6/6 | MEASURED against the REAL local API (thread 3000) + mock e2e 6/6 | `web/thread-*-3000.png` |
| W3 | Web support threads render as Hatiwal Support | **PASS** | MEASURED, en + ps (thread 2999) | `web/thread-*-2999.png` |

API full suite after `ba6cd39`: 2042 examples, 0 failures; rubocop clean.

## Real app bugs found (both pre-date 1.1.2)

1. **Every Android haptic was an unhandled promise rejection** — `e9acec0`.
   `app.json` blocks `android.permission.VIBRATE` (since `95ff0a4`, 2026-06-21), so
   every expo-haptics call rejects with a SecurityException; `triggerHaptic`'s
   synchronous try/catch cannot catch it. Dev builds: a full-screen red box (it failed
   7 flows in a row). Store builds: Android haptics have done nothing since June.
   Fixed by catching the promise; Jest 7/7 red on the old code, green now; confirmed on
   device (`chat/start_conversation_and_reply` red-boxed before, passes after, run-594).
   **Owner decision, not changed:** un-block VIBRATE if Android should have haptics.
2. **A dead session left a guest with the SELLER tab bar** (UI-050) — `c28b238`.
   Only Profile's logout called `resetMode`; a 401 / blocked account cleared the user
   without it. Now any signed-in → signed-out transition resets the mode. Seen on
   device; `chat/conversations_list` failed on it before and passes after (run-595).

Affected Jest suites (14 suites, 380 tests) green before committing.

## Open

- **UI-053** — RTL chip-row hint (cosmetic). Recommended fix in `qa/UI_FINDINGS.md`.
- Item 1c and push failure reporting are covered by unit tests, not staged on a device.
- Item 1b (iOS blank band) needs an iPhone.

## Rig notes from this pass

- In a dev build, typing two `r` keys while no field has focus RELOADS the app — a
  missed tap followed by `inputText` containing "r…r" looks like the app jumping back
  to Bazaar (run-588). Wait out the push animation before tapping the composer.
- Once a user has a Support thread, the permanent entry row is replaced by the real
  thread row pinned first (`support-thumb-<id>`), by design — flows must accept either.
- A sub-flow's own `env:` default overrides the caller's `runFlow: env:` (run-593).
- The rig deletes a passing flow's debug dir, `takeScreenshot` output included; the RTL
  evidence therefore comes from direct `maestro test --debug-output` runs (not
  overlapping any `qa.sh` run).

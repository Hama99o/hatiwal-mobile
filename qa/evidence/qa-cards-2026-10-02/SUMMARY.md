# QA — card redesign, feed toggle, chips, language/theme overlay, welcome message

2026-10-02 · hatiwal-mobile `main` (SDK 54), changes `bb477ac..ccc0d9c` (history since
rewritten; same content now under new SHAs) + hatiwal-api `26816da` + `6763ac1`, local API
with `SUPPORT_ADMIN_INITIATE=true` and `WELCOME_SUPPORT_MESSAGE=true`.
Android only: emulator `qa_phone` (API 35, 1080×2400, 420 dpi), Metro on :3008 serving
the working tree. **M** = measured on the device / API / DB; **I** = inferred from code or unit
tests. Evidence paths are relative to this folder and stay on the QA machine
(`qa/evidence/` is gitignored); only this file is committed.

## Verdicts

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Grid cards — soft panel, no border, square photo, no empty rows, inline "Firm price" chip, 1-line title, meta "2d · 10th District, Kabul", equal heights per row | **PASS (M) after fixes** — en and fa passed as built; ps and ur FAILED (clipped price/meta, cut age) → FIXED `cd9e021`; the chip truncating to "Firm …" → FIXED `c3a6cb0` | `feed/g01_grid_top.png`, `theme_lang/r_fa_grid.png`, `theme_lang/r_ur_cold.png` (before) → `r_ur_grid_after_fix3_zoom.png`, `r_ps_grid_after_fix3_zoom.png` (after), `r_en_grid_after_fix_zoom.png` (en unchanged) |
| 1b | ↳ dark | **PASS (M)** after fixing the system bars (`4c4d060`) | `theme_lang/th_e_8s.png` (before), `th_h_dark_after_fix.png` |
| 1c | ↳ RTL: meta and chip on the correct side | **PASS (M)** after `cd9e021` — age first in reading order, chip after the price | `theme_lang/r_ps_grid_after_fix3_zoom.png`, `la_en2ps_after.png` (list) |
| 1d | ↳ Saved, a profile, My Shop | **PASS (M)** — same card; My Shop's "Active" pill on the photo was nearly unreadable → FIXED `c3a6cb0`. My Shop *list* is the separate seller management card (border, actions), not part of this redesign | `feed/s01_saved.png`, `feed/p01_profile_grid.png`, `shop/m02_shop_grid.png` (before) → `fixes/fx_shop_grid.png`, `shop/m04_shop_list.png` |
| 2 | List mode — rounded photo filling the row, panel, no border, 2-line title | **PASS (M)** en, ps, dark | `feed/l02_list_top.png`, `theme_lang/la_en2ps_after.png`, `toggle/tg_5_double_2s.png` |
| 3 | No invisible rows, fast and slow, both modes | **PASS (M)** — every frame drawn, incl. the frame right after 3 fast flings | `feed/g03_grid_fast_now.png`, `g05_grid_fast_back_now.png`, `l04_list_fast_now.png`, `l05_list_fast_settled.png` |
| 4a | One tap switches grid ↔ list | **PASS (M)** — switched within 500 ms on an unscrolled feed (adb tap + on-device screencap). After 3 fast flings that loaded pages 2–3, one switch took > 3 s (JS thread busy, dev build) | `toggle/tg_1_list_0ms.png`, `tg_2_list_500ms.png`; `feed/l01_list_immediately.png` |
| 4b | Dim + spinner only while re-laying out | **PASS (M)** | `toggle/tg_4_double_0ms.png` |
| 4c | NO refetch on toggle | **PASS (M)** — API log: 0 `GET /listings` during 4 Maestro taps and 3 adb taps; a filter change refetches as it should | API log 14:39:35 → 14:40:46 and the adb window |
| 4d | Fast double tap (150 ms) ends on the last tap | **PASS (M)** | `toggle/tg_5_double_2s.png` |
| 4e | No fade-in replay on toggle / fade-in on filter change | **NOT MEASURED** — the rig disables animations on the emulator (reduced motion), so neither can show | — |
| 5 | Chips: no zoom, slight fade, labels sharp after several taps | **PASS for sharpness (M)**; zoom/fade cannot be judged from stills. The blur was iPhone-only and Android looked sharp before too, as far as old evidence shows | `chips/k0..k4_*.png`, `feed/c02_chips_after_several_taps.png` |
| 6a | Theme: overlay at once ("Applying theme…"), taps during it ignored, active option does nothing; light→dark→system | **PASS (M)** — overlay in the first frame after the tap; a System tap 150 ms into the overlay was ignored (ended Dark); tapping the active option: no overlay | `theme_lang/th_a_active_light_400ms.png`, `th_b_dark_0ms.png`, `th_c_tap_system_during.png`, `th_e_8s.png`, `th_f_system_0ms.png`, `th_g_system_8s.png` |
| 6b | Language: overlay at once in the TARGET language; en→ps (flip), ps→fa (no flip), RTL→en (flip back) | **PASS (M)** — "ژبه بدلېږي…", "در حال تغییر زبان…", "Changing language…" in the first frame. Done as en→ps→fa→ur→ps→en (fa→en itself not run; ur→ps and ps→en are) | `theme_lang/la_en2ps_0ms.png`, `la_ps2fa_0ms.png`, `la_fa2ur_0ms.png`, `la_ps2en_0ms.png` |
| 6c | ↳ after a switch, labels can be clipped until the next app start | **OPEN — UI-055** (transient; cold launch draws them in full) | `theme_lang/r_fa_grid.png` vs `r_fa_cold_heading.png` |
| 7 | Welcome: new account → exactly ONE unread message from verified Hatiwal Support, in its language, pinned first; log out/in → still one | **PASS** — email sign-up on the device (M): one unread "Welcome to Hatiwal! 👋…", badge 1, pinned first. Language: a Pashto sign-up through the same `POST /auth` got one message in Pashto (M, API). Re-login: two more sign-ins, still 1 conversation / 1 message, other party "Hatiwal Support" `verified: true` (M, API). Google sign-up NOT tested (no Google account on the emulator). The confirmation email went to a plus-alias of the owner's own address | `welcome/w01_chats_after_signup.png`, `w02_welcome_thread.png` |
| 8 | Regression flows (feed, chips, language/theme, inbox) | **PASS — all green at the end (M)**, after three flow fixes | `qa/reports/run-598..618` |

### Regression flows (rig, this HEAD)

| Flow | Result |
|---|---|
| browse/browse_listings · browse/view_mode_toggle · pagination/browse_pagination | PASS (run-598/599/600) |
| profile/change_language_pashto · profile/change_language_dari | PASS (run-603/604) |
| chat/conversations_list · chat/conversations_filter · chat/conversations_role_filter | PASS (run-607/608/609) |
| profile/theme_switch | run-602 FAIL → **flow bug** (tapped Dark while Dark was active; since e57f35a the active option does nothing, so no restart) → guarded; run-612 rig_fail (three restarts > 600 s cap) → split; run-614 FAIL (no return to Profile after the last restart — a gap the flow had never reached) → fixed; **run-616 PASS** |
| profile/theme_switch_light (new, split out) | **run-615 PASS** |
| dark_mode/browse_dark | run-606 FAIL (inherited Dark from run-602) → **run-613 PASS** from a clean theme |
| profile/change_language_english | run-605 rig_fail (600 s cap; two restarts) → pre-switch guarded to run only when English is active, text scrolls replaced by ids → **run-618 PASS** (after change_language_dari run-617 PASS) |
| rtl/browse_rtl_pashto | run-610 SILENT (pass + one `Network request failed`; its logcat was deleted by my batch script before I noticed — the script now keeps logcats for SILENT passes) → **run-611 clean PASS**, not reproduced |

All regression flows for this change set are green at the end.

## Bugs found and fixed (red → green test, committed by path; on device after)

1. **Dark theme: status bar and navigation bar strips stayed light** (`4c4d060`). With the app
   in Dark on a phone in light mode the strips behind the clock and the nav bar showed the
   native root view in the OS colour, and the white clock was unreadable.
   `ThemedSystemBars` now paints the root with the theme background (`expo-system-ui`, already
   a dependency). Test fails without the call.
2. **Grid cards in Pashto and Urdu clipped the price and the meta line** (`cd9e021`). Fixed-height
   grid rows (24 / 16 dp) vs Noto Sans Arabic's tall line box (17sp price: 38.5 dp natural):
   the bottom of "AFN 150,000" was cut, the chip looked raised, "," drew as ".", ې lost its dots,
   and as one mixed-direction string Android put the ellipsis on the age. PriceTag gained an
   optional `lineHeight` (only the grid passes it); the meta slot is 18 dp with pinned line boxes
   and the age/place are two Texts (the age never shrinks). English unchanged. Tests fail on the
   previous code.

3. **Grid "Firm price" chip cut to "Firm …"; My Shop "Active" pill unreadable on photos**
   (`c3a6cb0`, UI-054 / UI-056). The grid uses a short label (`listing.firmPriceShort`:
   Firm / ثابت / ثابت / طے شدہ — the key word of each locale's existing label; **owner may want
   to glance at the copy**) with the full label for screen readers, keeping the fixed 24 dp row;
   the list keeps the full label. The status pill on a photo gets an opaque card base. Tests fail
   on the previous code; verified `fixes/fx_en_grid.png`, `fixes/fx_shop_grid.png`.

## Open (not fixed — design calls or need more work)

- **UI-055** labels clipped right after an in-app language switch, until restart — dev-build only (store builds fully restart on a language change), documented per owner.
- **UI-057** (design) a saved-search chip looks exactly like an active-filter pill.
- Design notes only: "Recent searches" stays pinned and takes ~¼ of the Bazaar screen while
  scrolling; in RTL list rows the photo stays on the left (matches the rest of the app's RTL
  convention); Profile content scrolls under the translucent status bar (edge-to-edge).

## Rig notes

- Maestro cannot tap faster than its settle wait (~3 s), so "at once", "taps during the
  overlay are ignored" and "fast double tap" were measured with raw `adb input tap` and
  on-device `screencap` in one shell command (`toggle/`, `theme_lang/la_*`, `th_*`).
- The rig deletes a passing flow's debug dir, `takeScreenshot` output included; the visual
  flows in `maestro/_diag/` were run directly with `--debug-output`, never alongside a rig run.
- `--env EMAIL=` on the command line overrides a sub-flow's `runFlow: env:`; the welcome flow's
  re-login therefore signed in as the buyer, and re-login was checked through the API instead.
- `login.yaml` and friends assume English labels; in fa/ur they stall on Profile.

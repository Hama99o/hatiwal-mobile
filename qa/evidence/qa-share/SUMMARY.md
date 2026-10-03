# QA — sharing a listing / profile (2026-10-03)

Owner: *"when i share list or profile it did not work… it should have well
share system to whatsapp"*. Server fix by hamma9901 (production now sets
`PUBLIC_SHARE_BASE_URL=https://hatiwal.com`; web redirects `/l/<id>` →
`/listings/<id>` and `/u/<id>` → `/sellers/<id>`). This pass checks the app.

**Rig:** Android 15 emulator `qa_phone` (emulator-5580), debug APK, Metro on
the host from the working tree, local API with
`PUBLIC_SHARE_BASE_URL=https://hatiwal.com` added to `hatiwal-api/.env` for the
run. WhatsApp is not installed on the emulator; Google Messages and Chrome are.

## Verdict

**Sharing works.** All three entry points hand the share sheet an https
`hatiwal.com` link, never `hatiwal://`, in all four languages. A real chat
app turns it into a tappable link, and the link opens the right page.

Found on the way, and fixed: **after any language or theme change, "Gallery"
on Create Listing did nothing**, so a seller could not add a photo and could
not publish (details below).

## Results

| Check | Result | Evidence |
|---|---|---|
| Listing detail → ⋯ → Share: text = title — price + `https://hatiwal.com/l/<id>` | PASS | flow `share/share_listing_sheet` (run-637), `01-listing-share-sheet.jpg` |
| Seller profile → ⋯ → Share: text = invite line + `https://hatiwal.com/u/<id>` | PASS | flow `share/share_seller_sheet` (run-636), `06-seller-share-sheet-en.jpg` |
| Publish success sheet → Share: new listing's `https://hatiwal.com/l/<id>` | PASS (run-639). The run began in Pashto, its login switched to English, then it attached a photo, published and shared; the end screen is the new listing, Active, in English | flow `share/share_after_publish` |
| Never `hatiwal://` in any shared text | PASS | asserted in all three flows |
| Into a real app: shared into Google Messages, text arrives intact | PASS | `02-messages-compose.jpg` |
| Link is tappable in the receiving app | PASS (underlined, opens on tap) | `03-messages-sent-link-underlined.jpg` |
| Link opens the right page | PASS: prod `https://hatiwal.com/l/70` → 307 → `/en/listings/70`, Chrome on the emulator shows that listing | `05-prod-link-lands-on-listing.jpg` |
| Cancel the sheet: no error toast, stays on the screen | PASS | last steps of each flow |
| en / ps / fa / ur text | PASS: localized line, link on its own line, https | table below |
| Dark mode | PASS: the app ran in dark theme for the seller checks; the share sheet is system UI and follows the system theme | `07-…`, `09-…` |

Exact shared text, read from the share sheet:

| | Listing | Profile |
|---|---|---|
| en | `Samsung Galaxy S24 Ultra — AFN 62,000` / `https://hatiwal.com/l/81` | `Check out Omar Noori on Hatiwal` / `https://hatiwal.com/u/603` |
| ps | `Samsung Galaxy S24 Ultra — ؋ ۶۲٬۰۰۰` / `https://hatiwal.com/l/81` | `د هاتیوال پر Omar Noori وګورئ` / `https://hatiwal.com/u/603` |
| fa | `Samsung Galaxy S24 Ultra — ‎؋۶۲٬۰۰۰` / `https://hatiwal.com/l/81` | `Omar Noori را در هاتیوال ببینید` / `https://hatiwal.com/u/603` |
| ur | `Samsung Galaxy S24 Ultra — AFN 62,000` / `https://hatiwal.com/l/81` | `Hatiwal پر Omar Noori کو دیکھیں` / `https://hatiwal.com/u/603` |

RTL text order: Android's own share-sheet PREVIEW lays the Pashto line out
left-to-right, so it reads scrambled there (`07-seller-share-sheet-ps-preview-ltr.jpg`).
That is system UI. In the receiving app (Google Messages) the same text is laid
out right-to-left correctly (`08-ps-seller-in-messages-rtl-ok.jpg`). Not a
defect in the app.

## Fixed during this pass

### 1. Photos could not be added after a language or theme change — FIXED

- **Symptom:** Create Listing → Add Photos → Gallery: the sheet closes, no
  picker opens, nothing is said. Only killing the app brought it back. A
  listing cannot be published without a photo.
- **Cause, from the log:** `ExponentImagePicker.launchImageLibraryAsync` was
  rejected: *"Attempting to launch an unregistered ActivityResultLauncher"*.
  Every language or theme change restarts JS through `react-native-restart`
  (`src/lib/reloadApp.ts`). On Android with the New Architecture that left Expo
  modules' activity launchers unregistered.
- **Reproduced:** fresh app → picker opens 5/5. Switch to Pashto → picker
  rejected, every time.
- **Fix:** `reloadApp()` now reloads through Expo's own `reloadAppAsync`, which
  rebuilds the host the way Expo modules expect. `react-native-restart` stays
  only as the fallback. JS only, so no new APK is needed. Verified: after
  switching to English and then to Pashto, the picker opens, and the reload
  still applies the new language (RTL layout, Pashto labels).
- **Proved end to end:** run-639 of `share/share_after_publish` started with the
  app in Pashto. Its login switched to English (a reload), then the gallery
  attached a photo and the listing published. Before the fix, run-638 failed on
  exactly that step, at `listing-form-photo-thumb`.
- **Test:** `src/lib/__tests__/reloadApp.test.ts` (4 tests). The i18n and store
  suites still pass (35/35).
- **Ships:** in the next store build. Users on 1.1.2 and older keep the bug.
  Workaround until then: close the app fully and reopen it after changing
  language or theme.

### 2. Share rows had no testID — added

`more-sheet-share` (ListingDetail ⋯ sheet) and `profile-menu-share` (profile
⋯ menu). The flows target these rather than the translated label: the device
keeps whatever language the previous session left (it was Dari on the first run).

## Gaps — reported, not built (for the next weekly release)

1. **Links open the website, not the app.** Tapping `https://hatiwal.com/l/81`
   in Messages opened Chrome (`04-link-opens-chrome-not-app.jpg`). There are no
   Android App Links or iOS Universal Links (`app.json` has no `intentFilters`
   or `associatedDomains`, and the site serves no `assetlinks.json` or AASA).
2. **The seller link's WhatsApp preview is generic.** `https://hatiwal.com/u/<id>`
   serves the right `<title>` ("Umair Safi — Hatiwal"), but `og:title` is just
   "Hatiwal", with the generic site description and generic image. WhatsApp
   builds its card from `og:*`, so a shared profile shows no name and no
   avatar. The listing link is fine (title, description, photo).
3. **You cannot share your OWN profile.** The share action lives only in the ⋯
   menu on someone else's profile (`UserProfile` renders it when `!isMe`), and
   the Profile tab has no share action at all. A seller who wants to send people
   their shop has no button. This is likely part of what the owner hit.
4. **Brand spelling in the share text:** the ps/fa profile line says
   "هاتیوال"; elsewhere the app uses "هتیوال". The brand spelling is the
   owner's open decision, so it was left as is.
5. **Listing og:image is an Active Storage disk URL.** Worth checking that it
   does not expire before WhatsApp fetches it; not tested.

# Toasts fired while a sheet is open are invisible

**Audited 2026-09-15. Eight confirmed silent-failure paths, three cleared.**

## The mechanic

`<Toaster>` is mounted at `app/_layout.tsx:115`, at the root of the tree. On
Android a React Native `<Modal>` is a **separate native window** drawn over that
root. So a toast fired while any sheet is open renders *behind* it and the user
sees nothing at all.

It is invisible to tests for the same reason — the toast is not in the topmost
window's view hierarchy, so Maestro cannot see it either. `report_participant`
polled ten seconds for a toast that had already fired.

The tell is always the same shape:

```ts
onSuccess: () => { setSheetVisible(false); toast.success(...); }  // visible
onError:   () => { toast.error(...); }                            // NOT visible
```

The success path closes the sheet first, so its toast lands on the plain screen
and works. The error path leaves the sheet open, which is exactly when a toast
cannot be seen. **Every confirmed case below has that asymmetry.**

## Confirmed

| # | Where | Path | What the user sees |
|---|---|---|---|
| 1 | `ReportSheet` | submit `onError` (422 duplicate / self-report / generic) | nothing — **FIXED c479dcd**, now also inline |
| 2 | `ListingDetail` | `handleSendOffer` — amount ≤ 0 | nothing; sheet just sits there |
| 3 | `ListingDetail` | `handleSendOffer` — invalid quantity | nothing |
| 4 | `ListingDetail` | `offerMutation.onError` | nothing (`onSuccess` closes the sheet, `onError` does not) |
| 5 | `Browse` | `handleToggleNearest` geo failure | nothing — the "Nearest" pill lives inside `FilterSheet`, a `<Modal>` |
| 6 | `Conversation` | `handleSendOfferInThread` — invalid amount | nothing |
| 7 | `Conversation` | `handleSendCounter` — invalid counter | nothing (its own comment: *"'-500' must never reach the API with no error toast"*) |
| 8 | `Conversation` | `handleProposeMeetup` `catch` | nothing (`try` closes the sheet then toasts; `catch` only toasts) |

Five of these are on the **offer path** — the app's core commerce action.

## Cleared

- **`ListingForm`** — its only `<Modal>` is the currency picker, which has no
  error paths. Its validation errors already pair the toast with an INLINE
  message (`setQuantityServerError`) and an a11y announcement, with a comment
  saying the message would otherwise "land under a HIDDEN input, the exact
  'failed but nothing on screen explains why' bug this ticket exists to fix".
  That is the house pattern and the model for the fix below.
- **`ListingDetail` save `onError`** — the heart button is on the screen, not in
  a sheet.
- **`ListingDetail` share `catch`** — `handleShare` calls `setShowMoreSheet(false)`
  before sharing, and on iOS defers the share to the modal's `onDismiss`, so the
  sheet is gone by the time anything can fail.
- **`Browse` hide/unhide `onError`** — fired from feed cards, no modal open.

## The fix

`ReportSheet` (c479dcd) is the worked example: resolve the message once, then
surface it **both** ways — `toast.error(message)` for the paths where the sheet
has closed, and an inline `<Text testID="...-submit-error">` for the paths where
it has not. It keeps existing behaviour and adds the missing half.

Closing the sheet on error is the other option and is usually wrong: it discards
what the user typed, and for a validation error (cases 2, 3, 6, 7) they need to
stay on the form to correct it.

**Do not "fix" this by moving `<Toaster>` inside the sheets.** There are seven
sheets; the toast host belongs at the root. The missing piece is inline feedback
in the sheet, not a second toast host.

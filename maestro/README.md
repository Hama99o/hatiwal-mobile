# Hatiwal E2E Tests — Maestro

End-to-end flows for every user-facing feature. Tests run on a real simulator or device.

## Setup

```bash
# Install Maestro (Mac)
brew install maestro

# Or via curl (Linux / Mac)
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Running Tests

```bash
# Run all flows
maestro test maestro/

# Run one flow
maestro test maestro/auth/login.yaml

# Run a folder
maestro test maestro/listings/

# Run with a specific device
maestro test --device <device-id> maestro/auth/login.yaml
```

## Test Data Requirements

Tests expect the following seed data in the Rails DB:

| User | Email | Password | Role |
|---|---|---|---|
| Buyer | buyer@hatiwal.test | Password123! | Has no listings, has some saved, has conversations |
| Seller | seller@hatiwal.test | Password123! | Has draft, active, reserved, sold listings with conversations |
| New buyer | newbuyer@hatiwal.test | Password123! | Fresh account, nothing saved, no conversations |

Seed with:
```bash
# First time — seed E2E data on top of existing dev data
cd hatiwal-api && bundle exec rails db:seed:e2e

# Reset — wipe E2E accounts and re-seed from scratch (use before a clean test run)
cd hatiwal-api && bundle exec rails db:seed:reset_e2e
```

## Flow Index

152 flows across 15 folders. All use English locale strings as selectors.

```
_helpers/
  login.yaml              ← reusable: login as buyer (buyer@hatiwal.test)
  login_seller.yaml       ← reusable: login + switch to seller mode

auth/
  login.yaml                    ← happy path login
  login_deep.yaml               ← login, verify all profile fields persist
  login_wrong_password.yaml     ← wrong password shows error
  login_empty_fields.yaml       ← empty form submission (clearState)
  login_navigate_to_register.yaml ← tap "register" link from login
  sign_up.yaml                  ← happy path register
  sign_up_validation.yaml       ← required fields, password mismatch
  register_duplicate_email.yaml ← duplicate email shows server error (clearState)
  register_navigate_to_login.yaml ← tap "sign in" link from register
  logout.yaml                   ← confirm dialog, lands on Browse
  logout_cancel.yaml            ← cancel stays logged in
  session_persist.yaml          ← kill + reopen app, still logged in
  guest_browse.yaml             ← Continue browsing without auth
  guest_save_redirect.yaml      ← guest taps save → redirected to login → listing saved after auth
  guest_offer_redirect.yaml     ← guest taps Make Offer → redirected to login → offer sent after auth

browse/
  browse_listings.yaml            ← feed loads, scroll, tap detail
  browse_all_categories.yaml      ← all category chips load, tap to filter
  search_listings.yaml            ← search, clear, no results
  search_empty_state.yaml         ← non-existent query shows empty state
  search_with_filter.yaml         ← search term + condition filter active simultaneously
  filter_by_category.yaml         ← category sheet, apply, clear
  full_marketplace_cycle.yaml     ← seller creates → buyer finds/saves/offers → seller accepts → marks sold → buyer sees Sold in Saved
  filter_price_range.yaml         ← min/max price filter, reset
  filter_condition.yaml           ← condition chips filter, reset
  listing_detail.yaml             ← all detail elements visible
  listing_detail_save_unsave.yaml ← save via heart, unsave, verify in Saved tab
  listing_detail_offer.yaml       ← make price offer from detail
  listing_detail_offer_invalid.yaml ← offer validation (empty, zero)
  listing_detail_report.yaml      ← report listing from detail more-options menu
  listing_detail_sold_state.yaml  ← sold listing shows sold notice
  listing_detail_share.yaml       ← more-options → Share → OS share sheet opens
  listing_detail_similar.yaml     ← scroll to similar listings rail, tap one → opens that detail
  listing_detail_views_count.yaml ← views count visible on detail, increments on re-visit
  saved_search_apply.yaml         ← apply filters → auto-saved → clear → re-apply saved search
  seller_profile.yaml             ← view public seller profile from listing detail

gallery/
  listing_gallery_swipe.yaml       ← swipe through multi-photo gallery, dots update
  listing_gallery_no_photo.yaml    ← listing with no photos shows placeholder
  listing_create_multi_photos.yaml ← pick 3 photos, verify cover label on first
  listing_edit_add_photos.yaml     ← edit listing, add photo, reorder cover

listings/
  create_listing.yaml                  ← fill form, save as draft
  create_listing_all_fields.yaml       ← every field including condition + currency
  create_listing_validation.yaml       ← required field errors
  create_listing_with_photos.yaml      ← photo picker, cover label
  create_listing_publish_direct.yaml   ← fill form and publish directly
  create_listing_category_search.yaml  ← search within category picker
  create_listing_province_picker.yaml  ← search and select province
  create_listing_location_picker.yaml  ← map / coordinates picker
  create_listing_currency_usd.yaml     ← switch currency to USD, verify price display
  create_listing_currency_eur.yaml     ← switch currency to EUR, verify € symbol on detail
  create_listing_with_condition.yaml   ← set Like New condition → publish → ConditionBadge on detail
  create_listing_draft_restore.yaml    ← restore unsaved draft on re-open
  create_listing_draft_discard.yaml    ← discard in-progress draft via dialog
  edit_listing.yaml                    ← change title/price, save
  edit_listing_all_fields.yaml         ← change every editable field, save
  edit_listing_discard.yaml            ← discard unsaved changes via dialog
  edit_listing_remove_photo.yaml       ← delete a photo, cover updates
  edit_listing_reorder_photos.yaml     ← drag to reorder photos
  delete_listing.yaml                  ← confirm dialog, toast, removed
  draft_lifecycle.yaml                 ← draft → active → reserved → sold full chain
  lifecycle_publish.yaml               ← draft → active
  lifecycle_unpublish.yaml             ← active → draft
  lifecycle_reserve.yaml               ← active → reserved
  lifecycle_reactivate.yaml            ← reserved → active
  lifecycle_sold.yaml                  ← reserved → sold
  expired_listing_badge.yaml           ← active listing shows expiry countdown badge
  listing_renew_flow.yaml              ← expired listing → tap Renew → active again
  my_listings_filter_tabs.yaml         ← All / Draft / Active / Reserved / Sold tabs
  my_listings_search.yaml              ← search within my listings
  listing_conversations_list.yaml      ← seller views conversations for a listing

pagination/
  browse_pagination.yaml         ← browse feed: scroll to bottom loads more listings
  search_pagination.yaml         ← search results: scroll loads next page
  my_listings_pagination.yaml    ← My Listings: scroll loads more
  saved_pagination_deep.yaml     ← Saved tab: scroll loads more saved listings
  conversations_pagination.yaml  ← Conversations list: scroll loads more threads
  filter_combined_pagination.yaml ← category filter applied, then scroll to page 2 — filter survives

chat/
  conversations_list.yaml          ← list, unread count badge, tap opens thread
  conversations_filter.yaml        ← All / Unread / Read filter tabs
  conversations_empty_state.yaml   ← fresh account shows empty state + browse CTA
  start_conversation.yaml          ← message seller from detail
  start_conversation_and_reply.yaml ← buyer sends, seller replies (two accounts)
  send_message.yaml                ← send in existing thread
  send_multiple_messages.yaml      ← send 5 messages, all appear in correct order
  message_long_text.yaml           ← 500-char message wraps correctly
  conversation_read_status.yaml    ← sent → read receipt appears after other party reads
  offer_in_existing_thread.yaml    ← make offer from within chat thread
  offer_send_and_accept.yaml       ← buyer makes offer, seller accepts — outcome on bubble
  offer_send_and_decline.yaml      ← buyer makes offer, seller declines — outcome on bubble
  meetup_proposal.yaml             ← propose meetup, bubble visible with place + time
  meetup_proposed_bubble_ui.yaml   ← verify meetup bubble renders place tappable link
  meetup_validation.yaml           ← place and time required, validation messages
  meetup_respond.yaml              ← accept a meetup proposal
  meetup_decline.yaml              ← decline a meetup proposal
  meetup_full_cycle.yaml           ← propose → accept → both see accepted outcome
  conversation_delete.yaml         ← delete conversation with confirm dialog
  block_from_conversation.yaml     ← block/unblock user from within conversation thread (not profile)
  view_other_profile_from_conversation.yaml ← tap participant name → opens their public profile
  chat_older_messages_pagination.yaml ← scroll to top in thread → older messages load (page 2+)

saved/
  save_listing.yaml              ← save from detail, appears in Saved tab
  save_from_browse_feed.yaml     ← save from feed heart button, verify Saved tab
  save_multiple_listings.yaml    ← save 3 listings, all appear in Saved
  unsave_listing.yaml            ← unsave from Saved tab, list updates
  unsave_from_browse_feed.yaml   ← unsave via feed heart, verify removed from Saved
  saved_empty_state.yaml         ← empty state + browse button
  saved_pagination.yaml          ← scroll loads more, tap opens detail
  saved_listing_goes_sold.yaml   ← buyer saves → seller marks sold → Saved tab shows Sold badge

profile/
  edit_profile.yaml                       ← change name, save, verify
  edit_profile_all_fields.yaml            ← name + phone + city + bio + avatar, all saved
  edit_profile_validation.yaml            ← clear required field, error message
  edit_profile_avatar.yaml                ← tap avatar opens Gallery/Camera sheet
  edit_profile_bio_too_long.yaml          ← bio exceeds max length, validation fires
  edit_profile_province_picker_deep.yaml  ← search province in picker, select, save
  view_seller_profile_from_profile.yaml   ← profile stats, quick actions, links
  profile_stats_verify.yaml               ← listings count, conversations count visible
  seller_mode_toggle.yaml                 ← switch to seller mode from profile tab
  theme_switch.yaml                       ← Dark / Light / System theme options
  change_language_pashto.yaml             ← RTL, Pashto strings visible
  change_language_dari.yaml               ← RTL, Dari strings visible
  change_language_english.yaml            ← switch back to LTR English
  language_persists_across_tabs.yaml      ← change language, navigate all tabs, still RTL
  language_switch_all_screens.yaml        ← switch to Pashto, verify each main screen

mode/
  mode_switcher.yaml                    ← buyer/seller banner toggle, tab bar updates, empty states
  seller_views_own_listing_buyer_mode.yaml ← seller in buyer mode finds own listing — no Contact Seller shown

report/
  report_listing.yaml            ← select reason, submit, toast
  report_listing_no_reason.yaml  ← submit without reason shows validation error
  report_user.yaml               ← report from conversation header
  report_user_from_profile.yaml  ← report from seller profile page
  block_user.yaml                ← block/unblock from seller profile
  block_prevents_message.yaml    ← blocked user cannot start a new conversation
  block_user_hides_listings.yaml ← blocked user's listings hidden from browse

rtl/
  browse_rtl_pashto.yaml      ← Pashto RTL layout check on browse
  browse_rtl_dari.yaml        ← Dari RTL layout check on browse
  listing_detail_rtl.yaml     ← RTL in listing detail (Pashto)
  chat_rtl.yaml               ← RTL in chat thread (Pashto)
  my_listings_rtl.yaml        ← RTL in My Listings (Pashto)
  profile_rtl.yaml            ← RTL in Profile screen (Dari)

dark_mode/
  browse_dark.yaml          ← dark theme, browse renders correctly
  listing_detail_dark.yaml  ← dark theme, detail renders correctly
  chat_dark.yaml            ← dark theme, chat thread and input
  profile_dark.yaml         ← dark theme, profile screen
  my_listings_dark.yaml     ← dark theme, My Listings cards

onboarding/
  first_run.yaml  ← fresh install shows 3-slide carousel + language switcher, Skip/Get started both set the seen flag and land on Bazaar, flag persists across relaunch
```

## Adding Tests for a New Feature

1. Create a new flow file in the matching folder
2. Cover: happy path + main error state + empty state + any edge cases
3. Use `runFlow: ../_helpers/login.yaml` to avoid repeating login
4. Update this README with the new flow

## Notes

- RTL flows verify the app runs without crash — visual RTL correctness (alignment, text direction) requires manual screenshot review alongside Storybook
- Dark mode flows verify elements are visible — color contrast requires Storybook visual review
- Flows use English translation strings as selectors (default locale)
- For flows that test RTL: they switch language at the start and reset to English at the end
- `login_empty_fields` and `register_duplicate_email` use `launchApp: clearState: true` to start fresh

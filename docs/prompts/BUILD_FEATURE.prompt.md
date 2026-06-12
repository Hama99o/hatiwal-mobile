# Prompt Helper — Build a Marketplace Feature

> A reusable, copy-paste prompt for shipping a Hatiwal mobile feature the house way.
> Pair it with the **feature-builder** agent (engineering) and the **marketplace-designer** agent (polish).
>
> Before using: the assistant must read [mobile.prompt.md](mobile.prompt.md),
> [../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md), and the feature's row in [../FEATURES.md](../FEATURES.md).

---

## How to use

1. Copy the **Task Brief** below, fill the blanks (or just name the feature from `FEATURES.md`).
2. Run the **feature-builder** agent with it.
3. Run the **marketplace-designer** agent on the result for a deep visual review, then apply fixes.

---

## Task Brief (fill in)

```
Feature: <e.g. Buyer browse feed>
FEATURES.md row: <§2 Browse active listings>
Mode: <buyer | seller | chat | shared>
Type: <list | detail | form | both>
Route: /(main)/(tabs)/<route-name>
Backend endpoint(s): <GET /listings?search&category_id&page, ...>
Response root key: <listings + meta.pagination>  Serializer view: <:list>
Sidebar/tab group: <Browse | Sell | Chat | Saved | Profile>
Library(ies) to use (from DESIGN_SYSTEM §4): <flash-list, expo-image, ...>
Shared components to reuse/create: <ListingCard, PriceTag, StatusBadge, ...>
Translations namespace (English; ps+fa added too):
  {
    "title": "...",
    "searchPlaceholder": "...",
    "empty": { "title": "...", "description": "..." }
  }
Notes: <special tabs, filters, lifecycle actions, RTL edge cases>
```

---

## Definition of done (the agent must satisfy all)

- [ ] **API** — `src/api/<domain>.ts`: typed interfaces matching the Blueprinter serializer (camelCase), `http` instance only, `convertKeysToSnake` out / `convertKeysToCamel` in, no `any`.
- [ ] **Screen** — list → `UniversalList` (FlashList for big feeds); detail/form → `ScreenContainer`. ALL UI from RNR + sanctioned libraries; **nothing hand-rolled** that a library provides.
- [ ] **Photos** via `expo-image`; **price** via `PriceTag`/`formatCurrency`; **status** via `StatusBadge`.
- [ ] **States** — skeleton loading, `EmptyState` (icon + title + guidance + primary action), error handled (`sonner-native`).
- [ ] **Forms** via `react-hook-form` + `zod` with inline validation and sticky submit.
- [ ] **Destructive actions** via `confirmAlert` — never `Alert.alert`.
- [ ] **Freshness** — `useFocusEffect` refetch on every server-data screen.
- [ ] **Route** — thin `app/` wrapper (`export default Screen`), logic in `src/screens/`.
- [ ] **Sidebar/tab** — entry added with translation-key label + Lucide icon.
- [ ] **i18n** — every new key in **en + ps + fa**; new namespace registered in `en.ts`/`ps.ts`/`fa.ts`. English is the default.
- [ ] **RTL** — verified for Pashto; **dark mode** verified; **no hex literals**.
- [ ] **Size** — screen file ≤ ~300 lines; tabs/modals split into a `<screen-name>/` subfolder.
- [ ] **Verify** — builds clean; loads against API (`:3007`) on web (`:3008`); search/pagination work.

---

## Then: design review (marketplace-designer)

Ask the **marketplace-designer** agent to review the new screen. It checks the trust/photo/price hierarchy,
lifecycle legibility, states, motion, RTL/dark, and whether any primitive should have been a library —
and applies the fixes. Ship only after its verdict is **ship**.

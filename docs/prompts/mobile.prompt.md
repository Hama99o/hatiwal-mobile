## applyTo: `**`

These rules are **mandatory**. Follow them strictly for consistency, accessibility, and maintainability in the React Native / Expo mobile app.

---

## Project Foundation

- **Framework**: React Native + Expo SDK 54
- **Routing**: Expo Router 6 (file-based routing under `app/`)
- **UI library**: react-native-reusables (RNR) in `src/components/reusables/` — the ONLY UI library, strict rule (see §5). Custom components must be compositions of RNR.
- **Styling**: NativeWind v4 (Tailwind in RN) — use `className` for **layout only** (flex, padding, margin, gap, rounded, overflow). For **all colors**, use `useColors()` inline styles — see §5 Theming for the mandatory rule.
- **State**: Zustand stores in `src/stores/`
- **i18n**: `i18next` + `react-i18next`. 3 locales: `en`, `ps`, `fa` (RTL: `ps`, `fa`)
- **HTTP**: Axios instance at `src/api/http.ts` — auth headers auto-attached
- **Theme**: never hardcode hex values — ALWAYS use `useColors()` for any color. `className` is layout-only (spacing, sizing, rounded). See §5 Theming.

---

## 1) File System Structure

Always follow the established folder organization:

```
app/                          ← Expo Router routes (file = route)
  (auth)/                     ← Auth routes (login, register)
  (main)/
    (tabs)/                   ← Tab routes — every authenticated screen gets a tab entry
src/
  api/                        ← One file per domain (listings.ts, conversations.ts, ...)
  components/
    common/                   ← Cross-screen shared components (ListingCard, CategoryBadge, ...)
    shared/                   ← Layout / nav components (AppHeader, Sidebar, ...)
    ui/                       ← Primitive UI atoms (Badge, Button, Card, ScreenContainer, ...)
  config/
    sidebars/                 ← Sidebar configs per mode (buyer.config.ts, seller.config.ts)
  hooks/                      ← Custom hooks
  i18n/
    index.ts                  ← main i18n config
    en.ts                     ← imports all en/* namespace files
    ps.ts                     ← imports all ps/* namespace files
    fa.ts                     ← imports all fa/* namespace files
    locales/
      en/                     ← one JSON file per namespace (common.json, auth.json, ...)
      ps/                     ← same namespace files, Pashto translations
      fa/                     ← same namespace files, Dari/Farsi translations
  screens/                    ← Business-logic screens per mode
    buyer/
    seller/
    chat/
    shared/                   ← Screens used in both modes (listing detail, user profile)
  stores/                     ← Zustand stores
  types/                      ← Shared TypeScript types
  utils/                      ← Pure utilities (case-styles, formatters, ...)
```

- Do **not** put business logic inside `app/` route files — they must only `export default YourScreen`
- Do **not** mix buyer/seller concerns in the same screen file unless it is genuinely shared

---

## 2) Screen Layout

Every screen **must** use `ScreenContainer` as the outermost wrapper:

```tsx
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppHeader } from '@/components/shared/AppHeader';

export function BrowseScreen() {
  return (
    <ScreenContainer padded>
      <AppHeader title={t('browse.title')} />
      {/* content */}
    </ScreenContainer>
  );
}
```

`ScreenContainer` props:
| Prop | Default | Description |
|---|---|---|
| `scrollable` | `true` | Wraps content in `ScrollView` |
| `padded` | `true` | Adds `paddingHorizontal: 16` |
| `style` | — | Extra `ViewStyle` for the inner container |

For **list screens** (search + infinite scroll), use `UniversalList` — it manages its own scroll, so set `scrollable={false}` on `ScreenContainer`.

---

## 3) Mandatory Translations

**Never hardcode strings in JSX.** Always add keys to all 3 locale files and wrap with `t('...')`.

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<Text>{t('browse.title')}</Text>
```

---

### Translation File Structure (Modular — One File Per Namespace Per Language)

The i18n system uses a **modular file structure** — translations are split into namespace files per language.

```
src/i18n/
  index.ts                  ← main i18n config
  en.ts                     ← imports all en/* namespace files, exports enTranslations
  ps.ts                     ← imports all ps/* namespace files, exports psTranslations
  fa.ts                     ← imports all fa/* namespace files, exports faTranslations
  locales/
    en/
      common.json
      auth.json
      browse.json
      listing.json
      chat.json
      seller.json
      profile.json
      ...
    ps/
      common.json
      auth.json
      browse.json
      ...                   ← same namespaces as en/
    fa/
      common.json
      ...
```

**Key rule**: every namespace that exists in `en/` must also exist in `ps/` and `fa/` with the same keys.

---

### How Translations Are Loaded

`index.ts` imports from the language files:
```ts
import { enTranslations } from './en';
import { psTranslations } from './ps';
import { faTranslations } from './fa';

resources: {
  en: { translation: enTranslations },
  ps: { translation: psTranslations },
  fa: { translation: faTranslations },
}
```

Each language file (e.g. `en.ts`) imports all its namespace JSON files:
```ts
// src/i18n/en.ts
import en_common from './locales/en/common.json';
import en_browse from './locales/en/browse.json';
import en_listing from './locales/en/listing.json';

export const enTranslations = {
  common: en_common,
  browse: en_browse,
  listing: en_listing,
};
```

In a component, `t('browse.title')` resolves via `enTranslations.browse.title`.

---

### Scenario A — Adding Keys to an Existing Namespace

**Step 1**: Add the key to all 3 language namespace files:

```jsonc
// src/i18n/locales/en/browse.json
{
  "title": "Browse",
  "searchPlaceholder": "Search listings...",
  "newKey": "My new label"     // ← add here
}
```

```jsonc
// src/i18n/locales/ps/browse.json
{
  "title": "لټون",
  "searchPlaceholder": "خپلو توکو لټون وکړئ...",
  "newKey": "زما نوی لیبل"    // ← Pashto
}
```

```jsonc
// src/i18n/locales/fa/browse.json
{
  "title": "مرور",
  "searchPlaceholder": "جستجوی آگهی‌ها...",
  "newKey": "برچسب جدید من"   // ← Dari/Farsi
}
```

**Step 2**: No changes needed to `en.ts`, `ps.ts`, `fa.ts` — they already import those JSON files.

**Step 3**: Use it:
```tsx
<Text>{t('browse.newKey')}</Text>
```

---

### Scenario B — Adding a Brand New Namespace

For example, a new `savedListings` namespace:

**Step 1**: Create the JSON file for all 3 languages:

```jsonc
// src/i18n/locales/en/savedListings.json
{
  "title": "Saved Listings",
  "empty": {
    "title": "No saved listings",
    "description": "Listings you save will appear here."
  }
}
```

```jsonc
// src/i18n/locales/ps/savedListings.json
{
  "title": "خوندي شوي توکي",
  "empty": {
    "title": "هیڅ خوندي شوي توکي نشته",
    "description": "هغه توکي چې تاسو یې خوندي کړئ دلته به ښکاره شي."
  }
}
```

```jsonc
// src/i18n/locales/fa/savedListings.json
{
  "title": "آگهی‌های ذخیره‌شده",
  "empty": {
    "title": "هیچ آگهی ذخیره‌ای ندارید",
    "description": "آگهی‌هایی که ذخیره می‌کنید اینجا نشان داده می‌شوند."
  }
}
```

**Step 2**: Register in all 3 language index files:

```ts
// src/i18n/en.ts
import en_savedListings from './locales/en/savedListings.json';

export const enTranslations = {
  ...
  savedListings: en_savedListings,
};
```

Do the same for `ps.ts` and `fa.ts`.

**Step 3**: Use it:
```tsx
<Text>{t('savedListings.title')}</Text>
<Text>{t('savedListings.empty.title')}</Text>
```

---

### Translation Checklist

When adding any new user-facing string:

- [ ] Added key to `src/i18n/locales/en/<namespace>.json`
- [ ] Added key to `src/i18n/locales/ps/<namespace>.json` (Pashto)
- [ ] Added key to `src/i18n/locales/fa/<namespace>.json` (Dari/Farsi)
- [ ] If **new namespace**: also added import + entry to `en.ts`, `ps.ts`, `fa.ts`
- [ ] Using `t('namespace.key')` in JSX — no hardcoded strings

Always add the same key to **all 3 locales**. Pashto (`ps`) and Dari (`fa`) are both RTL.

---

## 4) Localized Dates, Times, and Numbers — `useLocalization`

**This is mandatory.** Never use raw `Date.toLocaleDateString()` or `date-fns/format` for user-facing output. Always use the `useLocalization` hook.

### Import

```tsx
import { useLocalization } from '@/hooks/useLocalization';
```

### Available Functions

```tsx
const {
  formatDate,         // Long date
  formatDateShort,    // Short date
  formatDateNumeric,  // Numeric date
  formatTime,         // 12-hour time
  formatTime24,       // 24-hour time
  formatDateTime,     // Date + time
  formatNumber,       // Locale-aware number
  formatCurrency,     // Currency (defaults to AFN for Afghan market)
  formatPercent,      // Percentage
  isRtl,             // true if current language is RTL (ps or fa)
} = useLocalization();
```

### Usage Examples

```tsx
// ❌ BAD
<Text>{new Date(listing.createdAt).toLocaleDateString()}</Text>
<Text>{listing.price} AFN</Text>

// ✅ GOOD
const { formatDate, formatCurrency } = useLocalization();

<Text>{formatDate(listing.createdAt)}</Text>
<Text>{formatCurrency(listing.price)}</Text>
```

---

## 5) UI Components

**react-native-reusables (RNR) is the ONLY UI library. This is a STRICT rule.**

### The strict rule

- Every visible UI element comes from `src/components/reusables/` — directly, or through a wrapper built on RNR.
- Custom components are allowed **only as compositions of RNR components**.
- The only raw RN primitives allowed are non-UI building blocks: `View`, `ScrollView`, `FlatList`, `ActivityIndicator`, `RefreshControl`, `Image`, and `Pressable` strictly as a touch wrapper.
- Raw `Text` from `react-native` is forbidden — use `Text` from `@/components/reusables/text`.

### Priority order when picking a component

1. **RNR primitive** (`src/components/reusables/`) — buttons, inputs, dialogs, selects, checkboxes, tabs, etc. **Always first choice.**
2. **Project wrapper** (`src/components/ui/`) — same components, convenience props API, backed by RNR.
3. **App-specific composition** (`common/`, `shared/`) — must be composed of RNR.
4. If RNR doesn't have it, add it: `npx @react-native-reusables/cli@latest add <name> -y`

### RNR Components (`src/components/reusables/`)

| Component | Import | Replaces |
|---|---|---|
| `Button` | `@/components/reusables/button` | Any button |
| `Text` | `@/components/reusables/text` | `Text` from react-native |
| `Input` | `@/components/reusables/input` | Text input |
| `Textarea` | `@/components/reusables/textarea` | Multi-line input |
| `Label` | `@/components/reusables/label` | Form label |
| `Card` | `@/components/reusables/card` | Container card |
| `Badge` | `@/components/reusables/badge` | Status chip |
| `Dialog` | `@/components/reusables/dialog` | Centered modal |
| `AlertDialog` | `@/components/reusables/alert-dialog` | Confirm dialog |
| `Select` | `@/components/reusables/select` | Dropdown picker |
| `Checkbox` | `@/components/reusables/checkbox` | Checkbox |
| `Switch` | `@/components/reusables/switch` | Toggle |
| `Tabs` | `@/components/reusables/tabs` | Tab bar |
| `Separator` | `@/components/reusables/separator` | Divider |
| `Skeleton` | `@/components/reusables/skeleton` | Loading placeholder |
| `Avatar` | `@/components/reusables/avatar` | User avatar |
| `Icon` | `@/components/reusables/icon` | Lucide icon wrapper |

### RNR usage example

```tsx
import { Button } from '@/components/reusables/button';
import { Text } from '@/components/reusables/text';
import { Input } from '@/components/reusables/input';

<Button variant="default" onPress={handleSubmit}>
  <Text>{t('common.save')}</Text>
</Button>

<Input
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder={t('browse.searchPlaceholder')}
/>
```

**Rules:**
- Button/Badge children must be wrapped in RNR `<Text>`.
- Use `className` for **layout only** (flex, padding, gap, rounded). All colors via `useColors()` inline styles.
- `Text` inside a `Button` auto-inherits correct color via `ButtonTextColorContext` — no manual color needed.
- Use `cn()` from `@/lib/utils` to merge layout classes.

### Modals

- **Centered confirmation / small form** → RNR `Dialog` (`@/components/reusables/dialog`)
- **Bottom sheet / full-screen form** → raw RN `<Modal>` (slide-up, `animationType="slide"`, `justify-end`) — **content must still be RNR**
- **Destructive confirm** → `reusables/alert-dialog` or `confirmAlert` from `@/utils/alert`

Do not force a bottom sheet into `Dialog` — it would center it and break the UX.

### Theming — CRITICAL RULE (NativeWind v4 dark mode limitation)

> **NativeWind v4 bakes light-mode `rgba()` values at build time. It generates ZERO `.dark` CSS rules.**
> Color className tokens (`text-foreground`, `bg-card`, `border-border`, etc.) always resolve to their
> **light-mode value** — even in dark mode. This makes text invisible on dark backgrounds.

**The ONLY correct approach for colors: `useColors()` inline styles.**

```tsx
import { useColors } from '@/hooks/useColors';

export function MyComponent() {
  const colors = useColors();   // reads useColorScheme() at runtime — always correct

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <Text style={{ color: colors.foreground }}>Title</Text>
      <Text style={{ color: colors.mutedForeground }}>Subtitle</Text>
    </View>
  );
}
```

**`className` is ONLY for layout** — never for color:
- ✅ Safe: `className="flex-1 p-4 gap-2 rounded-lg overflow-hidden"` (layout)
- ❌ Broken: `className="bg-card text-foreground border-border"` (colors — ignored in dark mode)

**Quick reference — common colors:**

```tsx
const colors = useColors();

colors.background        // page background
colors.foreground        // primary text
colors.card              // card/sheet surface
colors.border            // hairlines, dividers
colors.muted             // subtle fill, skeleton base
colors.mutedForeground   // secondary/meta text (city, timestamps)
colors.primary           // primary action fill
colors.primaryForeground // text ON primary button
colors.destructive       // delete/error
colors.destructiveForeground
colors.secondary
colors.secondaryForeground
```

**Button text color is automatic.** `Text` inside a `Button` auto-inherits the correct foreground via `ButtonTextColorContext` — no manual color needed on the Text.

**Theme system:**
- `src/stores/theme.store.ts` — Zustand store, persists `"light" | "dark" | "system"` to AsyncStorage
- `app/_layout.tsx` → `ThemeManager` — reads store, calls `setColorScheme` from `useColorScheme()` hook, syncs `.dark` class on `<html>` for web
- `loadSavedTheme()` — called at module level in `_layout.tsx` for early AsyncStorage load
- `setColorScheme` is only available as a method from `useColorScheme()` hook — NOT a standalone import

---

## 6) RTL Layout

Pashto (`ps`) and Dari (`fa`) are RTL. Use `useLocalization().isRtl` to flip layouts:

```tsx
const { isRtl } = useLocalization();

<View style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
  <Icon name="map-pin" />
  <Text>{listing.location}</Text>
</View>
```

For text alignment:
```tsx
<Text style={{ textAlign: isRtl ? 'right' : 'left' }}>
  {listing.description}
</Text>
```

---

## 7) List Screens — `UniversalList`

All list screens (browse, my listings, saved, conversations) **must** use `UniversalList`.

### Quick Structure

```tsx
import { UniversalList, type UniversalListConfig } from '@/components/common/UniversalList';

const config: UniversalListConfig<Listing> = {
  id: 'buyer-browse',
  fetcher: listingsFetcher,
  keyExtractor: (item) => String(item.id),
  renderItem: ({ item }) => <ListingCard listing={item} />,
  searchPlaceholder: t('browse.searchPlaceholder'),
  emptyTitle: t('browse.empty.title'),
  emptyDescription: t('browse.empty.description'),
};

return <UniversalList config={config} />;
```

### API Fetcher Signature

```ts
type ListQuery = {
  page: number;
  perPage: number;
  search?: string;
  filterData?: FilterItem[];
};

type ListFetchResult<T> = {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};
```

---

## 8) Adding New Screens = Adding Routes

Every new screen needs a route file in `app/`:

```
app/(main)/(tabs)/browse.tsx
```

Route file content — **only** a default export:

```tsx
// app/(main)/(tabs)/browse.tsx
import BrowseScreen from '@/screens/buyer/Browse';
export default BrowseScreen;
```

Business logic stays in `src/screens/buyer/Browse.tsx`.

---

## 9) Sidebar / Tab Updates

When adding a new screen, add it to the appropriate sidebar config:

```
src/config/sidebars/buyer.config.ts
src/config/sidebars/seller.config.ts
```

Each entry:
```ts
{
  id: 'saved-listings',
  label: 'sidebar.savedListings',   // ← translation key
  icon: 'bookmark',                  // lucide icon name
  route: '/(main)/(tabs)/saved-listings',
}
```

---

## 10) API Rules — Follow Every Time

**Every API file must adhere to ALL of these:**

1. Always use `convertKeysToSnake` for **outgoing** request data.
2. Always use `convertKeysToCamel` for **incoming** response data.
3. Use `http` from `@/api/http` — never create a new Axios instance.
4. Pagination params: `page[number]`, `page[size]`, `search`.
5. Always return a typed response — no `any`.

### Standard API File Structure

```ts
// src/api/listings.ts

import { http } from './http';
import { convertKeysToCamel, convertKeysToSnake } from '@/utils/case-styles';

export interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  status: 'draft' | 'active' | 'reserved' | 'sold';
  categoryId: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
  viewsCount: number;
  createdAt: string;
  seller: {
    id: number;
    name: string;
  };
}

export interface ListingsResponse {
  items: Listing[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

export const listingsAPI = {
  getListings: async (params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    categoryId?: number;
  }): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append('page[number]', String(params.pageNumber));
    if (params?.pageSize) query.append('page[size]', String(params.pageSize));
    if (params?.search) query.append('search', params.search);
    if (params?.categoryId) query.append('category_id', String(params.categoryId));

    const response = await http.get(`/listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(response.data.meta.pagination) as ListingsResponse['pagination'],
    };
  },

  getListing: async (id: number): Promise<Listing> => {
    const response = await http.get(`/listings/${id}`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  createListing: async (data: Partial<Listing>): Promise<Listing> => {
    const response = await http.post('/listings', {
      listing: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  updateListing: async (id: number, data: Partial<Listing>): Promise<Listing> => {
    const response = await http.put(`/listings/${id}`, {
      listing: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  deleteListing: async (id: number): Promise<void> => {
    await http.delete(`/listings/${id}`);
  },

  publishListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/listings/${id}/publish`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  reserveListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/listings/${id}/reserve`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  markSold: async (id: number): Promise<Listing> => {
    const response = await http.put(`/listings/${id}/sold`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },
};
```

---

## 11) Confirmation for Destructive Actions — `confirmAlert` (MANDATORY)

> ⚠️ **NEVER call `Alert.alert` directly.** React Native's `Alert.alert` is a **no-op on web (Expo Web)** — the dialog never appears.

**Always use `confirmAlert` from `@/utils/alert`:**

```tsx
import { confirmAlert } from '@/utils/alert';

const handleDelete = (id: number) => {
  confirmAlert(
    t('common.confirmDelete'),
    t('listing.confirmDeleteDescription'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]
  );
};
```

---

## 12) State Management

### Reading Auth / User

```tsx
import { useAuthStore } from '@/stores/auth.store';

const user = useAuthStore((s) => s.user);
```

### Reading Active Mode

```tsx
import { useModeStore } from '@/stores/mode.store';

const mode = useModeStore((s) => s.mode);  // 'buyer' | 'seller'
```

### Data Freshness — Focus Refetch (MANDATORY)

Every screen **must** re-fetch its data when the user navigates back to it.

**Rule: add `useFocusEffect` to every screen that displays server data.**

#### List screens

```tsx
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

const [refetchKey, setRefetchKey] = useState(0);
useFocusEffect(useCallback(() => { setRefetchKey(k => k + 1); }, []));

const config: UniversalListConfig<Listing> = {
  id: `buyer-browse-${refetchKey}`,
  // ...
};
```

#### Detail screens

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

const qc = useQueryClient();
useFocusEffect(useCallback(() => {
  qc.invalidateQueries({ queryKey: ['listing', id] });
}, [id, qc]));
```

---

## 13) Complete Checklist — Adding a New Feature Screen

1. **API** — create or update `src/api/<domain>.ts`
   - Typed interfaces, `convertKeysToCamel` on responses, `convertKeysToSnake` on body

2. **Screen** — create `src/screens/{mode}/YourFeature.tsx`
   - Use `UniversalList` for list views, `ScreenContainer` for detail/form views
   - ALL UI from react-native-reusables
   - No hardcoded strings — every text through `t('...')`
   - RTL layout with `useLocalization().isRtl`
   - Focus refetch with `useFocusEffect`

3. **Route** — create `app/(main)/(tabs)/your-feature.tsx`
   - Content: only `import YourFeatureScreen ... export default YourFeatureScreen`

4. **Sidebar** — add entry to `src/config/sidebars/{mode}.config.ts`

5. **Translations** — add keys to ALL 3 locale namespace files
   - `src/i18n/locales/en/<namespace>.json`
   - `src/i18n/locales/ps/<namespace>.json` (Pashto)
   - `src/i18n/locales/fa/<namespace>.json` (Dari/Farsi)
   - If new namespace: also update `en.ts`, `ps.ts`, `fa.ts`

6. **Test** — ensure data loads, search works, RTL layout is correct for Pashto and Dari

---

## 14) What NOT to Do

```tsx
// ❌ Hardcoded colors
<View style={{ backgroundColor: '#ffffff' }} />
// ❌ NativeWind color className — baked to light-mode rgba at build time, broken in dark mode
<View className="bg-background text-foreground" />
// ✅ useColors() inline style — reads colorScheme at runtime, always correct
const colors = useColors();
<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.foreground }}>...</Text>
</View>

// ❌ Raw date formatting
<Text>{new Date(listing.createdAt).toLocaleDateString()}</Text>
// ✅ useLocalization
<Text>{formatDate(listing.createdAt)}</Text>

// ❌ Hardcoded strings
<Text>Browse Listings</Text>
// ✅
<Text>{t('browse.title')}</Text>

// ❌ Missing RTL support
<View style={{ flexDirection: 'row' }}>
// ✅
<View style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>

// ❌ Translating only en locale
// ✅ All 3 locale files updated: en, ps, fa

// ❌ Business logic in route file
// ✅ Route file = thin wrapper

// ❌ Creating a new Axios instance
const myAxios = axios.create({ ... });
// ✅ Import shared instance
import { http } from './http';

// ❌ Raw Alert.alert — no-op on web
import { Alert } from 'react-native'; Alert.alert(...);
// ✅ Always confirmAlert
import { confirmAlert } from '@/utils/alert';

// ❌ Deleting without confirmation
onPress={() => deleteListing(id)}
// ✅ Confirm first with confirmAlert

// ❌ No focus refetch — list stays stale after create/edit/delete
const config = { id: 'buyer-browse', ... };
// ✅ refetchKey in id
const config = { id: `buyer-browse-${refetchKey}`, ... };

// ❌ router.back() after a mutation — crashes if there is no back stack
//    (e.g. user opened the edit screen directly via URL / hard refresh)
onSuccess: () => { router.back(); }
// ✅ Always navigate to a named route after mutations
onSuccess: () => { router.replace('/(main)/(tabs)/my-listings' as never); }

// ❌ HSL color + hex suffix — creates invalid color strings on web
//    React Native Web parses only the valid HSL prefix → solid background
//    that matches text color → invisible text
style={{ backgroundColor: colors.primary + '22' }}
// ✅ Use the pre-computed alpha variants from useColors()
style={{ backgroundColor: colors.primaryAlpha }}
// Available: colors.primaryAlpha, colors.destructiveAlpha, colors.warningAlpha

// ❌ Raw react-native Text
import { Text } from 'react-native';
// ✅ RNR Text
import { Text } from '@/components/reusables/text';

// ❌ TouchableOpacity as button
<TouchableOpacity style={{ backgroundColor: '#3B82F6' }} onPress={submit}>
// ✅ RNR Button
<Button onPress={submit}><Text>{t('common.submit')}</Text></Button>
```

---

## 15) Dependencies Baseline

```json
{
  "expo": "~54.0.17",
  "expo-router": "~6.0.23",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-i18next": "^16.x",
  "i18next": "^25.x",
  "zustand": "^5.x",
  "axios": "^1.x",
  "@tanstack/react-query": "^5.x",
  "nativewind": "^4.x",
  "react-native-reanimated": "~4.1.1",
  "expo-secure-store": "^15.x",
  "@react-native-async-storage/async-storage": "^2.x",
  "@rn-primitives/*": "^1.4.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.x",
  "tailwind-merge": "^3.x",
  "lucide-react-native": "^0.577.0"
}
```

---

## 16) Large Screens — Split Files

**Never build a screen file larger than ~300 lines.**

For detail screens with multiple tabs, each tab panel **must** be its own file in a subfolder:

```
src/screens/shared/listing-detail/
  GalleryTab.tsx
  DetailsTab.tsx
  SellerTab.tsx
```

Each tab file must be self-contained — call `useTranslation()`, `useLocalization()`, `useColors()` **inside** the component, never receive them as props.

---

## 17) Task Brief Template

Use this when asking Claude to add a new feature:

```
Feature: <short title>
Mode: <buyer | seller | chat | shared | all>
Type: <list screen | detail screen | form | both>
Route: /(main)/(tabs)/<route-name>
API endpoint(s): GET /api/v1/<resource>, POST /api/v1/<resource>, etc.
Response root key: <e.g. listings>
Sidebar group: <Browse | Sell | Chat | Profile>
Translations namespace keys (English only):
  {
    "title": "...",
    "searchPlaceholder": "...",
    "empty": { "title": "...", "description": "..." }
  }
Notes: any special cards, filters, tabs, or behaviors
```

---

## How Claude Should Use This File

1. Read this file first before generating any mobile code.
2. Apply **all** rules by default.
3. ALL UI from react-native-reusables — strict rule.
4. For list screens → use `UniversalList`.
5. For every date/number/currency displayed to the user → use `useLocalization()`.
6. When in doubt about translations — add all 3 locale files (en, ps, fa) with the same keys.
7. RTL layout is mandatory — always test with `isRtl = true`.

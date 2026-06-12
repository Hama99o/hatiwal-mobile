# Hatiwal Mobile

React Native app (Expo) for the Hatiwal local marketplace.

---

## Tech Stack

- **React Native + Expo SDK 54** — Expo Router 6 (file-based routing in `app/`)
- **UI**: [react-native-reusables](https://reactnativereusables.com) (shadcn/ui for RN) in `src/components/reusables/` — the only UI library (strict rule, see `docs/prompts/mobile.prompt.md` §5)
- **Styling**: NativeWind v4 (Tailwind) with CSS-variable theme tokens (`global.css`), auto dark mode
- **State**: Zustand · **Data**: TanStack Query + Axios · **i18n**: i18next (en/ps/fa, RTL support)

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- The **hatiwal-api** Rails backend running on port `3000`

---

## Running with Docker

### Web — open in Chrome on your machine

```bash
cd hatiwal-mobile
docker compose up web
```

Open **http://localhost:8081** in your browser.

---

### Mobile — open in Expo Go on your phone

Your phone and your machine must be on the **same Wi-Fi network**.

**Step 1 — find your machine's LAN IP:**

```bash
ip route get 1 | awk '{print $7; exit}'
# example output: 192.168.1.23
```

**Step 2 — start the mobile service:**

```bash
HOST_IP=192.168.1.23 docker compose up mobile
```

**Step 3 — scan the QR code** with the [Expo Go](https://expo.dev/go) app on your phone.

> `HOST_IP` is required so Metro advertises your machine's real LAN IP. Without it the phone gets a Docker-internal IP and fails to connect.

---

## Running without Docker (local Node)

Requires Node ≥ 22 (use `nvm use 22`).

```bash
npm install --legacy-peer-deps

# Web
npx expo start --web

# Mobile (Expo Go)
npx expo start
```

---

## Environment Variables

Defined in `.env` — all prefixed with `EXPO_PUBLIC_` so they are bundled at build time.

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Rails backend URL |
| `EXPO_PUBLIC_APP_NAME` | `Hatiwal` | App display name |
| `EXPO_PUBLIC_DEFAULT_LANG` | `ps` | Default language (`en`, `ps`, `fa`) |
| `EXPO_PUBLIC_DEFAULT_THEME` | `system` | `light`, `dark`, or `system` |

> When running the **mobile** Docker service, `EXPO_PUBLIC_API_URL` is automatically set to `http://<HOST_IP>:3000/api/v1` so the phone can reach the backend.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Buyer / Seller | `demo@hatiwal.com` | `demo1234` |
| Second User | `seller@hatiwal.com` | `seller1234` |

---

## Project Structure

```
app/                    Expo Router screens (file-based routing)
  (auth)/               Login, register screens
  (main)/
    (tabs)/             Authenticated tabs (browse, sell, chat, profile)
src/
  api/                  Axios HTTP client + API modules
  components/
    reusables/          react-native-reusables (RNR) — the UI library
    ui/                 Legacy-API wrappers, all backed by RNR
    common/             Shared cross-feature components (ListingCard, etc.)
    shared/             Layout / nav components (AppHeader, Sidebar, ...)
  config/
    sidebars/           Sidebar configs per mode (buyer, seller)
  hooks/                Custom React hooks
  i18n/                 Translations (en, ps, fa)
    index.ts
    en.ts
    ps.ts
    fa.ts
    locales/
      en/
      ps/
      fa/
  screens/
    buyer/              Buyer-mode screens
    seller/             Seller-mode screens
    chat/               Conversation + message screens
    shared/             Shared screens (profile, listing detail, etc.)
  stores/               Zustand state stores
  types/                TypeScript interfaces
  utils/                Helpers (secure storage, case conversion, ...)
```

---

## Language Support

| Code | Language | Direction |
|---|---|---|
| `en` | English | LTR |
| `ps` | Pashto | RTL |
| `fa` | Dari / Farsi | RTL |

RTL layout applies to Pashto and Dari. The app uses `I18nManager` and NativeWind flex utilities to flip layouts automatically.

---

## Modes

The app has two modes accessible from a single account:

- **Buyer mode** — browse listings, search, save, start chat
- **Seller mode** — manage your listings (create, edit, delete, publish, reserve, mark sold)

Mode is switched from the profile tab or sidebar. The app does not require two separate accounts.

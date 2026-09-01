# EAS Build & Deploy — Hatiwal Mobile (iOS)

How to build the Hatiwal app with **EAS (Expo Application Services)** and get it onto
real iPhones — for staging tests today and the App Store later.

> This guide was written after a real first-build session. Every gotcha listed in
> **Troubleshooting** is one we actually hit and fixed.

---

## 0. TL;DR — the commands you'll use

```bash
cd hatiwal-mobile
nvm use 22                                              # MUST be Node 20+ (see Gotcha #1)

# Staging / test build (installs on registered devices)
npx eas-cli build --platform ios --profile preview

# Production build (for the App Store)
npx eas-cli build --platform ios --profile production

# After a production build finishes — push to TestFlight / App Store
npx eas-cli submit --platform ios --profile production --latest
```

That's it once the project is set up (it now is — see §2).

---

## 1. What we're using & why

| Thing | Value |
|---|---|
| Expo account | `hama990` |
| Project | `hatiwal-mobile` (`projectId: e75a387d-5ee9-460a-bbd5-2ba973529931`) |
| Apple Team | `57DRRU3SP7` — MuhammadHammayoun SAFI (Individual) |
| Bundle ID | `com.hatiwal.app` |
| Backend API | `https://api.hatiwal.com/api/v1` (production — used by **all** profiles) |

Hatiwal has **no web app and no online payment**; the mobile app is the only client.
EAS builds the native `.ipa` on Expo's macOS servers, so you don't need a Mac.

---

## 2. One-time setup — ALREADY DONE ✅

You don't need to repeat these; they're stored on Expo's servers. Listed so you know
what exists:

- ✅ Logged in to EAS (`eas-cli login`) as `hama990`
- ✅ Apple Distribution Certificate created (expires **2027-06-24**)
- ✅ Provisioning profile `*[expo] com.hatiwal.app AdHoc ...` created
- ✅ Bundle ID `com.hatiwal.app` registered on Apple
- ✅ Apple Push Notifications (APNs) key created
- ✅ Test device registered: **iPhone** (UDID `00008130-0002389404C1401C`)

Credentials live on Expo's servers, so future builds **won't** re-prompt for your
Apple login.

---

## 3. Build profiles (`eas.json`)

| Profile | Distribution | Use it for | Installs how |
|---|---|---|---|
| `development` | internal (dev client) | local debugging with a dev client | dev build |
| `preview` | internal (ad-hoc) | **staging / testing** | direct install on **registered devices only** |
| `production` | store | App Store release | via TestFlight / App Store |

All three currently point at the **production** API. See §8 if you want a separate
staging backend.

---

## 4. Build a staging/test version (the `preview` profile)

```bash
cd hatiwal-mobile
nvm use 22
npx eas-cli build --platform ios --profile preview
```

What happens:
1. EAS uploads the project and runs `npm ci` on a macOS worker.
2. It bundles the JS (Metro), runs `fastlane` to compile + sign the `.ipa`.
3. ~10–20 min total on the **free tier** (queue + build). You get a build URL.

When done, open that URL — there's an **Install** button and a QR code.

> **Ad-hoc limitation:** a `preview` build only installs on devices whose UDID is
> registered (see §6). It is **not** TestFlight. To hand the app to people who aren't
> you, use TestFlight (§7).

---

## 5. Install the build on your iPhone

1. On the **iPhone**, open the build page in **Safari** (or scan the QR code from the
   build page). Most recent successful build:
   `https://expo.dev/accounts/hama990/projects/hatiwal-mobile/builds`
2. Tap **Install** → the app downloads onto the phone.
3. **First launch — "Untrusted Developer":**
   `Settings → General → VPN & Device Management → MuhammadHammayoun SAFI → Trust`.
4. Open the app. It talks to the **live** API, so log in with a real account.

---

## 6. Register more test devices (for `preview` builds)

Ad-hoc builds only run on registered devices. To add one:

```bash
nvm use 22
npx eas-cli device:create
```

Choose **Website** → open the generated URL/QR **on the device you want to add** →
install the profile via `Settings → General → VPN & Device Management`. Then rebuild
(`--profile preview`) so the new device is baked into the provisioning profile.

Apple allows up to **100 devices/year** per device type.

---

## 7. Push to TestFlight / App Store (the `production` profile)

When you want **external testers** (just an email, no UDID) or a public release:

```bash
# 1. Build a store-distribution binary
nvm use 22
npx eas-cli build --platform ios --profile production

# 2. Upload it to App Store Connect → TestFlight
npx eas-cli submit --platform ios --profile production --latest
```

Then in **App Store Connect → TestFlight**:
- Add internal testers (up to 100, instant) or external testers (up to 10,000, needs a
  short Apple "beta review" the first time).
- Testers install via the **TestFlight** app on their iPhone.

For a full App Store release, submit the build for review from App Store Connect.

> `eas submit` will ask for your **App Store Connect API key** or Apple login the first
> time. The `submit.production` block in `eas.json` is where that config is remembered.

---

## 8. (Optional) Separate staging backend

Right now `preview` writes to the **production** database. To isolate test traffic,
point the `preview` profile at a staging API in `eas.json`:

```jsonc
"preview": {
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_API_URL":   "https://staging-api.example.com/api/v1",
    "EXPO_PUBLIC_CABLE_URL": "wss://staging-api.example.com/hatiwal-cable"
  }
}
```

(Requires standing up a staging instance of `hatiwal-api`.)

---

## 9. Troubleshooting / gotchas we hit

### Gotcha #1 — `toReversed is not a function`
**Cause:** running EAS under **Node 18**. Expo's Metro tooling needs Node 20+.
**Fix:** `nvm use 22` before any `eas-cli` command. Always.

### Gotcha #2 — "Install dependencies" phase fails
**Cause:** this project needs `--legacy-peer-deps`; EAS does a clean strict install.
**Fix:** committed `.npmrc` at the project root:
```
legacy-peer-deps=true
```
Applies to all installs (local + EAS).

### Gotcha #3 — EAS builds an old version of your code
**Cause:** by default EAS builds from your **committed git tree**, not your working
directory. Uncommitted fixes never reach the build (you'll see the same commit hash on
repeated builds).
**Fix — pick one:**
- **Commit** your changes (preferred), or
- Prefix the build with `EAS_NO_VCS=1` to build the working directory:
  ```bash
  EAS_NO_VCS=1 npx eas-cli build --platform ios --profile preview
  ```

### Gotcha #4 — `Cannot find module '../lightningcss.darwin-arm64.node'`
**Cause:** `package-lock.json` was generated on **Linux**, so it only recorded the
Linux `lightningcss` native binary. EAS builds iOS on **macOS (darwin-arm64)** and
`npm ci` strictly follows the lockfile → the macOS binary is missing → NativeWind's
Metro config crashes in the **Bundle JavaScript** phase.
**Fix:** declared the macOS binaries as optional deps in `package.json` so they land in
the lockfile (Linux skips them via cpu/os, macOS installs them):
```jsonc
"optionalDependencies": {
  "lightningcss-darwin-arm64": "1.27.0",
  "lightningcss-darwin-x64": "1.27.0"
}
```
Then `npm install --package-lock-only --legacy-peer-deps` to refresh the lockfile.
> Keep the `lightningcss` version in these entries in sync with the version under
> `node_modules/lightningcss/package.json` if you ever bump NativeWind/lightningcss.

### Reading the real EAS error (when the dashboard just says "Unknown error")
The CLI won't print the failing log, but you can fetch it with your stored session:

```bash
SECRET=$(python3 -c "import json;print(json.load(open('$HOME/.expo/state.json'))['auth']['sessionSecret'])")
BUILD_ID=<the-build-uuid>
URL=$(curl -s https://api.expo.dev/graphql -H "Content-Type: application/json" \
  -H "expo-session: $SECRET" \
  -d "{\"query\":\"query(\$id:ID!){builds{byId(buildId:\$id){logFiles}}}\",\"variables\":{\"id\":\"$BUILD_ID\"}}" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['builds']['byId']['logFiles'][0])")
curl -s --compressed "$URL" | python3 -c "import sys,json;[print(json.loads(l).get('msg','')) for l in sys.stdin if l.strip()]"
```

(The `--compressed` flag matters — without it the log is unreadable binary.)

---

## 10. `expo doctor` warnings — current status

`npx expo-doctor` reports a few **non-blocking** warnings. They did **not** stop the
build. Status:

| Warning | Status | Action |
|---|---|---|
| `@types/react-native` should not be installed directly | ✅ **Fixed** (removed; RN ships its own types) | none |
| `storybook` script conflicts with `node_modules/.bin` | Harmless | optional: rename the npm script |
| Missing peer deps `@react-native-community/datetimepicker`, `slider` | Storybook-only | install **only if** you use on-device Storybook: `npx expo install @react-native-community/datetimepicker @react-native-community/slider` |
| Version mismatches: `expo-image` (2.1.7→~3.0.11), `expo-image-picker` (16→~17), `eslint-config-expo` (8→~10), `@shopify/flash-list`, `typescript` | Not done — **major bumps, needs testing** | align deliberately with `npx expo install --check`, then test on device |

> The version mismatches are **major** upgrades (e.g. `expo-image` 2→3). Don't bump them
> blindly — do it in its own change and test the affected screens (images, image picker).

---

## 11. What to do next — checklist

- [ ] **Install the current staging build on your iPhone** (§5) and test against the live API.
- [ ] **Commit the build-config fixes** so future builds work without `EAS_NO_VCS=1`:
      `.npmrc`, `package.json`, `package-lock.json`, `eas.json`, `app.json`, and this doc.
- [ ] When you want non-UDID testers → do a **production build + `eas submit`** to TestFlight (§7).
- [ ] (Optional) Stand up a **staging backend** and point `preview` at it (§8).
- [ ] (Later) Align the **`expo doctor` version mismatches** in a dedicated, tested change (§10).

---

_Last verified: build `a08027ea` finished successfully on 2026-06-24 (SDK 54, Node 22)._
</content>

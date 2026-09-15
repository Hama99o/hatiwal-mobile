# EAS Build & Deploy — Hatiwal Mobile (iOS)

How to build the Hatiwal app with **EAS (Expo Application Services)** and get it onto
real iPhones — for staging tests today and the App Store later.

> This guide was written after a real first-build session. Every gotcha listed in
> **Troubleshooting** is one we actually hit and fixed.

---

## 0. ⭐ Use the helper: `bin/mobile` — and PRODUCTION builds only

There is a helper so we never fumble this again. It auto-selects Node 20 and always
uses the **production** profile:

```bash
bin/mobile build ios        # build the iOS store .ipa
bin/mobile build android    # build the Android store .aab
bin/mobile build all        # both
bin/mobile submit ios       # upload the latest finished iOS build to App Store Connect
bin/mobile status           # list the last 10 builds
bin/mobile version          # app.json version + git HEAD
bin/mobile help
```

### Golden rules (learned the hard way)
1. **Production/store builds ONLY. Never `--profile preview`.** The owner deploys the
   store build and tests it through **TestFlight (iOS)** and the **Play testing tracks
   (Android)** — a separate preview/ad-hoc build is wasted effort and made him lose two
   builds once. Do not build preview unless he *explicitly* asks for a direct-install build.
2. **EAS free-tier builds are METERED** — every build spends one. Build deliberately;
   never chain multiple builds on an ambiguous request. Confirm platform + intent first.
3. **`submit` is a production deploy.** Claude's permission system blocks it, so run it
   yourself with the `!` prefix (`! bin/mobile submit ios`) or approve the prompt.
4. **Bump `app.json` `version`** before a store release (e.g. `1.1.0 → 1.1.1`).

### The deploy flow
**iOS:** `bin/mobile build ios` → wait for it to finish → `bin/mobile submit ios`
(uploads to App Store Connect) → in ASC create the version, **select the build**, fill
**"What's New" (Nouveautés)**, submit for review.

**Android:** `bin/mobile build android` → open the build link, **Download the .aab** and
**save it** → upload it in **Play Console → Production → Create new release** (there is no
Play service account, so this upload is manual). If a production release is already in
review, **wait until it's accepted** before uploading the next one.

### Raw commands (what the helper runs)

```bash
cd hatiwal-mobile
nvm use 20                                              # MUST be Node 20+ (see Gotcha #1)
npx eas-cli build --platform ios --profile production --no-wait
npx eas-cli build --platform android --profile production --no-wait
npx eas-cli submit --platform ios --profile production --latest
```

> A `--profile preview` (internal/ad-hoc) build exists in `eas.json` but is **not our
> deploy flow** — only use it if someone explicitly asks for a direct-install build.

### Play service account (one-time) — to automate Android `submit`

Right now iOS `submit` is automated (the ASC API key lives on EAS's servers) but
**Android `submit` is NOT** — there is no Google Play service account, so the `.aab` is
uploaded by hand. To make `bin/mobile submit android` work like iOS, set this up ONCE:

1. **Google Cloud Console** (same Google account that owns the Play Console):
   - Enable the **Google Play Android Developer API**.
   - Create a **Service account**, then create a **JSON key** for it and download it.
2. **Play Console → Users and permissions → Invite new users**: invite the service
   account's email and grant it access to release the Hatiwal app (Admin, or a custom
   role with "Release to production/testing").
3. Save the JSON key **outside git** (it is a secret) and point `eas.json` at it:
   ```jsonc
   // eas.json → submit → production → add an "android" block:
   "android": { "serviceAccountKeyPath": "./google-play-key.json", "track": "production" }
   ```
   `google-play-key.json` is already in `.gitignore` — **never commit it** (see
   [[feedback_no_hardcoded_infra_in_repo]] rule: secrets never enter the repo).
4. After that, `bin/mobile submit android` uploads the latest build straight to Play.

Until this is done, Android stays manual: download the `.aab` from its build link and
upload it in **Play Console → Production → Create new release**.

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

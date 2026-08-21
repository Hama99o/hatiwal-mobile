/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/src/__tests__/setup.ts",
  ],
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  // Screen-level suites render the real component tree and drive several
  // sequential act()/waitFor() round-trips. Each is fast on its own but 3-10x
  // slower inside a full parallel run, where ~120 suites contend for CPU:
  // ListingForm.routing measured 5s alone / 43s loaded, ListingForm.publish
  // 4.7s / 14.8s, chat/Conversations 14.5s / 69s. All three failed the default
  // 5s budget while passing in isolation — contention, not regressions.
  //
  // Set ONCE here rather than per file. It was previously a jest.setTimeout in
  // individual suites, which drifted: routing had been raised while publish had
  // not, so publish failed the same way months later, and then Conversations did
  // too. A global budget cannot be forgotten by the next slow suite.
  testTimeout: 45000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Jest doesn't support package.json "exports" field — map msw subpaths to CJS
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
    "^msw$": "<rootDir>/node_modules/msw/lib/core/index.js",
    // Font packages export require()'d .ttf assets — stub them so tests never
    // load native font files (used by src/lib/fonts.ts via the shared Text).
    "^@expo-google-fonts/.*$": "<rootDir>/src/__tests__/mocks/expoGoogleFontsStub.js",
  },
  // Transform .js/.ts AND .mjs files.
  // .mjs is required because MSW's transitive deps (rettime, until-async,
  // headers-polyfill, @open-draft/deferred-promise) are ESM-only (.mjs files).
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        caller: { name: "metro", bundler: "metro", platform: "ios" },
        configFile: "./babel.config.js",
      },
    ],
    "^.+\\.mjs$": [
      "babel-jest",
      {
        caller: { name: "metro", bundler: "metro", platform: "ios" },
        configFile: "./babel.config.js",
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(" +
      // MSW and all its ESM-only transitive deps
      "msw|rettime|until-async|headers-polyfill|@open-draft/deferred-promise|" +
      // React Native / Expo ecosystem
      "@react-native|" +
      "react-native|" +
      "expo|" +
      "@expo|" +
      "expo-router|" +
      "expo-modules-core|" +
      "expo-secure-store|" +
      "expo-image|" +
      "expo-haptics|" +
      "expo-font|" +
      "expo-linking|" +
      "expo-constants|" +
      "expo-status-bar|" +
      "expo-image-picker|" +
      "expo-image-manipulator|" +
      "expo-location|" +
      "expo-notifications|" +
      "nativewind|" +
      "@nativewind|" +
      "react-native-reanimated|" +
      "react-native-worklets|" +
      "react-native-gesture-handler|" +
      "react-native-safe-area-context|" +
      "react-native-screens|" +
      "react-native-svg|" +
      "@shopify/flash-list|" +
      "sonner-native|" +
      "lucide-react-native|" +
      "react-native-css-interop|" +
      "@rn-primitives|" +
      "@gorhom/bottom-sheet|" +
      "zustand" +
      ")/)",
  ],
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/api/**/*.ts",
    "src/components/common/**/*.tsx",
    "!src/**/__tests__/**",
    "!src/**/*.stories.*",
  ],
};

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/src/__tests__/setup.ts",
  ],
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Jest doesn't support package.json "exports" field — map msw subpaths to CJS
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
    "^msw$": "<rootDir>/node_modules/msw/lib/core/index.js",
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

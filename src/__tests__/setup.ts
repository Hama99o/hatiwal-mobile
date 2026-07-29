import "@testing-library/jest-native/extend-expect";
import { server } from "./mocks/server";

// Mock react-i18next — all t() calls return the key so tests are locale-independent
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

// Mock useColors — return fixed light-mode tokens so tests are theme-independent
jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "hsl(0,0%,98%)",
    foreground: "hsl(222,47%,11%)",
    card: "hsl(0,0%,100%)",
    cardForeground: "hsl(222,47%,11%)",
    primary: "hsl(221,83%,53%)",
    primaryForeground: "hsl(0,0%,100%)",
    primaryAlpha: "rgba(37,99,235,0.10)",
    secondary: "hsl(214,32%,91%)",
    secondaryForeground: "hsl(222,47%,11%)",
    muted: "hsl(210,40%,96%)",
    mutedForeground: "hsl(215,16%,47%)",
    accent: "hsl(210,40%,96%)",
    accentForeground: "hsl(222,47%,11%)",
    destructive: "hsl(0,84%,60%)",
    destructiveForeground: "hsl(0,0%,98%)",
    destructiveAlpha: "rgba(220,38,38,0.08)",
    border: "hsl(214,32%,91%)",
    input: "hsl(214,32%,91%)",
    ring: "hsl(221,83%,53%)",
    success: "hsl(142,76%,36%)",
    successForeground: "hsl(0,0%,98%)",
    successAlpha: "rgba(22,163,74,0.12)",
    warning: "hsl(38,92%,40%)",
    warningForeground: "hsl(0,0%,98%)",
    warningAlpha: "rgba(180,83,9,0.10)",
    imagePlaceholder: "hsl(210,40%,94%)",
    overlay: "rgba(0,0,0,0.5)",
    reservedOverlay: "rgba(180,83,9,0.85)",
    shadow: "#000",
  }),
}));

// Mock useLocalization — return sensible defaults
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => ({
    formatCurrency: (amount: number, currency = "AFN") => `${currency} ${amount}`,
    formatDate: (d: string) => d,
    formatDateShort: (d: string) => d,
    formatTime: (d: string) => d,
    formatDateTime: (d: string) => d,
    formatWeekday: (d: string) => d,
    formatSmartTime: (d: string) => d,
    formatNumber: (n: number) => String(n),
    isRtl: false,
    lang: "en",
  }),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// Mock expo-image (just renders nothing in tests)
jest.mock("expo-image", () => ({
  Image: "Image",
}));

// Mock expo-image-manipulator — used by listings.ts to resize photos before
// upload. The native module isn't available under Jest; the stub just echoes
// the input URI so the upload helpers can be imported/tested without it.
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(async (uri: string) => ({ uri })),
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
}));

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// RN's built-in Animated with `useNativeDriver: true` throws "Unable to locate
// attached view in the native tree" under react-test-renderer (there is no host
// view to attach to). Auto-mocking the native helper makes native-driven
// animations no-op in tests — e.g. the Switch thumb spring. The module moved to
// src/private/animated in React Native 0.79.
jest.mock("react-native/src/private/animated/NativeAnimatedHelper");

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock react-native-safe-area-context — useSafeAreaInsets() returns zeros so
// components that call it don't require a SafeAreaProvider ancestor in tests.
jest.mock("react-native-safe-area-context", () => {
  const RN = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 44, left: 0, bottom: 34, right: 0 },
    },
  };
});


// Mock expo-notifications — used by push-token.ts; mocked globally so screens
// that import it (or trigger push registration) don't require real device APIs.
jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: null }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  // Used by lib/notifications.ts (foreground handler + tap routing).
  setNotificationHandler: jest.fn(),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { DEFAULT: 3, MAX: 5, HIGH: 4, LOW: 2, MIN: 1, NONE: 0 },
}));

// MSW server lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

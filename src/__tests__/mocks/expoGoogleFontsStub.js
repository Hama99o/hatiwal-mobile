// Test stub for @expo-google-fonts/* packages.
//
// Those packages export font-family constants whose values are `require(...)` of
// real .ttf assets. In jest we don't want to load native font files, and the
// packages may not be present in every environment. This Proxy returns the
// imported name as its own value (e.g. `Rubik_400Regular` → "Rubik_400Regular"),
// which is exactly the shape src/lib/fonts.ts + expo-font's useFonts expect.
module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => (prop === "__esModule" ? true : String(prop)),
  }
);

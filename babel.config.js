module.exports = function (api) {
  // JEST_WORKER_ID, not NODE_ENV: Jest keeps an inherited NODE_ENV=development.
  const isJest = process.env.JEST_WORKER_ID !== undefined;
  api.cache.using(() => isJest);

  const appPresets = [
    ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    "nativewind/babel",
  ];
  // @storybook/core (pulled into the bundle via app/index.tsx's conditional
  // Storybook require) uses static class blocks, which the Expo preset does
  // not transform for node_modules — enable it explicitly so the bundle compiles.
  const plugins = ["@babel/plugin-transform-class-static-block"];

  if (!isJest) return { presets: appPresets, plugins };

  // Jest only. Since SDK 57, expo-modules-core and @react-native/jest-preset
  // contain JSX/createElement that nativewind rewrites into react-native-css-interop,
  // which then reads Appearance while react-native is still initialising
  // ("reading 'getColorScheme'"). node_modules get the plain Expo preset; app
  // code is compiled exactly as before.
  const nodeModules = /[\\/]node_modules[\\/]/;
  return {
    plugins,
    overrides: [
      { exclude: nodeModules, presets: appPresets },
      { test: nodeModules, presets: ["babel-preset-expo"] },
    ],
  };
};

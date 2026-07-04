module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // @storybook/core (pulled into the bundle via app/index.tsx's conditional
    // Storybook require) uses static class blocks, which the Expo preset does
    // not transform for node_modules — enable it explicitly so the bundle compiles.
    plugins: ["@babel/plugin-transform-class-static-block"],
  };
};

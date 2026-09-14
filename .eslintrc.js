// ESLint for the mobile app.
//
// `npm run lint` has existed in package.json and `eslint-config-expo` has been
// installed the whole time — there was simply no config file, so the script
// failed with "ESLint couldn't find a configuration file" and nobody ran it.
// A lint script that always errors is indistinguishable from one that always
// passes: neither tells you anything, and CI is Jest-only, so nothing noticed.
//
// `eslint-config-expo@8` is the legacy (.eslintrc) format — its package.json has
// `main: default.js` and no `exports`, so a flat `eslint.config.js` would not
// resolve it.
module.exports = {
  root: true,
  extends: ["expo"],
  overrides: [
    {
      // Storybook CSF `render` functions are INVOKED AS COMPONENTS by Storybook,
      // so calling hooks inside them is the documented pattern — but the rule
      // decides "is this a component?" from the name, and `render` is
      // lowercase. All four errors in the first run were this false positive
      // and nothing else.
      //
      // Scoped to stories rather than switched off globally: rules-of-hooks
      // catches real, silent state corruption in app code, and that is the
      // whole reason to keep lint on.
      files: ["*.stories.tsx", "*.stories.ts"],
      rules: { "react-hooks/rules-of-hooks": "off" },
    },
  ],
  ignorePatterns: [
    "node_modules/",
    ".expo/",
    "android/",
    "ios/",
    "coverage/",
    "dist/",
    // Generated at build time, not authored here.
    "*.config.js",
  ],
};

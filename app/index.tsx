// When STORYBOOK_ENABLED=true, render the Storybook catalog instead of the app.
// This lets the Storybook npm script work without touching production code.
const isStorybookEnabled = process.env.STORYBOOK_ENABLED === "true";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Screen = isStorybookEnabled
  ? require("../.storybook/Storybook").default
  : require("@/screens/shared/Splash").default;

export default Screen;

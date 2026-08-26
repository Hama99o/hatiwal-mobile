const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Keep the QA rig out of Metro's file map.
//
// Metro watches the whole project, not just src/. Nothing under `maestro/` or
// `qa/` is ever bundled — flow YAML, shell scripts, markdown, run reports — but
// writing to them still made the dev client reload the bundle. Mid-flow that
// blanks the screen, so whatever assertion the flow had reached fails and the app
// returns at its initial route.
//
// That cost real time twice in one day. Once as a phantom app bug: an assertion
// failed, the screenshot showed the feed, and the invented cause was a clipped
// submit button (UI-043, withdrawn). Once nearly as a phantom flow bug —
// `register_duplicate_email` "failed" to show its duplicate-email error while the
// screenshot showed that error rendered perfectly with `Refreshing…` across the
// top, and the only edits in flight were flow YAML and one markdown file.
//
// Excluding them lets the rig be repaired WHILE a sweep runs, which is the point
// of a continuous loop. Editing src/ still reloads, and should.
const RIG_DIRS = [/.*\/maestro\/.*/, /.*\/qa\/.*/];

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  ...RIG_DIRS,
];

module.exports = withNativeWind(config, {
  input: "./src/styles/global.css",
});

// Wraps app.json. Only job today: keep google-services.json OUT of git.
//
// The Firebase config was committed to this PUBLIC repo in 4f0678d and GitHub
// flagged its API key (2026-10-02). It is now gitignored:
//   - EAS cloud builds get it from the secret file variable GOOGLE_SERVICES_JSON
//     (eas env, environments production/preview/development); EAS sets the
//     variable to the path of the downloaded file.
//   - Local builds use ./google-services.json, kept on this machine only.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});

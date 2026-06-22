// Extends the static app.json. When OFFLINE_BUILD=1 (production offline builds),
// the INTERNET permission is stripped from the Android manifest as a hard,
// verifiable guarantee that the app cannot make any network calls.
// Dev builds keep INTERNET so they can connect to the Metro bundler.

module.exports = ({ config }) => {
  if (process.env.OFFLINE_BUILD === '1') {
    config.android = {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        'android.permission.INTERNET',
      ],
    };
  }
  return config;
};

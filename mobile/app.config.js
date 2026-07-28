// google-services.json is gitignored, and EAS resolves .easignore at the git
// root — which in this monorepo is not mobile/ — so the file can never reach
// the build archive. EAS mounts it as a file env var instead.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});

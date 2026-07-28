const { withGradleProperties } = require('@expo/config-plugins');

// x86/x86_64 are emulator-only and account for ~40% of the universal APK we hand
// out as a direct download. Trimmed on EAS builds only, so local emulator
// development keeps working.
const ARM_ONLY = 'armeabi-v7a,arm64-v8a';

module.exports = function withArmOnlyAbis(config) {
  if (!process.env.EAS_BUILD) {
    return config;
  }

  return withGradleProperties(config, (config) => {
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
    );

    if (existing) {
      existing.value = ARM_ONLY;
    } else {
      config.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: ARM_ONLY,
      });
    }

    return config;
  });
};

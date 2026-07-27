const { withGradleProperties } = require('@expo/config-plugins');

// Some dev machines on this project resolve maven.google.com/dl.google.com to
// an IPv6-only address over a network path with no working outbound IPv6,
// which surfaces as a confusing "Temporary failure in name resolution" error
// during local `expo run:android` builds. Forcing the JVM to prefer IPv4
// sidesteps it. This survives `expo prebuild` regenerating android/, unlike
// hand-editing android/gradle.properties directly.
const IPV4_FLAG = '-Djava.net.preferIPv4Stack=true';

module.exports = function withIpv4GradleFix(config) {
  return withGradleProperties(config, (config) => {
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs'
    );

    if (existing) {
      if (!existing.value.includes(IPV4_FLAG)) {
        existing.value = `${existing.value} ${IPV4_FLAG}`;
      }
    } else {
      config.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: IPV4_FLAG });
    }

    return config;
  });
};

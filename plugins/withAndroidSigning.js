const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Injects release signing config into the generated android/app/build.gradle.
 * Reads keystore details from environment variables set in CI:
 *   ANDROID_KEYSTORE_BASE64  — base64-encoded .jks file
 *   ANDROID_KEY_ALIAS        — key alias
 *   ANDROID_KEY_PASSWORD     — key password
 *   ANDROID_STORE_PASSWORD   — store password
 *
 * The keystore file is written to android/app/release.jks by the CI workflow
 * before the Gradle build runs.
 */
const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;

    // Only inject if not already present
    if (gradle.includes('signingConfigs.release')) {
      return mod;
    }

    // Inject signingConfigs block before the existing buildTypes block
    const signingConfigBlock = `
    signingConfigs {
        release {
            storeFile file("release.jks")
            storePassword System.getenv("ANDROID_STORE_PASSWORD") ?: ""
            keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: ""
            keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: ""
        }
    }
`;

    gradle = gradle.replace(
      /(\s*buildTypes\s*\{)/,
      `${signingConfigBlock}$1`
    );

    // Add signingConfig to the release buildType
    gradle = gradle.replace(
      /(release\s*\{[^}]*)(minifyEnabled\s+\w+)/,
      `$1signingConfig signingConfigs.release\n            $2`
    );

    mod.modResults.contents = gradle;
    return mod;
  });
};

module.exports = withAndroidSigning;

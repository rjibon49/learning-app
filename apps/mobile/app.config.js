// Adds Firebase (Google Analytics) to the build only when its config files exist,
// so builds keep working before the Firebase project is set up.
//
// Android: google-services.json in this folder, or the EAS file environment
// variable GOOGLE_SERVICES_JSON (the file is git-ignored, so EAS builds need the
// variable). iOS: GoogleService-Info.plist / GOOGLE_SERVICE_INFO_PLIST.
const fs = require("fs");
const path = require("path");

function configFile(envName, fileName) {
  const fromEnv = process.env[envName];
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const local = path.join(__dirname, fileName);
  return fs.existsSync(local) ? `./${fileName}` : null;
}

module.exports = ({ config }) => {
  const androidFile = configFile("GOOGLE_SERVICES_JSON", "google-services.json");
  const iosFile = configFile("GOOGLE_SERVICE_INFO_PLIST", "GoogleService-Info.plist");
  if (!androidFile && !iosFile) return config;

  const plugins = [...(config.plugins ?? []), "@react-native-firebase/app"];
  if (iosFile) {
    // React Native Firebase uses Swift Package Manager on iOS; Expo projects need dynamic frameworks.
    plugins.push(["expo-build-properties", { ios: { useFrameworks: "dynamic" } }]);
  }

  return {
    ...config,
    android: { ...config.android, ...(androidFile ? { googleServicesFile: androidFile } : {}) },
    ios: { ...config.ios, ...(iosFile ? { googleServicesFile: iosFile } : {}) },
    plugins,
  };
};

// EAS sets it to the profile in eas.json while it builds; it is not set running the app locally.
const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

// A build for the stores without them would still be made, and would talk to localhost: the
// API, and the links to share and to the terms. Better that it fails and says which is missing.
const REQUIRED_IN_PRODUCTION = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL'];
if (isProductionBuild) {
  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Set ${missing.join(' and ')} for the production build (EAS environment variables).`);
}

module.exports = ({ config }) => ({
  ...config,
  name: 'To Be a Traveller',
  slug: 'tobeatraveller',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mirabaix.tobeatraveller',
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Plain HTTP is only for talking to the API on the local network while developing: the
    // app in the stores only talks HTTPS.
    usesCleartextTraffic: !isProductionBuild,
    permissions: ['READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE', 'ACCESS_COARSE_LOCATION'],
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-sharing',
    'expo-localization',
    'expo-notifications',
    '@react-native-community/datetimepicker',
    ['expo-location', {
      locationWhenInUsePermission: 'Allow To Be a Traveller to use your location to fill in nearby places.',
    }],
  ],
  extra: {
    eas: { projectId: '21b2c26e-ca30-4c39-8bf7-ad3bf5c4b408' },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173',
    geoapifyKey: process.env.EXPO_PUBLIC_GEOAPIFY_KEY || '',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || '',
  },
  owner: 'mirabaix',
});

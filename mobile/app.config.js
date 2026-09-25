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
    // Allow HTTP connections (needed for local dev API and any non-HTTPS backend)
    usesCleartextTraffic: true,
    permissions: ['READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE', 'ACCESS_COARSE_LOCATION'],
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-sharing',
    'expo-localization',
    'expo-notifications',
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

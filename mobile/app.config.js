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
    permissions: ['READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE'],
  },
  web: { favicon: './assets/favicon.png' },
  extra: {
    eas: { projectId: '21b2c26e-ca30-4c39-8bf7-ad3bf5c4b408' },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    geoapifyKey: process.env.EXPO_PUBLIC_GEOAPIFY_KEY || '',
  },
  owner: 'mirabaix',
});

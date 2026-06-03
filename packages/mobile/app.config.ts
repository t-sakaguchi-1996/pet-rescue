import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'ペットレスキュー',
  slug: 'pet-rescue',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ef4444',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.petrescue.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        '現在地周辺の迷子ペット情報を表示するために使用します',
      NSPhotoLibraryUsageDescription:
        'ペットの写真をアップロードするために使用します',
      NSCameraUsageDescription: 'ペットの写真を撮影するために使用します',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ef4444',
    },
    package: 'com.petrescue.app',
    googleServicesFile: './google-services.json',
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-notifications',
      {
        color: '#ef4444',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          '現在地周辺の迷子ペット情報を表示するために使用します',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'ペットの写真をアップロードするために使用します',
        cameraPermission: 'ペットの写真を撮影するために使用します',
      },
    ],
  ],
  scheme: 'pet-rescue',
  extra: {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    eas: {
      projectId: '0fe3e1b7-1eaf-4e8f-ab78-8329d2f96210',
    },
  },
}

export default config

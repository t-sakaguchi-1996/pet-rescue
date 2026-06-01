import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'ペット救助',
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
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        '現在地周辺の迷子ペット情報を表示するために使用します',
      NSLocationAlwaysUsageDescription:
        '近くで迷子ペットが投稿された際に通知するために使用します',
      NSPhotoLibraryUsageDescription:
        'ペットの写真をアップロードするために使用します',
      NSCameraUsageDescription:
        'ペットの写真を撮影するために使用します',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ef4444',
    },
    package: 'com.petrescue.app',
    googleServicesFile: './google-services.json',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
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
        photosPermission:
          'ペットの写真をアップロードするために使用します',
        cameraPermission: 'ペットの写真を撮影するために使用します',
      },
    ],
  ],
  scheme: 'pet-rescue',
  extra: {
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
}

export default config

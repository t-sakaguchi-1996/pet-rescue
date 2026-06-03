import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
} from 'firebase/auth'
import type { Persistence } from 'firebase/auth'
// getReactNativePersistence is only in the React Native build (dist/rn), not in Node types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence
}
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined

const firebaseConfig = {
  apiKey: extra?.firebaseApiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: extra?.firebaseAuthDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: extra?.firebaseProjectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: extra?.firebaseStorageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: extra?.firebaseMessagingSenderId ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: extra?.firebaseAppId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
}

let app: FirebaseApp
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// AsyncStorageで認証状態を永続化
let _auth: ReturnType<typeof getAuth>
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} catch {
  // auth already initialized (hot reload / fast refresh)
  _auth = getAuth(app)
}

export const auth = _auth
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app

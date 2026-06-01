'use client'

import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { getFirebaseMessaging } from './firebase'
import { db } from './firebase'

export async function requestNotificationPermission(
  userId: string
): Promise<string | null> {
  const messaging = getFirebaseMessaging()
  if (!messaging) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  })

  if (token && userId) {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token),
    })
  }

  return token
}

export function onForegroundMessage(
  callback: (payload: {
    notification?: { title?: string; body?: string }
  }) => void
) {
  const messaging = getFirebaseMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}

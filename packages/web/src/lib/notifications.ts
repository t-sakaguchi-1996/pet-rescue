'use client'

import { getToken, onMessage } from 'firebase/messaging'
import { collection, addDoc, doc, updateDoc, arrayUnion, Timestamp, query, where, getDocs, limit } from 'firebase/firestore'
import { getFirebaseMessaging } from './firebase'
import { db } from './firebase'

const ADMIN_EMAIL = 'admin@gmail.com'

const NOTIFICATIONS = 'notifications'

/** 最有力情報選択時に選ばれた投稿者へ通知 */
export async function notifyBestInfoSelected(params: {
  recipientUserId: string
  petId: string
  petName: string
  sightingId?: string
  amount: number
}): Promise<void> {
  if (!params.recipientUserId) return
  try {
    await addDoc(collection(db, NOTIFICATIONS), {
      userId: params.recipientUserId,
      type: 'best_info_selected',
      petId: params.petId,
      petName: params.petName,
      sightingId: params.sightingId ?? null,
      amount: params.amount,
      isRead: false,
      createdAt: Timestamp.now(),
    })
  } catch { /* 通知失敗はメイン処理に影響させない */ }
}

/** ポイント付与時に付与先ユーザーへ通知 */
export async function notifyPointsGranted(params: {
  recipientUserId: string
  petId: string
  petName: string
  amount: number
  sightingId?: string
}): Promise<void> {
  if (!params.recipientUserId) return
  try {
    await addDoc(collection(db, NOTIFICATIONS), {
      userId: params.recipientUserId,
      type: 'points_granted',
      petId: params.petId,
      petName: params.petName,
      sightingId: params.sightingId ?? null,
      amount: params.amount,
      isRead: false,
      createdAt: Timestamp.now(),
    })
  } catch { /* 通知失敗はメイン処理に影響させない */ }
}

/** 景品交換申請時に管理者へ通知（物理的な承認が必要な場合のみ） */
export async function notifyAdminRewardExchange(params: {
  requesterDisplayName: string
  rewardName: string
}): Promise<void> {
  try {
    const q = query(collection(db, 'users'), where('email', '==', ADMIN_EMAIL), limit(1))
    const snap = await getDocs(q)
    if (snap.empty) return
    const adminUid = snap.docs[0].id
    await addDoc(collection(db, NOTIFICATIONS), {
      userId: adminUid,
      type: 'reward_exchange_requested',
      petId: '',
      petName: '',
      fromUserDisplayName: params.requesterDisplayName,
      rewardName: params.rewardName,
      isRead: false,
      createdAt: Timestamp.now(),
    })
  } catch { /* 通知失敗はメイン処理に影響させない */ }
}

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

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { Expo, type ExpoPushMessage } from 'expo-server-sdk'

initializeApp()
const db = getFirestore()
const expo = new Expo()

type NotificationType =
  | 'comment'
  | 'reply'
  | 'sighting_nearby'
  | 'found_nearby'
  | 'prefecture_sighting'
  | 'best_info_selected'
  | 'points_granted'
  | 'discovery_bonus'
  | 'reward_exchange_requested'
  | 'new_matched_sighting_after_edit'
  | 'new_matched_protected_after_edit'

// 通知種別とユーザー設定キーのマッピング
const NOTIFICATION_SETTING_KEY: Partial<Record<NotificationType, string>> = {
  comment: 'comment',
  reply: 'comment',
  sighting_nearby: 'sighting_nearby',
  found_nearby: 'found_nearby',
  best_info_selected: 'best_info_selected',
  points_granted: 'points_granted',
  discovery_bonus: 'discovery_bonus',
  prefecture_sighting: 'sighting_nearby',
}

interface AppNotification {
  userId: string
  type: NotificationType
  petId: string
  petName: string
  fromUserDisplayName?: string
  amount?: number
  rewardName?: string
}

function buildBody(n: AppNotification): string {
  const from = n.fromUserDisplayName ?? 'ユーザー'
  const pet = n.petName ?? 'ペット'
  switch (n.type) {
    case 'comment':
      return `${from}さんが「${pet}」にコメントしました`
    case 'reply':
      return `${from}さんがあなたのコメントに返信しました`
    case 'sighting_nearby':
      return `「${pet}」の近くで目撃情報が投稿されました`
    case 'found_nearby':
      return '近くで保護された動物の情報があります'
    case 'prefecture_sighting':
      return `同じ都道府県で目撃情報が投稿されました`
    case 'best_info_selected':
      return `「${pet}」の最有力情報に選ばれました！ +100pt`
    case 'points_granted':
      return `${n.amount ?? 0}ptが付与されました`
    case 'discovery_bonus':
      return `「${pet}」発見への貢献ボーナスが付与されました！`
    case 'reward_exchange_requested':
      return `景品「${n.rewardName ?? ''}」の交換申請を受け付けました`
    case 'new_matched_sighting_after_edit':
      return `「${pet}」に新しい目撃情報が見つかりました`
    case 'new_matched_protected_after_edit':
      return `「${pet}」に保護情報が見つかりました`
    default:
      return 'ANIMAL GO から新しい通知があります'
  }
}

export const sendPushOnNotification = onDocumentCreated(
  { document: 'notifications/{notificationId}', region: 'asia-northeast1' },
  async (event) => {
    const n = event.data?.data() as AppNotification | undefined
    if (!n?.userId) return

    const userSnap = await db.doc(`users/${n.userId}`).get()
    const userData = userSnap.data() ?? {}

    // 通知種別ごとのON/OFF設定チェック
    const notifSettings = (userData.notificationSettings ?? {}) as Record<string, boolean>
    const settingKey = NOTIFICATION_SETTING_KEY[n.type]
    if (settingKey !== undefined && notifSettings[settingKey] === false) return

    const tokens = (userData.expoPushTokens ?? []) as string[]
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t))
    if (validTokens.length === 0) return

    const body = buildBody(n)
    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      title: 'ANIMAL GO',
      body,
      sound: 'default',
      data: { petId: n.petId },
    }))

    const chunks = expo.chunkPushNotifications(messages)
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk)
        console.log('Push receipts:', receipts)
      } catch (err) {
        console.error('Push notification error:', err)
      }
    }
  }
)

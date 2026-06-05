import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
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

// ハーヴァーサイン距離（km）
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 目撃・保護情報が新規作成されたとき、近隣の迷子投稿者へ通知ドキュメントを作成する。
 * sightingType='found' の場合は found_nearby、それ以外は sighting_nearby を使用する。
 */
export const notifyOnNewSighting = onDocumentCreated(
  { document: 'sightings/{sightingId}', region: 'asia-northeast1' },
  async (event) => {
    const sightingId = event.params.sightingId
    const data = event.data?.data()
    if (!data) return

    const sightingType = (data.sightingType as string | undefined) ?? 'sighting'
    const location = data.location as {
      lat?: number; lng?: number; city?: string; prefecture?: string
    } | undefined
    const species = data.species as string | undefined
    const sightingUserId = data.userId as string | undefined
    const title = (data.title as string) || (sightingType === 'found' ? '保護情報' : '目撃情報')

    // 捜索中の迷子投稿を取得
    const petsSnap = await db.collection('pets')
      .where('type', '==', 'lost')
      .where('status', '==', 'searching')
      .limit(200)
      .get()

    const now = FieldValue.serverTimestamp()
    const batch = db.batch()
    let count = 0

    for (const petDoc of petsSnap.docs) {
      const pet = petDoc.data()
      if (sightingUserId && pet.userId === sightingUserId) continue
      if (species && pet.species !== species) continue

      const petLoc = pet.location as { lat?: number; lng?: number; city?: string; prefecture?: string } | undefined
      const radiusKm = (pet.searchRadiusKm as number | undefined) ?? 5
      let notifType: string | null = null

      if (location?.lat !== undefined && location?.lng !== undefined &&
          petLoc?.lat !== undefined && petLoc?.lng !== undefined) {
        const dist = haversineKm(location.lat, location.lng, petLoc.lat, petLoc.lng)
        if (dist <= radiusKm) {
          notifType = sightingType === 'found' ? 'found_nearby' : 'sighting_nearby'
        } else if (location.prefecture && petLoc.prefecture && location.prefecture === petLoc.prefecture) {
          notifType = sightingType === 'found' ? 'found_nearby' : 'prefecture_sighting'
        }
      } else if (location?.city && petLoc?.city && location.city === petLoc.city) {
        notifType = sightingType === 'found' ? 'found_nearby' : 'sighting_nearby'
      } else if (location?.prefecture && petLoc?.prefecture && location.prefecture === petLoc.prefecture) {
        notifType = sightingType === 'found' ? 'found_nearby' : 'prefecture_sighting'
      }

      if (!notifType || !pet.userId) continue

      const notifRef = db.collection('notifications').doc()
      batch.set(notifRef, {
        userId: pet.userId,
        type: notifType,
        petId: petDoc.id,
        petName: (pet.name as string) || '名前不明',
        sightingId,
        fromUserDisplayName: title,
        isRead: false,
        createdAt: now,
      })
      count++
      if (count >= 450) break  // batch limit 500 に余裕を持たせる
    }

    if (count > 0) await batch.commit()
    console.log(`notifyOnNewSighting: ${count} notifications created for sighting ${sightingId} (type: ${sightingType})`)
  }
)

/**
 * 保護投稿（type=found）が新規作成されたとき、近隣の迷子投稿者へ通知する。
 * 動物種が一致する場合のみ通知を送る。
 */
export const notifyOnNewFoundPet = onDocumentCreated(
  { document: 'pets/{petId}', region: 'asia-northeast1' },
  async (event) => {
    const petId = event.params.petId
    const data = event.data?.data()
    if (!data || data.type !== 'found') return  // 保護投稿のみ対象

    const location = data.location as {
      lat?: number; lng?: number; city?: string; prefecture?: string
    } | undefined
    const species = data.species as string | undefined
    const foundUserId = data.userId as string | undefined
    const petName = (data.name as string) || (data.description as string) || '保護されたペット'

    // 捜索中の迷子投稿を取得
    const lostPetsSnap = await db.collection('pets')
      .where('type', '==', 'lost')
      .where('status', '==', 'searching')
      .limit(200)
      .get()

    const now = FieldValue.serverTimestamp()
    const batch = db.batch()
    let count = 0

    for (const lostDoc of lostPetsSnap.docs) {
      const lostPet = lostDoc.data()
      if (foundUserId && lostPet.userId === foundUserId) continue
      if (species && lostPet.species !== species) continue  // 動物種が一致する場合のみ

      const petLoc = lostPet.location as { lat?: number; lng?: number; city?: string; prefecture?: string } | undefined
      const radiusKm = (lostPet.searchRadiusKm as number | undefined) ?? 5
      let notifType: string | null = null

      if (location?.lat !== undefined && location?.lng !== undefined &&
          petLoc?.lat !== undefined && petLoc?.lng !== undefined) {
        const dist = haversineKm(location.lat, location.lng, petLoc.lat, petLoc.lng)
        notifType = dist <= radiusKm ? 'found_nearby' : null
        if (!notifType && location.prefecture && petLoc.prefecture && location.prefecture === petLoc.prefecture) {
          notifType = 'found_nearby'  // 同都道府県でも通知
        }
      } else if (location?.city && petLoc?.city && location.city === petLoc.city) {
        notifType = 'found_nearby'
      } else if (location?.prefecture && petLoc?.prefecture && location.prefecture === petLoc.prefecture) {
        notifType = 'found_nearby'
      }

      if (!notifType || !lostPet.userId) continue

      const notifRef = db.collection('notifications').doc()
      batch.set(notifRef, {
        userId: lostPet.userId,
        type: notifType,
        petId: lostDoc.id,
        petName: (lostPet.name as string) || '名前不明',
        sightingId: petId,  // 保護投稿IDを参照
        fromUserDisplayName: petName,
        isRead: false,
        createdAt: now,
      })
      count++
      if (count >= 450) break
    }

    if (count > 0) await batch.commit()
    console.log(`notifyOnNewFoundPet: ${count} notifications created for found pet ${petId}`)
  }
)

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

import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'
import type { Sighting, SightingLocation, PetSpecies } from '@pet-rescue/shared'
import { fetchPets } from './firestore'

export interface SightingFilter {
  prefecture?: string
  city?: string
  species?: PetSpecies
  limitCount?: number
}

const SIGHTINGS = 'sightings'
const NOTIFICATIONS = 'notifications'

function toSighting(id: string, data: Record<string, unknown>): Sighting {
  const createdAt = data.createdAt as Timestamp | string
  const updatedAt = data.updatedAt as Timestamp | string
  return {
    id,
    species: data.species as PetSpecies | undefined,
    title: (data.title as string) ?? '',
    photos: (data.photos as string[]) ?? [],
    location: (() => {
      const loc = (data.location ?? {}) as Record<string, unknown>
      return {
        address: (loc.address as string) ?? '',
        city: (loc.city as string) ?? '',
        prefecture: (loc.prefecture as string) ?? '',
        lat: loc.lat as number | undefined,
        lng: loc.lng as number | undefined,
      }
    })(),
    description: data.description as string | undefined,
    userId: data.userId as string | undefined,
    guestEmail: data.guestEmail as string | undefined,
    temporaryId: data.temporaryId as string | undefined,
    posterName: (data.posterName as string) ?? '未登録ユーザー',
    posterPhotoURL: data.posterPhotoURL as string | undefined,
    pointGranted: Boolean(data.pointGranted),
    emailVerified: Boolean(data.emailVerified),
    isBestInfo: Boolean(data.isBestInfo),
    bestInfoPointGranted: Boolean(data.bestInfoPointGranted),
    bestInfoPetId: data.bestInfoPetId as string | undefined,
    createdAt:
      createdAt instanceof Timestamp
        ? createdAt.toDate().toISOString()
        : (createdAt ?? ''),
    updatedAt:
      updatedAt instanceof Timestamp
        ? updatedAt.toDate().toISOString()
        : (updatedAt ?? ''),
  }
}

/** ハーヴァーサイン公式で2点間の距離(km)を計算 */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 目撃投稿画像のアップロード（未ログイン可） */
export async function uploadSightingImage(ownerKey: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `sightings/${ownerKey}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** 目撃投稿の作成 */
export async function createSighting(params: {
  species?: import('@pet-rescue/shared').PetSpecies
  title: string
  photos: string[]
  location: SightingLocation
  description?: string
  userId?: string
  guestEmail?: string
  temporaryId?: string
  posterName: string
}): Promise<string> {
  const now = Timestamp.now()
  const data: Record<string, unknown> = {
    title: params.title,
    photos: params.photos,
    location: params.location,
    posterName: params.posterName,
    pointGranted: false,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  }
  if (params.species) data.species = params.species
  if (params.userId) data.userId = params.userId
  if (params.guestEmail) data.guestEmail = params.guestEmail
  if (params.temporaryId) data.temporaryId = params.temporaryId
  if (params.description) data.description = params.description
  if (!params.userId) data.userId = null

  const ref2 = await addDoc(collection(db, SIGHTINGS), data)

  // 動物種・投稿者が一致する近隣の迷子投稿に通知を送る
  await notifyNearbyLostPets(ref2.id, params.location, params.title, 'sighting_nearby', params.species, params.userId)

  return ref2.id
}

/** 指定の通知が既に存在するか確認（重複防止） */
async function notificationExists(
  sightingId: string,
  petId: string,
  type: string
): Promise<boolean> {
  const q = query(
    collection(db, NOTIFICATIONS),
    where('sightingId', '==', sightingId),
    where('petId', '==', petId),
    where('type', '==', type),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

/** 目撃・保護投稿の位置情報をチェックし、近隣または同県の迷子/保護投稿者に通知 */
async function notifyNearbyLostPets(
  sightingId: string,
  sightingLocation: SightingLocation,
  sightingTitle: string,
  notifType: 'sighting_nearby' | 'found_nearby' = 'sighting_nearby',
  sightingSpecies?: PetSpecies,
  sightingUserId?: string
): Promise<void> {
  try {
    const [lostPets, foundPets] = await Promise.all([
      fetchPets({ type: 'lost', status: 'searching', limitCount: 100 }),
      fetchPets({ type: 'found', status: 'searching', limitCount: 100 }),
    ])
    const allPets = [...lostPets, ...foundPets]

    const now = Timestamp.now()
    const notifications: Promise<unknown>[] = []

    for (const pet of allPets) {
      if (sightingUserId && pet.userId === sightingUserId) continue
      if (sightingSpecies && pet.species !== sightingSpecies) continue

      const radiusKm = pet.searchRadiusKm ?? 5
      const withinRadius = isWithinRadius(sightingLocation, pet.location, radiusKm)

      if (withinRadius) {
        // 探知範囲内 → sighting_nearby (または found_nearby)
        const alreadySent = await notificationExists(sightingId, pet.id, notifType)
        if (!alreadySent) {
          notifications.push(
            addDoc(collection(db, NOTIFICATIONS), {
              userId: pet.userId,
              type: notifType,
              petId: pet.id,
              petName: pet.name || '名前不明',
              sightingId,
              fromUserDisplayName: sightingTitle,
              isRead: false,
              createdAt: now,
            })
          )
        }
      } else if (isSamePrefecture(sightingLocation, pet.location)) {
        // 探知範囲外だが同じ都道府県内 → prefecture_sighting
        const alreadySent = await notificationExists(sightingId, pet.id, 'prefecture_sighting')
        if (!alreadySent) {
          notifications.push(
            addDoc(collection(db, NOTIFICATIONS), {
              userId: pet.userId,
              type: 'prefecture_sighting',
              petId: pet.id,
              petName: pet.name || '名前不明',
              sightingId,
              fromUserDisplayName: sightingTitle,
              isRead: false,
              createdAt: now,
            })
          )
        }
      }
    }

    await Promise.all(notifications)
  } catch {
    // 通知失敗は投稿自体に影響させない
  }
}

/** 目撃位置が迷子/保護投稿の探知範囲内か判定 */
function isWithinRadius(
  sightingLoc: SightingLocation,
  petLoc: { city: string; lat: number; lng: number },
  radiusKm: number
): boolean {
  if (
    sightingLoc.lat !== undefined &&
    sightingLoc.lng !== undefined &&
    petLoc.lat &&
    petLoc.lng
  ) {
    const dist = haversineKm(
      sightingLoc.lat, sightingLoc.lng,
      petLoc.lat, petLoc.lng
    )
    if (dist <= radiusKm) return true
  }
  // 座標がない場合は市区町村で代替判定
  if (sightingLoc.city && petLoc.city && sightingLoc.city === petLoc.city) {
    return true
  }
  return false
}

/** 目撃位置と迷子/保護投稿が同じ都道府県か判定 */
function isSamePrefecture(
  sightingLoc: SightingLocation,
  petLoc: { prefecture: string }
): boolean {
  return Boolean(
    sightingLoc.prefecture &&
    petLoc.prefecture &&
    sightingLoc.prefecture === petLoc.prefecture
  )
}

/** 保護投稿作成後に近隣通知 */
export async function notifyNearbyFromFoundPet(
  petId: string,
  petLocation: { address: string; city: string; prefecture: string; lat: number; lng: number },
  petName: string,
  petSpecies?: PetSpecies,
  petUserId?: string
): Promise<void> {
  const sightingLocation: SightingLocation = {
    address: petLocation.address,
    city: petLocation.city,
    prefecture: petLocation.prefecture,
    lat: petLocation.lat,
    lng: petLocation.lng,
  }
  await notifyNearbyLostPets(petId, sightingLocation, petName, 'found_nearby', petSpecies, petUserId)
}

/** 最新の目撃投稿一覧を取得 */
export async function fetchSightings(limitCount = 20): Promise<Sighting[]> {
  const q = query(
    collection(db, SIGHTINGS),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => toSighting(d.id, d.data()))
}

/** フィルター付き目撃情報取得（クライアント側で絞り込み） */
export async function fetchSightingsFiltered(filter: SightingFilter): Promise<Sighting[]> {
  const fetchLimit = filter.limitCount ?? 100
  const sightings = await fetchSightings(fetchLimit)
  return sightings.filter((s) => {
    if (filter.prefecture && s.location.prefecture !== filter.prefecture) return false
    if (filter.city && s.location.city !== filter.city) return false
    if (filter.species && s.species !== filter.species) return false
    return true
  })
}

/** ユーザーの目撃投稿一覧 */
export async function fetchUserSightings(userId: string): Promise<Sighting[]> {
  const q = query(
    collection(db, SIGHTINGS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => toSighting(d.id, d.data()))
}

/** メールアドレスで未ログイン投稿を取得（会員登録時の紐づけ用） */
export async function fetchGuestSightingsByEmail(email: string): Promise<Sighting[]> {
  const q = query(
    collection(db, SIGHTINGS),
    where('guestEmail', '==', email),
    where('userId', '==', null)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => toSighting(d.id, d.data()))
}

/** 未ログイン投稿をユーザーに紐づけ */
export async function linkGuestSightingToUser(
  sightingId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, SIGHTINGS, sightingId), {
    userId,
    updatedAt: Timestamp.now(),
  })
}

/** ポイント付与済みフラグをセット */
export async function markSightingPointGranted(sightingId: string): Promise<void> {
  await updateDoc(doc(db, SIGHTINGS, sightingId), {
    pointGranted: true,
    updatedAt: Timestamp.now(),
  })
}

/** 目撃情報を削除 */
export async function deleteSighting(sightingId: string): Promise<void> {
  await deleteDoc(doc(db, SIGHTINGS, sightingId))
}

/** 目撃情報を1件取得 */
export async function fetchSightingById(id: string): Promise<Sighting | null> {
  const snap = await getDoc(doc(db, SIGHTINGS, id))
  if (!snap.exists()) return null
  return toSighting(snap.id, snap.data())
}

/** 目撃情報を「最有力情報」に選ぶ（petId の bestInfoId/Type を更新し sighting に isBestInfo をセット） */
export async function selectBestInfoSighting(
  petId: string,
  sightingId: string,
  currentBestInfoId?: string,
  currentBestInfoType?: 'comment' | 'sighting'
): Promise<string | undefined> {
  const now = Timestamp.now()

  // 既存の最有力情報を解除
  if (currentBestInfoId && currentBestInfoId !== sightingId) {
    if (currentBestInfoType === 'sighting') {
      await updateDoc(doc(db, SIGHTINGS, currentBestInfoId), {
        isBestInfo: false,
        updatedAt: now,
      })
    } else if (currentBestInfoType === 'comment') {
      await updateDoc(doc(db, 'pets', petId, 'comments', currentBestInfoId), {
        isBestInfo: false,
        updatedAt: now,
      })
    }
  }

  // 新しい sighting を最有力情報にセット
  await updateDoc(doc(db, SIGHTINGS, sightingId), {
    isBestInfo: true,
    updatedAt: now,
  })

  // pet に bestInfoId/Type を記録
  await updateDoc(doc(db, 'pets', petId), {
    bestInfoId: sightingId,
    bestInfoType: 'sighting',
    updatedAt: now,
  })

  // sighting 投稿者の userId を返す（ポイント付与の判断に使用）
  const snap = await getDoc(doc(db, SIGHTINGS, sightingId))
  return snap.exists() ? (snap.data().userId as string | undefined) : undefined
}

/** 目撃情報の最有力情報を解除 */
export async function unselectBestInfoSighting(sightingId: string): Promise<void> {
  await updateDoc(doc(db, SIGHTINGS, sightingId), {
    isBestInfo: false,
    updatedAt: Timestamp.now(),
  })
}

/** 目撃情報の最有力情報ポイント付与済みフラグをセット */
export async function markSightingBestInfoPointGranted(sightingId: string): Promise<void> {
  await updateDoc(doc(db, SIGHTINGS, sightingId), {
    bestInfoPointGranted: true,
    updatedAt: Timestamp.now(),
  })
}

/** pet の最有力情報ポイント付与済みフラグをセット（同じ迷子投稿に複数回ポイント付与しない） */
export async function markPetBestInfoPointGranted(petId: string): Promise<void> {
  await updateDoc(doc(db, 'pets', petId), {
    bestInfoPointGranted: true,
    updatedAt: Timestamp.now(),
  })
}

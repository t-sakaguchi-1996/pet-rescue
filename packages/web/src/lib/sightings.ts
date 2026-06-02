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
    location: data.location as SightingLocation,
    description: data.description as string | undefined,
    userId: data.userId as string | undefined,
    guestEmail: data.guestEmail as string | undefined,
    temporaryId: data.temporaryId as string | undefined,
    posterName: (data.posterName as string) ?? '未登録ユーザー',
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

/** 目撃・保護投稿の位置情報をチェックし、近隣の迷子投稿者に通知 */
async function notifyNearbyLostPets(
  sightingId: string,
  sightingLocation: SightingLocation,
  sightingTitle: string,
  notifType: 'sighting_nearby' | 'found_nearby' = 'sighting_nearby',
  sightingSpecies?: PetSpecies,
  sightingUserId?: string
): Promise<void> {
  try {
    const lostPets = await fetchPets({
      type: 'lost',
      status: 'searching',
      limitCount: 100,
    })

    const now = Timestamp.now()
    const notifications: Promise<unknown>[] = []

    for (const pet of lostPets) {
      // 自分の迷子投稿には通知しない
      if (sightingUserId && pet.userId === sightingUserId) continue
      // 動物種が設定されている場合は一致するもののみ通知
      if (sightingSpecies && pet.species !== sightingSpecies) continue

      const isNearby = isLocationNearby(sightingLocation, pet.location)
      if (!isNearby) continue

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

    await Promise.all(notifications)
  } catch {
    // 通知失敗は投稿自体に影響させない
  }
}

/** 目撃・保護投稿の位置情報が迷子投稿と近いか判定 */
function isLocationNearby(
  sightingLoc: SightingLocation,
  petLoc: { city: string; lat: number; lng: number }
): boolean {
  // 同じ市区町村
  if (sightingLoc.city && petLoc.city && sightingLoc.city === petLoc.city) {
    return true
  }
  // 5km以内
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
    if (dist <= 5) return true
  }
  return false
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

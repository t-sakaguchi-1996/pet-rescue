import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { fetchPets } from './firestore'
import { fetchSightings } from './sightings'
import type { PetSpecies } from '@pet-rescue/shared'

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
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

export interface MatchedPost {
  id: string
  lat: number
  lng: number
  species?: PetSpecies
  type: 'sighting' | 'found'
}

/** 指定した中心点・探知範囲内の目撃情報・保護投稿を返す（species が指定された場合は同種のみ） */
export async function findMatchedPosts(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  excludePostType?: 'lost' | 'found',
  excludePostId?: string,
  species?: PetSpecies,
): Promise<MatchedPost[]> {
  const [sightings, foundPets] = await Promise.all([
    fetchSightings(500),
    fetchPets({ type: 'found', status: 'searching', limitCount: 500 }),
  ])

  const result: MatchedPost[] = []

  for (const s of sightings) {
    if (species && s.species !== species) continue
    if (s.location.lat === undefined || s.location.lng === undefined) continue
    if (haversineKm(centerLat, centerLng, s.location.lat, s.location.lng) <= radiusKm) {
      result.push({ id: s.id, lat: s.location.lat, lng: s.location.lng, species: s.species, type: 'sighting' })
    }
  }

  for (const p of foundPets) {
    if (species && p.species !== species) continue
    if (excludePostType === 'found' && p.id === excludePostId) continue
    if (!p.location.lat || !p.location.lng) continue
    if (haversineKm(centerLat, centerLng, p.location.lat, p.location.lng) <= radiusKm) {
      result.push({ id: p.id, lat: p.location.lat, lng: p.location.lng, species: p.species, type: 'found' })
    }
  }

  return result
}

/** 中心点・探知範囲内の目撃情報・保護投稿の合計件数（species が指定された場合は同種のみ） */
export async function getMatchedPostCount(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  excludePostType?: 'lost' | 'found',
  excludePostId?: string,
  species?: PetSpecies,
): Promise<number> {
  const matched = await findMatchedPosts(centerLat, centerLng, radiusKm, excludePostType, excludePostId, species)
  return matched.length
}

async function editMatchNotificationExists(
  type: string,
  userId: string,
  petId: string,
  matchedPostId: string,
): Promise<boolean> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('type', '==', type),
    where('petId', '==', petId),
    where('sightingId', '==', matchedPostId),
    limit(1),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

/**
 * 編集保存後に、新たに探知範囲内に入った目撃情報・保護投稿に対する通知を作成する。
 * 差分判定：beforeの範囲外 → afterの範囲内 になったもののみを通知対象とし、重複通知を防ぐ。
 */
export async function createNewMatchedNotificationsAfterEdit(params: {
  targetPostType: 'lost' | 'found'
  targetPostId: string
  targetPostName: string
  targetPostUserId: string
  species?: PetSpecies
  beforeLat: number
  beforeLng: number
  beforeRadiusKm: number
  afterLat: number
  afterLng: number
  afterRadiusKm: number
}): Promise<void> {
  const {
    targetPostType, targetPostId, targetPostName, targetPostUserId, species,
    beforeLat, beforeLng, beforeRadiusKm,
    afterLat, afterLng, afterRadiusKm,
  } = params

  const [beforeMatched, afterMatched] = await Promise.all([
    findMatchedPosts(beforeLat, beforeLng, beforeRadiusKm, targetPostType, targetPostId, species),
    findMatchedPosts(afterLat, afterLng, afterRadiusKm, targetPostType, targetPostId, species),
  ])

  const beforeKeys = new Set(beforeMatched.map((p) => `${p.type}:${p.id}`))
  const newMatched = afterMatched.filter((p) => !beforeKeys.has(`${p.type}:${p.id}`))

  const now = Timestamp.now()
  const tasks: Promise<unknown>[] = []

  for (const matched of newMatched) {
    const notifType = matched.type === 'sighting'
      ? 'new_matched_sighting_after_edit'
      : 'new_matched_protected_after_edit'

    const exists = await editMatchNotificationExists(notifType, targetPostUserId, targetPostId, matched.id)
    if (exists) continue

    tasks.push(
      addDoc(collection(db, 'notifications'), {
        userId: targetPostUserId,
        type: notifType,
        petId: targetPostId,
        petName: targetPostName,
        sightingId: matched.id,
        fromUserDisplayName: '新たに目撃や保護情報が見つかりました',
        isRead: false,
        createdAt: now,
      }),
    )
  }

  await Promise.all(tasks)
}

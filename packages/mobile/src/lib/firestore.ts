import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

const NOTIFICATIONS = 'notifications'

async function addNotification(data: Record<string, unknown>): Promise<void> {
  try {
    await addDoc(collection(db, NOTIFICATIONS), { ...data, isRead: false, createdAt: Timestamp.now() })
  } catch { /* 通知失敗はメイン処理に影響させない */ }
}
import type {
  Pet,
  PetSpecies,
  PetType,
  PetStatus,
  Comment,
  Sighting,
  SightingLocation,
  UserProfile,
} from '../types'

const PETS = 'pets'
const COMMENTS = 'comments'
const SIGHTINGS = 'sightings'
const USERS = 'users'
const FETCH_TIMEOUT_MS = 10000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore timeout after ${ms}ms`)), ms)
    ),
  ])
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

function toPet(id: string, data: Record<string, unknown>): Pet {
  const lostDate = data.lostDate as Timestamp | string
  const createdAt = data.createdAt as Timestamp | string
  const updatedAt = data.updatedAt as Timestamp | string
  return {
    id,
    type: data.type as Pet['type'],
    species: data.species as Pet['species'],
    breed: (data.breed as string) ?? '',
    name: (data.name as string) ?? '',
    color: (data.color as string) ?? '',
    gender: data.gender as Pet['gender'],
    age: (data.age as string) ?? '',
    description: (data.description as string) ?? '',
    images: (data.images as string[]) ?? [],
    location: data.location as Pet['location'],
    lostDate: lostDate instanceof Timestamp ? lostDate.toDate().toISOString() : (lostDate ?? ''),
    status: data.status as Pet['status'],
    userId: (data.userId as string) ?? '',
    ownerDisplayName: data.ownerDisplayName as string | undefined,
    ownerPhotoURL: data.ownerPhotoURL as string | undefined,
    contactEmail: (data.contactEmail as string) ?? '',
    contactPhone: (data.contactPhone as string) ?? '',
    searchRadiusKm: data.searchRadiusKm as number | undefined,
    bestInfoId: data.bestInfoId as string | undefined,
    bestInfoType: data.bestInfoType as Pet['bestInfoType'],
    bestInfoPointGranted: data.bestInfoPointGranted as boolean | undefined,
    discoveryBonusGranted: data.discoveryBonusGranted as boolean | undefined,
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ?? ''),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (updatedAt ?? ''),
  }
}

function toComment(id: string, data: Record<string, unknown>): Comment {
  const createdAt = data.createdAt as Timestamp | string
  const updatedAt = data.updatedAt as Timestamp | string
  return {
    id,
    petId: data.petId as string,
    userId: data.userId as string | undefined,
    guestEmail: data.guestEmail as string | undefined,
    userDisplayName: (data.userDisplayName as string) ?? '未登録ユーザー',
    userPhotoURL: data.userPhotoURL as string | undefined,
    text: (data.text as string) ?? '',
    imageUrls: (data.imageUrls as string[]) ?? [],
    parentId: data.parentId as string | undefined,
    isBestInfo: Boolean(data.isBestInfo),
    bestInfoPointGranted: Boolean(data.bestInfoPointGranted),
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ?? ''),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (updatedAt ?? ''),
  }
}

function toSighting(id: string, data: Record<string, unknown>): Sighting {
  const createdAt = data.createdAt as Timestamp | string
  const updatedAt = data.updatedAt as Timestamp | string
  const loc = (data.location ?? {}) as Record<string, unknown>
  return {
    id,
    species: data.species as PetSpecies | undefined,
    title: (data.title as string) ?? '',
    photos: (data.photos as string[]) ?? [],
    location: {
      address: (loc.address as string) ?? '',
      city: (loc.city as string) ?? '',
      prefecture: (loc.prefecture as string) ?? '',
      lat: loc.lat as number | undefined,
      lng: loc.lng as number | undefined,
    },
    description: data.description as string | undefined,
    userId: data.userId as string | undefined,
    guestEmail: data.guestEmail as string | undefined,
    posterName: (data.posterName as string) ?? '未登録ユーザー',
    posterPhotoURL: data.posterPhotoURL as string | undefined,
    pointGranted: Boolean(data.pointGranted),
    emailVerified: Boolean(data.emailVerified),
    isBestInfo: Boolean(data.isBestInfo),
    bestInfoPetId: data.bestInfoPetId as string | undefined,
    bestInfoPointGranted: Boolean(data.bestInfoPointGranted),
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ?? ''),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (updatedAt ?? ''),
  }
}

// ──────────────── Pet ────────────────

export interface PetFilter {
  type?: PetType
  species?: PetSpecies
  status?: PetStatus
  prefecture?: string
  city?: string
  limitCount?: number
}

export async function fetchPets(filter: PetFilter = {}): Promise<Pet[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (filter.type) constraints.push(where('type', '==', filter.type))
  if (filter.species) constraints.push(where('species', '==', filter.species))
  if (filter.status) constraints.push(where('status', '==', filter.status))
  if (filter.prefecture) constraints.push(where('location.prefecture', '==', filter.prefecture))
  if (filter.city) constraints.push(where('location.city', '==', filter.city))
  if (filter.limitCount) constraints.push(limit(filter.limitCount))

  const snap = await withTimeout(getDocs(query(collection(db, PETS), ...constraints)), FETCH_TIMEOUT_MS)
  return snap.docs.map((d) => toPet(d.id, d.data()))
}

export async function fetchPetById(id: string): Promise<Pet | null> {
  const snap = await withTimeout(getDoc(doc(db, PETS, id)), FETCH_TIMEOUT_MS)
  if (!snap.exists()) return null
  return toPet(snap.id, snap.data())
}

export async function createPet(
  data: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Timestamp.now()
  const ref = await addDoc(
    collection(db, PETS),
    stripUndefined({
      ...data,
      lostDate: Timestamp.fromDate(new Date(data.lostDate)),
      createdAt: now,
      updatedAt: now,
    })
  )
  return ref.id
}

export async function updatePet(
  id: string,
  data: Partial<Omit<Pet, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, PETS, id), stripUndefined({
    ...data as Record<string, unknown>,
    updatedAt: Timestamp.now(),
  }))
}

export async function deletePet(id: string): Promise<void> {
  await deleteDoc(doc(db, PETS, id))
}

export async function fetchUserPets(userId: string): Promise<Pet[]> {
  const snap = await withTimeout(
    getDocs(
      query(
        collection(db, PETS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
    ),
    FETCH_TIMEOUT_MS
  )
  return snap.docs.map((d) => toPet(d.id, d.data()))
}

// ──────────────── Comments ────────────────

export function subscribeComments(
  petId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe {
  const orderedQ = query(
    collection(db, PETS, petId, COMMENTS),
    orderBy('createdAt', 'asc')
  )
  const fallbackQ = query(collection(db, PETS, petId, COMMENTS))

  let unsubscribe = onSnapshot(
    orderedQ,
    (snap) => callback(snap.docs.map((d) => toComment(d.id, d.data()))),
    (err) => {
      if (err.code === 'failed-precondition') {
        unsubscribe = onSnapshot(fallbackQ, (snap) => {
          const sorted = snap.docs
            .map((d) => toComment(d.id, d.data()))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          callback(sorted)
        })
      }
    }
  )
  return unsubscribe
}

export async function createComment(
  petId: string,
  userId: string,
  userDisplayName: string,
  text: string,
  parentId?: string,
  petOwnerId?: string,
  petName?: string
): Promise<string> {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, PETS, petId, COMMENTS), {
    petId,
    userId,
    userDisplayName,
    text,
    imageUrls: [],
    parentId: parentId ?? null,
    isBestInfo: false,
    bestInfoPointGranted: false,
    createdAt: now,
    updatedAt: now,
  })

  // 迷子投稿者へ通知（自分のペットへのコメントは除く）
  if (petOwnerId && petOwnerId !== userId) {
    await addNotification({
      userId: petOwnerId,
      type: parentId ? 'reply' : 'comment',
      petId,
      petName: petName ?? '',
      fromUserId: userId,
      fromUserDisplayName: userDisplayName,
    })
  }

  return ref.id
}

// ──────────────── Sightings ────────────────

export interface SightingFilter {
  prefecture?: string
  city?: string
  species?: PetSpecies
  limitCount?: number
}

export async function fetchRecentSightings(limitCount = 50): Promise<Sighting[]> {
  const snap = await withTimeout(
    getDocs(query(collection(db, SIGHTINGS), orderBy('createdAt', 'desc'), limit(limitCount))),
    FETCH_TIMEOUT_MS
  )
  return snap.docs.map((d) => toSighting(d.id, d.data()))
}

export async function fetchSightingsFiltered(filter: SightingFilter = {}): Promise<Sighting[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (filter.prefecture) constraints.push(where('location.prefecture', '==', filter.prefecture))
  if (filter.city) constraints.push(where('location.city', '==', filter.city))
  if (filter.species) constraints.push(where('species', '==', filter.species))
  constraints.push(limit(filter.limitCount ?? 100))

  try {
    const snap = await withTimeout(
      getDocs(query(collection(db, SIGHTINGS), ...constraints)),
      FETCH_TIMEOUT_MS
    )
    return snap.docs.map((d) => toSighting(d.id, d.data()))
  } catch {
    // Firestore index might not exist — fallback to client-side filter
    const snap = await withTimeout(
      getDocs(query(collection(db, SIGHTINGS), orderBy('createdAt', 'desc'), limit(200))),
      FETCH_TIMEOUT_MS
    )
    let results = snap.docs.map((d) => toSighting(d.id, d.data()))
    if (filter.prefecture) results = results.filter((s) => s.location.prefecture === filter.prefecture)
    if (filter.city) results = results.filter((s) => s.location.city === filter.city)
    if (filter.species) results = results.filter((s) => s.species === filter.species)
    return results.slice(0, filter.limitCount ?? 100)
  }
}

export async function fetchSightingById(id: string): Promise<Sighting | null> {
  const snap = await withTimeout(getDoc(doc(db, SIGHTINGS, id)), FETCH_TIMEOUT_MS)
  if (!snap.exists()) return null
  return toSighting(snap.id, snap.data())
}

// ──────────────── Best Info ────────────────

export async function selectBestInfoSighting(
  petId: string,
  sightingId: string,
  currentBestInfoId?: string,
  currentBestInfoType?: 'comment' | 'sighting'
): Promise<string | undefined> {
  const now = Timestamp.now()
  if (currentBestInfoId && currentBestInfoId !== sightingId) {
    if (currentBestInfoType === 'sighting') {
      await updateDoc(doc(db, SIGHTINGS, currentBestInfoId), { isBestInfo: false, updatedAt: now })
    } else if (currentBestInfoType === 'comment') {
      await updateDoc(doc(db, PETS, petId, COMMENTS, currentBestInfoId), { isBestInfo: false, updatedAt: now })
    }
  }
  await updateDoc(doc(db, SIGHTINGS, sightingId), { isBestInfo: true, bestInfoPetId: petId, updatedAt: now })
  await updateDoc(doc(db, PETS, petId), { bestInfoId: sightingId, bestInfoType: 'sighting', updatedAt: now })
  const snap = await getDoc(doc(db, SIGHTINGS, sightingId))
  return snap.exists() ? (snap.data().userId as string | undefined) : undefined
}

export async function selectBestInfoComment(
  petId: string,
  commentId: string,
  currentBestInfoId?: string,
  currentBestInfoType?: 'comment' | 'sighting'
): Promise<string | undefined> {
  const now = Timestamp.now()
  if (currentBestInfoId && currentBestInfoId !== commentId) {
    if (currentBestInfoType === 'sighting') {
      await updateDoc(doc(db, SIGHTINGS, currentBestInfoId), { isBestInfo: false, updatedAt: now })
    } else if (currentBestInfoType === 'comment') {
      await updateDoc(doc(db, PETS, petId, COMMENTS, currentBestInfoId), { isBestInfo: false, updatedAt: now })
    }
  }
  await updateDoc(doc(db, PETS, petId, COMMENTS, commentId), { isBestInfo: true, updatedAt: now })
  await updateDoc(doc(db, PETS, petId), { bestInfoId: commentId, bestInfoType: 'comment', updatedAt: now })
  const snap = await getDoc(doc(db, PETS, petId, COMMENTS, commentId))
  return snap.exists() ? (snap.data().userId as string | undefined) : undefined
}

export async function markSightingBestInfoPointGranted(sightingId: string): Promise<void> {
  await updateDoc(doc(db, SIGHTINGS, sightingId), { bestInfoPointGranted: true, updatedAt: Timestamp.now() })
}

export async function markPetBestInfoPointGranted(petId: string): Promise<void> {
  await updateDoc(doc(db, PETS, petId), { bestInfoPointGranted: true, updatedAt: Timestamp.now() })
}

export async function deleteSighting(sightingId: string): Promise<void> {
  await deleteDoc(doc(db, SIGHTINGS, sightingId))
}

export async function deleteComment(petId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, PETS, petId, COMMENTS, commentId))
}

export async function createSighting(data: {
  species?: PetSpecies
  title: string
  description?: string
  location: SightingLocation
  photos: string[]
  userId?: string
  guestEmail?: string
  posterName: string
}): Promise<string> {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, SIGHTINGS), stripUndefined({
    ...data,
    pointGranted: false,
    emailVerified: false,
    isBestInfo: false,
    createdAt: now,
    updatedAt: now,
  }))

  // 近隣通知は Cloud Function (notifyOnNewSighting) が担う

  return ref.id
}

// ──────────────── User ────────────────

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await withTimeout(getDoc(doc(db, USERS, uid)), FETCH_TIMEOUT_MS)
  if (!snap.exists()) return null
  const data = snap.data()
  const createdAt = data.createdAt as Timestamp | string
  return {
    id: snap.id,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? '',
    photoURL: data.photoURL as string | undefined,
    points: data.points as number | undefined,
    totalPointsEarned: data.totalPointsEarned as number | undefined,
    sightingCount: data.sightingCount as number | undefined,
    protectedPostCount: data.protectedPostCount as number | undefined,
    bestInfoCount: data.bestInfoCount as number | undefined,
    discoveryCount: data.discoveryCount as number | undefined,
    selectedTitle: data.selectedTitle as string | undefined,
    titles: (data.titles as string[]) ?? [],
    badges: (data.badges as string[]) ?? [],
    showInRanking: data.showInRanking !== false,
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ?? ''),
  }
}

export async function updateUserSettings(
  uid: string,
  data: { displayName?: string; selectedTitle?: string | null; showInRanking?: boolean; notificationSettings?: Record<string, boolean> }
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), stripUndefined(data as Record<string, unknown>))
}

export async function notifyBestInfoSelected(params: {
  recipientUserId: string
  petId: string
  petName: string
  sightingId?: string
  amount: number
}): Promise<void> {
  if (!params.recipientUserId) return
  await addNotification({
    userId: params.recipientUserId,
    type: 'best_info_selected',
    petId: params.petId,
    petName: params.petName,
    sightingId: params.sightingId ?? null,
    amount: params.amount,
  })
}

export type { Pet, PetSpecies, PetType, PetStatus, Comment, Sighting, UserProfile }

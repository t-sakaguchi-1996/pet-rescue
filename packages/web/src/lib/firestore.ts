import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Pet, PetSpecies, PetType, PetStatus } from '@pet-rescue/shared'

const PETS_COLLECTION = 'pets'
const FETCH_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore timeout after ${ms}ms`)), ms)
    ),
  ])
}

function toPet(id: string, data: Record<string, unknown>): Pet {
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
    lostDate:
      data.lostDate instanceof Timestamp
        ? data.lostDate.toDate().toISOString()
        : (data.lostDate as string),
    status: data.status as Pet['status'],
    userId: (data.userId as string) ?? '',
    contactEmail: (data.contactEmail as string) ?? '',
    contactPhone: (data.contactPhone as string) ?? '',
    reward: data.reward as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string),
  }
}

export interface PetFilter {
  type?: PetType
  species?: PetSpecies
  prefecture?: string
  status?: PetStatus
  limitCount?: number
}

export async function fetchPets(filter: PetFilter = {}): Promise<Pet[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]

  if (filter.type) constraints.push(where('type', '==', filter.type))
  if (filter.species) constraints.push(where('species', '==', filter.species))
  if (filter.prefecture)
    constraints.push(where('location.prefecture', '==', filter.prefecture))
  if (filter.status) constraints.push(where('status', '==', filter.status))
  if (filter.limitCount) constraints.push(limit(filter.limitCount))

  const q = query(collection(db, PETS_COLLECTION), ...constraints)
  const snapshot = await withTimeout(getDocs(q), FETCH_TIMEOUT_MS)
  return snapshot.docs.map((d) => toPet(d.id, d.data()))
}

export async function fetchPetById(id: string): Promise<Pet | null> {
  const ref = doc(db, PETS_COLLECTION, id)
  const snap = await withTimeout(getDoc(ref), FETCH_TIMEOUT_MS)
  if (!snap.exists()) return null
  return toPet(snap.id, snap.data())
}

export async function createPet(
  data: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, PETS_COLLECTION), {
    ...data,
    lostDate: Timestamp.fromDate(new Date(data.lostDate)),
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updatePet(
  id: string,
  data: Partial<Omit<Pet, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, PETS_COLLECTION, id)
  await updateDoc(ref, { ...data, updatedAt: Timestamp.now() })
}

export async function deletePet(id: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, id))
}

export async function fetchUserPets(userId: string): Promise<Pet[]> {
  const q = query(
    collection(db, PETS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => toPet(d.id, d.data()))
}

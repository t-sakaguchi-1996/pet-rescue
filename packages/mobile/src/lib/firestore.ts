import {
  collection,
  doc,
  addDoc,
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
import type {
  Pet,
  PetSpecies,
  PetType,
  PetStatus,
} from '../../../shared/src/types'

const PETS = 'pets'

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
    contactEmail: (data.contactEmail as string) ?? '',
    contactPhone: (data.contactPhone as string) ?? '',
    reward: data.reward as string | undefined,
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ?? ''),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (updatedAt ?? ''),
  }
}

export interface PetFilter {
  type?: PetType
  species?: PetSpecies
  status?: PetStatus
  prefecture?: string
  limitCount?: number
}

export async function fetchPets(filter: PetFilter = {}): Promise<Pet[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (filter.type) constraints.push(where('type', '==', filter.type))
  if (filter.species) constraints.push(where('species', '==', filter.species))
  if (filter.status) constraints.push(where('status', '==', filter.status))
  if (filter.prefecture) constraints.push(where('location.prefecture', '==', filter.prefecture))
  if (filter.limitCount) constraints.push(limit(filter.limitCount))

  const snap = await getDocs(query(collection(db, PETS), ...constraints))
  return snap.docs.map((d) => toPet(d.id, d.data()))
}

export async function fetchPetById(id: string): Promise<Pet | null> {
  const snap = await getDoc(doc(db, PETS, id))
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

export async function fetchUserPets(userId: string): Promise<Pet[]> {
  const snap = await getDocs(
    query(
      collection(db, PETS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map((d) => toPet(d.id, d.data()))
}

export type { Pet, PetSpecies, PetType, PetStatus }

import firestore, {
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore'
import type {
  Pet,
  PetSpecies,
  PetType,
  PetStatus,
} from '../../../shared/src/types'

const PETS = 'pets'

function toPet(
  id: string,
  data: FirebaseFirestoreTypes.DocumentData
): Pet {
  return {
    id,
    type: data.type,
    species: data.species,
    breed: data.breed ?? '',
    name: data.name ?? '',
    color: data.color ?? '',
    gender: data.gender,
    age: data.age ?? '',
    description: data.description ?? '',
    images: data.images ?? [],
    location: data.location,
    lostDate:
      data.lostDate?.toDate?.()?.toISOString() ?? data.lostDate ?? '',
    status: data.status,
    userId: data.userId ?? '',
    contactEmail: data.contactEmail ?? '',
    contactPhone: data.contactPhone ?? '',
    reward: data.reward,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? '',
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? '',
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
  let ref: FirebaseFirestoreTypes.Query = firestore()
    .collection(PETS)
    .orderBy('createdAt', 'desc')

  if (filter.type) ref = ref.where('type', '==', filter.type)
  if (filter.species) ref = ref.where('species', '==', filter.species)
  if (filter.status) ref = ref.where('status', '==', filter.status)
  if (filter.prefecture)
    ref = ref.where('location.prefecture', '==', filter.prefecture)
  if (filter.limitCount) ref = ref.limit(filter.limitCount)

  const snap = await ref.get()
  return snap.docs.map((d) => toPet(d.id, d.data()))
}

export async function fetchPetById(id: string): Promise<Pet | null> {
  const snap = await firestore().collection(PETS).doc(id).get()
  if (!snap.exists) return null
  return toPet(snap.id, snap.data()!)
}

export async function createPet(
  data: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = firestore.Timestamp.now()
  const ref = await firestore()
    .collection(PETS)
    .add({
      ...data,
      lostDate: firestore.Timestamp.fromDate(new Date(data.lostDate)),
      createdAt: now,
      updatedAt: now,
    })
  return ref.id
}

export async function fetchUserPets(userId: string): Promise<Pet[]> {
  const snap = await firestore()
    .collection(PETS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()
  return snap.docs.map((d) => toPet(d.id, d.data()))
}

export { type Pet, type PetSpecies, type PetType, type PetStatus }

export type PetType = 'lost' | 'found'
export type PetSpecies = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other'
export type PetGender = 'male' | 'female' | 'unknown'
export type PetStatus = 'searching' | 'protected' | 'resolved'

export interface PetLocation {
  lat: number
  lng: number
  address: string
  prefecture: string
  city: string
}

export interface Pet {
  id: string
  type: PetType
  species: PetSpecies
  breed: string
  name: string
  color: string
  gender: PetGender
  age: string
  description: string
  images: string[]
  location: PetLocation
  lostDate: string
  status: PetStatus
  userId: string
  ownerDisplayName?: string
  contactEmail: string
  contactPhone: string
  searchRadiusKm?: number
  bestInfoId?: string
  bestInfoType?: 'comment' | 'sighting'
  bestInfoPointGranted?: boolean
  discoveryBonusGranted?: boolean
  createdAt: string
  updatedAt: string
}

export const SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: '犬',
  cat: '猫',
  rabbit: 'うさぎ',
  bird: '鳥',
  other: 'その他',
}

export const GENDER_LABELS: Record<PetGender, string> = {
  male: 'オス',
  female: 'メス',
  unknown: '不明',
}

export const STATUS_LABELS: Record<PetStatus, string> = {
  searching: '捜索中',
  protected: '保護済み',
  resolved: '解決済み',
}

export const TYPE_LABELS: Record<PetType, string> = {
  lost: '迷子',
  found: '保護',
}

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  fcmTokens: string[]
  notificationRadius: number
  notificationLocation?: {
    lat: number
    lng: number
  }
  points?: number
  createdAt: string
}

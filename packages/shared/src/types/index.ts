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
  reward?: string
  bestInfoId?: string
  bestInfoType?: 'comment' | 'sighting'
  bestInfoPointGranted?: boolean
  createdAt: string
  updatedAt: string
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

export interface Comment {
  id: string
  petId: string
  userId?: string
  guestEmail?: string
  temporaryId?: string
  userDisplayName: string
  userPhotoURL?: string
  text: string
  imageUrls: string[]
  parentId?: string
  isBestInfo?: boolean
  bestInfoPointGranted?: boolean
  createdAt: string
  updatedAt: string
}

export interface SightingLocation {
  address: string
  city: string
  prefecture: string
  lat?: number
  lng?: number
}

export interface Sighting {
  id: string
  species?: PetSpecies
  title: string
  photos: string[]
  location: SightingLocation
  description?: string
  userId?: string
  guestEmail?: string
  temporaryId?: string
  posterName: string
  pointGranted: boolean
  emailVerified: boolean
  isBestInfo?: boolean
  bestInfoPointGranted?: boolean
  bestInfoPetId?: string
  createdAt: string
  updatedAt: string
}

export interface PointTransaction {
  id: string
  userId: string
  type: 'sighting' | 'best_comment' | 'best_sighting'
  amount: number
  referenceId: string
  date: string
  createdAt: string
}

export interface AppNotification {
  id: string
  userId: string
  type: 'comment' | 'reply' | 'sighting_nearby' | 'found_nearby' | 'best_info_selected' | 'points_granted'
  petId: string
  petName: string
  fromUserId?: string
  fromUserDisplayName?: string
  sightingId?: string
  amount?: number
  isRead: boolean
  createdAt: string
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

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

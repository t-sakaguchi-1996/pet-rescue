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

export interface Comment {
  id: string
  petId: string
  userId?: string
  guestEmail?: string
  userDisplayName: string
  userPhotoURL?: string
  text: string
  imageUrls: string[]
  parentId?: string
  isBestInfo: boolean
  bestInfoPointGranted: boolean
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
  posterName: string
  pointGranted: boolean
  emailVerified: boolean
  isBestInfo: boolean
  bestInfoPetId?: string
  bestInfoPointGranted?: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  photoURL?: string
  points?: number
  totalPointsEarned?: number
  sightingCount?: number
  protectedPostCount?: number
  bestInfoCount?: number
  discoveryCount?: number
  selectedTitle?: string
  titles?: string[]
  badges?: string[]
  showInRanking?: boolean
  createdAt: string
}

// ─── Point Transactions ─────────────────────────────────────────────────────

export type TransactionType =
  | 'sighting'
  | 'protected_post'
  | 'best_comment'
  | 'best_sighting'
  | 'discovery_bonus'
  | 'reward_exchange'
  | 'admin_adjustment'
  | 'cancellation'

export interface PointTransaction {
  id: string
  userId: string
  transactionType: TransactionType
  amount: number
  sourceType?: string
  sourceId?: string
  description?: string
  date: string
  isCancelled: boolean
  createdAt: string
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export type RewardType = 'badge' | 'title' | 'sticker' | 'coupon' | 'donation' | 'physical_goods'
export type ExchangeStatus = 'requested' | 'approved' | 'shipped' | 'completed' | 'cancelled' | 'rejected'

export interface Reward {
  id: string
  name: string
  description: string
  requiredPoints: number
  rewardType: RewardType
  stock?: number | null
  monthlyExchangeLimit?: number | null
  isActive: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface RewardExchange {
  id: string
  userId: string
  userDisplayName?: string
  rewardId: string
  rewardName: string
  rewardType?: RewardType
  requiredPoints: number
  status: ExchangeStatus
  requestedAt: string
  approvedAt?: string
  shippedAt?: string
  cancelledAt?: string
  adminNote?: string
}

// ─── Rankings ────────────────────────────────────────────────────────────────

export type RankingType =
  | 'total_points'
  | 'monthly_points'
  | 'weekly_points'
  | 'sighting_count'
  | 'protection_count'
  | 'best_info_count'
  | 'discovery_count'

export interface RankingEntry {
  rank: number
  userId: string
  displayName: string
  photoURL?: string
  selectedTitle?: string
  badges?: string[]
  score: number
  prefecture?: string
  isCurrentUser?: boolean
}

// ─── Labels & Constants ──────────────────────────────────────────────────────

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

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sighting: '目撃情報投稿',
  protected_post: '保護投稿',
  best_comment: '最有力情報（コメント）',
  best_sighting: '最有力情報（目撃）',
  discovery_bonus: '発見貢献ボーナス',
  reward_exchange: '景品交換',
  admin_adjustment: '管理者調整',
  cancellation: 'ポイント取り消し',
}

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

export interface TitleDefinition {
  id: string
  name: string
  requiredPoints: number
}

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  emoji: string
}

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: 'first_contributor', name: '初回協力者', requiredPoints: 10 },
  { id: 'community_watcher', name: '地域見守りメンバー', requiredPoints: 100 },
  { id: 'search_supporter', name: '捜索サポーター', requiredPoints: 500 },
  { id: 'mygo_supporter', name: 'ANIMAL GOサポーター', requiredPoints: 1000 },
  { id: 'info_provider', name: '有力情報提供者', requiredPoints: 3000 },
  { id: 'regional_rescue', name: '地域レスキュー協力者', requiredPoints: 5000 },
  { id: 'certified_supporter', name: '認定サポーター', requiredPoints: 10000 },
  { id: 'top_searcher', name: 'トップ捜索協力者', requiredPoints: 20000 },
]

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_post', name: '初投稿バッジ', description: '初めて投稿を行いました', emoji: '🌟' },
  { id: 'first_sighting', name: '初目撃投稿バッジ', description: '初めて目撃情報を投稿しました', emoji: '👁️' },
  { id: 'first_protection', name: '初保護投稿バッジ', description: '初めて保護投稿を行いました', emoji: '🤝' },
  { id: 'best_info_provider', name: '最有力情報提供者バッジ', description: '最有力情報に選ばれました', emoji: '⭐' },
  { id: 'discovery_contributor', name: '発見貢献バッジ', description: '発見・保護につながる情報を提供しました', emoji: '🎉' },
  { id: 'monthly_top10', name: '月間TOP10バッジ', description: '月間ランキングTOP10入り', emoji: '🏆' },
  { id: 'weekly_top10', name: '週間TOP10バッジ', description: '週間ランキングTOP10入り', emoji: '🥇' },
  { id: 'local_watcher', name: '地域見守りバッジ', description: '地域の見守り活動に継続貢献', emoji: '🏘️' },
  { id: 'consecutive_contributor', name: '連続協力バッジ', description: '3日以上連続して貢献活動を行いました', emoji: '🔥' },
]

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

export type NotificationType =
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

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  petId: string
  petName: string
  fromUserId?: string
  fromUserDisplayName?: string
  sightingId?: string
  amount?: number
  rewardName?: string
  isRead: boolean
  createdAt: string
}

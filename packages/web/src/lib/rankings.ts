import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { RankingEntry, RankingType } from '@pet-rescue/shared'

const USERS = 'users'
const POINT_TRANSACTIONS = 'point_transactions'

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPeriodStart(type: 'all' | 'monthly' | 'weekly'): string | null {
  if (type === 'all') return null
  const now = new Date()
  if (type === 'monthly') {
    return toISODate(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 6)
  return toISODate(weekAgo)
}

interface UserDoc {
  id: string
  displayName: string
  photoURL?: string
  selectedTitle?: string
  badges?: string[]
  prefecture?: string
  showInRanking?: boolean
  isBanned?: boolean
  totalPointsEarned?: number
  sightingCount?: number
  protectedPostCount?: number
  bestInfoCount?: number
  discoveryCount?: number
}

async function fetchUserDocs(limitCount = 200): Promise<UserDoc[]> {
  const q = query(collection(db, USERS), limit(limitCount))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({
      id: d.id,
      displayName: (d.data().displayName as string) ?? '匿名ユーザー',
      photoURL: d.data().photoURL as string | undefined,
      selectedTitle: d.data().selectedTitle as string | undefined,
      badges: d.data().badges as string[] | undefined,
      prefecture: d.data().prefecture as string | undefined,
      showInRanking: d.data().showInRanking !== false,
      isBanned: Boolean(d.data().isBanned),
      totalPointsEarned: (d.data().totalPointsEarned as number) ?? 0,
      sightingCount: (d.data().sightingCount as number) ?? 0,
      protectedPostCount: (d.data().protectedPostCount as number) ?? 0,
      bestInfoCount: (d.data().bestInfoCount as number) ?? 0,
      discoveryCount: (d.data().discoveryCount as number) ?? 0,
    }))
    .filter((u) => !u.isBanned)
}

function buildEntries(
  users: UserDoc[],
  getScore: (u: UserDoc) => number,
  currentUserId?: string
): RankingEntry[] {
  return users
    .map((u) => ({ user: u, score: getScore(u) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ user, score }, i) => ({
      rank: i + 1,
      userId: user.id,
      displayName: user.showInRanking ? user.displayName : '匿名ユーザー',
      photoURL: user.showInRanking ? user.photoURL : undefined,
      selectedTitle: user.showInRanking ? user.selectedTitle : undefined,
      badges: user.showInRanking ? user.badges : undefined,
      score,
      prefecture: user.showInRanking ? user.prefecture : undefined,
      isCurrentUser: user.id === currentUserId,
    }))
}

/** 累計貢献ポイントランキング（users.totalPointsEarned を使用） */
async function fetchTotalPointsRanking(currentUserId?: string): Promise<RankingEntry[]> {
  const users = await fetchUserDocs()
  return buildEntries(users, (u) => u.totalPointsEarned ?? 0, currentUserId)
}

/** 期間内のポイント集計ランキング（point_transactions を集計） */
async function fetchPeriodPointsRanking(
  periodStart: string,
  currentUserId?: string
): Promise<RankingEntry[]> {
  const txSnap = await getDocs(
    query(
      collection(db, POINT_TRANSACTIONS),
      where('date', '>=', periodStart)
    )
  )

  const scoreMap = new Map<string, number>()
  for (const d of txSnap.docs) {
    const data = d.data()
    if (data.isCancelled) continue
    if (!data.userId) continue
    const amount = (data.amount as number) ?? 0
    if (amount <= 0) continue
    scoreMap.set(data.userId as string, (scoreMap.get(data.userId as string) ?? 0) + amount)
  }

  const users = await fetchUserDocs()
  const enriched = users.map((u) => ({ ...u, periodScore: scoreMap.get(u.id) ?? 0 }))

  return enriched
    .filter((u) => u.periodScore > 0)
    .sort((a, b) => b.periodScore - a.periodScore)
    .map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      displayName: u.showInRanking ? u.displayName : '匿名ユーザー',
      photoURL: u.showInRanking ? u.photoURL : undefined,
      selectedTitle: u.showInRanking ? u.selectedTitle : undefined,
      badges: u.showInRanking ? u.badges : undefined,
      score: u.periodScore,
      prefecture: u.showInRanking ? u.prefecture : undefined,
      isCurrentUser: u.id === currentUserId,
    }))
}

/** カウンター系ランキング */
async function fetchCountRanking(
  field: 'sightingCount' | 'protectedPostCount' | 'bestInfoCount' | 'discoveryCount',
  currentUserId?: string
): Promise<RankingEntry[]> {
  const users = await fetchUserDocs()
  return buildEntries(users, (u) => u[field] ?? 0, currentUserId)
}

/** ランキングを取得する統合関数 */
export async function fetchRanking(
  type: RankingType,
  currentUserId?: string
): Promise<RankingEntry[]> {
  switch (type) {
    case 'total_points':
      return fetchTotalPointsRanking(currentUserId)
    case 'monthly_points': {
      const start = getPeriodStart('monthly')!
      return fetchPeriodPointsRanking(start, currentUserId)
    }
    case 'weekly_points': {
      const start = getPeriodStart('weekly')!
      return fetchPeriodPointsRanking(start, currentUserId)
    }
    case 'sighting_count':
      return fetchCountRanking('sightingCount', currentUserId)
    case 'protection_count':
      return fetchCountRanking('protectedPostCount', currentUserId)
    case 'best_info_count':
      return fetchCountRanking('bestInfoCount', currentUserId)
    case 'discovery_count':
      return fetchCountRanking('discoveryCount', currentUserId)
  }
}

/** 特定ユーザーの順位を取得（ランキングリスト全体が必要なため fetchRanking と合わせて使う） */
export function findUserRank(entries: RankingEntry[], userId: string): number | null {
  const entry = entries.find((e) => e.userId === userId)
  return entry?.rank ?? null
}

export const RANKING_TYPE_LABELS: Record<RankingType, string> = {
  total_points: '総合貢献ポイント',
  monthly_points: '今月の貢献ポイント',
  weekly_points: '今週の貢献ポイント',
  sighting_count: '目撃投稿数',
  protection_count: '保護投稿数',
  best_info_count: '最有力情報回数',
  discovery_count: '発見貢献回数',
}

export const RANKING_SCORE_UNIT: Record<RankingType, string> = {
  total_points: 'pt',
  monthly_points: 'pt',
  weekly_points: 'pt',
  sighting_count: '件',
  protection_count: '件',
  best_info_count: '回',
  discovery_count: '回',
}

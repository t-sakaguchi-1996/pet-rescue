import {
  collection,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { RankingEntry, RankingType } from '../types'

const USERS = 'users'
const POINT_TRANSACTIONS = 'point_transactions'

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

async function fetchUserDocs(): Promise<UserDoc[]> {
  const snap = await getDocs(query(collection(db, USERS), limit(200)))
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

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPeriodStart(type: 'monthly' | 'weekly'): string {
  const now = new Date()
  if (type === 'monthly') {
    return toISODate(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 6)
  return toISODate(weekAgo)
}

async function fetchPeriodPointsRanking(
  periodStart: string,
  currentUserId?: string
): Promise<RankingEntry[]> {
  const txSnap = await getDocs(
    query(collection(db, POINT_TRANSACTIONS), where('date', '>=', periodStart))
  )
  const scoreMap = new Map<string, number>()
  for (const d of txSnap.docs) {
    const data = d.data()
    if (data.isCancelled || !data.userId) continue
    const amount = (data.amount as number) ?? 0
    if (amount <= 0) continue
    const uid = data.userId as string
    scoreMap.set(uid, (scoreMap.get(uid) ?? 0) + amount)
  }
  const users = await fetchUserDocs()
  return users
    .filter((u) => (scoreMap.get(u.id) ?? 0) > 0)
    .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
    .map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      displayName: u.showInRanking ? u.displayName : '匿名ユーザー',
      photoURL: u.showInRanking ? u.photoURL : undefined,
      selectedTitle: u.showInRanking ? u.selectedTitle : undefined,
      badges: u.showInRanking ? u.badges : undefined,
      score: scoreMap.get(u.id) ?? 0,
      prefecture: u.showInRanking ? u.prefecture : undefined,
      isCurrentUser: u.id === currentUserId,
    }))
}

export async function fetchRanking(
  type: RankingType,
  currentUserId?: string
): Promise<RankingEntry[]> {
  switch (type) {
    case 'total_points': {
      const users = await fetchUserDocs()
      return buildEntries(users, (u) => u.totalPointsEarned ?? 0, currentUserId)
    }
    case 'monthly_points':
      return fetchPeriodPointsRanking(getPeriodStart('monthly'), currentUserId)
    case 'weekly_points':
      return fetchPeriodPointsRanking(getPeriodStart('weekly'), currentUserId)
    case 'sighting_count': {
      const users = await fetchUserDocs()
      return buildEntries(users, (u) => u.sightingCount ?? 0, currentUserId)
    }
    case 'protection_count': {
      const users = await fetchUserDocs()
      return buildEntries(users, (u) => u.protectedPostCount ?? 0, currentUserId)
    }
    case 'best_info_count': {
      const users = await fetchUserDocs()
      return buildEntries(users, (u) => u.bestInfoCount ?? 0, currentUserId)
    }
    case 'discovery_count': {
      const users = await fetchUserDocs()
      return buildEntries(users, (u) => u.discoveryCount ?? 0, currentUserId)
    }
  }
}

export function findUserRank(entries: RankingEntry[], userId: string): number | null {
  return entries.find((e) => e.userId === userId)?.rank ?? null
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

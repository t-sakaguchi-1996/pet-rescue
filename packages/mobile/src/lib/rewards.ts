import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Reward, RewardExchange, ExchangeStatus } from '../types'

const REWARDS = 'rewards'
const REWARD_EXCHANGES = 'reward_exchanges'
const USERS = 'users'
const POINT_TRANSACTIONS = 'point_transactions'

function toReward(id: string, data: Record<string, unknown>): Reward {
  const createdAt = data.createdAt as Timestamp | string
  const updatedAt = data.updatedAt as Timestamp | string
  return {
    id,
    name: (data.name as string) ?? '',
    description: (data.description as string) ?? '',
    requiredPoints: (data.requiredPoints as number) ?? 0,
    rewardType: data.rewardType as Reward['rewardType'],
    stock: data.stock as number | null | undefined,
    monthlyExchangeLimit: data.monthlyExchangeLimit as number | null | undefined,
    isActive: Boolean(data.isActive),
    imageUrl: data.imageUrl as string | undefined,
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt as string) ?? '',
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (updatedAt as string) ?? '',
  }
}

function toExchange(id: string, data: Record<string, unknown>): RewardExchange {
  const ts = (field: unknown) =>
    field instanceof Timestamp
      ? field.toDate().toISOString()
      : typeof field === 'string'
        ? field
        : undefined
  return {
    id,
    userId: (data.userId as string) ?? '',
    userDisplayName: data.userDisplayName as string | undefined,
    rewardId: (data.rewardId as string) ?? '',
    rewardName: (data.rewardName as string) ?? '',
    rewardType: data.rewardType as Reward['rewardType'] | undefined,
    requiredPoints: (data.requiredPoints as number) ?? 0,
    status: (data.status as ExchangeStatus) ?? 'requested',
    requestedAt: ts(data.requestedAt) ?? '',
    approvedAt: ts(data.approvedAt),
    shippedAt: ts(data.shippedAt),
    cancelledAt: ts(data.cancelledAt),
    adminNote: data.adminNote as string | undefined,
  }
}

export async function fetchRewards(): Promise<Reward[]> {
  try {
    const q = query(
      collection(db, REWARDS),
      where('isActive', '==', true),
      orderBy('requiredPoints', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => toReward(d.id, d.data()))
  } catch {
    const snap = await getDocs(collection(db, REWARDS))
    return snap.docs
      .map((d) => toReward(d.id, d.data()))
      .filter((r) => r.isActive)
      .sort((a, b) => a.requiredPoints - b.requiredPoints)
  }
}

export async function fetchUserRewardExchanges(userId: string): Promise<RewardExchange[]> {
  try {
    const q = query(
      collection(db, REWARD_EXCHANGES),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => toExchange(d.id, d.data()))
  } catch {
    const q = query(collection(db, REWARD_EXCHANGES), where('userId', '==', userId))
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => toExchange(d.id, d.data()))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  }
}

export async function requestRewardExchange(
  userId: string,
  rewardId: string
): Promise<{ success: boolean; error?: string }> {
  const [userSnap, rewardSnap] = await Promise.all([
    getDoc(doc(db, USERS, userId)),
    getDoc(doc(db, REWARDS, rewardId)),
  ])

  if (!userSnap.exists()) return { success: false, error: 'ユーザーが見つかりません' }
  if (!rewardSnap.exists()) return { success: false, error: '景品が見つかりません' }

  const userData = userSnap.data()
  const reward = toReward(rewardId, rewardSnap.data())

  if (!reward.isActive) return { success: false, error: 'この景品は現在取り扱いがありません' }

  const currentPoints: number = (userData.points as number) ?? 0
  if (currentPoints < reward.requiredPoints) {
    return { success: false, error: `貢献ポイントが不足しています（必要: ${reward.requiredPoints}pt、保有: ${currentPoints}pt）` }
  }

  if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
    return { success: false, error: '在庫がありません' }
  }

  const isDigitalAcquisition = reward.rewardType === 'badge' || reward.rewardType === 'title'
  const needsApproval = ['sticker', 'coupon', 'donation', 'physical_goods'].includes(reward.rewardType)
  const initialStatus: ExchangeStatus = needsApproval ? 'requested' : 'approved'
  const now = Timestamp.now()
  const userDisplayName = (userData.displayName as string) ?? ''

  if (!isDigitalAcquisition) {
    await updateDoc(doc(db, USERS, userId), {
      points: increment(-reward.requiredPoints),
    })
    await addDoc(collection(db, POINT_TRANSACTIONS), {
      userId,
      type: 'reward_exchange',
      transactionType: 'reward_exchange',
      amount: -reward.requiredPoints,
      sourceType: 'reward',
      sourceId: rewardId,
      description: `景品交換: ${reward.name}`,
      date: now.toDate().toISOString().split('T')[0],
      isCancelled: false,
      createdAt: now,
    })
    if (reward.stock !== null && reward.stock !== undefined) {
      await updateDoc(doc(db, REWARDS, rewardId), {
        stock: increment(-1),
        updatedAt: now,
      })
    }
  }

  await addDoc(collection(db, REWARD_EXCHANGES), {
    userId,
    userDisplayName,
    rewardId,
    rewardName: reward.name,
    rewardType: reward.rewardType,
    requiredPoints: reward.requiredPoints,
    status: initialStatus,
    requestedAt: now,
    ...(initialStatus === 'approved' ? { approvedAt: now } : {}),
  })

  return { success: true }
}

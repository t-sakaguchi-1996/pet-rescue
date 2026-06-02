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
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Reward, RewardExchange, ExchangeStatus } from '@pet-rescue/shared'
import { notifyAdminRewardExchange } from './notifications'

const NEEDS_ADMIN_APPROVAL: Reward['rewardType'][] = ['sticker', 'coupon', 'donation', 'physical_goods']

const REWARDS = 'rewards'
const REWARD_EXCHANGES = 'reward_exchanges'
const USERS = 'users'
const POINT_TRANSACTIONS = 'point_transactions'

function toReward(id: string, data: Record<string, unknown>): Reward {
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
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? '',
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string) ?? '',
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
    userEmail: data.userEmail as string | undefined,
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

/** アクティブな景品一覧を取得 */
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
    // インデックスビルド中のフォールバック: 全件取得してクライアント側でフィルタ・ソート
    const snap = await getDocs(collection(db, REWARDS))
    return snap.docs
      .map((d) => toReward(d.id, d.data()))
      .filter((r) => r.isActive)
      .sort((a, b) => a.requiredPoints - b.requiredPoints)
  }
}

/** 全景品一覧を取得（管理者用） */
export async function fetchAllRewards(): Promise<Reward[]> {
  const q = query(collection(db, REWARDS), orderBy('requiredPoints', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => toReward(d.id, d.data()))
}

/** 景品交換を申請する */
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
  const rewardData = rewardSnap.data()
  const reward = toReward(rewardId, rewardData)

  if (!reward.isActive) return { success: false, error: 'この景品は現在取り扱いがありません' }

  const currentPoints: number = userData.points ?? 0
  if (currentPoints < reward.requiredPoints) {
    return { success: false, error: `貢献ポイントが不足しています（必要: ${reward.requiredPoints}pt、保有: ${currentPoints}pt）` }
  }

  // 在庫チェック
  if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
    return { success: false, error: '在庫がありません' }
  }

  // 月間交換上限チェック
  if (reward.monthlyExchangeLimit) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthExchangesSnap = await getDocs(
      query(
        collection(db, REWARD_EXCHANGES),
        where('userId', '==', userId),
        where('rewardId', '==', rewardId),
        where('requestedAt', '>=', monthStart),
        where('status', '!=', 'cancelled')
      )
    )
    if (monthExchangesSnap.size >= reward.monthlyExchangeLimit) {
      return { success: false, error: `この景品は月${reward.monthlyExchangeLimit}回まで交換できます` }
    }
  }

  const now = Timestamp.now()
  const userDisplayName = (userData.displayName as string) ?? ''
  const userEmail = (userData.email as string) ?? ''

  // バッジ・称号はポイント消費なしで取得、物理的特典は管理者承認待ち
  const isDigitalAcquisition = reward.rewardType === 'badge' || reward.rewardType === 'title'
  const needsApproval = NEEDS_ADMIN_APPROVAL.includes(reward.rewardType)
  const initialStatus: ExchangeStatus = needsApproval ? 'requested' : 'approved'

  if (!isDigitalAcquisition) {
    // ポイント控除（バッジ・称号は消費しない）
    await updateDoc(doc(db, USERS, userId), {
      points: increment(-reward.requiredPoints),
    })

    // ポイント履歴に記録
    await addDoc(collection(db, POINT_TRANSACTIONS), {
      userId,
      type: 'reward_exchange',
      transactionType: 'reward_exchange',
      amount: -reward.requiredPoints,
      referenceId: rewardId,
      sourceType: 'reward',
      sourceId: rewardId,
      description: `景品交換: ${reward.name}`,
      date: now.toDate().toISOString().split('T')[0],
      isCancelled: false,
      createdAt: now,
    })

    // 在庫を減らす
    if (reward.stock !== null && reward.stock !== undefined) {
      await updateDoc(doc(db, REWARDS, rewardId), {
        stock: increment(-1),
        updatedAt: now,
      })
    }
  }

  // 交換申請を記録
  await addDoc(collection(db, REWARD_EXCHANGES), {
    userId,
    userDisplayName,
    userEmail,
    rewardId,
    rewardName: reward.name,
    rewardType: reward.rewardType,
    requiredPoints: reward.requiredPoints,
    status: initialStatus,
    requestedAt: now,
    ...(initialStatus === 'approved' ? { approvedAt: now } : {}),
  })

  // 物理的特典の場合のみ管理者へ通知
  if (needsApproval) {
    await notifyAdminRewardExchange({
      requesterDisplayName: userDisplayName,
      rewardName: reward.name,
    })
  }

  return { success: true }
}

/** ユーザーの景品交換履歴を取得 */
export async function fetchUserRewardExchanges(userId: string): Promise<RewardExchange[]> {
  const q = query(
    collection(db, REWARD_EXCHANGES),
    where('userId', '==', userId),
    orderBy('requestedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => toExchange(d.id, d.data()))
}

/** 全交換申請一覧を取得（管理者用） */
export async function fetchAllRewardExchanges(): Promise<RewardExchange[]> {
  const q = query(collection(db, REWARD_EXCHANGES), orderBy('requestedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => toExchange(d.id, d.data()))
}

/** 交換申請のステータスを更新（管理者用） */
export async function updateExchangeStatus(
  exchangeId: string,
  status: ExchangeStatus,
  adminNote?: string
): Promise<void> {
  const now = Timestamp.now()
  const updates: Record<string, unknown> = { status, updatedAt: now }
  if (adminNote) updates.adminNote = adminNote
  if (status === 'approved') updates.approvedAt = now
  if (status === 'shipped') updates.shippedAt = now
  if (status === 'cancelled') updates.cancelledAt = now
  await updateDoc(doc(db, REWARD_EXCHANGES, exchangeId), updates)
}

function omitUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

/** 景品を新規追加（管理者用） */
export async function createReward(
  data: Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, REWARDS), { ...omitUndefined(data as Record<string, unknown>), createdAt: now, updatedAt: now })
  return ref.id
}

/** 景品を更新（管理者用） */
export async function updateReward(
  rewardId: string,
  data: Partial<Omit<Reward, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, REWARDS, rewardId), { ...omitUndefined(data as Record<string, unknown>), updatedAt: Timestamp.now() })
}

/** 初期景品マスタをシードする（管理者が初回のみ実行） */
export async function seedInitialRewards(): Promise<void> {
  const existing = await getDocs(collection(db, REWARDS))
  if (!existing.empty) return

  const now = Timestamp.now()
  const initial = [
    { name: 'プロフィールバッジ', description: 'プロフィールに表示できる特別バッジです', requiredPoints: 100, rewardType: 'badge', stock: null, monthlyExchangeLimit: null, isActive: true },
    { name: '称号「地域見守りメンバー」', description: 'プロフィールや投稿に表示できる称号です', requiredPoints: 300, rewardType: 'title', stock: null, monthlyExchangeLimit: null, isActive: true },
    { name: '称号「捜索サポーター」', description: 'プロフィールや投稿に表示できる称号です', requiredPoints: 500, rewardType: 'title', stock: null, monthlyExchangeLimit: null, isActive: true },
    { name: 'ANIMAL MyGOステッカー', description: 'オリジナルステッカーをご自宅にお届けします', requiredPoints: 1000, rewardType: 'sticker', stock: 100, monthlyExchangeLimit: null, isActive: true },
    { name: '迷子札・ペット用品クーポン500円分', description: '提携ペット用品店で使えるクーポンです', requiredPoints: 2500, rewardType: 'coupon', stock: null, monthlyExchangeLimit: null, isActive: true },
    { name: 'ペット用品クーポン1,000円分', description: '提携ペット用品店で使えるクーポンです', requiredPoints: 5000, rewardType: 'coupon', stock: null, monthlyExchangeLimit: null, isActive: true },
    { name: 'ペット用品クーポン2,000円分', description: '提携ペット用品店で使えるクーポンです（月1回まで）', requiredPoints: 10000, rewardType: 'coupon', stock: null, monthlyExchangeLimit: 1, isActive: true },
    { name: 'ペット用品クーポン3,000円分 または 動物保護団体への寄付3,000円相当', description: 'クーポンまたは指定動物保護団体への寄付をお選びいただけます（月1回まで）', requiredPoints: 20000, rewardType: 'coupon', stock: null, monthlyExchangeLimit: 1, isActive: true },
  ]

  await Promise.all(
    initial.map((item) => addDoc(collection(db, REWARDS), { ...item, createdAt: now, updatedAt: now }))
  )
}

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { PointTransaction, TransactionType, SourceType } from '@pet-rescue/shared'
import {
  fetchGuestSightingsByEmail,
  linkGuestSightingToUser,
  markSightingPointGranted,
  markSightingBestInfoPointGranted,
  markPetBestInfoPointGranted,
} from './sightings'
import {
  fetchGuestCommentsByEmail,
  linkGuestCommentToUser,
} from './comments'
import { checkAndUpdateTitles } from './titles'

const POINT_TRANSACTIONS = 'point_transactions'
const USERS = 'users'

const SIGHTING_POINT = 2
const DAILY_SIGHTING_LIMIT = 10
const PROTECTED_POST_POINT = 10
const DAILY_PROTECTED_LIMIT = 20
const BEST_INFO_POINT = 100
const DISCOVERY_BONUS_POINT = 300

function toDate(d: Timestamp | string | undefined): Date {
  if (d instanceof Timestamp) return d.toDate()
  if (typeof d === 'string') return new Date(d)
  return new Date()
}

function toISODate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().split('T')[0]
}

/** 既存レコードを PointTransaction 型にマッピング（後方互換） */
function toPointTransaction(id: string, data: Record<string, unknown>): PointTransaction {
  const transactionType = ((data.transactionType ?? data.type) as TransactionType) ?? 'sighting'
  const sourceId = (data.sourceId ?? data.referenceId) as string | undefined
  return {
    id,
    userId: data.userId as string,
    transactionType,
    amount: (data.amount as number) ?? 0,
    sourceType: data.sourceType as SourceType | undefined,
    sourceId,
    description: data.description as string | undefined,
    date: (data.date as string) ?? '',
    isCancelled: Boolean(data.isCancelled),
    cancelledAt: data.cancelledAt as string | undefined,
    cancelledReason: data.cancelledReason as string | undefined,
    createdAt: toDate(data.createdAt as Timestamp | string).toISOString(),
  }
}

/** ユーザーの今日の特定タイプのポイント合計を取得 */
async function getDailyPointsUsed(
  userId: string,
  transactionType: TransactionType,
  date: string
): Promise<number> {
  const q = query(
    collection(db, POINT_TRANSACTIONS),
    where('userId', '==', userId),
    where('type', '==', transactionType),
    where('date', '==', date)
  )
  const snap = await getDocs(q)
  return snap.docs.reduce(
    (sum, d) => sum + ((d.data().amount as number) ?? 0),
    0
  )
}

/** 同じ source に対して同じ transactionType が既に記録されているか確認 */
async function isDuplicate(
  sourceId: string,
  transactionType: TransactionType
): Promise<boolean> {
  const q = query(
    collection(db, POINT_TRANSACTIONS),
    where('referenceId', '==', sourceId),
    where('type', '==', transactionType),
    where('isCancelled', '==', false)
  )
  const snap = await getDocs(q)
  if (!snap.empty) return true

  // 旧レコード（isCancelled フィールドなし）のチェック
  const q2 = query(
    collection(db, POINT_TRANSACTIONS),
    where('referenceId', '==', sourceId),
    where('type', '==', transactionType)
  )
  const snap2 = await getDocs(q2)
  return snap2.docs.some((d) => !d.data().isCancelled)
}

/**
 * ポイントトランザクションを記録してユーザーのポイントを更新する。
 * amount > 0 の場合は totalPointsEarned も加算し、称号チェックを行う。
 */
async function recordPointTransaction(params: {
  userId: string
  transactionType: TransactionType
  amount: number
  sourceType?: SourceType
  sourceId: string
  description?: string
  date: string
}): Promise<void> {
  const now = Timestamp.now()
  await addDoc(collection(db, POINT_TRANSACTIONS), {
    userId: params.userId,
    type: params.transactionType,
    transactionType: params.transactionType,
    amount: params.amount,
    referenceId: params.sourceId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    description: params.description,
    date: params.date,
    isCancelled: false,
    createdAt: now,
  })

  if (params.amount > 0) {
    await updateDoc(doc(db, USERS, params.userId), {
      points: increment(params.amount),
      totalPointsEarned: increment(params.amount),
    })
    // 称号チェック（非同期、失敗しても続行）
    try {
      const userSnap = await getDoc(doc(db, USERS, params.userId))
      if (userSnap.exists()) {
        const earned = (userSnap.data().totalPointsEarned as number) ?? 0
        await checkAndUpdateTitles(params.userId, earned)
      }
    } catch { /* 称号チェック失敗はポイント付与に影響させない */ }
  } else {
    await updateDoc(doc(db, USERS, params.userId), {
      points: increment(params.amount),
    })
  }
}

// ─────────────────────────────────────────
// 目撃投稿ポイント
// ─────────────────────────────────────────

/** 目撃投稿のポイントを付与（1日最大10ptチェック付き） */
export async function grantSightingPoints(
  userId: string,
  sightingId: string,
  sightingDate: string
): Promise<{ granted: boolean; amount: number }> {
  const used = await getDailyPointsUsed(userId, 'sighting', sightingDate)
  const remaining = DAILY_SIGHTING_LIMIT - used
  if (remaining <= 0) return { granted: false, amount: 0 }

  const dup = await isDuplicate(sightingId, 'sighting')
  if (dup) return { granted: false, amount: 0 }

  const amount = Math.min(SIGHTING_POINT, remaining)
  await recordPointTransaction({
    userId,
    transactionType: 'sighting',
    amount,
    sourceType: 'sighting',
    sourceId: sightingId,
    description: '目撃情報投稿',
    date: sightingDate,
  })
  await markSightingPointGranted(sightingId)

  // 目撃投稿数カウンター更新
  await updateDoc(doc(db, USERS, userId), { sightingCount: increment(1) }).catch(() => {})

  return { granted: true, amount }
}

// ─────────────────────────────────────────
// 保護投稿ポイント
// ─────────────────────────────────────────

/** 保護投稿のポイントを付与（1日最大20ptチェック付き） */
export async function grantProtectedPostPoints(
  userId: string,
  petId: string,
  date: string
): Promise<{ granted: boolean; amount: number }> {
  const used = await getDailyPointsUsed(userId, 'protected_post', date)
  const remaining = DAILY_PROTECTED_LIMIT - used
  if (remaining <= 0) return { granted: false, amount: 0 }

  const dup = await isDuplicate(petId, 'protected_post')
  if (dup) return { granted: false, amount: 0 }

  const amount = Math.min(PROTECTED_POST_POINT, remaining)
  await recordPointTransaction({
    userId,
    transactionType: 'protected_post',
    amount,
    sourceType: 'protected_post',
    sourceId: petId,
    description: '保護投稿',
    date,
  })

  // 保護投稿数カウンター更新
  await updateDoc(doc(db, USERS, userId), { protectedPostCount: increment(1) }).catch(() => {})

  return { granted: true, amount }
}

// ─────────────────────────────────────────
// 最有力情報ポイント
// ─────────────────────────────────────────

/** 最有力情報コメントのポイントを付与 */
export async function grantBestCommentPoints(
  userId: string,
  commentId: string
): Promise<void> {
  const dup = await isDuplicate(commentId, 'best_comment')
  if (dup) return

  const today = toISODate(new Date())
  await recordPointTransaction({
    userId,
    transactionType: 'best_comment',
    amount: BEST_INFO_POINT,
    sourceType: 'comment',
    sourceId: commentId,
    description: '最有力情報（コメント）',
    date: today,
  })

  await updateDoc(doc(db, USERS, userId), { bestInfoCount: increment(1) }).catch(() => {})
}

/** 最有力情報目撃投稿のポイントを付与 */
export async function grantBestSightingPoints(
  userId: string,
  sightingId: string
): Promise<void> {
  const dup = await isDuplicate(sightingId, 'best_sighting')
  if (dup) return

  const today = toISODate(new Date())
  await recordPointTransaction({
    userId,
    transactionType: 'best_sighting',
    amount: BEST_INFO_POINT,
    sourceType: 'sighting',
    sourceId: sightingId,
    description: '最有力情報（目撃投稿）',
    date: today,
  })

  await updateDoc(doc(db, USERS, userId), { bestInfoCount: increment(1) }).catch(() => {})
}

// ─────────────────────────────────────────
// 発見確認ボーナス
// ─────────────────────────────────────────

/** 発見確認ボーナスを付与（迷子投稿者が確認した場合） */
export async function grantDiscoveryBonus(
  userId: string,
  petId: string
): Promise<{ granted: boolean }> {
  const dup = await isDuplicate(petId, 'discovery_bonus')
  if (dup) return { granted: false }

  const today = toISODate(new Date())
  await recordPointTransaction({
    userId,
    transactionType: 'discovery_bonus',
    amount: DISCOVERY_BONUS_POINT,
    sourceType: 'lost_pet_post',
    sourceId: petId,
    description: '発見・保護確認ボーナス',
    date: today,
  })

  await updateDoc(doc(db, USERS, userId), { discoveryCount: increment(1) }).catch(() => {})

  return { granted: true }
}

// ─────────────────────────────────────────
// ポイント取り消し（管理者用）
// ─────────────────────────────────────────

/** ポイントトランザクションを取り消す（is_cancelled = true にする） */
export async function cancelPointTransaction(
  transactionId: string,
  cancelledReason: string,
  adminUserId: string
): Promise<void> {
  const txRef = doc(db, POINT_TRANSACTIONS, transactionId)
  const txSnap = await getDoc(txRef)
  if (!txSnap.exists()) throw new Error('トランザクションが見つかりません')

  const data = txSnap.data()
  if (data.isCancelled) throw new Error('既に取り消し済みです')

  const amount = (data.amount as number) ?? 0
  const userId = data.userId as string

  await updateDoc(txRef, {
    isCancelled: true,
    cancelledAt: Timestamp.now(),
    cancelledReason,
    cancelledBy: adminUserId,
  })

  // ユーザーのポイントを元に戻す
  if (amount > 0) {
    await updateDoc(doc(db, USERS, userId), {
      points: increment(-amount),
    })
  }
}

// ─────────────────────────────────────────
// 照会
// ─────────────────────────────────────────

/** ユーザーの総ポイント（現在の保有ポイント）を取得 */
export async function getUserPoints(userId: string): Promise<number> {
  const snap = await getDoc(doc(db, USERS, userId))
  if (!snap.exists()) return 0
  return (snap.data().points as number) ?? 0
}

/** ポイント履歴を取得（有効なもの、取り消し済みを含む全件） */
export async function getPointTransactions(userId: string): Promise<PointTransaction[]> {
  const q = query(
    collection(db, POINT_TRANSACTIONS),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toPointTransaction(d.id, d.data()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** 全ポイント履歴を取得（管理者用） */
export async function getAllPointTransactions(limitCount = 200): Promise<PointTransaction[]> {
  const q = query(collection(db, POINT_TRANSACTIONS))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toPointTransaction(d.id, d.data()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limitCount)
}

// ─────────────────────────────────────────
// ゲスト紐づけ
// ─────────────────────────────────────────

/**
 * 会員登録時に、同じメールアドレスの未ログイン投稿・コメントをユーザーに紐づけ、
 * ポイント付与条件を満たすものにポイントを付与する。
 */
export async function linkGuestActivityAndGrantPoints(
  userId: string,
  email: string
): Promise<void> {
  // 目撃投稿の紐づけ＆ポイント付与
  const guestSightings = await fetchGuestSightingsByEmail(email)
  for (const sighting of guestSightings) {
    await linkGuestSightingToUser(sighting.id, userId)
    if (!sighting.pointGranted) {
      const sightingDate = toISODate(sighting.createdAt)
      await grantSightingPoints(userId, sighting.id, sightingDate)
    }
    if (sighting.isBestInfo && !sighting.bestInfoPointGranted) {
      if (sighting.bestInfoPetId) {
        const petSnap = await getDoc(doc(db, 'pets', sighting.bestInfoPetId))
        if (!petSnap.exists() || !petSnap.data().bestInfoPointGranted) {
          await grantBestSightingPoints(userId, sighting.id)
          await markSightingBestInfoPointGranted(sighting.id)
          await markPetBestInfoPointGranted(sighting.bestInfoPetId)
        }
      } else {
        await grantBestSightingPoints(userId, sighting.id)
        await markSightingBestInfoPointGranted(sighting.id)
      }
    }
  }

  // コメントの紐づけ＆最有力情報ポイント付与
  const guestComments = await fetchGuestCommentsByEmail(email)
  for (const comment of guestComments) {
    await linkGuestCommentToUser(comment.petId, comment.id, userId)
    if (comment.isBestInfo && !comment.bestInfoPointGranted) {
      await grantBestCommentPoints(userId, comment.id)
    }
  }
}

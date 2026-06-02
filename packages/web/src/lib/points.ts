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
import type { PointTransaction } from '@pet-rescue/shared'
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

const POINT_TRANSACTIONS = 'point_transactions'
const USERS = 'users'

const SIGHTING_POINT = 2
const DAILY_SIGHTING_LIMIT = 10
const BEST_COMMENT_POINT = 100
const BEST_SIGHTING_POINT = 100

function toDate(d: Timestamp | string | undefined): Date {
  if (d instanceof Timestamp) return d.toDate()
  if (typeof d === 'string') return new Date(d)
  return new Date()
}

function toISODate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().split('T')[0]
}

/** ユーザーの今日の目撃投稿ポイント合計を取得 */
async function getDailySightingPointsUsed(userId: string, date: string): Promise<number> {
  const q = query(
    collection(db, POINT_TRANSACTIONS),
    where('userId', '==', userId),
    where('type', '==', 'sighting'),
    where('date', '==', date)
  )
  const snap = await getDocs(q)
  return snap.docs.reduce((sum, d) => sum + ((d.data().amount as number) ?? 0), 0)
}

/** ポイントトランザクションを記録してユーザーのポイントを加算 */
async function recordPointTransaction(
  userId: string,
  type: 'sighting' | 'best_comment' | 'best_sighting',
  amount: number,
  referenceId: string,
  date: string
): Promise<void> {
  const now = Timestamp.now()
  await addDoc(collection(db, POINT_TRANSACTIONS), {
    userId,
    type,
    amount,
    referenceId,
    date,
    createdAt: now,
  })

  await updateDoc(doc(db, USERS, userId), {
    points: increment(amount),
  })
}

/** 目撃投稿のポイントを付与（1日最大10ptチェック付き） */
export async function grantSightingPoints(
  userId: string,
  sightingId: string,
  sightingDate: string
): Promise<{ granted: boolean; amount: number }> {
  const used = await getDailySightingPointsUsed(userId, sightingDate)
  const remaining = DAILY_SIGHTING_LIMIT - used
  if (remaining <= 0) return { granted: false, amount: 0 }

  const amount = Math.min(SIGHTING_POINT, remaining)
  await recordPointTransaction(userId, 'sighting', amount, sightingId, sightingDate)
  await markSightingPointGranted(sightingId)
  return { granted: true, amount }
}

/** 最有力情報コメントのポイントを付与 */
export async function grantBestCommentPoints(
  userId: string,
  commentId: string
): Promise<void> {
  const today = toISODate(new Date())
  await recordPointTransaction(userId, 'best_comment', BEST_COMMENT_POINT, commentId, today)
}

/** 最有力情報目撃投稿のポイントを付与 */
export async function grantBestSightingPoints(
  userId: string,
  sightingId: string
): Promise<void> {
  const today = toISODate(new Date())
  await recordPointTransaction(userId, 'best_sighting', BEST_SIGHTING_POINT, sightingId, today)
}

/** ユーザーの総ポイントを取得 */
export async function getUserPoints(userId: string): Promise<number> {
  const snap = await getDoc(doc(db, USERS, userId))
  if (!snap.exists()) return 0
  return (snap.data().points as number) ?? 0
}

/** ポイント履歴を取得 */
export async function getPointTransactions(userId: string): Promise<PointTransaction[]> {
  const q = query(
    collection(db, POINT_TRANSACTIONS),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        userId: data.userId as string,
        type: data.type as 'sighting' | 'best_comment' | 'best_sighting',
        amount: data.amount as number,
        referenceId: data.referenceId as string,
        date: data.date as string,
        createdAt: toDate(data.createdAt as Timestamp | string).toISOString(),
      } satisfies PointTransaction
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

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
    if (sighting.pointGranted) continue
    await linkGuestSightingToUser(sighting.id, userId)
    const sightingDate = toISODate(sighting.createdAt)
    await grantSightingPoints(userId, sighting.id, sightingDate)
  }

  // コメントの紐づけ＆最有力情報ポイント付与
  const guestComments = await fetchGuestCommentsByEmail(email)
  for (const comment of guestComments) {
    await linkGuestCommentToUser(comment.petId, comment.id, userId)
    if (comment.isBestInfo && !comment.bestInfoPointGranted) {
      await grantBestCommentPoints(userId, comment.id)
    }
  }

  // 目撃情報の最有力情報ポイント付与（isBestInfo=true かつ未付与のもの）
  for (const sighting of guestSightings) {
    if (!sighting.isBestInfo || sighting.bestInfoPointGranted) continue
    // bestInfoPetId が記録されている場合は pet.bestInfoPointGranted もチェック
    if (sighting.bestInfoPetId) {
      const petSnap = await getDoc(doc(db, 'pets', sighting.bestInfoPetId))
      if (petSnap.exists() && petSnap.data().bestInfoPointGranted) continue
      await grantBestSightingPoints(userId, sighting.id)
      await markSightingBestInfoPointGranted(sighting.id)
      await markPetBestInfoPointGranted(sighting.bestInfoPetId)
    } else {
      await grantBestSightingPoints(userId, sighting.id)
      await markSightingBestInfoPointGranted(sighting.id)
    }
  }
}

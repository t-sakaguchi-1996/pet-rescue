import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { PointTransaction, TransactionType } from '../types'

const POINT_TRANSACTIONS = 'point_transactions'
const USERS = 'users'
const BEST_INFO_POINT = 100
const DISCOVERY_BONUS_POINT = 300

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

async function isDuplicateTransaction(sourceId: string, transactionType: string): Promise<boolean> {
  const q = query(
    collection(db, POINT_TRANSACTIONS),
    where('referenceId', '==', sourceId),
    where('type', '==', transactionType)
  )
  const snap = await getDocs(q)
  return snap.docs.some((d) => !d.data().isCancelled)
}

async function recordPointTransaction(params: {
  userId: string
  transactionType: string
  amount: number
  sourceType?: string
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
  }
}

export async function grantBestSightingPoints(userId: string, sightingId: string): Promise<void> {
  const dup = await isDuplicateTransaction(sightingId, 'best_sighting')
  if (dup) return
  await recordPointTransaction({
    userId, transactionType: 'best_sighting', amount: BEST_INFO_POINT,
    sourceType: 'sighting', sourceId: sightingId,
    description: '最有力情報（目撃投稿）', date: toISODate(new Date()),
  })
  await updateDoc(doc(db, USERS, userId), { bestInfoCount: increment(1) }).catch(() => {})
}

export async function grantBestCommentPoints(userId: string, commentId: string): Promise<void> {
  const dup = await isDuplicateTransaction(commentId, 'best_comment')
  if (dup) return
  await recordPointTransaction({
    userId, transactionType: 'best_comment', amount: BEST_INFO_POINT,
    sourceType: 'comment', sourceId: commentId,
    description: '最有力情報（コメント）', date: toISODate(new Date()),
  })
  await updateDoc(doc(db, USERS, userId), { bestInfoCount: increment(1) }).catch(() => {})
}

export async function grantDiscoveryBonus(userId: string, petId: string): Promise<void> {
  const dup = await isDuplicateTransaction(petId, 'discovery_bonus')
  if (dup) return
  await recordPointTransaction({
    userId, transactionType: 'discovery_bonus', amount: DISCOVERY_BONUS_POINT,
    sourceType: 'lost_pet_post', sourceId: petId,
    description: '発見・保護確認ボーナス', date: toISODate(new Date()),
  })
  await updateDoc(doc(db, USERS, userId), { discoveryCount: increment(1) }).catch(() => {})
}

function toPointTransaction(id: string, data: Record<string, unknown>): PointTransaction {
  const createdAt = data.createdAt as Timestamp | string
  return {
    id,
    userId: (data.userId as string) ?? '',
    transactionType: (data.transactionType ?? data.type) as TransactionType,
    amount: (data.amount as number) ?? 0,
    sourceType: data.sourceType as string | undefined,
    sourceId: data.sourceId as string | undefined,
    description: data.description as string | undefined,
    date: (data.date as string) ?? '',
    isCancelled: Boolean(data.isCancelled),
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ?? ''),
  }
}

export async function fetchPointTransactions(userId: string): Promise<PointTransaction[]> {
  try {
    const q = query(
      collection(db, POINT_TRANSACTIONS),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => toPointTransaction(d.id, d.data()))
  } catch {
    // Index not built yet — fallback without orderBy
    const q = query(collection(db, POINT_TRANSACTIONS), where('userId', '==', userId))
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => toPointTransaction(d.id, d.data()))
      .sort((a, b) => b.date.localeCompare(a.date))
  }
}

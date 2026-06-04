import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { PointTransaction, TransactionType } from '../types'

const POINT_TRANSACTIONS = 'point_transactions'

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

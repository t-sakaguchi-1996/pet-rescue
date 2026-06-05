'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  doc, getDoc, getDocs, collection, query, where, orderBy,
  updateDoc, deleteDoc, writeBatch, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TRANSACTION_TYPE_LABELS } from '@pet-rescue/shared'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

const EXCHANGE_STATUS_LABELS: Record<string, string> = {
  requested: '申請済み',
  approved: '承認済み',
  shipped: '発送済み',
  completed: '完了',
  cancelled: 'キャンセル',
  rejected: '却下',
}

type TxDoc = {
  id: string; userId: string; transactionType: string; amount: number
  description?: string; date: string; isCancelled: boolean; createdAt: string
}
type ExDoc = {
  id: string; rewardName: string; requiredPoints: number; status: string; requestedAt: string
}
type PetDoc = { id: string; name?: string; type?: string; species?: string; status?: string }
type SightingDoc = { id: string; description?: string; createdAt?: string }

function toDate(val: unknown): Date | null {
  if (!val) return null
  if (typeof val === 'object' && 'toDate' in (val as object)) return (val as { toDate: () => Date }).toDate()
  const d = new Date(String(val))
  return isNaN(d.getTime()) ? null : d
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { uid } = use(params)

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false

  const [userData, setUserData] = useState<Record<string, unknown> | null>(null)
  const [transactions, setTransactions] = useState<TxDoc[]>([])
  const [exchanges, setExchanges] = useState<ExDoc[]>([])
  const [pets, setPets] = useState<PetDoc[]>([])
  const [sightings, setSightings] = useState<SightingDoc[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'points' | 'exchanges' | 'pets' | 'sightings'>('points')

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/mypage')
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (!user || !isAdmin || !uid) return
    setDataLoading(true)

    const fallback = (q: ReturnType<typeof query>, col: string) =>
      getDocs(q).catch(() => getDocs(query(collection(db, col), where('userId', '==', uid))))

    Promise.all([
      getDoc(doc(db, 'users', uid)),
      fallback(query(collection(db, 'point_transactions'), where('userId', '==', uid), orderBy('createdAt', 'desc')), 'point_transactions'),
      fallback(query(collection(db, 'reward_exchanges'), where('userId', '==', uid), orderBy('requestedAt', 'desc')), 'reward_exchanges'),
      fallback(query(collection(db, 'pets'), where('userId', '==', uid), orderBy('createdAt', 'desc')), 'pets'),
      fallback(query(collection(db, 'sightings'), where('userId', '==', uid), orderBy('createdAt', 'desc')), 'sightings'),
    ]).then(([userSnap, txSnap, exSnap, petsSnap, sightingsSnap]) => {
      setUserData(userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null)

      setTransactions(txSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const ts = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt ?? '')
        return { id: d.id, userId: String(data.userId ?? ''), transactionType: String(data.transactionType ?? data.type ?? ''), amount: Number(data.amount ?? 0), description: data.description as string | undefined, date: String(data.date ?? ''), isCancelled: Boolean(data.isCancelled), createdAt: ts }
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

      setExchanges(exSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const ts = data.requestedAt instanceof Timestamp ? data.requestedAt.toDate().toISOString() : String(data.requestedAt ?? '')
        return { id: d.id, rewardName: String(data.rewardName ?? ''), requiredPoints: Number(data.requiredPoints ?? 0), status: String(data.status ?? ''), requestedAt: ts }
      }))

      setPets(petsSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return { id: d.id, name: data.name as string | undefined, type: data.type as string | undefined, species: data.species as string | undefined, status: data.status as string | undefined }
      }))
      setSightings(sightingsSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const ts = toDate(data.createdAt)?.toISOString()
        return { id: d.id, description: data.description as string | undefined, createdAt: ts }
      }))
    }).finally(() => setDataLoading(false))
  }, [uid, user, isAdmin])

  const refreshUser = async () => {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) setUserData({ id: snap.id, ...snap.data() })
  }

  const handleBan = async () => {
    const banned = Boolean(userData?.isBanned)
    if (!window.confirm(banned ? 'BANを解除しますか？' : 'このユーザーをBANしますか？')) return
    await updateDoc(doc(db, 'users', uid), { isBanned: !banned })
    setUserData((prev) => prev ? { ...prev, isBanned: !banned } : null)
    alert(banned ? 'BAN解除しました' : 'BANしました')
  }

  const handleReset = async () => {
    if (!window.confirm(
      'このユーザーのデータをすべてリセットします。\n\n' +
      '・ポイント・実績・称号・バッジ（ランキングスコア含む）\n' +
      '・ポイント履歴（期間別ランキング）\n' +
      '・迷子・保護投稿（ペット）\n' +
      '・目撃情報\n' +
      '・通知\n\n' +
      'この操作は元に戻せません。続行しますか？'
    )) return

    try {
      const CHUNK = 400

      // ─── ペット投稿とコメントサブコレクションの削除 ───
      const petsSnap = await getDocs(query(collection(db, 'pets'), where('userId', '==', uid)))
      for (const petDoc of petsSnap.docs) {
        const commentsSnap = await getDocs(collection(db, 'pets', petDoc.id, 'comments'))
        for (let i = 0; i < commentsSnap.docs.length; i += CHUNK) {
          const batch = writeBatch(db)
          commentsSnap.docs.slice(i, i + CHUNK).forEach((c) => batch.delete(c.ref))
          await batch.commit()
        }
        await deleteDoc(petDoc.ref)
      }

      // ─── 目撃情報の削除 ───
      const sightingsSnap = await getDocs(query(collection(db, 'sightings'), where('userId', '==', uid)))
      for (let i = 0; i < sightingsSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        sightingsSnap.docs.slice(i, i + CHUNK).forEach((s) => batch.delete(s.ref))
        await batch.commit()
      }

      // ─── ポイント履歴の削除（期間別ランキングに使用） ───
      const txSnap = await getDocs(query(collection(db, 'point_transactions'), where('userId', '==', uid)))
      for (let i = 0; i < txSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        txSnap.docs.slice(i, i + CHUNK).forEach((t) => batch.delete(t.ref))
        await batch.commit()
      }

      // ─── 通知の削除 ───
      const notifSnap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', uid)))
      for (let i = 0; i < notifSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        notifSnap.docs.slice(i, i + CHUNK).forEach((n) => batch.delete(n.ref))
        await batch.commit()
      }

      // ─── ユーザードキュメントのリセット ───
      const resetFields = {
        points: 0, totalPointsEarned: 0,
        sightingCount: 0, protectedPostCount: 0, bestInfoCount: 0, discoveryCount: 0,
        titles: [], badges: [], selectedTitle: null,
      }
      await updateDoc(doc(db, 'users', uid), resetFields)
      setUserData((prev) => prev ? { ...prev, ...resetFields } : null)
      setPets([])
      setSightings([])
      setTransactions([])

      alert(
        `リセット完了\n` +
        `・ペット投稿: ${petsSnap.docs.length}件削除\n` +
        `・目撃情報: ${sightingsSnap.docs.length}件削除\n` +
        `・ポイント履歴: ${txSnap.docs.length}件削除\n` +
        `・通知: ${notifSnap.docs.length}件削除`
      )
    } catch (err) {
      alert('リセット中にエラーが発生しました: ' + (err as Error).message)
    }
  }

  if (loading || !user || !isAdmin) return null
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }
  if (!userData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/mypage" className="text-sm font-bold" style={{ color: '#C46B00' }}>← 戻る</Link>
        <p className="mt-4 text-gray-500">ユーザーが見つかりません</p>
      </div>
    )
  }

  const displayName = (userData.displayName as string) || '（名前なし）'
  const email = (userData.email as string) || ''
  const points = (userData.points as number) ?? 0
  const totalPointsEarned = (userData.totalPointsEarned as number) ?? 0
  const isBanned = Boolean(userData.isBanned)
  const createdAt = toDate(userData.createdAt)?.toLocaleDateString('ja-JP') ?? '—'

  const TABS = [
    { id: 'points' as const, label: `ポイント履歴 (${transactions.length})` },
    { id: 'exchanges' as const, label: `交換履歴 (${exchanges.length})` },
    { id: 'pets' as const, label: `ペット投稿 (${pets.length})` },
    { id: 'sightings' as const, label: `目撃投稿 (${sightings.length})` },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <Link href="/mypage" className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: '#C46B00' }}>
        ← ユーザー管理に戻る
      </Link>

      {/* プロフィール */}
      <div className="p-5 rounded-2xl bg-white" style={{ border: '1.5px solid #FFE0A0' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black" style={{ color: '#3D2400' }}>{displayName}</h1>
              {isBanned && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFE8E8', color: '#CC3333' }}>BAN</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{email}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">UID: {uid}</p>
            <p className="text-[11px] text-gray-400">{createdAt} 登録</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleBan}
                    className="text-sm px-3 py-1.5 rounded-xl font-bold"
                    style={{ background: isBanned ? '#E8FFE8' : '#FFE8E8', color: isBanned ? '#226622' : '#CC3333' }}>
              {isBanned ? 'BAN解除' : 'BANする'}
            </button>
            <button onClick={handleReset}
                    className="text-sm px-3 py-1.5 rounded-xl font-bold"
                    style={{ background: '#FFE8E8', color: '#CC3333', border: '1px solid #FFCCCC' }}>
              🗑️ データをリセット
            </button>
          </div>
        </div>

        {/* ポイント・実績グリッド */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: '保有pt', value: points.toLocaleString() },
            { label: '累計pt', value: totalPointsEarned.toLocaleString() },
            { label: '目撃', value: `${(userData.sightingCount as number) ?? 0}件` },
            { label: '保護', value: `${(userData.protectedPostCount as number) ?? 0}件` },
            { label: '最有力', value: `${(userData.bestInfoCount as number) ?? 0}回` },
            { label: '発見', value: `${(userData.discoveryCount as number) ?? 0}回` },
          ].map((item) => (
            <div key={item.label} className="p-2 rounded-xl text-center" style={{ background: '#FFF9F0', border: '1px solid #FFE0A0' }}>
              <p className="text-[9px] mb-0.5" style={{ color: '#B08050' }}>{item.label}</p>
              <p className="text-sm font-black" style={{ color: '#5A3A1A' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 履歴タブ */}
      <div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 no-scrollbar">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-all"
                    style={{
                      background: activeTab === t.id ? '#C46B00' : '#FFF3DC',
                      color: activeTab === t.id ? 'white' : '#8B5E1A',
                      border: `1.5px solid ${activeTab === t.id ? '#C46B00' : '#FFD98A'}`,
                    }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ポイント履歴 */}
        {activeTab === 'points' && (
          <div className="space-y-1.5">
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">ポイント履歴なし</p>
            ) : transactions.map((tx) => (
              <div key={tx.id}
                   className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2"
                   style={{ background: 'white', border: '1px solid #FFE0A0', opacity: tx.isCancelled ? 0.5 : 1 }}>
                <div className="min-w-0">
                  <p className="text-xs font-bold" style={{ color: '#3D2400' }}>
                    {(TRANSACTION_TYPE_LABELS as Record<string, string>)[tx.transactionType] ?? tx.transactionType}
                    {tx.isCancelled && <span className="text-red-400 ml-1 font-normal">[取消]</span>}
                  </p>
                  {tx.description && <p className="text-[10px] text-gray-400 truncate">{tx.description}</p>}
                  <p className="text-[10px] text-gray-400">{tx.date}</p>
                </div>
                <span className="text-sm font-black flex-shrink-0" style={{ color: tx.amount >= 0 ? '#C46B00' : '#CC3333' }}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}pt
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 景品交換履歴 */}
        {activeTab === 'exchanges' && (
          <div className="space-y-1.5">
            {exchanges.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">交換履歴なし</p>
            ) : exchanges.map((ex) => (
              <div key={ex.id}
                   className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2"
                   style={{ background: 'white', border: '1px solid #FFE0A0' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#3D2400' }}>{ex.rewardName}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(ex.requestedAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#FFF3DC', color: '#7A4500' }}>
                    {EXCHANGE_STATUS_LABELS[ex.status] ?? ex.status}
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#CC3333' }}>
                    -{ex.requiredPoints}pt
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ペット投稿 */}
        {activeTab === 'pets' && (
          <div className="space-y-1.5">
            {pets.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">ペット投稿なし</p>
            ) : pets.map((pet) => (
              <Link key={pet.id} href={`/posts/${pet.id}`}
                    className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 hover:opacity-75 transition-opacity"
                    style={{ background: 'white', border: '1px solid #FFE0A0', display: 'flex' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#3D2400' }}>{pet.name || '名前なし'}</p>
                  <p className="text-[10px] text-gray-400">
                    {pet.type === 'lost' ? '迷子' : '保護'} / {pet.species} / {pet.status}
                  </p>
                </div>
                <span className="text-gray-300 text-sm flex-shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}

        {/* 目撃情報 */}
        {activeTab === 'sightings' && (
          <div className="space-y-1.5">
            {sightings.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">目撃投稿なし</p>
            ) : sightings.map((s) => (
              <Link key={s.id} href={`/sightings/${s.id}`}
                    className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 hover:opacity-75 transition-opacity"
                    style={{ background: 'white', border: '1px solid #FFE0A0', display: 'flex' }}>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: '#3D2400' }}>{s.description || '説明なし'}</p>
                  {s.createdAt && (
                    <p className="text-[10px] text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 text-sm flex-shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

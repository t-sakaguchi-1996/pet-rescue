'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLoadingState } from '@/contexts/LoadingContext'
import { getAllPointTransactions, cancelPointTransaction } from '@/lib/points'
import { fetchAllRewardExchanges, updateExchangeStatus, fetchAllRewards, updateReward, createReward, seedInitialRewards } from '@/lib/rewards'
import { getDocs, collection, writeBatch, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TRANSACTION_TYPE_LABELS } from '@pet-rescue/shared'
import type { PointTransaction, RewardExchange, Reward, ExchangeStatus, RewardType } from '@pet-rescue/shared'

const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  requested: '申請済み',
  approved: '承認済み',
  shipped: '発送済み',
  completed: '完了',
  cancelled: 'キャンセル',
  rejected: '却下',
}

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  badge: 'バッジ',
  title: '称号',
  sticker: 'ステッカー',
  coupon: 'クーポン',
  donation: '寄付',
  physical_goods: '物品',
}

const STATUS_COLOR: Record<ExchangeStatus, { bg: string; text: string }> = {
  requested: { bg: '#FFF3DC', text: '#C46B00' },
  approved: { bg: '#E8FFE8', text: '#226622' },
  shipped: { bg: '#E8F4FF', text: '#224488' },
  completed: { bg: '#E8FFE8', text: '#226622' },
  cancelled: { bg: '#F0F0F0', text: '#888888' },
  rejected: { bg: '#FFE8E8', text: '#CC3333' },
}

type AdminTab = 'exchanges' | 'points' | 'users' | 'rewards'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { startLoading, stopLoading } = useLoadingState()
  const [tab, setTab] = useState<AdminTab>('exchanges')
  const [exchanges, setExchanges] = useState<RewardExchange[]>([])
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  const [allUsers, setAllUsers] = useState<Record<string, unknown>[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const PAGE_SIZE = 30

  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [editingReward, setEditingReward] = useState<Partial<Reward> | null>(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    setLoading(true)
    startLoading()
    Promise.all([
      fetchAllRewardExchanges(),
      getAllPointTransactions(100),
      fetchAllRewards(),
      getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))).catch(() =>
        getDocs(collection(db, 'users'))
      ),
    ])
      .then(([ex, tx, rw, usersSnap]) => {
        setExchanges(ex)
        setTransactions(tx)
        setRewards(rw)
        setAllUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
      .catch((err) => console.error('Admin load error:', err))
      .finally(() => {
        setLoading(false)
        stopLoading()
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExchangeStatus = async (exchangeId: string, status: ExchangeStatus, note?: string) => {
    startLoading()
    try {
      await updateExchangeStatus(exchangeId, status, note)
      setExchanges((prev) => prev.map((e) => e.id === exchangeId ? { ...e, status } : e))
    } finally {
      stopLoading()
    }
  }

  const handleCancelTransaction = async (txId: string) => {
    if (!cancelReason.trim()) { alert('取り消し理由を入力してください'); return }
    if (!window.confirm(`このポイントトランザクション(${txId})を取り消しますか？`)) return
    if (!user) return
    setCancellingId(txId)
    startLoading()
    try {
      await cancelPointTransaction(txId, cancelReason.trim(), user.uid)
      setTransactions((prev) => prev.map((t) => t.id === txId ? { ...t, isCancelled: true } : t))
      setCancelReason('')
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setCancellingId(null)
      stopLoading()
    }
  }

  const handleResetAllUsers = async () => {
    if (!window.confirm(
      '【全ユーザー】データをリセットします。\n\n' +
      '・全ユーザーのポイント・実績・称号・バッジ（ランキングスコア含む）\n' +
      '・全ポイント履歴（期間別ランキング）\n' +
      '・全ペット投稿（迷子・保護）\n' +
      '・全目撃情報\n' +
      '・全通知\n\n' +
      '⚠️ この操作は元に戻せません。本当に続行しますか？'
    )) return
    if (!window.confirm('最終確認: 全データを削除します。よろしいですか？')) return

    startLoading()
    try {
      const CHUNK = 400

      // ─── 全ペット投稿とコメントサブコレクションを削除 ───
      const petsSnap = await getDocs(collection(db, 'pets'))
      for (const petDoc of petsSnap.docs) {
        const commentsSnap = await getDocs(collection(db, 'pets', petDoc.id, 'comments'))
        for (let i = 0; i < commentsSnap.docs.length; i += CHUNK) {
          const batch = writeBatch(db)
          commentsSnap.docs.slice(i, i + CHUNK).forEach((c) => batch.delete(c.ref))
          await batch.commit()
        }
        await deleteDoc(petDoc.ref)
      }

      // ─── 全目撃情報を削除 ───
      const sightingsSnap = await getDocs(collection(db, 'sightings'))
      for (let i = 0; i < sightingsSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        sightingsSnap.docs.slice(i, i + CHUNK).forEach((s) => batch.delete(s.ref))
        await batch.commit()
      }

      // ─── 全ポイント履歴を削除（期間別ランキングに使用） ───
      const txSnap = await getDocs(collection(db, 'point_transactions'))
      for (let i = 0; i < txSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        txSnap.docs.slice(i, i + CHUNK).forEach((t) => batch.delete(t.ref))
        await batch.commit()
      }

      // ─── 全通知を削除 ───
      const notifSnap = await getDocs(collection(db, 'notifications'))
      for (let i = 0; i < notifSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        notifSnap.docs.slice(i, i + CHUNK).forEach((n) => batch.delete(n.ref))
        await batch.commit()
      }

      // ─── 全ユーザードキュメントをリセット ───
      const usersSnap = await getDocs(collection(db, 'users'))
      for (let i = 0; i < usersSnap.docs.length; i += CHUNK) {
        const batch = writeBatch(db)
        usersSnap.docs.slice(i, i + CHUNK).forEach((d) => {
          batch.update(d.ref, {
            points: 0,
            totalPointsEarned: 0,
            sightingCount: 0,
            protectedPostCount: 0,
            bestInfoCount: 0,
            discoveryCount: 0,
            titles: [],
            badges: [],
            selectedTitle: null,
          })
        })
        await batch.commit()
      }

      alert(
        `リセット完了\n` +
        `・ユーザー: ${usersSnap.docs.length}件リセット\n` +
        `・ペット投稿: ${petsSnap.docs.length}件削除\n` +
        `・目撃情報: ${sightingsSnap.docs.length}件削除\n` +
        `・ポイント履歴: ${txSnap.docs.length}件削除\n` +
        `・通知: ${notifSnap.docs.length}件削除`
      )
    } catch (err) {
      alert('リセット中にエラーが発生しました: ' + (err as Error).message)
    } finally {
      stopLoading()
    }
  }

  const handleSeedRewards = async () => {
    setSeeding(true)
    startLoading()
    try {
      await seedInitialRewards()
      setRewards(await fetchAllRewards())
      alert('初期景品データを追加しました')
    } finally {
      setSeeding(false)
      stopLoading()
    }
  }

  const handleSaveReward = async () => {
    if (!editingReward) return
    startLoading()
    try {
      if (editingReward.id) {
        await updateReward(editingReward.id, editingReward)
      } else {
        await createReward(editingReward as Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>)
      }
      setRewards(await fetchAllRewards())
      setEditingReward(null)
      alert('保存しました')
    } finally {
      stopLoading()
    }
  }

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'exchanges', label: '🎁 交換申請' },
    { id: 'points', label: '⭐ ポイント履歴' },
    { id: 'users', label: '👤 ユーザー管理' },
    { id: 'rewards', label: '📦 景品マスタ' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black" style={{ color: '#3D2400' }}>🔧 管理者ダッシュボード</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: '#FFC96B', color: '#3D2400' }}>
            ADMIN
          </span>
        </div>
        <button
          onClick={handleResetAllUsers}
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: '#FFE8E8', color: '#CC3333', border: '1px solid #FFCCCC' }}
          title="全ユーザーのポイント・実績・称号・バッジ・投稿・目撃情報をリセット"
        >
          🗑️ 全データをリセット
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all"
            style={{
              background: tab === t.id ? '#C46B00' : '#FFF3DC',
              color: tab === t.id ? 'white' : '#8B5E1A',
              border: `1.5px solid ${tab === t.id ? '#C46B00' : '#FFD98A'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400">読み込み中...</p>
      ) : (
        <>
          {/* 交換申請 */}
          {tab === 'exchanges' && (
            <div className="space-y-3">
              <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>
                景品交換申請 ({exchanges.length}件)
              </p>
              {exchanges.length === 0 ? (
                <p className="text-center py-8 text-gray-400">交換申請はありません</p>
              ) : exchanges.map((ex) => {
                const statusLabel = EXCHANGE_STATUS_LABELS[ex.status] ?? ex.status
                const statusStyle = STATUS_COLOR[ex.status] ?? { bg: '#FFF3DC', text: '#7A4500' }
                const typeLabel = ex.rewardType ? REWARD_TYPE_LABELS[ex.rewardType] : ''
                return (
                  <div key={ex.id} className="p-4 rounded-2xl bg-white"
                       style={{ border: '1.5px solid #FFE0A0' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#3D2400' }}>{ex.rewardName}</p>
                        <p className="text-xs text-gray-500">
                          申請者: {ex.userDisplayName || ex.userEmail || ex.userId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ex.requiredPoints.toLocaleString()}pt
                          {typeLabel && ` ・ ${typeLabel}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(ex.requestedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-center"
                              style={{ background: statusStyle.bg, color: statusStyle.text }}>
                          {statusLabel}
                        </span>
                        {ex.status === 'requested' && (
                          <>
                            <button onClick={() => handleExchangeStatus(ex.id, 'approved')}
                                    className="text-xs px-2 py-1 rounded-lg font-bold"
                                    style={{ background: '#E8FFE8', color: '#226622' }}>承認</button>
                            <button onClick={() => handleExchangeStatus(ex.id, 'rejected', '申請を却下しました')}
                                    className="text-xs px-2 py-1 rounded-lg font-bold"
                                    style={{ background: '#FFE8E8', color: '#CC3333' }}>却下</button>
                          </>
                        )}
                        {ex.status === 'approved' && (
                          <button onClick={() => handleExchangeStatus(ex.id, 'shipped')}
                                  className="text-xs px-2 py-1 rounded-lg font-bold"
                                  style={{ background: '#E8F4FF', color: '#224488' }}>発送済みに更新</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ポイント履歴 */}
          {tab === 'points' && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>
                直近のポイント履歴（最大100件）
              </p>
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#FFF3DC' }}>
                <p className="text-xs mb-1 font-bold" style={{ color: '#7A4500' }}>ポイント取り消し</p>
                <input
                  placeholder="取り消し理由"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input-field text-sm w-full"
                />
              </div>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id}
                       className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${tx.isCancelled ? 'opacity-50' : ''}`}
                       style={{ background: 'white', border: '1px solid #FFE0A0' }}>
                    <div>
                      <p className="font-bold" style={{ color: '#3D2400' }}>
                        {TRANSACTION_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                        {tx.isCancelled && ' [取消済]'}
                      </p>
                      <p className="text-gray-500">ユーザーID: {tx.userId}</p>
                      <p className="text-gray-500">{tx.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black" style={{ color: tx.amount >= 0 ? '#C46B00' : '#CC3333' }}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount}pt
                      </span>
                      {!tx.isCancelled && tx.amount > 0 && (
                        <button
                          onClick={() => handleCancelTransaction(tx.id)}
                          disabled={cancellingId === tx.id}
                          className="text-[10px] px-2 py-1 rounded-lg"
                          style={{ background: '#FFE8E8', color: '#CC3333' }}
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ユーザー管理 */}
          {tab === 'users' && (() => {
            const filtered = userSearchQuery
              ? allUsers.filter((u) => {
                  const q = userSearchQuery.toLowerCase()
                  return (u.displayName as string ?? '').toLowerCase().includes(q)
                    || (u.email as string ?? '').toLowerCase().includes(q)
                })
              : allUsers
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
            const pagedUsers = filtered.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE)
            return (
              <div>
                <div className="mb-3">
                  <input
                    placeholder="ユーザー名・メールアドレスで検索"
                    value={userSearchQuery}
                    onChange={(e) => { setUserSearchQuery(e.target.value); setUsersPage(1) }}
                    className="input-field w-full text-sm"
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold" style={{ color: '#5A3A1A' }}>
                    {userSearchQuery ? `検索結果: ${filtered.length}件` : `ユーザー一覧: ${allUsers.length}件`}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button onClick={() => setUsersPage((p) => Math.max(1, p - 1))} disabled={usersPage === 1}
                              className="px-2 py-1 rounded-lg font-bold disabled:opacity-30"
                              style={{ background: '#FFF3DC', color: '#7A4500' }}>‹ 前</button>
                      <span style={{ color: '#5A3A1A' }}>{usersPage} / {totalPages}</span>
                      <button onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))} disabled={usersPage === totalPages}
                              className="px-2 py-1 rounded-lg font-bold disabled:opacity-30"
                              style={{ background: '#FFF3DC', color: '#7A4500' }}>次 ›</button>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {pagedUsers.map((u) => {
                    const uid = u.id as string
                    const name = (u.displayName as string) || '（名前なし）'
                    const email = (u.email as string) || ''
                    const pts = (u.points as number) ?? 0
                    const banned = Boolean(u.isBanned)
                    const createdAt = u.createdAt
                      ? new Date(
                          typeof u.createdAt === 'object' && 'toDate' in (u.createdAt as object)
                            ? (u.createdAt as { toDate: () => Date }).toDate()
                            : String(u.createdAt)
                        ).toLocaleDateString('ja-JP')
                      : '—'
                    return (
                      <Link key={uid} href={`/admin/users/${uid}`}
                            className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-opacity hover:opacity-75"
                            style={{ background: 'white', border: '1px solid #FFE0A0', opacity: banned ? 0.6 : 1, display: 'flex' }}>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#3D2400' }}>
                            {name}
                            {banned && <span className="ml-1 text-[10px] text-red-500 font-normal">[BAN]</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{email}</p>
                          <p className="text-[10px] text-gray-400">{createdAt} 登録 / {pts.toLocaleString()}pt</p>
                        </div>
                        <span className="flex-shrink-0 text-gray-300 text-sm">›</span>
                      </Link>
                    )
                  })}
                  {pagedUsers.length === 0 && (
                    <p className="text-center py-8 text-gray-400 text-sm">
                      {userSearchQuery ? '該当するユーザーが見つかりません' : 'ユーザーがいません'}
                    </p>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                    <button onClick={() => setUsersPage((p) => Math.max(1, p - 1))} disabled={usersPage === 1}
                            className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-30"
                            style={{ background: '#FFF3DC', color: '#7A4500' }}>‹ 前へ</button>
                    <span style={{ color: '#5A3A1A' }}>{usersPage} / {totalPages} ページ</span>
                    <button onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))} disabled={usersPage === totalPages}
                            className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-30"
                            style={{ background: '#FFF3DC', color: '#7A4500' }}>次へ ›</button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 景品マスタ */}
          {tab === 'rewards' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold" style={{ color: '#5A3A1A' }}>景品マスタ ({rewards.length}件)</p>
                <div className="flex gap-2">
                  <button onClick={handleSeedRewards} disabled={seeding}
                          className="text-sm px-3 py-1.5 rounded-xl font-bold"
                          style={{ background: '#FFF3DC', color: '#7A4500', border: '1px solid #FFD98A' }}>
                    {seeding ? '...' : '初期データ追加'}
                  </button>
                  <button
                    onClick={() => setEditingReward({ isActive: true, rewardType: 'coupon', requiredPoints: 1000 })}
                    className="btn-primary text-sm px-3">
                    + 追加
                  </button>
                </div>
              </div>

              {editingReward && (
                <div className="mb-4 p-4 rounded-2xl" style={{ background: '#FFF3DC', border: '1.5px solid #FFD98A' }}>
                  <p className="font-bold text-sm mb-3" style={{ color: '#5A3A1A' }}>
                    {editingReward.id ? '景品を編集' : '景品を追加'}
                  </p>
                  <div className="space-y-2">
                    <input placeholder="名前" value={editingReward.name ?? ''} onChange={(e) => setEditingReward((p) => ({ ...p, name: e.target.value }))} className="input-field text-sm w-full" />
                    <textarea placeholder="説明" value={editingReward.description ?? ''} onChange={(e) => setEditingReward((p) => ({ ...p, description: e.target.value }))} className="input-field text-sm w-full" rows={2} />
                    <div className="flex gap-2">
                      <input type="number" placeholder="必要pt" value={editingReward.requiredPoints ?? 0} onChange={(e) => setEditingReward((p) => ({ ...p, requiredPoints: Number(e.target.value) }))} className="input-field text-sm flex-1" />
                      <select value={editingReward.rewardType ?? 'coupon'} onChange={(e) => setEditingReward((p) => ({ ...p, rewardType: e.target.value as Reward['rewardType'] }))} className="input-field text-sm flex-1">
                        <option value="badge">バッジ</option>
                        <option value="title">称号</option>
                        <option value="sticker">ステッカー</option>
                        <option value="coupon">クーポン</option>
                        <option value="donation">寄付</option>
                        <option value="physical_goods">物品</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" placeholder="在庫（空=無制限）" value={editingReward.stock ?? ''} onChange={(e) => setEditingReward((p) => ({ ...p, stock: e.target.value ? Number(e.target.value) : null }))} className="input-field text-sm flex-1" />
                      <input type="number" placeholder="月上限（空=無制限）" value={editingReward.monthlyExchangeLimit ?? ''} onChange={(e) => setEditingReward((p) => ({ ...p, monthlyExchangeLimit: e.target.value ? Number(e.target.value) : null }))} className="input-field text-sm flex-1" />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editingReward.isActive ?? true} onChange={(e) => setEditingReward((p) => ({ ...p, isActive: e.target.checked }))} />
                      公開中
                    </label>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setEditingReward(null)} className="btn-secondary text-sm flex-1">キャンセル</button>
                    <button onClick={handleSaveReward} className="btn-primary text-sm flex-[2]">保存</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {rewards.map((rw) => (
                  <div key={rw.id} className="p-3 rounded-xl flex items-center justify-between gap-2"
                       style={{ background: 'white', border: '1px solid #FFE0A0', opacity: rw.isActive ? 1 : 0.6 }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#3D2400' }}>{rw.name}</p>
                      <p className="text-xs text-gray-500">
                        {rw.requiredPoints.toLocaleString()}pt / {REWARD_TYPE_LABELS[rw.rewardType] ?? rw.rewardType}
                        {rw.stock !== null && rw.stock !== undefined && ` / 在庫${rw.stock}個`}
                        {rw.monthlyExchangeLimit && ` / 月${rw.monthlyExchangeLimit}回まで`}
                        {!rw.isActive && ' [非公開]'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingReward(rw)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: '#FFF3DC', color: '#7A4500', border: '1px solid #FFD98A' }}>
                      編集
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

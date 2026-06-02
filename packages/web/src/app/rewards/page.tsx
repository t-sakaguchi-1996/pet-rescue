'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { fetchRewards, requestRewardExchange, fetchUserRewardExchanges, seedInitialRewards } from '@/lib/rewards'
import type { Reward, RewardExchange } from '@pet-rescue/shared'

const REWARD_TYPE_EMOJI: Record<string, string> = {
  badge: '🏅',
  title: '🎖️',
  sticker: '🎨',
  coupon: '🎟️',
  donation: '💝',
  physical_goods: '📦',
}

const EXCHANGE_STATUS_LABEL: Record<string, string> = {
  requested: '申請済み',
  approved: '承認済み',
  shipped: '発送済み',
  completed: '受取完了',
  cancelled: 'キャンセル',
  rejected: '却下',
}

const EXCHANGE_STATUS_COLOR: Record<string, string> = {
  requested: '#E8A93A',
  approved: '#2AAA6E',
  shipped: '#4A90D9',
  completed: '#2AAA6E',
  cancelled: '#999',
  rejected: '#CC3333',
}

export default function RewardsPage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [exchanges, setExchanges] = useState<RewardExchange[]>([])
  const [loading, setLoading] = useState(true)
  const [exchanging, setExchanging] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'history'>('list')
  const [seeding, setSeeding] = useState(false)

  const currentPoints = profile?.points ?? 0

  const isDigitalAcquisition = (r: Reward) => r.rewardType === 'badge' || r.rewardType === 'title'
  const alreadyAcquired = (r: Reward) =>
    isDigitalAcquisition(r) &&
    exchanges.some((ex) => ex.rewardId === r.id && (ex.status === 'approved' || ex.status === 'completed'))

  useEffect(() => {
    Promise.all([
      fetchRewards(),
      user ? fetchUserRewardExchanges(user.uid) : Promise.resolve([]),
    ])
      .then(([r, e]) => {
        setRewards(r)
        setExchanges(e)
      })
      .finally(() => setLoading(false))
  }, [user])

  const handleExchange = async (reward: Reward) => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (currentPoints < reward.requiredPoints) {
      alert(`貢献ポイントが不足しています（必要: ${reward.requiredPoints}pt、保有: ${currentPoints}pt）`)
      return
    }
    const isDigital = isDigitalAcquisition(reward)
    const confirmMsg = isDigital
      ? `「${reward.name}」を取得しますか？\n※ ポイントは消費されません。`
      : `「${reward.name}」と交換しますか？\n${reward.requiredPoints}pt が消費されます。`
    if (!window.confirm(confirmMsg)) return

    setExchanging(reward.id)
    try {
      const result = await requestRewardExchange(user.uid, reward.id)
      if (result.success) {
        await refreshProfile()
        const updated = await fetchUserRewardExchanges(user.uid)
        setExchanges(updated)
        const successMsg = isDigital
          ? '取得しました！マイページの「称号・バッジ」タブで確認できます。'
          : '交換申請を受け付けました。マイページで申請状況を確認できます。'
        alert(successMsg)
        setTab('history')
      } else {
        alert(result.error ?? '取得に失敗しました')
      }
    } catch {
      alert('処理に失敗しました。もう一度お試しください。')
    } finally {
      setExchanging(null)
    }
  }

  const handleSeedRewards = async () => {
    setSeeding(true)
    try {
      await seedInitialRewards()
      const updated = await fetchRewards()
      setRewards(updated)
      alert('初期景品データを追加しました')
    } catch {
      alert('初期化に失敗しました')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: '#3D2400' }}>🎁 貢献特典</h1>
        <p className="text-sm" style={{ color: '#8B6340' }}>
          捜索協力で貯めた貢献ポイントを特典と交換できます
        </p>
      </div>

      {/* ポイント残高 */}
      {user ? (
        <div className="mb-5 p-4 rounded-2xl flex items-center gap-3"
             style={{ background: 'linear-gradient(135deg, #FFF3DC, #FFECC0)', border: '1.5px solid #FFD98A' }}>
          <span className="text-3xl">⭐</span>
          <div>
            <p className="text-xs font-bold" style={{ color: '#7A4500' }}>現在の保有ポイント</p>
            <p className="text-2xl font-black" style={{ color: '#C46B00' }}>
              {currentPoints.toLocaleString()}<span className="text-sm ml-1">pt</span>
            </p>
          </div>
          <Link href="/mypage" className="ml-auto text-xs underline" style={{ color: '#C46B00' }}>
            履歴を見る
          </Link>
        </div>
      ) : (
        <div className="mb-5 p-4 rounded-2xl text-center"
             style={{ background: '#FFF9F0', border: '1.5px dashed #FFD98A' }}>
          <p className="text-sm font-bold mb-2" style={{ color: '#7A4500' }}>
            交換するにはログインが必要です
          </p>
          <Link href="/auth/login" className="text-sm font-bold underline" style={{ color: '#C46B00' }}>
            ログイン / 新規登録
          </Link>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-2 mb-5">
        {(['list', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl font-bold text-sm transition-all"
            style={{
              background: tab === t ? '#C46B00' : '#FFF3DC',
              color: tab === t ? 'white' : '#8B5E1A',
              border: `1.5px solid ${tab === t ? '#C46B00' : '#FFD98A'}`,
            }}
          >
            {t === 'list' ? '🎁 特典一覧' : '📋 交換履歴'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#FFF3DC' }} />
          ))}
        </div>
      ) : tab === 'list' ? (
        <>
          {rewards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">🎁</p>
              <p className="text-sm mb-4" style={{ color: '#8B6340' }}>特典がまだ登録されていません</p>
              {user && (
                <button
                  onClick={handleSeedRewards}
                  disabled={seeding}
                  className="text-sm font-bold px-4 py-2 rounded-xl"
                  style={{ background: '#FFF3DC', color: '#7A4500', border: '1px solid #FFD98A' }}
                >
                  {seeding ? '初期化中...' : '初期特典データを追加する'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const isDigital = isDigitalAcquisition(reward)
                const acquired = alreadyAcquired(reward)
                const canAct = user && currentPoints >= reward.requiredPoints && !acquired
                const emoji = REWARD_TYPE_EMOJI[reward.rewardType] ?? '🎁'
                const isHighValue = reward.requiredPoints >= 10000

                return (
                  <div
                    key={reward.id}
                    className="p-4 rounded-2xl"
                    style={{
                      background: 'white',
                      border: isHighValue ? '2px solid #FFD700' : '1.5px solid #FFE0A0',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: '#3D2400' }}>
                            {reward.name}
                          </p>
                          {isDigital && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: '#E8FFE8', color: '#226622', border: '1px solid #B2DFDB' }}>
                              ポイント消費なし
                            </span>
                          )}
                          {isHighValue && !isDigital && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: '#FFD700', color: '#3D2400' }}>
                              月1回
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: '#8B6340' }}>
                          {reward.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-lg font-black" style={{ color: '#C46B00' }}>
                            {reward.requiredPoints.toLocaleString()}pt
                          </span>
                          <span className="text-[10px]" style={{ color: '#B08050' }}>
                            {isDigital ? '以上で取得可能' : '消費'}
                          </span>
                          {!isDigital && reward.stock !== null && reward.stock !== undefined && (
                            <span className="text-xs" style={{ color: reward.stock <= 5 ? '#CC3333' : '#8B6340' }}>
                              残り {reward.stock} 個
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleExchange(reward)}
                        disabled={!canAct || exchanging === reward.id || (!isDigital && reward.stock !== null && reward.stock !== undefined && reward.stock <= 0)}
                        className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                        style={{
                          background: acquired ? '#E8FFE8' : canAct ? '#FFC96B' : '#FFF3DC',
                          color: acquired ? '#226622' : canAct ? '#3D2400' : '#B08050',
                          border: `1px solid ${acquired ? '#B2DFDB' : '#FFD98A'}`,
                        }}
                      >
                        {exchanging === reward.id
                          ? '処理中...'
                          : acquired
                            ? '取得済み'
                            : isDigital ? '取得する' : '交換する'}
                      </button>
                    </div>
                    {user && !canAct && !acquired && (
                      <p className="text-[10px] mt-1.5" style={{ color: '#B08050' }}>
                        あと {(reward.requiredPoints - currentPoints).toLocaleString()}pt
                        {isDigital ? ' 以上で取得可能' : ' で交換可能'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ポイント獲得案内 */}
          <div className="mt-6 p-4 rounded-2xl"
               style={{ background: '#FFF9F0', border: '1.5px dashed #FFD98A' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#7A4500' }}>貢献ポイントの獲得方法</p>
            <ul className="space-y-1 text-xs" style={{ color: '#8B6340' }}>
              <li>👁️ 目撃情報を投稿する → <strong>+2pt</strong>（1日最大10pt）</li>
              <li>🤝 保護した子を報告する → <strong>+10pt</strong>（1日最大20pt）</li>
              <li>⭐ コメント・目撃情報が最有力情報に選ばれる → <strong>+100pt</strong></li>
              <li>🎉 提供情報が実際の発見につながる → <strong>さらに+300pt</strong></li>
            </ul>
            <p className="text-[10px] mt-2" style={{ color: '#C8A87A' }}>
              ※ 貢献ポイントは捜索協力実績の可視化のための指標です
            </p>
          </div>
        </>
      ) : (
        /* 交換履歴タブ */
        <div>
          {!user ? (
            <p className="text-center text-sm py-8" style={{ color: '#8B6340' }}>
              ログインして交換履歴を確認してください
            </p>
          ) : exchanges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">📋</p>
              <p className="text-sm" style={{ color: '#8B6340' }}>交換履歴はまだありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exchanges.map((ex) => {
                const isDigital = ex.rewardType === 'badge' || ex.rewardType === 'title'
                const dateLabel = isDigital ? '取得日' : '申請日'
                const ptLabel = isDigital ? '消費なし' : `${ex.requiredPoints.toLocaleString()}pt`
                const statusLabel = isDigital && ex.status === 'approved' ? '取得済み' : (EXCHANGE_STATUS_LABEL[ex.status] ?? ex.status)
                const statusColor = isDigital && ex.status === 'approved' ? '#226622' : (EXCHANGE_STATUS_COLOR[ex.status] ?? '#888')
                return (
                  <div key={ex.id} className="p-4 rounded-2xl"
                       style={{ background: 'white', border: '1.5px solid #FFE0A0' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#3D2400' }}>{ex.rewardName}</p>
                        <p className="text-xs mt-0.5" style={{ color: isDigital ? '#226622' : '#8B6340' }}>
                          {ptLabel}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#C8A87A' }}>
                          {dateLabel}: {new Date(ex.requestedAt).toLocaleDateString('ja-JP')}
                        </p>
                        {ex.adminNote && (
                          <p className="text-xs mt-1 p-2 rounded-lg" style={{ background: '#FFF3DC', color: '#7A4500' }}>
                            📝 {ex.adminNote}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                        style={{
                          background: `${statusColor}20`,
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

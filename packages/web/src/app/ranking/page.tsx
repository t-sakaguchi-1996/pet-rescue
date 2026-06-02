'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { fetchRanking, findUserRank, RANKING_TYPE_LABELS, RANKING_SCORE_UNIT } from '@/lib/rankings'
import { getTitleName, getBadgeDefinition } from '@/lib/titles'
import type { RankingEntry, RankingType } from '@pet-rescue/shared'

const RANKING_TABS: { type: RankingType; label: string; emoji: string }[] = [
  { type: 'total_points', label: '総合ポイント', emoji: '🏆' },
  { type: 'monthly_points', label: '今月', emoji: '📅' },
  { type: 'weekly_points', label: '今週', emoji: '🔥' },
  { type: 'sighting_count', label: '目撃投稿', emoji: '👁️' },
  { type: 'protection_count', label: '保護投稿', emoji: '🤝' },
  { type: 'best_info_count', label: '最有力情報', emoji: '⭐' },
  { type: 'discovery_count', label: '発見貢献', emoji: '🎉' },
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function RankingPage() {
  const { user, profile } = useAuth()
  const [activeType, setActiveType] = useState<RankingType>('total_points')
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<number | null>(null)

  const needsAuth = activeType === 'monthly_points' || activeType === 'weekly_points'

  useEffect(() => {
    if (needsAuth && !user) {
      setEntries([])
      setMyRank(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchRanking(activeType, user?.uid)
      .then((data) => {
        setEntries(data.slice(0, 50))
        if (user?.uid) setMyRank(findUserRank(data, user.uid))
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [activeType, user?.uid, needsAuth])

  const unit = RANKING_SCORE_UNIT[activeType]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: '#3D2400' }}>
          🏆 貢献ランキング
        </h1>
        <p className="text-sm" style={{ color: '#8B6340' }}>
          迷子ペット捜索に協力しているユーザーを見えるようにします
        </p>
      </div>

      {/* マイランク（ログイン中） */}
      {user && myRank !== null && (
        <div className="mb-5 p-4 rounded-2xl flex items-center gap-3"
             style={{ background: 'linear-gradient(135deg, #FFF3DC, #FFECC0)', border: '2px solid #FFD98A' }}>
          <div className="text-3xl font-black" style={{ color: '#C46B00' }}>#{myRank}</div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#7A4500' }}>あなたの順位</p>
            <p className="text-xs" style={{ color: '#B08050' }}>{RANKING_TYPE_LABELS[activeType]}</p>
          </div>
          <div className="ml-auto text-right">
            <Link href="/mypage" className="text-xs font-bold underline" style={{ color: '#C46B00' }}>
              マイページで詳細を確認
            </Link>
          </div>
        </div>
      )}
      {user && myRank === null && (
        <div className="mb-5 p-3 rounded-2xl text-center"
             style={{ background: '#FFF9F0', border: '1.5px dashed #FFD98A' }}>
          <p className="text-xs" style={{ color: '#B08050' }}>
            このランキングにはまだ参加していません。
            <Link href="/sightings/new" className="underline ml-1" style={{ color: '#C46B00' }}>目撃情報を投稿する</Link>
          </p>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {RANKING_TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveType(tab.type)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: activeType === tab.type ? '#C46B00' : '#FFF3DC',
              color: activeType === tab.type ? 'white' : '#8B5E1A',
              border: `1.5px solid ${activeType === tab.type ? '#C46B00' : '#FFD98A'}`,
            }}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ランキングリスト */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#FFF3DC' }} />
          ))}
        </div>
      ) : needsAuth && !user ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-bold mb-2" style={{ color: '#5A3A1A' }}>ログインが必要です</p>
          <p className="text-sm mb-4" style={{ color: '#8B6340' }}>期間別ランキングは会員のみ閲覧できます</p>
          <Link href="/auth/login"
                className="inline-flex font-bold text-sm px-6 py-2 rounded-full"
                style={{ background: '#FFC96B', color: '#3D2400' }}>
            ログインして見る
          </Link>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📊</div>
          <p style={{ color: '#8B6340' }}>まだデータがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isMe = entry.isCurrentUser
            const medal = RANK_MEDALS[i] ?? null
            const titleName = entry.selectedTitle ? getTitleName(entry.selectedTitle) : null

            return (
              <div
                key={entry.userId}
                className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                style={{
                  background: isMe
                    ? 'linear-gradient(135deg, #FFF3DC, #FFECC0)'
                    : 'white',
                  border: isMe ? '2px solid #FFD98A' : '1.5px solid #FFE0A0',
                }}
              >
                {/* 順位 */}
                <div className="w-8 text-center flex-shrink-0">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: '#B08050' }}>
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* アバター */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                     style={{ background: '#FFE0A0' }}>
                  {entry.photoURL ? (
                    <Image src={entry.photoURL} alt={entry.displayName} width={40} height={40}
                           className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-base font-bold" style={{ color: '#5A3A1A' }}>
                      {entry.displayName.charAt(0)}
                    </span>
                  )}
                </div>

                {/* 名前・称号・バッジ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm font-bold truncate" style={{ color: '#3D2400' }}>
                      {entry.displayName}
                      {isMe && <span className="ml-1 text-xs" style={{ color: '#C46B00' }}>(あなた)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {titleName && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: '#FFC96B', color: '#3D2400' }}>
                        {titleName}
                      </span>
                    )}
                    {entry.badges?.slice(0, 3).map((badgeId) => {
                      const b = getBadgeDefinition(badgeId)
                      return b ? (
                        <span key={badgeId} title={b.name} className="text-sm">{b.emoji}</span>
                      ) : null
                    })}
                    {entry.prefecture && (
                      <span className="text-[10px]" style={{ color: '#B08050' }}>
                        📍 {entry.prefecture}
                      </span>
                    )}
                  </div>
                </div>

                {/* スコア */}
                <div className="text-right flex-shrink-0">
                  <span className="text-base font-black" style={{ color: '#C46B00' }}>
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-xs ml-0.5" style={{ color: '#B08050' }}>{unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ランキング非表示への誘導 */}
      {user && (
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: '#B08050' }}>
            ランキングに表示したくない場合は
            <Link href="/mypage" className="underline ml-1" style={{ color: '#C46B00' }}>
              マイページの設定
            </Link>
            から変更できます
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 p-5 rounded-2xl text-center"
           style={{ background: 'linear-gradient(135deg, #FFF3DC, #FFECC0)', border: '1.5px solid #FFD98A' }}>
        <p className="text-sm font-bold mb-2" style={{ color: '#7A4500' }}>
          捜索に協力して貢献ポイントを獲得しよう
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/sightings/new"
                className="text-xs font-bold px-4 py-2 rounded-full"
                style={{ background: '#FFC96B', color: '#3D2400' }}>
            👁️ 目撃情報を投稿（+2pt）
          </Link>
          <Link href="/rewards"
                className="text-xs font-bold px-4 py-2 rounded-full"
                style={{ background: 'white', color: '#C46B00', border: '1px solid #FFD98A' }}>
            🎁 貢献特典を見る
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getTitleName, getBadgeDefinition } from '@/lib/titles'
import { BADGE_DEFINITIONS, TITLE_DEFINITIONS } from '@pet-rescue/shared'

interface PublicProfile {
  displayName: string
  photoURL?: string
  points?: number
  totalPointsEarned?: number
  selectedTitle?: string
  titles?: string[]
  badges?: string[]
  sightingCount?: number
  protectedPostCount?: number
  bestInfoCount?: number
  discoveryCount?: number
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'users', id))
      .then((snap) => {
        if (!snap.exists()) { setNotFound(true); return }
        const d = snap.data()
        const name = (d.displayName as string) ?? 'ユーザー'
        document.title = `${name}さんのプロフィール | ANIMAL GO`
        setProfile({
          displayName: (d.displayName as string) ?? 'ユーザー',
          photoURL: d.photoURL as string | undefined,
          points: d.points as number | undefined,
          totalPointsEarned: d.totalPointsEarned as number | undefined,
          selectedTitle: d.selectedTitle as string | undefined,
          titles: (d.titles as string[]) ?? [],
          badges: (d.badges as string[]) ?? [],
          sightingCount: d.sightingCount as number | undefined,
          protectedPostCount: d.protectedPostCount as number | undefined,
          bestInfoCount: d.bestInfoCount as number | undefined,
          discoveryCount: d.discoveryCount as number | undefined,
        })
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">ユーザーが見つかりません</p>
        <button onClick={() => router.back()} className="btn-secondary text-sm">戻る</button>
      </div>
    )
  }

  const initial = profile.displayName.charAt(0).toUpperCase()
  const titleName = profile.selectedTitle ? getTitleName(profile.selectedTitle) : null
  const earnedTitles = profile.titles ?? []
  const earnedBadges = profile.badges ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
        ← 戻る
      </button>
      <h1 className="text-lg font-black mb-5" style={{ color: '#3D2400' }}>
        {profile.displayName}さんのプロフィール
      </h1>

      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center flex-shrink-0">
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt={profile.displayName} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <span className="text-3xl font-bold text-amber-500">{initial}</span>
            )}
          </div>
          <div>
            <p className="font-black text-xl" style={{ color: '#3D2400' }}>{profile.displayName}</p>
            {titleName && (
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1"
                    style={{ background: '#FFC96B', color: '#3D2400' }}>
                {titleName}
              </span>
            )}
            {earnedBadges.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1.5">
                {earnedBadges.slice(0, 5).map((bid) => {
                  const b = getBadgeDefinition(bid)
                  return b ? <span key={bid} title={b.name} className="text-lg">{b.emoji}</span> : null
                })}
                {earnedBadges.length > 5 && (
                  <span className="text-xs" style={{ color: '#B08050' }}>+{earnedBadges.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ポイントサマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: '保有ポイント', value: `${(profile.points ?? 0).toLocaleString()}pt`, emoji: '⭐', color: '#C46B00' },
          { label: '累計獲得', value: `${(profile.totalPointsEarned ?? 0).toLocaleString()}pt`, emoji: '📈', color: '#8B5E1A' },
          { label: '目撃投稿', value: `${profile.sightingCount ?? 0}件`, emoji: '👁️', color: '#5A8A3A' },
          { label: '最有力情報', value: `${profile.bestInfoCount ?? 0}回`, emoji: '⭐', color: '#4A6FA5' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-2xl text-center bg-white" style={{ border: '1.5px solid #FFE0A0' }}>
            <div className="text-xl mb-1">{item.emoji}</div>
            <p className="text-[10px] mb-0.5" style={{ color: '#B08050' }}>{item.label}</p>
            <p className="text-base font-black" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 活動実績 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: '保護投稿', value: profile.protectedPostCount ?? 0, unit: '件', emoji: '🤝' },
          { label: '発見貢献', value: profile.discoveryCount ?? 0, unit: '回', emoji: '🎉' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-2xl text-center"
               style={{ background: '#FFF9F0', border: '1.5px solid #FFE0A0' }}>
            <div className="text-xl mb-1">{item.emoji}</div>
            <p className="text-[10px] mb-0.5" style={{ color: '#B08050' }}>{item.label}</p>
            <p className="text-lg font-black" style={{ color: '#5A3A1A' }}>
              {item.value}<span className="text-xs ml-0.5">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 称号一覧 */}
      {earnedTitles.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-5" style={{ border: '1.5px solid #FFE0A0' }}>
          <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>🎖️ 取得済み称号</p>
          <div className="flex flex-wrap gap-2">
            {TITLE_DEFINITIONS.filter((t) => earnedTitles.includes(t.id)).map((t) => (
              <span key={t.id}
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      background: profile.selectedTitle === t.id ? '#FFC96B' : '#FFF3DC',
                      color: '#7A4500',
                      border: `1px solid ${profile.selectedTitle === t.id ? '#C46B00' : '#FFD98A'}`,
                    }}>
                {profile.selectedTitle === t.id ? `⭐ ${t.name}` : t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* バッジ一覧 */}
      {earnedBadges.length > 0 && (
        <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #FFE0A0' }}>
          <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>🏅 取得済みバッジ</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.id)).map((b) => (
              <div key={b.id} className="p-2 rounded-xl text-center bg-white"
                   style={{ border: '1.5px solid #FFE0A0' }}>
                <div className="text-2xl mb-1">{b.emoji}</div>
                <p className="text-[10px] font-bold" style={{ color: '#3D2400' }}>{b.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

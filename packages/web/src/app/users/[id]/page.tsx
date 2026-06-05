'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getTitleName, getBadgeDefinition } from '@/lib/titles'
import { BADGE_DEFINITIONS, SPECIES_LABELS, TYPE_LABELS } from '@pet-rescue/shared'
import type { Pet, Sighting } from '@pet-rescue/shared'

interface PublicProfile {
  displayName: string
  photoURL?: string
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
  const [pets, setPets] = useState<Pet[]>([])
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getDoc(doc(db, 'users', id)),
      getDocs(query(collection(db, 'pets'), where('userId', '==', id), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'sightings'), where('userId', '==', id), orderBy('createdAt', 'desc'), limit(20))),
    ])
      .then(([userSnap, petsSnap, sightingsSnap]) => {
        if (!userSnap.exists()) { setNotFound(true); return }
        const d = userSnap.data()
        const name = (d.displayName as string) ?? 'ユーザー'
        document.title = `${name}さんのプロフィール | ANIMAL GO`
        setProfile({
          displayName: name,
          photoURL: d.photoURL as string | undefined,
          selectedTitle: d.selectedTitle as string | undefined,
          titles: (d.titles as string[]) ?? [],
          badges: (d.badges as string[]) ?? [],
          sightingCount: d.sightingCount as number | undefined,
          protectedPostCount: d.protectedPostCount as number | undefined,
          bestInfoCount: d.bestInfoCount as number | undefined,
          discoveryCount: d.discoveryCount as number | undefined,
        })
        setPets(petsSnap.docs.map((d) => {
          const data = d.data()
          return { id: d.id, ...data } as unknown as Pet
        }))
        setSightings(sightingsSnap.docs.map((d) => {
          const data = d.data()
          return { id: d.id, ...data } as unknown as Sighting
        }))
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
  const earnedBadges = profile.badges ?? []

  const stats = [
    { label: '目撃投稿', value: profile.sightingCount ?? 0, unit: '件', emoji: '👁️' },
    { label: '保護投稿', value: profile.protectedPostCount ?? 0, unit: '件', emoji: '🤝' },
    { label: '最有力情報', value: profile.bestInfoCount ?? 0, unit: '回', emoji: '⭐' },
    { label: '発見貢献', value: profile.discoveryCount ?? 0, unit: '回', emoji: '🎉' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
        ← 戻る
      </button>

      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5" style={{ border: '1.5px solid #FFE0A0' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
               style={{ background: '#FFE0A0' }}>
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt={profile.displayName} width={64} height={64}
                     className="object-cover w-full h-full" />
            ) : (
              <span className="text-2xl font-bold" style={{ color: '#7A4500' }}>{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg" style={{ color: '#3D2400' }}>{profile.displayName}</p>
            {titleName && (
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1"
                    style={{ background: '#FFC96B', color: '#3D2400' }}>
                🏅 {titleName}
              </span>
            )}
            {earnedBadges.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1.5">
                {earnedBadges.slice(0, 6).map((bid) => {
                  const b = getBadgeDefinition(bid)
                  return b ? <span key={bid} title={b.name} className="text-base">{b.emoji}</span> : null
                })}
                {earnedBadges.length > 6 && (
                  <span className="text-xs" style={{ color: '#B08050' }}>+{earnedBadges.length - 6}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4つの実績 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map((item) => (
          <div key={item.label} className="p-3 rounded-2xl text-center bg-white"
               style={{ border: '1.5px solid #FFE0A0' }}>
            <div className="text-2xl mb-1">{item.emoji}</div>
            <p className="text-[10px] mb-0.5" style={{ color: '#B08050' }}>{item.label}</p>
            <p className="text-lg font-black" style={{ color: '#5A3A1A' }}>
              {item.value.toLocaleString()}
              <span className="text-xs font-normal ml-0.5">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* バッジ */}
      {earnedBadges.length > 0 && (
        <div className="bg-white rounded-2xl p-4 mb-5" style={{ border: '1.5px solid #FFE0A0' }}>
          <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>🏅 取得済みバッジ</p>
          <div className="flex flex-wrap gap-2">
            {BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.id)).map((b) => (
              <div key={b.id} className="flex items-center gap-1.5 px-2 py-1 rounded-xl"
                   style={{ background: '#FFF9F0', border: '1px solid #FFE0A0' }}>
                <span className="text-lg">{b.emoji}</span>
                <span className="text-[10px] font-bold" style={{ color: '#5A3A1A' }}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 投稿情報 */}
      <div className="space-y-5">
        {/* 迷子・保護投稿 */}
        {pets.length > 0 && (
          <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #FFE0A0' }}>
            <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>
              🐾 投稿一覧（{pets.length}件）
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pets.map((pet) => (
                <Link key={pet.id} href={`/posts/${pet.id}`}
                      className="block rounded-xl overflow-hidden hover:opacity-80 transition-opacity"
                      style={{ border: '1px solid #FFE0A0' }}>
                  <div className="aspect-square relative bg-gray-100">
                    {pet.images?.[0] ? (
                      <Image src={pet.images[0]} alt={pet.name || 'ペット'} fill sizes="160px"
                             className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl"
                           style={{ background: '#FFF3DC' }}>
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: pet.type === 'lost' ? '#ef4444' : '#3b82f6',
                            color: '#fff',
                          }}>
                      {TYPE_LABELS[pet.type]}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold truncate" style={{ color: '#3D2400' }}>
                      {pet.name || '名前不明'}
                    </p>
                    <p className="text-[10px]" style={{ color: '#9ca3af' }}>
                      {SPECIES_LABELS[pet.species]}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 目撃情報 */}
        {sightings.length > 0 && (
          <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #FFE0A0' }}>
            <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>
              👁️ 目撃情報（{sightings.length}件）
            </p>
            <div className="space-y-2">
              {sightings.map((s) => (
                <Link key={s.id} href={`/sightings/${s.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: '#FFFAF0', border: '1px solid #FFE0A0' }}>
                  {s.photos?.[0] ? (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image src={s.photos[0]} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center text-xl"
                         style={{ background: '#FFF3DC' }}>
                      👁️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: '#3D2400' }}>{s.title}</p>
                    <p className="text-[10px]" style={{ color: '#9B8060' }}>
                      📍 {s.location?.prefecture} {s.location?.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {pets.length === 0 && sightings.length === 0 && (
          <div className="text-center py-8" style={{ color: '#9B8060' }}>
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">投稿はまだありません</p>
          </div>
        )}
      </div>
    </div>
  )
}

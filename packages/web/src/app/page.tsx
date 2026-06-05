'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PetCard from '@/components/PetCard'
import SightingCard from '@/components/SightingCard'
import SearchFilter from '@/components/SearchFilter'
import { fetchPets, fetchOwnerNames } from '@/lib/firestore'
import { fetchSightingsFiltered } from '@/lib/sightings'
import type { Pet, Sighting } from '@pet-rescue/shared'
import { useSearchParams } from 'next/navigation'

type ListItem = { kind: 'pet'; data: Pet } | { kind: 'sighting'; data: Sighting } | { kind: 'found'; data: Sighting }

function HomeContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const paramsKey = searchParams.toString()
  const fetchRef = useRef(paramsKey)

  const params = {
    type:       searchParams.get('type')       ?? '',
    species:    searchParams.get('species')    ?? undefined,
    prefecture: searchParams.get('prefecture') ?? undefined,
    city:       searchParams.get('city')       ?? undefined,
    status:     searchParams.get('status')     ?? undefined,
  }

  const loadItems = () => {
    setLoading(true)
    setError(null)

    type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other' | undefined
    const species = params.species as Species
    const status = (params.status as 'searching' | 'protected' | 'resolved') ?? 'searching'

    const fetchLost = params.type === '' || params.type === 'lost'
      ? fetchPets({ type: 'lost', species, prefecture: params.prefecture, city: params.city, status, limitCount: 50 })
          .then(async (fetched) => {
            const needsName = fetched.filter((p) => !p.ownerDisplayName)
            if (needsName.length === 0) return fetched
            const ids = [...new Set(needsName.map((p) => p.userId))]
            const names = await fetchOwnerNames(ids)
            return fetched.map((p) => ({ ...p, ownerDisplayName: p.ownerDisplayName ?? names.get(p.userId) }))
          })
      : Promise.resolve([] as Pet[])

    const fetchSightings = params.type === '' || params.type === 'sighting'
      ? fetchSightingsFiltered({ sightingType: 'sighting', species, prefecture: params.prefecture, city: params.city, limitCount: 50 })
      : Promise.resolve([] as Sighting[])

    const fetchFound = params.type === '' || params.type === 'found'
      ? fetchSightingsFiltered({ sightingType: 'found', species, prefecture: params.prefecture, city: params.city, limitCount: 50 })
      : Promise.resolve([] as Sighting[])

    Promise.all([fetchLost, fetchSightings, fetchFound])
      .then(([pets, sightings, foundSightings]) => {
        const merged: ListItem[] = [
          ...pets.map((p): ListItem => ({ kind: 'pet', data: p })),
          ...sightings.map((s): ListItem => ({ kind: 'sighting', data: s })),
          ...foundSightings.map((s): ListItem => ({ kind: 'found', data: s })),
        ]
        merged.sort((a, b) =>
          new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
        )
        setItems(merged)
      })
      .catch((err: Error) => setError(err.message ?? 'データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRef.current = paramsKey
    loadItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadItems()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">

      {/* ═══ ヒーロー ═══ */}
      <div className="overflow-hidden mb-6 rounded-3xl" style={{ border: '1.5px solid #FFD98A' }}>
        <div className="px-6 pt-8 pb-5 sm:px-12 sm:pt-10 sm:pb-7 text-center"
             style={{ background: 'linear-gradient(160deg, #FFF3DC 0%, #FFECC0 100%)' }}>
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                style={{ background: 'rgba(255,255,255,0.65)', color: '#7A4500' }}>
            🐾 みんなで探す・協力者にもメリットがあるプラットフォーム
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-snug"
              style={{ color: '#3D2400' }}>
            ANIMAL GO
          </h1>
          <p className="mt-2 text-base sm:text-lg font-bold" style={{ color: '#7A4500' }}>
            迷子ペットを、みんなの力で見つけよう
          </p>
          <p className="mt-2 text-sm sm:text-base max-w-md mx-auto" style={{ color: '#6B4200' }}>
            目撃情報を投稿するとポイントが貯まります。<br className="hidden sm:block" />
            有力情報が選ばれると大きくポイントアップ！
          </p>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
            <Link href="/sightings/new"
                  className="inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-full transition-all active:scale-95"
                  style={{ background: '#FFC96B', color: '#3D2400', boxShadow: '0 4px 14px rgba(255,201,107,0.5)' }}>
              👁️ 目撃情報を投稿（+2pt）
            </Link>
            <Link href="/posts/new?type=lost"
                  className="inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-full transition-all active:scale-95"
                  style={{ background: 'white', color: '#C46B00', border: '1.5px solid #FFD98A' }}>
              🔍 迷子を報告する
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3">
          {[
            { src: '/images/pet-shiba.jpg',        alt: '柴犬' },
            { src: '/images/pet-scottish-fold.jpg', alt: 'スコティッシュフォールド' },
            { src: '/images/pet-hero.jpg',          alt: 'ペット' },
          ].map((img, i) => (
            <div key={i} className="relative aspect-square"
                 style={{ borderLeft: i > 0 ? '2px solid rgba(255,255,255,0.6)' : 'none' }}>
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="33vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ポイントシステム紹介 ═══ */}
      <div className="mb-6 rounded-3xl p-5 sm:p-6"
           style={{ background: 'linear-gradient(135deg, #FFF3DC, #FFECC0)', border: '1.5px solid #FFD98A' }}>
        <h2 className="text-center font-black text-base sm:text-lg mb-4" style={{ color: '#3D2400' }}>
          ⭐ 協力するほどポイントが貯まる
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              emoji: '👁️',
              title: '目撃情報を投稿',
              desc: '見かけたペット情報を投稿するだけで +2pt！1日最大10ptまで獲得できます',
              badge: '+2pt',
              badgeColor: '#FFC96B',
            },
            {
              emoji: '💬',
              title: '有力コメントが選ばれると',
              desc: '迷子投稿にコメントし「最有力情報」に選ばれたら大幅ポイントアップ！',
              badge: '+100pt',
              badgeColor: '#FFB830',
            },
            {
              emoji: '🔗',
              title: '未登録でも後から紐づけOK',
              desc: '登録なしで投稿→会員登録時に同じメールで自動紐づけ。ポイントも受け取れます',
              badge: '後付けOK',
              badgeColor: '#E8A93A',
            },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-4 text-center"
                 style={{ border: '1px solid #FFE8A0' }}>
              <div className="text-3xl mb-2">{item.emoji}</div>
              <span className="inline-block text-xs font-black px-2 py-0.5 rounded-full mb-2"
                    style={{ background: item.badgeColor, color: '#3D2400' }}>
                {item.badge}
              </span>
              <p className="text-xs font-bold mb-1" style={{ color: '#3D2400' }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: '#8B6340' }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/sightings/new"
                className="flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.99]"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px dashed #FFD98A' }}>
            <div className="text-3xl flex-shrink-0">👁️</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#7A4500' }}>
                ペットを見かけたら目撃情報を投稿しよう！
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#B08050' }}>
                投稿するだけで +2pt 獲得。登録なしでも投稿できます
              </p>
            </div>
            <span className="font-black text-sm flex-shrink-0" style={{ color: '#C46B00' }}>→</span>
          </Link>
        </div>
      </div>

      {/* ═══ フィルター ═══ */}
      <SearchFilter currentParams={params} />

      {/* ═══ ペット一覧 ═══ */}
      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse"
                   style={{ border: '1.5px solid #FFE0A0' }}>
                <div className="aspect-square" style={{ background: '#FFF3DC' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 rounded-full w-3/4" style={{ background: '#FFECC0' }} />
                  <div className="h-2.5 rounded-full w-1/2" style={{ background: '#FFECC0' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">😿</div>
            <p className="font-semibold mb-2" style={{ color: '#5A3A1A' }}>接続できませんでした</p>
            <p className="text-xs rounded-2xl px-4 py-2 inline-block max-w-sm break-all"
               style={{ color: '#C04000', background: '#FFF0E6' }}>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🐾</div>
            <p style={{ color: '#8B6340' }}>該当する情報がありません</p>
            <p className="text-sm mt-1" style={{ color: '#C8A87A' }}>条件を変えて検索してみてください</p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3 px-1" style={{ color: '#B08050' }}>
              {items.length}件の情報が見つかりました
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {items.map((item, index) =>
                item.kind === 'pet' ? (
                  <PetCard key={item.data.id} pet={item.data} priority={index < 2} />
                ) : (
                  <Link key={item.data.id} href={`/sightings/${item.data.id}`}>
                    <SightingCard sighting={item.data} />
                  </Link>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-3 py-5">
        <div className="rounded-3xl h-80 animate-pulse mb-6"
             style={{ background: 'linear-gradient(160deg, #FFC96B, #FFEDD4)' }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse"
                 style={{ border: '1.5px solid #FFE0A0' }}>
              <div className="aspect-square" style={{ background: '#FFF3DC' }} />
              <div className="p-3">
                <div className="h-3 rounded-full w-3/4" style={{ background: '#FFECC0' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}

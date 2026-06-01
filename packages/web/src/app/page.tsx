'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import PetCard from '@/components/PetCard'
import SearchFilter from '@/components/SearchFilter'
import { fetchPets, fetchOwnerNames } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'
import { useSearchParams, useRouter } from 'next/navigation'

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const paramsKey = searchParams.toString()
  const fetchRef = useRef(paramsKey)

  const params = {
    type:       searchParams.get('type')       ?? undefined,
    species:    searchParams.get('species')    ?? undefined,
    prefecture: searchParams.get('prefecture') ?? undefined,
    status:     searchParams.get('status')     ?? undefined,
  }

  const loadPets = () => {
    setLoading(true)
    setError(null)
    fetchPets({
      type:       params.type    as 'lost' | 'found' | undefined,
      species:    params.species as 'dog' | 'cat' | 'rabbit' | 'bird' | 'other' | undefined,
      prefecture: params.prefecture,
      status:     (params.status as 'searching' | 'protected' | 'resolved') ?? 'searching',
      limitCount: 50,
    })
      .then(async (fetched) => {
        // ownerDisplayName が未保存の既存投稿は users コレクションから補完
        const needsName = fetched.filter((p) => !p.ownerDisplayName)
        if (needsName.length === 0) {
          setPets(fetched)
          return
        }
        const ids = [...new Set(needsName.map((p) => p.userId))]
        const names = await fetchOwnerNames(ids)
        setPets(
          fetched.map((p) => ({
            ...p,
            ownerDisplayName: p.ownerDisplayName ?? names.get(p.userId),
          }))
        )
      })
      .catch((err: Error) => setError(err.message ?? 'データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  // 検索パラメータ変更時に再取得
  useEffect(() => {
    fetchRef.current = paramsKey
    loadPets()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  // タブ復帰・ページ表示時に再取得（投稿編集後に戻っても最新を表示）
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadPets()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (value) { p.set(key, value) } else { p.delete(key) }
    router.push(`/?${p.toString()}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">

      {/* ═══ ヒーロー ═══ */}
      <div className="overflow-hidden mb-6">

        <div className="px-6 pt-8 pb-7 sm:px-12 sm:pt-10 sm:pb-8 text-center">
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                style={{ background: 'rgba(255,255,255,0.65)', color: '#7A4500' }}>
            🐾 迷子ペット情報プラットフォーム
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-snug"
              style={{ color: '#3D2400' }}>
            大切なあの子と<br />
            もう一度会うために
          </h1>
          <p className="mt-3 text-sm sm:text-base max-w-md mx-auto"
             style={{ color: '#6B4200' }}>
            迷子ペットの情報を掲載・検索できます。<br className="hidden sm:block" />
            保護した子の情報登録もこちらから。
          </p>
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

      {/* ═══ クイックフィルター ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        {[
          {
            emoji: '🔍', label: '迷子の報告', sub: '捜索中',
            active: params.type === 'lost',
            onClick: () => setFilter('type', params.type === 'lost' ? '' : 'lost'),
            bg: '#FFF3DC', activeBg: '#FFC96B', border: '#FFD98A', activeBorder: '#E8A93A',
            color: '#6B4200', activeColor: '#3D2400',
          },
          {
            emoji: '🤝', label: '保護の報告', sub: '保護した子',
            active: params.type === 'found',
            onClick: () => setFilter('type', params.type === 'found' ? '' : 'found'),
            bg: '#EBF2FF', activeBg: '#D1E2FF', border: '#C0D8FF', activeBorder: '#6B9FE8',
            color: '#2B5FBF', activeColor: '#1A3F80',
          },
          {
            emoji: '💚', label: '解決済み', sub: '再会できた',
            active: params.status === 'resolved',
            onClick: () => setFilter('status', params.status === 'resolved' ? '' : 'resolved'),
            bg: '#E6FAF0', activeBg: '#B2EFCD', border: '#9ADFC0', activeBorder: '#2AAA6E',
            color: '#1A7A3C', activeColor: '#0D5228',
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="rounded-2xl p-3 text-center transition-all active:scale-95 cursor-pointer"
            style={{
              background: item.active ? item.activeBg : item.bg,
              border: `1.5px solid ${item.active ? item.activeBorder : item.border}`,
              boxShadow: item.active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <div className="text-xl sm:text-2xl mb-0.5">{item.emoji}</div>
            <div className="text-xs font-bold"
                 style={{ color: item.active ? item.activeColor : item.color }}>
              {item.label}
            </div>
            <div className="text-[10px] mt-0.5"
                 style={{ color: item.active ? item.activeColor : '#9B8060', opacity: 0.8 }}>
              {item.sub}
            </div>
          </button>
        ))}
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
        ) : pets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🐾</div>
            <p style={{ color: '#8B6340' }}>該当するペット情報がありません</p>
            <p className="text-sm mt-1" style={{ color: '#C8A87A' }}>条件を変えて検索してみてください</p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3 px-1" style={{ color: '#B08050' }}>
              {pets.length}件の情報が見つかりました
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {pets.map((pet, index) => (
                <PetCard key={pet.id} pet={pet} priority={index < 2} />
              ))}
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

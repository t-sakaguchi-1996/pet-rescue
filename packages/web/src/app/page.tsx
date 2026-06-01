'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import PetCard from '@/components/PetCard'
import SearchFilter from '@/components/SearchFilter'
import { fetchPets } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'
import { useSearchParams, useRouter } from 'next/navigation'

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = {
    type:       searchParams.get('type')       ?? undefined,
    species:    searchParams.get('species')    ?? undefined,
    prefecture: searchParams.get('prefecture') ?? undefined,
    status:     searchParams.get('status')     ?? undefined,
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPets({
      type:       params.type       as 'lost' | 'found' | undefined,
      species:    params.species    as 'dog' | 'cat' | 'rabbit' | 'bird' | 'other' | undefined,
      prefecture: params.prefecture,
      status:     (params.status    as 'searching' | 'protected' | 'resolved') ?? 'searching',
      limitCount: 50,
    })
      .then(setPets)
      .catch((err: Error) => setError(err.message ?? 'データの取得に失敗しました'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/?${p.toString()}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">

      {/* ═══ ヒーロー ═══ */}
      <div className="rounded-3xl overflow-hidden mb-6 relative"
           style={{ background: 'linear-gradient(135deg, #FFC96B 0%, #FFEDD4 60%, #D1E2FF 100%)' }}>

        {/* PC：2カラム / モバイル：縦積み */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

          {/* 左：テキスト */}
          <div className="px-6 pt-8 pb-6 md:px-10 md:py-10 flex flex-col justify-center">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                  style={{ background: 'rgba(255,255,255,0.6)', color: '#7A4500' }}>
              🐾 迷子ペット情報プラットフォーム
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight mb-3"
                style={{ color: '#3D2400' }}>
              大切なあの子と<br />もう一度会うために
            </h1>
            <p className="text-sm md:text-base mb-6" style={{ color: '#6B4200' }}>
              迷子ペットの情報掲載・検索ができます。<br className="hidden sm:block" />
              保護した子の情報もこちらから登録できます。
            </p>

            {/* CTAボタン群 */}
            <div className="flex flex-wrap gap-2">
              <Link href="/posts/new?type=lost"
                    className="inline-flex items-center gap-1.5 font-bold text-sm px-5 py-2.5 rounded-full transition-all active:scale-95"
                    style={{ background: '#FFC96B', color: '#3D2400', boxShadow: '0 4px 14px rgba(255,201,107,0.5)' }}>
                🔍 迷子を報告する
              </Link>
              <Link href="/posts/new?type=found"
                    className="inline-flex items-center gap-1.5 font-bold text-sm px-5 py-2.5 rounded-full transition-all active:scale-95"
                    style={{ background: '#D1E2FF', color: '#1A3F80', boxShadow: '0 4px 14px rgba(107,159,232,0.3)' }}>
                🤝 保護した子を報告
              </Link>
              <Link href="/map"
                    className="inline-flex items-center gap-1.5 font-semibold text-sm px-5 py-2.5 rounded-full border-2 transition-all active:scale-95"
                    style={{ borderColor: '#FFC96B', color: '#5A3A1A', background: 'rgba(255,255,255,0.7)' }}>
                🗺️ 地図で探す
              </Link>
            </div>
          </div>

          {/* 右：ペット写真モザイク */}
          <div className="relative h-52 md:h-auto md:min-h-[280px]">
            {/* メイン大画像 */}
            <div className="absolute inset-0 md:inset-2 rounded-none md:rounded-2xl overflow-hidden">
              <Image
                src="/images/pet-hero.jpg"
                alt="保護されたペット"
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* フローティングサムネイル（PC のみ） */}
            <div className="hidden md:block absolute bottom-4 left-2 w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md">
              <Image src="/images/pet-shiba.jpg" alt="柴犬" fill className="object-cover" />
            </div>
            <div className="hidden md:block absolute bottom-4 left-24 w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md">
              <Image src="/images/pet-scottish-fold.jpg" alt="スコティッシュフォールド" fill className="object-cover" />
            </div>
            {/* グラデーションオーバーレイ */}
            <div className="absolute inset-0 md:hidden"
                 style={{ background: 'linear-gradient(to top, rgba(255,201,107,0.4) 0%, transparent 50%)' }} />
          </div>
        </div>
      </div>

      {/* ═══ クイックフィルター（ボタン） ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        {[
          {
            emoji: '🔍', label: '迷子の報告', sub: '捜索中',
            active: params.type === 'lost' && !params.status,
            onClick: () => setFilter('type', params.type === 'lost' ? '' : 'lost'),
            bg: '#FFF3DC', activeBg: '#FFC96B', border: '#FFD98A', activeBorder: '#E8A93A',
            color: '#6B4200', activeColor: '#3D2400',
          },
          {
            emoji: '🤝', label: '保護の報告', sub: '保護した子',
            active: params.type === 'found' && !params.status,
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
            <div className="text-xs font-bold" style={{ color: item.active ? item.activeColor : item.color }}>
              {item.label}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: item.active ? item.activeColor : '#9B8060', opacity: 0.8 }}>
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
              <div key={i} className="bg-white rounded-3xl border overflow-hidden animate-pulse" style={{ borderColor: '#FFE0A0' }}>
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
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
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
        <div className="rounded-3xl h-64 animate-pulse mb-6"
             style={{ background: 'linear-gradient(135deg, #FFC96B, #FFEDD4)' }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse"
                 style={{ border: '1.5px solid #FFE0A0' }}>
              <div className="aspect-square" style={{ background: '#FFF3DC' }} />
              <div className="p-3 space-y-2">
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

'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import PetCard from '@/components/PetCard'
import SearchFilter from '@/components/SearchFilter'
import { fetchPets } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'
import { useSearchParams } from 'next/navigation'

function HomeContent() {
  const searchParams = useSearchParams()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = {
    type: searchParams.get('type') ?? undefined,
    species: searchParams.get('species') ?? undefined,
    prefecture: searchParams.get('prefecture') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPets({
      type: params.type as 'lost' | 'found' | undefined,
      species: params.species as 'dog' | 'cat' | 'rabbit' | 'bird' | 'other' | undefined,
      prefecture: params.prefecture,
      status: (params.status as 'searching' | 'protected' | 'resolved') ?? 'searching',
      limitCount: 50,
    })
      .then(setPets)
      .catch((err: Error) => setError(err.message ?? 'データの取得に失敗しました'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">

      {/* ヒーロー */}
      <div className="relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-primary-400 via-primary-500 to-peach-400 p-6 sm:p-10 text-white shadow-soft">
        {/* 装飾 */}
        <div className="absolute top-3 right-4 text-5xl sm:text-7xl opacity-20 select-none pointer-events-none">🐾</div>
        <div className="absolute bottom-2 right-16 text-3xl sm:text-4xl opacity-15 select-none pointer-events-none">🐱</div>
        <div className="absolute bottom-3 right-6 text-2xl opacity-10 select-none pointer-events-none">🐶</div>

        <div className="relative">
          <p className="text-xs sm:text-sm font-semibold bg-white/20 rounded-full px-3 py-1 inline-block mb-3">
            🐾 迷子ペット情報プラットフォーム
          </p>
          <h1 className="text-xl sm:text-3xl font-black leading-snug mb-2">
            大切なあの子を<br className="sm:hidden" />一緒に探しましょう
          </h1>
          <p className="text-white/80 text-xs sm:text-sm mb-5 max-w-sm">
            迷子ペットの情報を掲載・検索できます。<br />
            保護した子の情報もこちらから。
          </p>

          {/* CTA ボタン */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/posts/new?type=lost"
              className="bg-white text-primary-600 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full hover:bg-primary-50 transition-all shadow-sm active:scale-95"
            >
              🔍 迷子を報告する
            </Link>
            <Link
              href="/posts/new?type=found"
              className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full hover:bg-white/30 transition-all active:scale-95"
            >
              🤝 保護した子を報告
            </Link>
            <Link
              href="/map"
              className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full hover:bg-white/30 transition-all active:scale-95"
            >
              🗺️ 地図で探す
            </Link>
          </div>
        </div>
      </div>

      {/* 統計バー */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        {[
          { emoji: '🔍', label: '迷子の報告', color: 'from-primary-50 to-white border-primary-100' },
          { emoji: '🤝', label: '保護の報告', color: 'from-blue-50 to-white border-blue-100' },
          { emoji: '💖', label: '解決済み', color: 'from-emerald-50 to-white border-emerald-100' },
        ].map((item) => (
          <div key={item.label} className={`bg-gradient-to-b ${item.color} border rounded-2xl p-3 text-center`}>
            <div className="text-xl sm:text-2xl mb-0.5">{item.emoji}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium">{item.label}</div>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <SearchFilter currentParams={params} />

      {/* ペット一覧 */}
      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-pink-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-pink-50" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-pink-50 rounded-full w-3/4" />
                  <div className="h-2.5 bg-pink-50 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">😿</div>
            <p className="text-gray-500 font-medium mb-2">接続できませんでした</p>
            <p className="text-xs text-red-400 bg-red-50 rounded-2xl px-4 py-2 inline-block max-w-sm break-all">
              {error}
            </p>
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🐾</div>
            <p>該当するペット情報がありません</p>
            <p className="text-sm mt-1 text-gray-300">条件を変えて検索してみてください</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 px-1">
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
        <div className="rounded-3xl bg-gradient-to-br from-primary-400 to-peach-400 h-44 animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-pink-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-pink-50" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-pink-50 rounded-full w-3/4" />
                <div className="h-2 bg-pink-50 rounded-full w-1/2" />
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

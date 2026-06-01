'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PetCard from '@/components/PetCard'
import SearchFilter from '@/components/SearchFilter'
import { fetchPets } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
      .catch((err) => {
        console.error(err)
        setError('データの取得に失敗しました。Firebaseの設定を確認してください。')
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ヒーローバナー */}
      <div className="bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl p-8 mb-8 text-white">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">
            迷子のペットを一緒に見つけましょう
          </h1>
          <p className="text-red-50 mb-6">
            迷子ペット情報の掲載・検索ができます。大切な家族を取り戻すために。
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/posts/new?type=lost"
              className="bg-white text-red-500 font-bold px-6 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              迷子を報告する
            </Link>
            <Link
              href="/posts/new?type=found"
              className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors border border-red-400"
            >
              保護した子を報告
            </Link>
            <Link
              href="/map"
              className="bg-orange-500 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
            >
              地図で探す
            </Link>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <SearchFilter currentParams={params} />

      {/* ペット一覧 */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-gray-500">{error}</p>
            <p className="text-sm text-gray-400 mt-2">
              .env.local の FIREBASE_APP_ID を設定してください
            </p>
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🐾</div>
            <p className="text-lg">該当するペット情報がありません</p>
            <p className="text-sm mt-1">条件を変えて検索してみてください</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{pets.length}件の情報が見つかりました</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl p-8 mb-8 h-48 animate-pulse" />
        <div className="h-20 bg-white rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
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

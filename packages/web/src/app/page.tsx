import Link from 'next/link'
import PetCard from '@/components/PetCard'
import SearchFilter from '@/components/SearchFilter'
import { fetchPets } from '@/lib/firestore'

export const dynamic = 'force-dynamic'

interface SearchParams {
  type?: string
  species?: string
  prefecture?: string
  status?: string
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const pets = await fetchPets({
    type: params.type as 'lost' | 'found' | undefined,
    species: params.species as
      | 'dog'
      | 'cat'
      | 'rabbit'
      | 'bird'
      | 'other'
      | undefined,
    prefecture: params.prefecture,
    status: (params.status as 'searching' | 'protected' | 'resolved') ?? 'searching',
    limitCount: 50,
  })

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
        <p className="text-sm text-gray-500 mb-4">{pets.length}件の情報が見つかりました</p>
        {pets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🐾</div>
            <p className="text-lg">該当するペット情報がありません</p>
            <p className="text-sm mt-1">条件を変えて検索してみてください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

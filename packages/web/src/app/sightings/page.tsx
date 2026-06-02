import { fetchSightings } from '@/lib/sightings'
import SightingCard from '@/components/SightingCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SightingsPage() {
  const sightings = await fetchSightings(50)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#3D2400' }}>
            👁️ 目撃情報一覧
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B6340' }}>
            みんなが投稿した目撃情報をチェックしよう
          </p>
        </div>
        <Link
          href="/sightings/new"
          className="font-bold text-sm px-4 py-2 rounded-full"
          style={{ background: '#FFC96B', color: '#3D2400' }}
        >
          ＋ 目撃情報を投稿（+2pt）
        </Link>
      </div>

      {sightings.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ border: '1.5px dashed #FFD98A' }}>
          <p className="text-5xl mb-4">👁️</p>
          <p className="text-gray-500 mb-4">まだ目撃情報はありません</p>
          <Link
            href="/sightings/new"
            className="inline-flex font-bold text-sm px-5 py-2.5 rounded-full"
            style={{ background: '#FFC96B', color: '#3D2400' }}
          >
            最初の目撃情報を投稿する
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sightings.map((s) => (
            <Link key={s.id} href={`/sightings/${s.id}`}>
              <SightingCard sighting={s} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

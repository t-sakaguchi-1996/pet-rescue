import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { fetchSightingById } from '@/lib/sightings'
import { fetchPets } from '@/lib/firestore'
import { SPECIES_LABELS } from '@pet-rescue/shared'
import SightingBestInfoPanel from '@/components/SightingBestInfoPanel'
import SightingMap from '@/components/SightingMap'
import SightingDeleteButton from '@/components/SightingDeleteButton'
import UserProfileButton from '@/components/UserProfileButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SightingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sighting = await fetchSightingById(id)
  if (!sighting) notFound()

  // 近隣の迷子投稿（動物種・場所が一致）を最大5件取得
  const allLostPets = await fetchPets({ type: 'lost', status: 'searching', limitCount: 100 })
  const nearbyPets = allLostPets.filter((pet) => {
    if (sighting.species && pet.species !== sighting.species) return false
    if (sighting.location.city && pet.location.city === sighting.location.city) return true
    if (
      sighting.location.lat !== undefined &&
      sighting.location.lng !== undefined &&
      pet.location.lat &&
      pet.location.lng
    ) {
      const R = 6371
      const dLat = (pet.location.lat - sighting.location.lat!) * Math.PI / 180
      const dLng = (pet.location.lng - sighting.location.lng!) * Math.PI / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(sighting.location.lat! * Math.PI / 180) *
        Math.cos(pet.location.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 5
    }
    return false
  }).slice(0, 5)

  const hasLocation = sighting.location.lat !== undefined && sighting.location.lng !== undefined

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/sightings"
          className="inline-flex items-center text-sm transition-colors hover:opacity-70"
          style={{ color: '#8B5E1A' }}
        >
          ← 目撃情報一覧に戻る
        </Link>
        <SightingDeleteButton sightingId={sighting.id} sightingUserId={sighting.userId} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1.5px solid #FFE0A0' }}>
        {/* 写真ギャラリー */}
        {sighting.photos.length > 0 ? (
          <div>
            <div className="relative aspect-video bg-gray-100">
              <Image
                src={sighting.photos[0]}
                alt={sighting.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                priority
                className="object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#FFC96B', color: '#3D2400' }}>
                  目撃情報
                </span>
                {sighting.species && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                    {SPECIES_LABELS[sighting.species]}
                  </span>
                )}
                {sighting.isBestInfo && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#FFD700', color: '#3D2400' }}>
                    ⭐ 最有力情報
                  </span>
                )}
              </div>
            </div>
            {sighting.photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto" style={{ borderBottom: '1px solid #FFE0A0' }}>
                {sighting.photos.slice(1).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-5xl"
               style={{ background: '#FFF8ED' }}>
            {sighting.species === 'dog' ? '🐕' : sighting.species === 'cat' ? '🐈' : '👁️'}
          </div>
        )}

        <div className="p-6">
          <h1 className="text-xl font-black mb-4" style={{ color: '#3D2400' }}>
            {sighting.title}
          </h1>

          {/* 投稿者プロフィール */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
               style={{ background: '#FFFAF0', border: '1px solid #FFE0A0', display: 'inline-flex' }}>
            <UserProfileButton
              userId={sighting.userId}
              displayName={sighting.posterName}
              photoURL={sighting.posterPhotoURL}
            />
          </div>

          {/* 基本情報 */}
          <dl className="space-y-2 mb-5">
            {sighting.species && (
              <InfoRow label="動物種" value={SPECIES_LABELS[sighting.species]} />
            )}
            <InfoRow
              label="場所"
              value={`${sighting.location.prefecture}${sighting.location.city ? ` ${sighting.location.city}` : ''}${sighting.location.address ? ` ${sighting.location.address}` : ''}`}
            />
            <InfoRow
              label="投稿日時"
              value={format(new Date(sighting.createdAt), 'yyyy年M月d日 H:mm', { locale: ja })}
            />
          </dl>

          {/* 説明 */}
          {sighting.description && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: '#FFFAF0', border: '1px solid #FFE8B0' }}>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#7A4500' }}>コメント・補足情報</h2>
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: '#3D2400' }}>
                {sighting.description}
              </p>
            </div>
          )}

          {/* 地図 */}
          {hasLocation && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-2" style={{ color: '#7A4500' }}>目撃場所（半径5km）</h2>
              <div className="rounded-xl overflow-hidden" style={{ height: '280px' }}>
                <SightingMap
                  sightingLat={sighting.location.lat!}
                  sightingLng={sighting.location.lng!}
                  nearbyPets={nearbyPets.map(p => ({
                    id: p.id,
                    name: p.name,
                    lat: p.location.lat,
                    lng: p.location.lng,
                    type: p.type,
                    species: p.species,
                  }))}
                />
              </div>
            </div>
          )}

          {/* 関連する迷子投稿 */}
          {nearbyPets.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#7A4500' }}>
                📍 近隣の迷子投稿（{nearbyPets.length}件）
              </h2>
              <div className="space-y-2">
                {nearbyPets.map((pet) => (
                  <Link key={pet.id} href={`/posts/${pet.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-amber-50"
                        style={{ border: '1px solid #FFE0A0', background: '#FFFAF0' }}>
                    {pet.images[0] ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={pet.images[0]} alt={pet.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                           style={{ background: '#FFE0A0' }}>
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#3D2400' }}>
                        {pet.name || '名前不明'}
                      </p>
                      <p className="text-xs" style={{ color: '#8B6340' }}>
                        {SPECIES_LABELS[pet.species]} · {pet.location.prefecture} {pet.location.city}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: '#FFE0A0', color: '#7A4500' }}>
                      詳細 →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 最有力情報選択パネル（ペットオーナー向け） */}
          <SightingBestInfoPanel
            sighting={{
              id: sighting.id,
              isBestInfo: sighting.isBestInfo,
              bestInfoPointGranted: sighting.bestInfoPointGranted,
              userId: sighting.userId,
              posterName: sighting.posterName,
            }}
            nearbyPetIds={nearbyPets.map((p) => p.id)}
            nearbyPets={nearbyPets.map((p) => ({
              id: p.id,
              name: p.name || '名前不明',
              species: p.species,
              bestInfoId: p.bestInfoId,
              bestInfoType: p.bestInfoType,
              bestInfoPointGranted: p.bestInfoPointGranted,
              userId: p.userId,
            }))}
          />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-sm w-20 flex-shrink-0" style={{ color: '#9B8060' }}>{label}</dt>
      <dd className="text-sm font-medium" style={{ color: '#3D2400' }}>{value}</dd>
    </div>
  )
}

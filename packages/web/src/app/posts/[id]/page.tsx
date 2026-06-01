import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchPetById } from '@/lib/firestore'
import {
  SPECIES_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
} from '@pet-rescue/shared'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pet = await fetchPetById(id)
  if (!pet) notFound()

  const typeClass =
    pet.type === 'lost' ? 'pet-badge-lost' : 'pet-badge-found'

  const statusClass =
    pet.status === 'searching'
      ? 'status-searching'
      : pet.status === 'protected'
        ? 'status-protected'
        : 'status-resolved'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm mb-6"
      >
        ← 一覧に戻る
      </Link>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* 画像ギャラリー */}
        <div className="relative aspect-video bg-gray-100">
          {pet.images.length > 0 ? (
            <Image
              src={pet.images[0]}
              alt={pet.name || 'ペット'}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl">
              {pet.species === 'dog'
                ? '🐕'
                : pet.species === 'cat'
                  ? '🐈'
                  : '🐾'}
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={typeClass}>{TYPE_LABELS[pet.type]}</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass}`}
            >
              {STATUS_LABELS[pet.status]}
            </span>
          </div>
        </div>

        {/* サムネイル */}
        {pet.images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {pet.images.slice(1).map((img, i) => (
              <div
                key={i}
                className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden"
              >
                <Image src={img} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左カラム: 基本情報 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {pet.name || '名前不明'}
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                {SPECIES_LABELS[pet.species]}
                {pet.breed ? ` / ${pet.breed}` : ''}
              </p>

              <dl className="space-y-3">
                <InfoRow label="種別" value={TYPE_LABELS[pet.type]} />
                <InfoRow label="動物種" value={SPECIES_LABELS[pet.species]} />
                {pet.breed && <InfoRow label="品種" value={pet.breed} />}
                <InfoRow label="毛色" value={pet.color} />
                <InfoRow label="性別" value={GENDER_LABELS[pet.gender]} />
                {pet.age && <InfoRow label="年齢" value={pet.age} />}
                <InfoRow
                  label={
                    pet.type === 'lost' ? '迷子になった日' : '保護した日'
                  }
                  value={format(new Date(pet.lostDate), 'yyyy年M月d日', {
                    locale: ja,
                  })}
                />
                <InfoRow
                  label="場所"
                  value={`${pet.location.prefecture} ${pet.location.city}`}
                />
                {pet.location.address && (
                  <InfoRow label="詳しい場所" value={pet.location.address} />
                )}
                {pet.reward && (
                  <InfoRow
                    label="お礼"
                    value={pet.reward}
                    highlight
                  />
                )}
              </dl>
            </div>

            {/* 右カラム: 説明・連絡先 */}
            <div>
              {pet.description && (
                <div className="mb-6">
                  <h2 className="font-semibold text-gray-800 mb-2">
                    詳細・特徴
                  </h2>
                  <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                    {pet.description}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="font-semibold text-gray-800 mb-3">
                  連絡先情報
                </h2>
                <p className="text-xs text-gray-500 mb-3">
                  情報をお持ちの方はご連絡ください
                </p>
                {pet.contactEmail && (
                  <a
                    href={`mailto:${pet.contactEmail}`}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium mb-2"
                  >
                    📧 {pet.contactEmail}
                  </a>
                )}
                {pet.contactPhone && (
                  <a
                    href={`tel:${pet.contactPhone}`}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium"
                  >
                    📞 {pet.contactPhone}
                  </a>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-4">
                投稿日:{' '}
                {format(new Date(pet.createdAt), 'yyyy年M月d日 H:mm', {
                  locale: ja,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex gap-3">
      <dt className="text-sm text-gray-500 w-28 flex-shrink-0">{label}</dt>
      <dd
        className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-gray-900'}`}
      >
        {value}
      </dd>
    </div>
  )
}

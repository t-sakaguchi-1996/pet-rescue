'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Pet } from '@pet-rescue/shared'
import { SPECIES_LABELS, STATUS_LABELS, TYPE_LABELS } from '@pet-rescue/shared'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Props {
  pet: Pet
  showEditLink?: boolean
}

export default function PetCard({ pet, showEditLink }: Props) {
  const router = useRouter()

  const statusClass =
    pet.status === 'searching'
      ? 'bg-amber-100 text-amber-600'
      : pet.status === 'protected'
        ? 'bg-emerald-100 text-emerald-600'
        : 'bg-gray-100 text-gray-400'

  const typeGradient =
    pet.type === 'lost'
      ? 'from-primary-500 to-primary-400'
      : 'from-blue-500 to-blue-400'

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/posts/${pet.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/posts/${pet.id}`)}
      className="pet-card group"
    >
      {/* 画像 */}
      <div className="relative aspect-square bg-pink-50">
        {pet.images.length > 0 ? (
          <Image
            src={pet.images[0]}
            alt={pet.name || 'ペット'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">
            {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
          </div>
        )}

        {/* タイプバッジ */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${typeGradient} shadow-sm`}>
            {TYPE_LABELS[pet.type]}
          </span>
        </div>

        {/* ステータスバッジ */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}`}>
            {STATUS_LABELS[pet.status]}
          </span>
        </div>
      </div>

      {/* 情報 */}
      <div className="p-3">
        <p className="font-bold text-gray-800 text-sm truncate">
          {pet.name || '名前不明'}
          <span className="text-gray-400 font-normal text-xs ml-1">
            ({SPECIES_LABELS[pet.species]})
          </span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          📍 {pet.location.prefecture} {pet.location.city}
        </p>
        <p className="text-[10px] text-gray-300 mt-1.5">
          {format(new Date(pet.createdAt), 'M/d', { locale: ja })} 投稿
        </p>

        {showEditLink && (
          <Link
            href={`/posts/${pet.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block mt-2 text-xs text-primary-400 hover:text-primary-600 font-semibold hover:underline"
          >
            編集する →
          </Link>
        )}
      </div>
    </div>
  )
}

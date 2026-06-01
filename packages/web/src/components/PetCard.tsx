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
  priority?: boolean
}

export default function PetCard({ pet, showEditLink, priority = false }: Props) {
  const router = useRouter()

  const statusStyle =
    pet.status === 'searching'
      ? { background: '#FFF3CD', color: '#B07800', border: '1.5px solid #FFD54F' }
      : pet.status === 'protected'
        ? { background: '#DDFBE8', color: '#1A7A3C', border: '1.5px solid #6DD99A' }
        : { background: '#F0F0F0', color: '#888888', border: '1.5px solid #D0D0D0' }

  const typeBadgeStyle =
    pet.type === 'lost'
      ? { background: '#FF6B35', color: '#FFFFFF', border: 'none' }
      : { background: '#2B5FBF', color: '#FFFFFF', border: 'none' }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/posts/${pet.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/posts/${pet.id}`)}
      className="pet-card group"
    >
      {/* 画像 */}
      <div className="relative aspect-square" style={{ background: '#FFF3DC' }}>
        {pet.images.length > 0 ? (
          <Image
            src={pet.images[0]}
            alt={pet.name || 'ペット'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">
            {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
          </div>
        )}

        {/* 種別バッジ（大きめ・目立つ） */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2">
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full shadow-sm"
            style={typeBadgeStyle}
          >
            {TYPE_LABELS[pet.type]}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full shadow-sm"
            style={statusStyle}
          >
            {STATUS_LABELS[pet.status]}
          </span>
        </div>
      </div>

      {/* 情報 */}
      <div className="p-3">
        <p className="font-black text-sm leading-tight truncate" style={{ color: '#3D2400' }}>
          {pet.name || '名前不明'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#B08050' }}>
          {SPECIES_LABELS[pet.species]}{pet.breed ? ` / ${pet.breed}` : ''}
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: '#C8A070' }}>
          📍 {pet.location.prefecture} {pet.location.city}
        </p>

        {/* オーナー情報 */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: '#FFF0D0', color: '#8B5E1A' }}>
            👤 {pet.ownerDisplayName ?? '投稿者'}
          </span>
          <span className="text-[10px] ml-auto" style={{ color: '#C8A070' }}>
            {format(new Date(pet.createdAt), 'M/d', { locale: ja })}
          </span>
        </div>

        {showEditLink && (
          <Link
            href={`/posts/${pet.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block mt-2 text-xs font-semibold hover:underline"
            style={{ color: '#C46B00' }}
          >
            編集する →
          </Link>
        )}
      </div>
    </div>
  )
}

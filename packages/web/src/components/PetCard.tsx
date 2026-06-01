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

  const statusStyle =
    pet.status === 'searching'
      ? { background: '#FFF3CD', color: '#B07800' }
      : pet.status === 'protected'
        ? { background: '#DDFBE8', color: '#1A7A3C' }
        : { background: '#F0F0F0', color: '#888888' }

  const typeBadge =
    pet.type === 'lost'
      ? { background: '#FFE8C4', color: '#C46B00' }
      : { background: '#D1E2FF', color: '#2B5FBF' }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/posts/${pet.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/posts/${pet.id}`)}
      className="pet-card group"
    >
      <div className="relative aspect-square" style={{ background: '#FFF3DC' }}>
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

        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={typeBadge}>
            {TYPE_LABELS[pet.type]}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={statusStyle}>
            {STATUS_LABELS[pet.status]}
          </span>
        </div>
      </div>

      <div className="p-3">
        <p className="font-bold text-sm truncate" style={{ color: '#3D2400' }}>
          {pet.name || '名前不明'}
          <span className="font-normal text-xs ml-1" style={{ color: '#B08050' }}>
            ({SPECIES_LABELS[pet.species]})
          </span>
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#B08050' }}>
          📍 {pet.location.prefecture} {pet.location.city}
        </p>
        <p className="text-[10px] mt-1.5" style={{ color: '#C8A070' }}>
          {format(new Date(pet.createdAt), 'M/d', { locale: ja })} 投稿
        </p>

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

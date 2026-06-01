import Image from 'next/image'
import Link from 'next/link'
import type { Pet } from '@pet-rescue/shared'
import { SPECIES_LABELS, STATUS_LABELS, TYPE_LABELS } from '@pet-rescue/shared'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Props {
  pet: Pet
  showEditLink?: boolean
}

export default function PetCard({ pet, showEditLink }: Props) {
  const statusClass =
    pet.status === 'searching'
      ? 'bg-yellow-100 text-yellow-700'
      : pet.status === 'protected'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500'

  return (
    <Link
      href={`/posts/${pet.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden block group"
    >
      <div className="relative aspect-square bg-gray-100">
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
        <div className="absolute top-2 left-2 flex gap-1">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              pet.type === 'lost'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {TYPE_LABELS[pet.type]}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass}`}>
            {STATUS_LABELS[pet.status]}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {pet.name || '名前不明'}{' '}
              <span className="text-gray-400 font-normal">
                ({SPECIES_LABELS[pet.species]})
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              📍 {pet.location.prefecture} {pet.location.city}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {format(new Date(pet.createdAt), 'M/d', { locale: ja })} 投稿
        </p>
        {showEditLink && (
          <Link
            href={`/posts/${pet.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block mt-2 text-xs text-red-500 hover:underline"
          >
            編集する
          </Link>
        )}
      </div>
    </Link>
  )
}

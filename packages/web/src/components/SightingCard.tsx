import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Sighting } from '@pet-rescue/shared'
import { SPECIES_LABELS } from '@pet-rescue/shared'

interface Props {
  sighting: Sighting
}

export default function SightingCard({ sighting }: Props) {
  const { species, title, photos, location, description, posterName, createdAt } = sighting

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:shadow-md"
         style={{ background: 'white', border: '1.5px solid #FFE0A0' }}>
      {/* 写真 */}
      <div className="relative aspect-[4/3] bg-gray-50">
        {photos.length > 0 ? (
          <Image
            src={photos[0]}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-gray-300">
            👁️
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#FFC96B', color: '#3D2400' }}>
            目撃情報
          </span>
          {species && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}>
              {SPECIES_LABELS[species]}
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm font-bold leading-snug line-clamp-2 mb-1"
           style={{ color: '#3D2400' }}>
          {title}
        </p>
        <p className="text-xs mb-1" style={{ color: '#8B6340' }}>
          📍 {location.prefecture}{location.city ? ` ${location.city}` : ''}
        </p>
        {description && (
          <p className="text-xs line-clamp-2 mb-1" style={{ color: '#9B8060' }}>
            {description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: '#B08050' }}>
            {posterName === '未登録ユーザー' ? '未登録ユーザー' : posterName}
          </span>
          <span className="text-xs" style={{ color: '#C8A87A' }}>
            {format(new Date(createdAt), 'M/d H:mm', { locale: ja })}
          </span>
        </div>
      </div>
    </div>
  )
}

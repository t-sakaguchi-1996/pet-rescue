'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import type { Sighting } from '@pet-rescue/shared'
import { SPECIES_LABELS } from '@pet-rescue/shared'

interface Props {
  sighting: Sighting
}

export default function SightingCard({ sighting }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { species, title, photos, location, description, posterName, posterPhotoURL, createdAt, userId } = sighting
  const posterInitial = (posterName && posterName !== '未登録ユーザー' ? posterName : 'U').charAt(0).toUpperCase()

  const handlePosterClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return
    if (userId === user?.uid) { router.push(`/users/${userId}`); return }
    if (window.confirm('プロフィールを確認しますか？')) {
      router.push(`/users/${userId}`)
    }
  }

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
          {sighting.sightingType === 'found' ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#4A90D9', color: 'white' }}>
              🤝 保護情報
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#FFC96B', color: '#3D2400' }}>
              目撃情報
            </span>
          )}
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
        {(location.prefecture || location.city || location.address) && (
          <p className="text-xs mb-1" style={{ color: '#8B6340' }}>
            📍 {[location.prefecture, location.city].filter(Boolean).join(' ') || location.address}
          </p>
        )}
        {description && (
          <p className="text-xs line-clamp-2 mb-1" style={{ color: '#9B8060' }}>
            {description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid #F5E8D0' }}>
          <button
            onClick={handlePosterClick}
            className={`flex items-center gap-1.5 min-w-0 ${userId ? 'hover:opacity-70 transition-opacity' : ''}`}
          >
            <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold overflow-hidden"
                 style={{ background: '#FFE0A0', color: '#7A4500' }}>
              {posterPhotoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterPhotoURL} alt={posterName} className="w-full h-full object-cover" />
              ) : posterInitial}
            </div>
            <span className="text-[10px] truncate font-medium" style={{ color: '#7A4500' }}>
              {posterName === '未登録ユーザー' ? '未登録ユーザー' : posterName}
            </span>
          </button>
          <span className="text-[10px] flex-shrink-0" style={{ color: '#C8A87A' }}>
            {format(new Date(createdAt), 'M/d H:mm', { locale: ja })}
          </span>
        </div>
      </div>
    </div>
  )
}

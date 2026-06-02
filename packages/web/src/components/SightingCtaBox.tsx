'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  petOwnerId: string
  petSpecies?: string
}

export default function SightingCtaBox({ petOwnerId, petSpecies }: Props) {
  const { user } = useAuth()

  // 自分の投稿には目撃情報の導線を表示しない
  if (user && user.uid === petOwnerId) return null

  const href = petSpecies ? `/sightings/new?species=${petSpecies}` : '/sightings/new'

  return (
    <div className="mt-4 p-4 rounded-2xl"
         style={{ background: '#FFF3DC', border: '1.5px solid #FFD98A' }}>
      <p className="text-sm font-bold mb-1" style={{ color: '#7A4500' }}>
        👁️ 見かけた方へ
      </p>
      <p className="text-xs mb-3" style={{ color: '#8B6340' }}>
        このペットを見かけた場合は目撃情報を投稿してください。投稿すると <strong>+2pt</strong> 獲得できます。
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 font-bold text-xs px-4 py-2 rounded-full"
        style={{ background: '#FFC96B', color: '#3D2400' }}
      >
        目撃情報を投稿する（+2pt）
      </Link>
    </div>
  )
}

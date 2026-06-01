'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { fetchPets } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <p className="text-gray-400 text-sm">地図を読み込み中...</p>
    </div>
  ),
})

export default function MapPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPets({ status: 'searching', limitCount: 200 })
      .then(setPets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="font-bold text-gray-800">
          迷子ペットマップ
          {!loading && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({pets.length}件表示中)
            </span>
          )}
        </h1>
      </div>
      <div className="flex-1">
        <MapView pets={pets} />
      </div>
    </div>
  )
}

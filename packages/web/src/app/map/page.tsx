'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchPets } from '@/lib/firestore'
import { fetchSightings } from '@/lib/sightings'
import type { Pet, Sighting } from '@pet-rescue/shared'
import { useLoadingState } from '@/contexts/LoadingContext'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <p className="text-gray-400 text-sm">地図を読み込み中...</p>
    </div>
  ),
})

const DEFAULT_CENTER = { lat: 35.6812362, lng: 139.7671248 }

type LocationState = 'pending' | 'granted' | 'skipped' | 'error'
export type MapFilter = 'all' | 'lost' | 'protected' | 'sighting'

const FILTER_OPTIONS: { value: MapFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'lost', label: '迷子' },
  { value: 'protected', label: '保護' },
  { value: 'sighting', label: '目撃' },
]

function parseFilter(raw: string | null): MapFilter {
  if (raw === 'lost' || raw === 'protected' || raw === 'sighting') return raw
  return 'all'
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  )
}

function MapPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startLoading, stopLoading } = useLoadingState()

  const [pets, setPets] = useState<Pet[]>([])
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [locationState, setLocationState] = useState<LocationState>('pending')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [filter, setFilter] = useState<MapFilter>(() => parseFilter(searchParams.get('type')))

  useEffect(() => {
    startLoading()
    Promise.all([
      fetchPets({ status: 'searching', limitCount: 200 }),
      fetchSightings(100),
    ])
      .then(([petsResult, sightingsResult]) => {
        setPets(petsResult)
        setSightings(sightingsResult)
      })
      .catch(console.error)
      .finally(() => {
        setDataLoading(false)
        stopLoading()
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = useCallback((next: MapFilter) => {
    setFilter(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', next)
    router.replace(`/map?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('error')
      return
    }
    setGettingLocation(true)
    startLoading()
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationState('granted')
        setGettingLocation(false)
        stopLoading()
      },
      () => {
        setLocationState('error')
        setGettingLocation(false)
        stopLoading()
      },
      { timeout: 10000 }
    )
  }

  const mapSightings = sightings.filter(
    (s) => s.location.lat !== undefined && s.location.lng !== undefined
  )
  const mapCenter = userLocation ?? DEFAULT_CENTER

  const totalCount = (() => {
    if (filter === 'lost') return pets.filter((p) => p.type === 'lost').length
    if (filter === 'protected') return pets.filter((p) => p.type === 'found').length
    if (filter === 'sighting') return mapSightings.length
    return pets.length + mapSightings.length
  })()

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <h1 className="font-bold text-gray-800 whitespace-nowrap">
          迷子ペットマップ
          {locationState !== 'pending' && !dataLoading && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({totalCount}件)
            </span>
          )}
        </h1>

        {locationState !== 'pending' && (
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as MapFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {locationState === 'pending' ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-lg border border-gray-100">
            <div className="text-center mb-5">
              <span className="text-5xl">📍</span>
            </div>
            <h2 className="text-base font-bold text-gray-800 text-center mb-2">
              現在位置を使用して周辺の投稿を表示しますか？
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              現在位置を使用すると、あなたの周辺にある迷子・保護・目撃情報が表示されます
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUseLocation}
                disabled={gettingLocation}
                className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                style={{ background: '#ef4444', color: 'white' }}
              >
                {gettingLocation ? '取得中...' : '📍 使用する'}
              </button>
              <button
                onClick={() => setLocationState('skipped')}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                使用しない
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {locationState === 'error' && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700">
              現在位置を取得できませんでした。地図はデフォルト位置で表示します。
            </div>
          )}
          <div className="flex-1">
            <MapView
              pets={pets}
              sightings={sightings}
              userLocation={userLocation}
              defaultCenter={mapCenter}
              defaultZoom={userLocation ? 13 : 10}
              filter={filter}
            />
          </div>
        </>
      )}
    </div>
  )
}

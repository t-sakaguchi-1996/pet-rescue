'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps'
import Link from 'next/link'
import type { Pet, PetSpecies, Sighting } from '@pet-rescue/shared'
import { SPECIES_LABELS, TYPE_LABELS } from '@pet-rescue/shared'
import Image from 'next/image'
import MapCircle from './MapCircle'
import type { MapFilter } from '@/app/map/page'

// Fits the map to show all pet circles on first load
function MapBoundsController({ pets }: { pets: Pet[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (!map || pets.length === 0 || fitted.current) return
    fitted.current = true

    let north = -90, south = 90, east = -180, west = 180
    const R = 6371000
    pets.forEach((pet) => {
      const r = (pet.searchRadiusKm ?? 5) * 1000
      const latOff = (r / R) * (180 / Math.PI)
      const lngOff = (r / (R * Math.cos((pet.location.lat * Math.PI) / 180))) * (180 / Math.PI)
      north = Math.max(north, pet.location.lat + latOff)
      south = Math.min(south, pet.location.lat - latOff)
      east  = Math.max(east,  pet.location.lng + lngOff)
      west  = Math.min(west,  pet.location.lng - lngOff)
    })
    map.fitBounds({ north, south, east, west }, 40)
  }, [map, pets])

  return null
}

function speciesGlyph(species: PetSpecies): string {
  switch (species) {
    case 'dog': return '🐕'
    case 'cat': return '🐈'
    case 'rabbit': return '🐇'
    case 'bird': return '🐦'
    default: return '🐾'
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface Props {
  pets: Pet[]
  sightings?: Sighting[]
  userLocation?: { lat: number; lng: number } | null
  defaultCenter?: { lat: number; lng: number }
  defaultZoom?: number
  filter?: MapFilter
}

export default function MapView({
  pets,
  sightings = [],
  userLocation,
  defaultCenter = { lat: 35.6812362, lng: 139.7671248 },
  defaultZoom = 10,
  filter = 'all',
}: Props) {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null)

  const showLost = filter === 'all' || filter === 'lost'
  const showProtected = filter === 'all' || filter === 'protected'
  const showSightings = filter === 'all' || filter === 'sighting'

  const visiblePets = pets.filter((p) =>
    p.type === 'lost' ? showLost : showProtected
  )

  const mapSightings = sightings.filter(
    (s) => s.location.lat !== undefined && s.location.lng !== undefined
  )
  const visibleSightings = showSightings ? mapSightings : []

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        mapId="pet-rescue-map"
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
      >
        <MapBoundsController pets={visiblePets} />
        {/* 迷子・保護投稿マーカーと探知範囲円 */}
        {visiblePets.map((pet) => {
          const radiusKm = pet.searchRadiusKm ?? 5
          const circleColor = pet.type === 'lost' ? '#ef4444' : '#3b82f6'
          return (
            <Fragment key={pet.id}>
              <MapCircle
                center={{ lat: pet.location.lat, lng: pet.location.lng }}
                radius={radiusKm * 1000}
                fillColor={circleColor}
                strokeColor={circleColor}
              />
              <AdvancedMarker
                position={{ lat: pet.location.lat, lng: pet.location.lng }}
                onClick={() => { setSelectedPet(pet); setSelectedSighting(null) }}
              >
                <Pin
                  background={circleColor}
                  borderColor={pet.type === 'lost' ? '#b91c1c' : '#1d4ed8'}
                  glyphColor="white"
                  glyph={speciesGlyph(pet.species)}
                />
              </AdvancedMarker>
            </Fragment>
          )
        })}

        {/* 目撃情報マーカー（琥珀色） */}
        {visibleSightings.map((s) => (
          <AdvancedMarker
            key={`sighting-${s.id}`}
            position={{ lat: s.location.lat!, lng: s.location.lng! }}
            onClick={() => { setSelectedSighting(s); setSelectedPet(null) }}
          >
            <Pin
              background="#f59e0b"
              borderColor="#d97706"
              glyphColor="white"
              glyph={speciesGlyph(s.species ?? 'other')}
            />
          </AdvancedMarker>
        ))}

        {/* 現在位置マーカー（青い丸） */}
        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
            }}>
              <div style={{
                position: 'absolute',
                width: 28,
                height: 28,
                background: 'rgba(59, 130, 246, 0.25)',
                borderRadius: '50%',
              }} />
              <div style={{
                width: 14,
                height: 14,
                background: '#3b82f6',
                border: '2.5px solid white',
                borderRadius: '50%',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.5)',
                position: 'relative',
                zIndex: 1,
              }} />
            </div>
          </AdvancedMarker>
        )}

        {/* 迷子・保護投稿 InfoWindow */}
        {selectedPet && (
          <InfoWindow
            position={{
              lat: selectedPet.location.lat,
              lng: selectedPet.location.lng,
            }}
            onCloseClick={() => setSelectedPet(null)}
          >
            <div className="w-52">
              {selectedPet.images[0] && (
                <div className="relative h-28 rounded-lg overflow-hidden mb-2">
                  <Image
                    src={selectedPet.images[0]}
                    alt={selectedPet.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex gap-1 mb-1">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    selectedPet.type === 'lost'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {TYPE_LABELS[selectedPet.type]}
                </span>
              </div>
              <p className="font-bold text-sm text-gray-900">
                {selectedPet.name || '名前不明'}
              </p>
              <p className="text-xs text-gray-500">
                {SPECIES_LABELS[selectedPet.species]}
                {selectedPet.breed ? ` / ${selectedPet.breed}` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedPet.location.prefecture} {selectedPet.location.city}
              </p>
              <Link
                href={`/posts/${selectedPet.id}`}
                className="block mt-2 text-center text-xs bg-red-500 text-white rounded-lg py-1.5 hover:bg-red-600"
              >
                詳細を見る
              </Link>
            </div>
          </InfoWindow>
        )}

        {/* 目撃情報 InfoWindow */}
        {selectedSighting && (
          <InfoWindow
            position={{
              lat: selectedSighting.location.lat!,
              lng: selectedSighting.location.lng!,
            }}
            onCloseClick={() => setSelectedSighting(null)}
          >
            <div className="w-52">
              {selectedSighting.photos[0] && (
                <div className="relative h-28 rounded-lg overflow-hidden mb-2">
                  <Image
                    src={selectedSighting.photos[0]}
                    alt={selectedSighting.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex gap-1 mb-1 flex-wrap">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  目撃情報
                </span>
                {selectedSighting.species && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {SPECIES_LABELS[selectedSighting.species]}
                  </span>
                )}
              </div>
              <p className="font-bold text-sm text-gray-900 line-clamp-2">
                {selectedSighting.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedSighting.location.prefecture} {selectedSighting.location.city}
              </p>
              <Link
                href={`/sightings/${selectedSighting.id}`}
                className="block mt-2 text-center text-xs bg-amber-500 text-white rounded-lg py-1.5 hover:bg-amber-600"
              >
                詳細を見る
              </Link>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}

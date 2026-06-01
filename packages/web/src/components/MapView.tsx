'use client'

import { useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import Link from 'next/link'
import type { Pet } from '@pet-rescue/shared'
import { SPECIES_LABELS, TYPE_LABELS } from '@pet-rescue/shared'
import Image from 'next/image'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface Props {
  pets: Pet[]
  defaultCenter?: { lat: number; lng: number }
}

export default function MapView({
  pets,
  defaultCenter = { lat: 35.6812362, lng: 139.7671248 },
}: Props) {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={10}
        mapId="pet-rescue-map"
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
      >
        {pets.map((pet) => (
          <AdvancedMarker
            key={pet.id}
            position={{ lat: pet.location.lat, lng: pet.location.lng }}
            onClick={() => setSelectedPet(pet)}
          >
            <Pin
              background={pet.type === 'lost' ? '#ef4444' : '#3b82f6'}
              borderColor={pet.type === 'lost' ? '#b91c1c' : '#1d4ed8'}
              glyphColor="white"
              glyph={pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
            />
          </AdvancedMarker>
        ))}

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
      </Map>
    </APIProvider>
  )
}

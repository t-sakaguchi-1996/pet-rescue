'use client'

import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from '@vis.gl/react-google-maps'
import MapCircle from './MapCircle'
import type { PetSpecies, PetType } from '@pet-rescue/shared'

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
interface NearbyPet {
  id: string
  name: string
  lat: number
  lng: number
  type: PetType
  species: PetSpecies
}

interface Props {
  sightingLat: number
  sightingLng: number
  nearbyPets?: NearbyPet[]
}

export default function SightingMap({ sightingLat, sightingLng, nearbyPets = [] }: Props) {
  const center = { lat: sightingLat, lng: sightingLng }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        mapId="sighting-detail-map"
        defaultCenter={center}
        defaultZoom={12}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
      >
        {/* 目撃地点マーカー + 5km サークル */}
        <AdvancedMarker position={center}>
          <Pin background="#FFC96B" borderColor="#C46B00" glyphColor="#3D2400" glyph="👁️" />
        </AdvancedMarker>
        <MapCircle center={center} radius={5000} fillColor="#FFC96B" strokeColor="#C46B00" />

        {/* 近隣の迷子投稿マーカー + 5km サークル */}
        {nearbyPets.map((pet) => (
          <div key={pet.id}>
            <AdvancedMarker position={{ lat: pet.lat, lng: pet.lng }}>
              <Pin
                background={pet.type === 'lost' ? '#ef4444' : '#3b82f6'}
                borderColor={pet.type === 'lost' ? '#b91c1c' : '#1d4ed8'}
                glyphColor="white"
                glyph={speciesGlyph(pet.species)}
              />
            </AdvancedMarker>
            <MapCircle
              center={{ lat: pet.lat, lng: pet.lng }}
              radius={5000}
              fillColor={pet.type === 'lost' ? '#ef4444' : '#3b82f6'}
              strokeColor={pet.type === 'lost' ? '#ef4444' : '#3b82f6'}
            />
          </div>
        ))}
      </Map>
    </APIProvider>
  )
}

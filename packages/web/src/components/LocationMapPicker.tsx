'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AdvancedMarker,
  Map,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import MapCircle from './MapCircle'
import type { PetSpecies } from '@pet-rescue/shared'
import { useLoadingState } from '@/contexts/LoadingContext'

const DEFAULT_CENTER = { lat: 35.6812362, lng: 139.7671248 }

export interface LocationData {
  lat: number
  lng: number
  address: string
  prefecture: string
  city: string
}

export const SPECIES_GLYPH: Record<PetSpecies, string> = {
  dog: '🐕',
  cat: '🐈',
  rabbit: '🐇',
  bird: '🐦',
  other: '🐾',
}

interface Props {
  mapInstanceId?: string
  pinLocation: { lat: number; lng: number } | null
  species?: PetSpecies
  searchRadiusKm?: number
  showRadiusCircle?: boolean
  draggable?: boolean
  autoDetectOnMount?: boolean
  onPinChange: (loc: LocationData) => void
}

export default function LocationMapPicker({
  mapInstanceId = 'location-picker-map',
  pinLocation,
  species = 'other',
  searchRadiusKm = 5,
  showRadiusCircle = false,
  draggable = true,
  autoDetectOnMount = false,
  onPinChange,
}: Props) {
  const map = useMap(mapInstanceId)
  const geocodingLib = useMapsLibrary('geocoding')
  const { startLoading, stopLoading } = useLoadingState()
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const autoDetectDone = useRef(false)
  const prevPinRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder())
  }, [geocodingLib])

  // Auto-detect current location on mount — only centers the map, does not place a pin
  useEffect(() => {
    if (!autoDetectOnMount || autoDetectDone.current || pinLocation || !map) return
    autoDetectDone.current = true
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        map.setZoom(13)
      },
      () => {},
      { timeout: 8000 }
    )
  }, [autoDetectOnMount, pinLocation, map])

  // Pan map when parent updates pinLocation externally (e.g. forward geocoding)
  useEffect(() => {
    if (!pinLocation || !map) return
    const prev = prevPinRef.current
    if (prev && prev.lat === pinLocation.lat && prev.lng === pinLocation.lng) return
    prevPinRef.current = pinLocation
    map.panTo(pinLocation)
    map.setZoom(15)
  }, [pinLocation, map])

  const reverseGeocode = useCallback(
    async (pos: { lat: number; lng: number }) => {
      if (!geocoder) {
        onPinChange({ ...pos, address: '', prefecture: '', city: '' })
        return
      }
      startLoading()
      try {
        const result = await geocoder.geocode({ location: pos })
        if (result.results[0]) {
          const comps = result.results[0]
            .address_components as google.maps.GeocoderAddressComponent[]
          const prefecture =
            comps.find((c) => c.types.includes('administrative_area_level_1'))?.long_name ?? ''
          const city =
            comps.find((c) => c.types.includes('locality'))?.long_name ??
            comps.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ??
            ''
          onPinChange({
            lat: pos.lat,
            lng: pos.lng,
            address: result.results[0].formatted_address,
            prefecture,
            city,
          })
        }
      } catch {
        onPinChange({ ...pos, address: '', prefecture: '', city: '' })
      } finally {
        stopLoading()
      }
    },
    [geocoder, onPinChange, startLoading, stopLoading]
  )

  const handleMapClick = useCallback(
    (e: { detail: { latLng: { lat: number; lng: number } | null } }) => {
      if (!draggable) return
      const pos = e.detail.latLng
      if (!pos) return
      void reverseGeocode({ lat: pos.lat, lng: pos.lng })
    },
    [draggable, reverseGeocode]
  )

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return
    setGettingLocation(true)
    startLoading()
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        map?.panTo(newPos)
        map?.setZoom(15)
        void reverseGeocode(newPos)
        setGettingLocation(false)
        stopLoading()
      },
      () => {
        setGettingLocation(false)
        stopLoading()
      },
      { timeout: 10000 }
    )
  }

  const initialCenter = pinLocation ?? DEFAULT_CENTER
  const initialZoom = pinLocation ? 15 : 12

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          地図をクリックして場所を指定
          {pinLocation ? (
            <span className="text-green-600 font-medium ml-2">✓ 設定済み</span>
          ) : (
            <span className="text-red-500 font-medium ml-2">（必須）</span>
          )}
        </p>
        {draggable && (
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={gettingLocation || !geocoder}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: '#FFF3DC', color: '#7A4500', border: '1px solid #FFD98A' }}
          >
            📍 {gettingLocation ? '取得中...' : '現在位置'}
          </button>
        )}
      </div>
      <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
        <Map
          id={mapInstanceId}
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          mapId={mapInstanceId}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          onClick={draggable ? handleMapClick : undefined}
        >
          {pinLocation && (
            <AdvancedMarker position={pinLocation}>
              <Pin
                background="#ef4444"
                borderColor="#b91c1c"
                glyphColor="white"
                glyph={SPECIES_GLYPH[species]}
              />
            </AdvancedMarker>
          )}
          {pinLocation && showRadiusCircle && (
            <MapCircle
              center={pinLocation}
              radius={searchRadiusKm * 1000}
              fillColor="#ef4444"
              strokeColor="#ef4444"
            />
          )}
        </Map>
      </div>
    </div>
  )
}

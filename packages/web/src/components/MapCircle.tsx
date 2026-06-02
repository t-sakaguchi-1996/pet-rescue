'use client'

import { useEffect } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

interface Props {
  center: { lat: number; lng: number }
  radius?: number
  fillColor?: string
  strokeColor?: string
}

export default function MapCircle({
  center,
  radius = 5000,
  fillColor = '#4285F4',
  strokeColor = '#4285F4',
}: Props) {
  const map = useMap()
  const mapsLib = useMapsLibrary('maps')

  useEffect(() => {
    if (!map || !mapsLib) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circle = new (mapsLib as any).Circle({
      map,
      center,
      radius,
      fillColor,
      fillOpacity: 0.15,
      strokeColor,
      strokeOpacity: 0.7,
      strokeWeight: 2,
    })

    return () => {
      circle.setMap(null)
    }
  // center オブジェクト参照変化を避けるため lat/lng を個別依存
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapsLib, center.lat, center.lng, radius, fillColor, strokeColor])

  return null
}

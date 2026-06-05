import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps'
import LoadingIndicator from './LoadingIndicator'
import * as Location from 'expo-location'

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const DEFAULT_LAT = 35.6812362
const DEFAULT_LNG = 139.7671248

export interface LocationData {
  lat: number
  lng: number
  address: string
  prefecture: string
  city: string
}

interface Props {
  pinLocation: { lat: number; lng: number } | null
  onPinChange: (loc: LocationData) => void
  draggable?: boolean
  showRadiusCircle?: boolean
  searchRadiusKm?: number
}

export default function LocationMapPicker({
  pinLocation,
  onPinChange,
  draggable = true,
  showRadiusCircle = false,
  searchRadiusKm = 5,
}: Props) {
  const mapRef = useRef<MapView>(null)
  const [busy, setBusy] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')

  // Animate map to new pin; when circle is shown, fit the full radius
  useEffect(() => {
    if (!pinLocation || !mapRef.current) return
    const delta = showRadiusCircle
      ? (searchRadiusKm / 111.32) * 2.4  // diameter in degrees + 20% padding
      : 0.01
    mapRef.current.animateToRegion(
      {
        latitude: pinLocation.lat,
        longitude: pinLocation.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      400,
    )
  }, [pinLocation?.lat, pinLocation?.lng, showRadiusCircle, searchRadiusKm])

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setBusy(true)
      setBusyMsg('住所検索中...')
      try {
        if (GOOGLE_MAPS_API_KEY) {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=ja`
          const res = await fetch(url)
          const data = (await res.json()) as {
            results: {
              formatted_address: string
              address_components: { long_name: string; types: string[] }[]
            }[]
          }
          if (data.results?.[0]) {
            const comps = data.results[0].address_components
            const prefecture =
              comps.find((c) => c.types.includes('administrative_area_level_1'))?.long_name ?? ''
            const city =
              comps.find(
                (c) =>
                  c.types.includes('locality') ||
                  c.types.includes('administrative_area_level_2'),
              )?.long_name ?? ''
            onPinChange({ lat, lng, prefecture, city, address: data.results[0].formatted_address })
            return
          }
        }
        // Fallback: expo-location reverse geocode
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        if (results[0]) {
          const { region, city, district, streetNumber, street } = results[0]
          onPinChange({
            lat,
            lng,
            prefecture: region ?? '',
            city: city ?? district ?? '',
            address: [streetNumber, street].filter(Boolean).join(' '),
          })
        } else {
          onPinChange({ lat, lng, prefecture: '', city: '', address: '' })
        }
      } catch {
        onPinChange({ lat, lng, prefecture: '', city: '', address: '' })
      } finally {
        setBusy(false)
        setBusyMsg('')
      }
    },
    [onPinChange],
  )

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      if (!draggable) return
      const { latitude, longitude } = e.nativeEvent.coordinate
      void reverseGeocode(latitude, longitude)
    },
    [draggable, reverseGeocode],
  )

  const handleCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    setBusy(true)
    setBusyMsg('現在地を取得中...')
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude)
    } catch {
      setBusy(false)
      setBusyMsg('')
    }
  }

  const fitDelta = showRadiusCircle ? (searchRadiusKm / 111.32) * 2.4 : 0.01
  const initialRegion = {
    latitude: pinLocation?.lat ?? DEFAULT_LAT,
    longitude: pinLocation?.lng ?? DEFAULT_LNG,
    latitudeDelta: pinLocation ? fitDelta : 0.05,
    longitudeDelta: pinLocation ? fitDelta : 0.05,
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View>
        <View style={styles.row}>
          <Text style={styles.hint}>場所を都道府県・市区町村で入力してください</Text>
          {draggable && (
            <TouchableOpacity style={styles.locBtn} onPress={handleCurrentLocation} disabled={busy}>
              <Text style={styles.locBtnText}>📍 現在地取得</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.noMapPlaceholder}>
          <Text style={styles.noMapText}>📍</Text>
          <Text style={styles.noMapLabel}>
            {pinLocation
              ? `✓ 座標取得済み (${pinLocation.lat.toFixed(4)}, ${pinLocation.lng.toFixed(4)})`
              : '地図は現在利用できません\n都道府県・市区町村で場所を入力してください'}
          </Text>
          {busy && <LoadingIndicator label={busyMsg} />}
        </View>
      </View>
    )
  }

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.hint}>
          地図をタップして場所を指定
          {pinLocation ? (
            <Text style={styles.setOk}> ✓ 設定済み</Text>
          ) : (
            <Text style={styles.setRequired}>（必須）</Text>
          )}
        </Text>
        {draggable && (
          <TouchableOpacity
            style={styles.locBtn}
            onPress={handleCurrentLocation}
            disabled={busy}
          >
            <Text style={styles.locBtnText}>📍 現在地</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onPress={draggable ? handleMapPress : undefined}
          scrollEnabled
          zoomEnabled
        >
          {pinLocation && (
            <Marker
              coordinate={{ latitude: pinLocation.lat, longitude: pinLocation.lng }}
              pinColor="#C46B00"
            />
          )}
          {pinLocation && showRadiusCircle && (
            <Circle
              center={{ latitude: pinLocation.lat, longitude: pinLocation.lng }}
              radius={searchRadiusKm * 1000}
              fillColor="rgba(255,201,107,0.15)"
              strokeColor="rgba(196,107,0,0.5)"
              strokeWidth={1.5}
            />
          )}
        </MapView>

        {busy && (
          <View style={styles.overlay}>
            <LoadingIndicator label={busyMsg} />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hint: { fontSize: 12, color: '#6b7280', flex: 1 },
  setOk: { color: '#10b981', fontWeight: '600' },
  setRequired: { color: '#ef4444', fontWeight: '600' },
  locBtn: {
    backgroundColor: '#FFF3DC',
    borderWidth: 1,
    borderColor: '#FFD98A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locBtnText: { fontSize: 12, fontWeight: '600', color: '#7A4500' },
  mapWrapper: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  map: { flex: 1 },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overlayText: { fontSize: 12, color: '#7A4500', fontWeight: '600' },
  noMapPlaceholder: {
    height: 120, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center',
    padding: 16, gap: 8,
  },
  noMapText: { fontSize: 32 },
  noMapLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
})

import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native'
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { fetchPets } from '../../src/lib/firestore'
import type { Pet } from '../../src/types'
import { TYPE_LABELS, SPECIES_LABELS } from '../../src/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  rabbit: '🐇',
  bird: '🐦',
  other: '🐾',
}

export default function MapScreen() {
  const router = useRouter()
  const mapRef = useRef<MapView>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)

  const INITIAL_REGION = {
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }

  useEffect(() => {
    fetchPets({ status: 'searching', limitCount: 200 })
      .then(setPets)
      .finally(() => setLoading(false))

    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          mapRef.current?.animateToRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          })
        })
      }
    })
  }, [])

  const petsWithLocation = pets.filter(
    (p) => p.location.lat && p.location.lng
  )

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#C46B00" size="large" />
          <Text style={styles.loadingText}>地図を読み込み中...</Text>
        </View>
      ) : null}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedPet(null)}
      >
        {petsWithLocation.map((pet) => (
          <Marker
            key={pet.id}
            coordinate={{ latitude: pet.location.lat, longitude: pet.location.lng }}
            onPress={() => setSelectedPet(pet)}
          >
            <View style={[
              styles.markerContainer,
              { backgroundColor: pet.type === 'lost' ? '#ef4444' : '#3b82f6' },
            ]}>
              <Text style={styles.markerEmoji}>{SPECIES_EMOJI[pet.species] ?? '🐾'}</Text>
            </View>
          </Marker>
        ))}

        {userLocation && (
          <Circle
            center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            radius={500}
            fillColor="rgba(59, 130, 246, 0.1)"
            strokeColor="rgba(59, 130, 246, 0.3)"
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* 現在地ボタン */}
      {userLocation && (
        <TouchableOpacity
          style={styles.myLocationBtn}
          onPress={() => {
            mapRef.current?.animateToRegion({
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            })
          }}
        >
          <Text style={styles.myLocationIcon}>📍</Text>
        </TouchableOpacity>
      )}

      {/* カウンターバッジ */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          🐾 {petsWithLocation.length}件表示中
          {petsWithLocation.length < pets.length ? ` (${pets.length - petsWithLocation.length}件は位置情報なし)` : ''}
        </Text>
      </View>

      {/* ペット選択パネル */}
      {selectedPet && (
        <TouchableOpacity
          style={styles.petPanel}
          onPress={() => router.push(`/pet/${selectedPet.id}`)}
          activeOpacity={0.9}
        >
          <View style={styles.petPanelContent}>
            <View style={[
              styles.petPanelBadge,
              { backgroundColor: selectedPet.type === 'lost' ? '#fee2e2' : '#dbeafe' },
            ]}>
              <Text style={[
                styles.petPanelBadgeText,
                { color: selectedPet.type === 'lost' ? '#ef4444' : '#3b82f6' },
              ]}>
                {TYPE_LABELS[selectedPet.type]}
              </Text>
            </View>
            <Text style={styles.petPanelEmoji}>{SPECIES_EMOJI[selectedPet.species] ?? '🐾'}</Text>
            <View style={styles.petPanelInfo}>
              <Text style={styles.petPanelName}>{selectedPet.name || '名前不明'}</Text>
              <Text style={styles.petPanelSpecies}>
                {SPECIES_LABELS[selectedPet.species]}
                {selectedPet.breed ? ` / ${selectedPet.breed}` : ''}
              </Text>
              <Text style={styles.petPanelLocation}>
                📍 {selectedPet.location.prefecture} {selectedPet.location.city}
              </Text>
            </View>
            <Text style={styles.petPanelArrow}>›</Text>
          </View>
          <Text style={styles.petPanelHint}>タップして詳細を見る</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: '#7A4500', fontSize: 14 },

  markerContainer: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
    borderWidth: 2, borderColor: '#fff',
  },
  markerEmoji: { fontSize: 18 },

  myLocationBtn: {
    position: 'absolute', right: 16, bottom: 140,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  myLocationIcon: { fontSize: 22 },

  countBadge: {
    position: 'absolute', top: 12, left: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
    alignItems: 'center',
  },
  countText: { fontSize: 12, color: '#7A4500', fontWeight: '600' },

  petPanel: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
    borderWidth: 1.5, borderColor: '#FFD98A',
  },
  petPanelContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  petPanelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  petPanelBadgeText: { fontSize: 11, fontWeight: 'bold' },
  petPanelEmoji: { fontSize: 28 },
  petPanelInfo: { flex: 1 },
  petPanelName: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  petPanelSpecies: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  petPanelLocation: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  petPanelArrow: { fontSize: 24, color: '#9ca3af' },
  petPanelHint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
})

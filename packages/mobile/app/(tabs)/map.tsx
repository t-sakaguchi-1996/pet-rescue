import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { fetchPets, fetchRecentSightings } from '../../src/lib/firestore'
import type { Pet, Sighting } from '../../src/types'
import { TYPE_LABELS, SPECIES_LABELS } from '../../src/types'
import LoadingIndicator from '../../src/components/LoadingIndicator'

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

// Google Maps API key がない場合にクラッシュを防ぐため、条件付きで import する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MapView: any = null, Marker: any = null, Circle: any = null, PROVIDER_GOOGLE: any = undefined
if (GOOGLE_MAPS_API_KEY) {
  const maps = require('react-native-maps')
  MapView = maps.default
  Marker = maps.Marker
  Circle = maps.Circle
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', other: '🐾',
}

type MapFilter = 'all' | 'lost' | 'protected' | 'sighting'

const FILTER_TABS: { key: MapFilter; label: string; emoji: string }[] = [
  { key: 'all', label: 'すべて', emoji: '🗺️' },
  { key: 'lost', label: '迷子', emoji: '🔴' },
  { key: 'protected', label: '保護', emoji: '🔵' },
  { key: 'sighting', label: '目撃', emoji: '👁️' },
]

type SelectedItem =
  | { kind: 'pet'; data: Pet }
  | { kind: 'sighting'; data: Sighting }

export default function MapScreen() {
  const router = useRouter()
  const mapRef = useRef<MapView>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [filter, setFilter] = useState<MapFilter>('all')
  const markerJustPressed = useRef(false)

  const INITIAL_REGION = {
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }

  useEffect(() => {
    Promise.all([
      fetchPets({ limitCount: 200 }),
      fetchRecentSightings(100),
    ]).then(([p, s]) => {
      setPets(p)
      setSightings(s)
    }).finally(() => setLoading(false))

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

  const petsWithLocation = pets.filter((p) => {
    if (!p.location.lat || !p.location.lng) return false
    if (filter === 'all') return true
    if (filter === 'lost') return p.type === 'lost' && p.status === 'searching'
    if (filter === 'protected') return p.type === 'found'
    return false
  })

  const sightingsWithLocation = sightings.filter((s) => {
    if (!s.location.lat || !s.location.lng) return false
    return filter === 'all' || filter === 'sighting'
  })

  const totalVisible = petsWithLocation.length + (filter !== 'lost' && filter !== 'protected' ? sightingsWithLocation.length : 0)

  if (!GOOGLE_MAPS_API_KEY || !MapView) {
    return (
      <View style={styles.noMapContainer}>
        <Text style={styles.noMapEmoji}>🗺️</Text>
        <Text style={styles.noMapTitle}>地図を表示できません</Text>
        <Text style={styles.noMapDesc}>
          Google Maps API キーが設定されていません。{'\n'}
          開発者に連絡するか、EXPO_PUBLIC_GOOGLE_MAPS_API_KEY を設定して{'\n'}
          再ビルドしてください。
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <LoadingIndicator label="地図を読み込み中..." />
        </View>
      ) : null}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => {
          if (markerJustPressed.current) { markerJustPressed.current = false; return }
          setSelected(null)
        }}
      >
        {/* ペットマーカー */}
        {petsWithLocation.map((pet) => (
          <Marker
            key={`pet-${pet.id}`}
            coordinate={{ latitude: pet.location.lat, longitude: pet.location.lng }}
            onPress={(e) => { e.stopPropagation?.(); markerJustPressed.current = true; setSelected({ kind: 'pet', data: pet }) }}
            tracksViewChanges={Platform.OS !== 'ios'}
          >
            <View
              pointerEvents="none"
              style={[
                styles.markerContainer,
                { backgroundColor: pet.type === 'lost' ? '#ef4444' : '#3b82f6' },
              ]}
            >
              <Text style={styles.markerEmoji}>{SPECIES_EMOJI[pet.species] ?? '🐾'}</Text>
            </View>
          </Marker>
        ))}

        {/* 目撃情報マーカー */}
        {(filter === 'all' || filter === 'sighting') && sightingsWithLocation.map((s) => (
          <Marker
            key={`sighting-${s.id}`}
            coordinate={{ latitude: s.location.lat!, longitude: s.location.lng! }}
            onPress={(e) => { e.stopPropagation?.(); markerJustPressed.current = true; setSelected({ kind: 'sighting', data: s }) }}
            tracksViewChanges={Platform.OS !== 'ios'}
          >
            <View pointerEvents="none" style={styles.sightingMarker}>
              <Text style={styles.markerEmoji}>{s.species ? (SPECIES_EMOJI[s.species] ?? '👁️') : '👁️'}</Text>
            </View>
          </Marker>
        ))}

        {/* ユーザー位置の円 */}
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

      {/* フィルタータブ */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
                {tab.emoji} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* カウンターバッジ */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          🐾 {petsWithLocation.length}件のペット
          {(filter === 'all' || filter === 'sighting') && sightingsWithLocation.length > 0
            ? `  👁️ ${sightingsWithLocation.length}件の目撃`
            : ''}
        </Text>
      </View>

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

      {/* 選択パネル - ペット */}
      {selected?.kind === 'pet' && (
        <TouchableOpacity
          style={styles.infoPanel}
          onPress={() => router.push(`/pet/${selected.data.id}`)}
          activeOpacity={0.92}
        >
          {selected.data.images[0] ? (
            <Image
              source={{ uri: selected.data.images[0] }}
              style={styles.infoPanelImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.infoPanelImageFallback, { backgroundColor: selected.data.type === 'lost' ? '#fee2e2' : '#dbeafe' }]}>
              <Text style={styles.infoPanelFallbackEmoji}>{SPECIES_EMOJI[selected.data.species] ?? '🐾'}</Text>
            </View>
          )}
          <View style={styles.infoPanelBody}>
            <View style={styles.infoPanelBadgeRow}>
              <View style={[
                styles.infoPanelBadge,
                { backgroundColor: selected.data.type === 'lost' ? '#fee2e2' : '#dbeafe' },
              ]}>
                <Text style={[
                  styles.infoPanelBadgeText,
                  { color: selected.data.type === 'lost' ? '#ef4444' : '#3b82f6' },
                ]}>
                  {TYPE_LABELS[selected.data.type]}
                </Text>
              </View>
              <Text style={styles.infoPanelSpecies}>
                {SPECIES_LABELS[selected.data.species]}
                {selected.data.breed ? ` / ${selected.data.breed}` : ''}
              </Text>
            </View>
            <Text style={styles.infoPanelName} numberOfLines={1}>
              {selected.data.name || '名前不明'}
            </Text>
            <Text style={styles.infoPanelLocation}>
              📍 {selected.data.location.prefecture} {selected.data.location.city}
            </Text>
          </View>
          <View style={[styles.infoPanelBtn, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.infoPanelBtnText}>詳細を見る</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 選択パネル - 目撃情報 */}
      {selected?.kind === 'sighting' && (
        <TouchableOpacity
          style={styles.infoPanel}
          onPress={() => router.push(`/sightings/${selected.data.id}`)}
          activeOpacity={0.92}
        >
          {selected.data.photos[0] ? (
            <Image
              source={{ uri: selected.data.photos[0] }}
              style={styles.infoPanelImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.infoPanelImageFallback, { backgroundColor: '#FFF3DC' }]}>
              <Text style={styles.infoPanelFallbackEmoji}>
                {selected.data.species ? (SPECIES_EMOJI[selected.data.species] ?? '👁️') : '👁️'}
              </Text>
            </View>
          )}
          <View style={styles.infoPanelBody}>
            <View style={styles.infoPanelBadgeRow}>
              <View style={[styles.infoPanelBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.infoPanelBadgeText, { color: '#d97706' }]}>目撃情報</Text>
              </View>
              {selected.data.species && (
                <Text style={styles.infoPanelSpecies}>{SPECIES_LABELS[selected.data.species]}</Text>
              )}
            </View>
            <Text style={styles.infoPanelName} numberOfLines={2}>
              {selected.data.title}
            </Text>
            <Text style={styles.infoPanelLocation}>
              📍 {selected.data.location.prefecture} {selected.data.location.city}
            </Text>
          </View>
          <View style={[styles.infoPanelBtn, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.infoPanelBtnText}>詳細を見る</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  noMapContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f9fafb' },
  noMapEmoji: { fontSize: 56, marginBottom: 16 },
  noMapTitle: { fontSize: 17, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  noMapDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: '#7A4500', fontSize: 14 },

  markerContainer: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 3,
    } : {}),
    borderWidth: 2, borderColor: '#fff',
  },
  sightingMarker: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFC96B',
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 3,
    } : {}),
    borderWidth: 2, borderColor: '#fff',
  },
  markerEmoji: { fontSize: 18 },

  filterBar: {
    position: 'absolute', top: 12, left: 0, right: 0,
    zIndex: 5,
  },
  filterContent: { paddingHorizontal: 12, gap: 6 },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: '#FFD98A',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  filterTabActive: { backgroundColor: '#C46B00', borderColor: '#C46B00' },
  filterTabText: { fontSize: 12, fontWeight: 'bold', color: '#8B5E1A' },
  filterTabTextActive: { color: '#fff' },

  countBadge: {
    position: 'absolute', bottom: 160, left: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
    alignItems: 'center',
  },
  countText: { fontSize: 12, color: '#7A4500', fontWeight: '600' },

  myLocationBtn: {
    position: 'absolute', right: 16, bottom: 160,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  myLocationIcon: { fontSize: 22 },

  infoPanel: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 8,
    borderWidth: 1.5, borderColor: '#FFD98A',
  },
  infoPanelImage: {
    width: '100%', height: 110,
  },
  infoPanelImageFallback: {
    width: '100%', height: 110,
    alignItems: 'center', justifyContent: 'center',
  },
  infoPanelFallbackEmoji: { fontSize: 44 },
  infoPanelBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  infoPanelBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoPanelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  infoPanelBadgeText: { fontSize: 11, fontWeight: 'bold' },
  infoPanelSpecies: { fontSize: 11, color: '#6b7280' },
  infoPanelName: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
  infoPanelLocation: { fontSize: 11, color: '#9ca3af' },
  infoPanelBtn: {
    marginHorizontal: 14, marginBottom: 12, paddingVertical: 9,
    borderRadius: 10, alignItems: 'center',
  },
  infoPanelBtnText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
})

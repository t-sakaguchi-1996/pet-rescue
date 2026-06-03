import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import Constants from 'expo-constants'
import { fetchPets } from '../../src/lib/firestore'
import type { Pet } from '../../src/types'
import { TYPE_LABELS, SPECIES_LABELS } from '../../src/types'

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient'

// react-native-maps は Expo Go 非対応のため条件付きロード
let NativeMapView: React.ComponentType<any> | null = null
let NativeMarker: React.ComponentType<any> | null = null
let NativeCallout: React.ComponentType<any> | null = null

if (!isExpoGo) {
  try {
    const maps = require('react-native-maps')
    NativeMapView = maps.default
    NativeMarker = maps.Marker
    NativeCallout = maps.Callout
  } catch {
    // native module unavailable
  }
}

export default function MapScreen() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [region, setRegion] = useState({
    latitude: 35.6812362,
    longitude: 139.7671248,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })

  useEffect(() => {
    fetchPets({ status: 'searching', limitCount: 200 }).then(setPets)

    if (!isExpoGo) {
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') {
          Location.getCurrentPositionAsync({}).then(({ coords }) => {
            setRegion((r) => ({
              ...r,
              latitude: coords.latitude,
              longitude: coords.longitude,
            }))
          })
        }
      })
    }
  }, [])

  // Expo Go：カード一覧で代替表示
  if (isExpoGo || !NativeMapView) {
    return (
      <View style={styles.container}>
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🗺️</Text>
          <Text style={styles.bannerTitle}>地図表示はアプリビルド版で利用できます</Text>
          <Text style={styles.bannerSub}>現在は一覧表示でご確認ください</Text>
        </View>
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => router.push(`/pet/${item.id}`)}
            >
              {item.images[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbEmoji}>
                    {item.species === 'dog' ? '🐕' : item.species === 'cat' ? '🐈' : '🐾'}
                  </Text>
                </View>
              )}
              <View style={styles.listContent}>
                <View style={styles.listBadgeRow}>
                  <View style={[styles.badge, item.type === 'lost' ? styles.badgeLost : styles.badgeFound]}>
                    <Text style={[styles.badgeText, item.type === 'lost' ? styles.badgeLostText : styles.badgeFoundText]}>
                      {TYPE_LABELS[item.type]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.listName}>{item.name || '名前不明'}</Text>
                <Text style={styles.listSpecies}>{SPECIES_LABELS[item.species]}</Text>
                <Text style={styles.listLocation}>
                  📍 {item.location.prefecture} {item.location.city}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>表示できるペットがありません</Text>
            </View>
          }
        />
      </View>
    )
  }

  // ネイティブビルド：地図表示
  const MapViewComp = NativeMapView
  const MarkerComp = NativeMarker
  const CalloutComp = NativeCallout

  return (
    <View style={styles.container}>
      <MapViewComp
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {MarkerComp && CalloutComp && pets.map((pet) => (
          <MarkerComp
            key={pet.id}
            coordinate={{ latitude: pet.location.lat, longitude: pet.location.lng }}
            pinColor={pet.type === 'lost' ? '#ef4444' : '#3b82f6'}
          >
            <CalloutComp onPress={() => router.push(`/pet/${pet.id}`)}>
              <View style={styles.callout}>
                {pet.images[0] && (
                  <Image source={{ uri: pet.images[0] }} style={styles.calloutImage} />
                )}
                <View style={styles.calloutContent}>
                  <Text style={styles.calloutName}>{pet.name || '名前不明'}</Text>
                  <Text style={styles.calloutSpecies}>
                    {SPECIES_LABELS[pet.species]}
                    {pet.breed ? ` / ${pet.breed}` : ''}
                  </Text>
                  <Text style={styles.calloutLocation}>
                    {pet.location.prefecture} {pet.location.city}
                  </Text>
                  <Text style={styles.calloutAction}>タップして詳細</Text>
                </View>
              </View>
            </CalloutComp>
          </MarkerComp>
        ))}
      </MapViewComp>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>迷子</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>保護</Text>
        </View>
        <Text style={styles.legendCount}>{pets.length}件表示中</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  map: { flex: 1 },
  banner: {
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
    padding: 16,
    alignItems: 'center',
  },
  bannerIcon: { fontSize: 28, marginBottom: 4 },
  bannerTitle: { fontSize: 13, fontWeight: '600', color: '#92400e', textAlign: 'center' },
  bannerSub: { fontSize: 12, color: '#b45309', marginTop: 2 },
  list: { padding: 12 },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  thumbnail: { width: 80, height: 80 },
  thumbPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 32 },
  listContent: { flex: 1, padding: 10, justifyContent: 'center' },
  listBadgeRow: { flexDirection: 'row', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeLost: { backgroundColor: '#fee2e2' },
  badgeFound: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  badgeLostText: { color: '#ef4444' },
  badgeFoundText: { color: '#3b82f6' },
  listName: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  listSpecies: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  listLocation: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#9ca3af' },
  callout: { flexDirection: 'row', width: 200, padding: 4 },
  calloutImage: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  calloutContent: { flex: 1 },
  calloutName: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
  calloutSpecies: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  calloutLocation: { fontSize: 11, color: '#6b7280' },
  calloutAction: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginTop: 4 },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#374151' },
  legendCount: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
})

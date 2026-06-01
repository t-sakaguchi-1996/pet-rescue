import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { fetchPets } from '../../src/lib/firestore'
import type { Pet } from '../../../shared/src/types'
import { TYPE_LABELS, SPECIES_LABELS } from '../../../shared/src/types'

export default function MapScreen() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [region, setRegion] = useState({
    latitude: 35.6812362,
    longitude: 139.7671248,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })

  useEffect(() => {
    fetchPets({ status: 'searching', limitCount: 200 }).then(setPets)

    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({}).then(({ coords }) => {
          setUserLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
          setRegion((r) => ({
            ...r,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }))
        })
      }
    })
  }, [])

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {pets.map((pet) => (
          <Marker
            key={pet.id}
            coordinate={{
              latitude: pet.location.lat,
              longitude: pet.location.lng,
            }}
            pinColor={pet.type === 'lost' ? '#ef4444' : '#3b82f6'}
          >
            <Callout onPress={() => router.push(`/pet/${pet.id}`)}>
              <View style={styles.callout}>
                {pet.images[0] && (
                  <Image
                    source={{ uri: pet.images[0] }}
                    style={styles.calloutImage}
                  />
                )}
                <View style={styles.calloutContent}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          pet.type === 'lost' ? '#fee2e2' : '#dbeafe',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color: pet.type === 'lost' ? '#ef4444' : '#3b82f6',
                        },
                      ]}
                    >
                      {TYPE_LABELS[pet.type]}
                    </Text>
                  </View>
                  <Text style={styles.calloutName}>
                    {pet.name || '名前不明'}
                  </Text>
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
            </Callout>
          </Marker>
        ))}
      </MapView>

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
  container: { flex: 1 },
  map: { flex: 1 },
  callout: { flexDirection: 'row', width: 200, padding: 4 },
  calloutImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  calloutContent: { flex: 1 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  calloutName: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
  calloutSpecies: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  calloutLocation: { fontSize: 11, color: '#6b7280' },
  calloutAction: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 4,
  },
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

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { fetchPets } from '../../src/lib/firestore'
import type { Pet } from '../../src/types'
import { TYPE_LABELS, SPECIES_LABELS } from '../../src/types'

export default function MapScreen() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])

  useEffect(() => {
    fetchPets({ status: 'searching', limitCount: 200 }).then(setPets)
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>🗺️</Text>
        <Text style={styles.bannerTitle}>地図表示は準備中です</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
})

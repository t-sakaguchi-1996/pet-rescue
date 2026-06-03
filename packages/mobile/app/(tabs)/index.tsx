import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { fetchPets } from '../../src/lib/firestore'
import PetCard from '../../src/components/PetCard'
import type { Pet } from '../../src/types'

export default function HomeScreen() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await fetchPets({
        status: 'searching',
        species: (speciesFilter as Pet['species']) || undefined,
        type: (typeFilter as Pet['type']) || undefined,
        limitCount: 50,
      })
      setPets(data)
    } catch (e) {
      console.error('fetchPets error:', e)
      setError('データの取得に失敗しました。\nネットワーク接続を確認してください。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [speciesFilter, typeFilter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const filters = [
    { label: 'すべて', species: '', type: '' },
    { label: '迷子犬', species: 'dog', type: 'lost' },
    { label: '迷子猫', species: 'cat', type: 'lost' },
    { label: '保護犬猫', species: '', type: 'found' },
  ]

  return (
    <View style={styles.container}>
      {/* フィルタータブ */}
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = speciesFilter === f.species && typeFilter === f.type
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => {
                setSpeciesFilter(f.species)
                setTypeFilter(f.type)
              }}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load() }}>
            <Text style={styles.retryText}>再読み込み</Text>
          </TouchableOpacity>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyText}>該当するペットがいません</Text>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ef4444"
            />
          }
          renderItem={({ item }) => (
            <PetCard
              pet={item}
              onPress={() => router.push(`/pet/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#ef4444' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#9ca3af' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  list: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
})

import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { fetchSightingsFiltered } from '../../src/lib/firestore'
import { SPECIES_LABELS, PREFECTURES, type Sighting, type PetSpecies } from '../../src/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const SPECIES_OPTIONS: { value: PetSpecies | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'dog', label: '犬' },
  { value: 'cat', label: '猫' },
  { value: 'rabbit', label: 'うさぎ' },
  { value: 'bird', label: '鳥' },
  { value: 'other', label: 'その他' },
]

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', other: '🐾',
}

export default function SightingsScreen() {
  const router = useRouter()
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [species, setSpecies] = useState<PetSpecies | ''>('')
  const [showPrefPicker, setShowPrefPicker] = useState(false)
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchSightingsFiltered({
        prefecture: prefecture || undefined,
        city: city.trim() || undefined,
        species: (species as PetSpecies) || undefined,
        limitCount: 100,
      })
      setSightings(result)
    } finally {
      setLoading(false)
    }
  }, [prefecture, city, species])

  useEffect(() => { void load() }, [load])

  const handleReset = () => {
    setPrefecture('')
    setCity('')
    setSpecies('')
  }

  const renderItem = ({ item }: { item: Sighting }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/sightings/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* 写真またはプレースホルダー */}
      {item.photos.length > 0 ? (
        <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImageEmoji}>
            {item.species ? (SPECIES_EMOJI[item.species] ?? '👁️') : '👁️'}
          </Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardBadges}>
          {item.species && (
            <View style={styles.speciesBadge}>
              <Text style={styles.speciesBadgeText}>{SPECIES_LABELS[item.species]}</Text>
            </View>
          )}
          {item.isBestInfo && (
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>⭐ 最有力</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardLocation} numberOfLines={1}>
          📍 {item.location.prefecture} {item.location.city}
        </Text>
        <Text style={styles.cardMeta}>
          {item.posterName} · {format(new Date(item.createdAt), 'M/d', { locale: ja })}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👁️ 目撃情報一覧</Text>
          <Text style={styles.headerSub}>みんなが投稿した目撃情報</Text>
        </View>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => router.push('/sightings/new')}
        >
          <Text style={styles.postBtnText}>＋ 投稿（+2pt）</Text>
        </TouchableOpacity>
      </View>

      {/* フィルター */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* 都道府県 */}
          <TouchableOpacity
            style={[styles.filterChip, prefecture && styles.filterChipActive]}
            onPress={() => setShowPrefPicker(!showPrefPicker)}
          >
            <Text style={[styles.filterChipText, prefecture && styles.filterChipTextActive]}>
              {prefecture || '都道府県'}
            </Text>
          </TouchableOpacity>

          {/* 市区町村 */}
          <TextInput
            style={[styles.filterInput, city && styles.filterChipActive]}
            placeholder="市区町村"
            placeholderTextColor="#B08050"
            value={city}
            onChangeText={setCity}
            editable={!!prefecture}
          />

          {/* 動物種 */}
          <TouchableOpacity
            style={[styles.filterChip, species && styles.filterChipActive]}
            onPress={() => setShowSpeciesPicker(!showSpeciesPicker)}
          >
            <Text style={[styles.filterChipText, species && styles.filterChipTextActive]}>
              {species ? SPECIES_LABELS[species] : '動物種'}
            </Text>
          </TouchableOpacity>

          {/* リセット */}
          {(prefecture || city || species) && (
            <TouchableOpacity style={styles.resetChip} onPress={handleReset}>
              <Text style={styles.resetChipText}>× リセット</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* 都道府県ピッカー */}
      {showPrefPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderText}>都道府県を選択</Text>
              <TouchableOpacity onPress={() => setShowPrefPicker(false)}>
                <Text style={styles.pickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity style={styles.pickerItem} onPress={() => { setPrefecture(''); setCity(''); setShowPrefPicker(false) }}>
                <Text style={styles.pickerItemText}>すべて</Text>
              </TouchableOpacity>
              {PREFECTURES.map((p) => (
                <TouchableOpacity key={p} style={[styles.pickerItem, prefecture === p && styles.pickerItemActive]}
                  onPress={() => { setPrefecture(p); setCity(''); setShowPrefPicker(false) }}>
                  <Text style={[styles.pickerItemText, prefecture === p && styles.pickerItemTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 動物種ピッカー */}
      {showSpeciesPicker && (
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerBox, styles.pickerBoxSmall]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderText}>動物種を選択</Text>
              <TouchableOpacity onPress={() => setShowSpeciesPicker(false)}>
                <Text style={styles.pickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {SPECIES_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value}
                style={[styles.pickerItem, species === opt.value && styles.pickerItemActive]}
                onPress={() => { setSpecies(opt.value); setShowSpeciesPicker(false) }}>
                <Text style={[styles.pickerItemText, species === opt.value && styles.pickerItemTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* リスト */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C46B00" size="large" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : sightings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👁️</Text>
          <Text style={styles.emptyText}>
            {prefecture || city || species ? '条件に一致する目撃情報がありません' : 'まだ目撃情報はありません'}
          </Text>
          <TouchableOpacity style={styles.postBtnLarge} onPress={() => router.push('/sightings/new')}>
            <Text style={styles.postBtnLargeText}>最初の目撃情報を投稿する</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sightings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.countText}>{sightings.length}件の目撃情報</Text>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#3D2400' },
  headerSub: { fontSize: 12, color: '#8B6340', marginTop: 2 },
  postBtn: {
    backgroundColor: '#FFC96B', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  postBtnText: { fontSize: 12, fontWeight: 'bold', color: '#3D2400' },

  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterScroll: { padding: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FFF3DC', borderWidth: 1.5, borderColor: '#FFD98A',
  },
  filterChipActive: { backgroundColor: '#C46B00', borderColor: '#C46B00' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8B5E1A' },
  filterChipTextActive: { color: '#fff' },
  filterInput: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 90,
    backgroundColor: '#FFF3DC', borderWidth: 1.5, borderColor: '#FFD98A',
    fontSize: 12, color: '#3D2400',
  },
  resetChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  resetChipText: { fontSize: 12, fontWeight: '600', color: '#991B1B' },

  pickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100,
    justifyContent: 'center', alignItems: 'center',
  },
  pickerBox: {
    backgroundColor: '#fff', borderRadius: 16, width: '85%', maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerBoxSmall: { maxHeight: '50%' },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  pickerHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#3D2400' },
  pickerClose: { fontSize: 18, color: '#9ca3af' },
  pickerList: { flex: 1 },
  pickerItem: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  pickerItemActive: { backgroundColor: '#FFF3DC' },
  pickerItemText: { fontSize: 14, color: '#374151' },
  pickerItemTextActive: { color: '#C46B00', fontWeight: 'bold' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#7A4500', fontSize: 14 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  postBtnLarge: {
    backgroundColor: '#FFC96B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  postBtnLargeText: { fontWeight: 'bold', color: '#3D2400', fontSize: 14 },

  countText: { fontSize: 12, color: '#B08050', paddingHorizontal: 4, marginBottom: 8 },
  list: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },

  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#FFE0A0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  cardImage: { width: '100%', aspectRatio: 4 / 3 },
  cardImagePlaceholder: {
    width: '100%', aspectRatio: 4 / 3, backgroundColor: '#FFF8ED',
    alignItems: 'center', justifyContent: 'center',
  },
  cardImageEmoji: { fontSize: 36 },
  cardBody: { padding: 10 },
  cardBadges: { flexDirection: 'row', gap: 4, marginBottom: 4, flexWrap: 'wrap' },
  speciesBadge: { backgroundColor: '#FFF3DC', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  speciesBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#7A4500' },
  bestBadge: { backgroundColor: '#FFF9C4', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bestBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#7A5800' },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#3D2400', marginBottom: 4 },
  cardLocation: { fontSize: 11, color: '#8B6340', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#B08050' },
})

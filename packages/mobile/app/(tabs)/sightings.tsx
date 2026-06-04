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
  Modal,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { fetchSightingsFiltered } from '../../src/lib/firestore'
import { SPECIES_LABELS, PREFECTURES, type Sighting, type PetSpecies } from '../../src/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const SPECIES_OPTIONS: { value: PetSpecies | ''; label: string; emoji: string }[] = [
  { value: '', label: 'すべて', emoji: '🐾' },
  { value: 'dog', label: '犬', emoji: '🐕' },
  { value: 'cat', label: '猫', emoji: '🐈' },
  { value: 'rabbit', label: 'うさぎ', emoji: '🐇' },
  { value: 'bird', label: '鳥', emoji: '🐦' },
  { value: 'other', label: 'その他', emoji: '🐾' },
]

export default function SightingsScreen() {
  const router = useRouter()
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [species, setSpecies] = useState<PetSpecies | ''>('')
  const [prefModal, setPrefModal] = useState(false)

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

  const locationText = (item: Sighting) => {
    const parts = [item.location.prefecture, item.location.city].filter(Boolean)
    return parts.join(' ') || item.location.address || ''
  }

  const renderItem = ({ item }: { item: Sighting }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/sightings/${item.id}`)}
      activeOpacity={0.85}
    >
      {item.photos.length > 0 ? (
        <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImageEmoji}>
            {item.species ? (item.species === 'dog' ? '🐕' : item.species === 'cat' ? '🐈' : '👁️') : '👁️'}
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
        {locationText(item) ? (
          <Text style={styles.cardLocation} numberOfLines={1}>📍 {locationText(item)}</Text>
        ) : null}
        <Text style={styles.cardMeta}>
          {item.posterName} · {format(new Date(item.createdAt), 'M/d', { locale: ja })}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const isFiltered = !!(prefecture || city || species)

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👁️ 目撃情報一覧</Text>
          <Text style={styles.headerSub}>みんなが投稿した目撃情報</Text>
        </View>
        <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/sightings/new')}>
          <Text style={styles.postBtnText}>＋ 投稿（+2pt）</Text>
        </TouchableOpacity>
      </View>

      {/* 検索フィルターパネル */}
      <View style={styles.filterPanel}>
        {/* 動物種チップ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.speciesRow}
        >
          {SPECIES_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.speciesChip, species === opt.value && styles.speciesChipActive]}
              onPress={() => setSpecies(opt.value)}
            >
              <Text style={styles.speciesEmoji}>{opt.emoji}</Text>
              <Text style={[styles.speciesLabel, species === opt.value && styles.speciesLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 場所フィルター */}
        <View style={styles.locationRow}>
          {/* 都道府県 */}
          <TouchableOpacity
            style={[styles.prefBtn, prefecture && styles.prefBtnActive]}
            onPress={() => setPrefModal(true)}
          >
            <Text style={[styles.prefBtnText, prefecture && styles.prefBtnTextActive]} numberOfLines={1}>
              {prefecture || '都道府県'}
            </Text>
            <Text style={styles.prefArrow}>▼</Text>
          </TouchableOpacity>

          {/* 市区町村 */}
          <TextInput
            style={[styles.cityInput, !prefecture && styles.cityInputDisabled]}
            placeholder={prefecture ? '市区町村' : '都道府県を先に選択'}
            placeholderTextColor="#B08050"
            value={city}
            onChangeText={setCity}
            editable={!!prefecture}
          />

          {/* リセット */}
          {isFiltered && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 都道府県 Modal */}
      <Modal visible={prefModal} transparent animationType="slide" onRequestClose={() => setPrefModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPrefModal(false)}>
          <Pressable style={styles.modalPanel} onPress={() => {}}>
            <Text style={styles.modalTitle}>都道府県を選択</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalOption, !prefecture && styles.modalOptionActive]}
                onPress={() => { setPrefecture(''); setCity(''); setPrefModal(false) }}
              >
                <Text style={[styles.modalOptionText, !prefecture && styles.modalOptionTextActive]}>
                  すべての都道府県
                </Text>
              </TouchableOpacity>
              {PREFECTURES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.modalOption, prefecture === p && styles.modalOptionActive]}
                  onPress={() => { setPrefecture(p); setCity(''); setPrefModal(false) }}
                >
                  <Text style={[styles.modalOptionText, prefecture === p && styles.modalOptionTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* リスト */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C46B00" size="large" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : sightings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>👁️</Text>
          <Text style={styles.emptyText}>
            {isFiltered ? '条件に一致する目撃情報がありません' : 'まだ目撃情報はありません'}
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

const W = '#3D2400'
const M = '#7A4500'
const A = '#FFC96B'
const BG = '#FFF3DC'
const BR = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: W },
  headerSub: { fontSize: 12, color: '#8B6340', marginTop: 2 },
  postBtn: { backgroundColor: A, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  postBtnText: { fontSize: 12, fontWeight: 'bold', color: W },

  // Filter panel
  filterPanel: {
    backgroundColor: '#fff',
    paddingTop: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: BR,
  },
  speciesRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
    flexDirection: 'row',
  },
  speciesChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  speciesChipActive: { backgroundColor: BG, borderColor: A },
  speciesEmoji: { fontSize: 14 },
  speciesLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  speciesLabelActive: { color: M, fontWeight: 'bold' },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingBottom: 10,
  },
  prefBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BR,
    maxWidth: 130,
  },
  prefBtnActive: { backgroundColor: '#C46B00', borderColor: '#C46B00' },
  prefBtnText: { fontSize: 12, fontWeight: '600', color: M, flex: 1 },
  prefBtnTextActive: { color: '#fff' },
  prefArrow: { fontSize: 9, color: '#B08050' },

  cityInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BR,
    fontSize: 12, color: W,
  },
  cityInputDisabled: { opacity: 0.5 },

  resetBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5',
    alignItems: 'center', justifyContent: 'center',
  },
  resetBtnText: { fontSize: 13, fontWeight: 'bold', color: '#991B1B' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalPanel: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 'bold', color: W, textAlign: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalOption: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  modalOptionActive: { backgroundColor: BG },
  modalOptionText: { fontSize: 15, color: '#374151' },
  modalOptionTextActive: { color: '#C46B00', fontWeight: 'bold' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { color: '#7A4500', fontSize: 14 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  postBtnLarge: { backgroundColor: A, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  postBtnLargeText: { fontWeight: 'bold', color: W, fontSize: 14 },

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
  speciesBadge: { backgroundColor: BG, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  speciesBadgeText: { fontSize: 10, fontWeight: 'bold', color: M },
  bestBadge: { backgroundColor: '#FFF9C4', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bestBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#7A5800' },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: W, marginBottom: 4 },
  cardLocation: { fontSize: 11, color: '#8B6340', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#B08050' },
})

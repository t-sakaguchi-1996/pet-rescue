import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { fetchPets } from '../../src/lib/firestore'
import PetCard from '../../src/components/PetCard'
import type { Pet, PetType, PetSpecies, PetStatus } from '../../src/types'
import { PREFECTURES } from '../../src/types'

// ─── Quick filter chips ────────────────────────────────────────────────────────
type QuickFilter = 'all' | 'lost_dog' | 'lost_cat' | 'found'
const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'lost_dog', label: '🐕 迷子犬' },
  { key: 'lost_cat', label: '🐈 迷子猫' },
  { key: 'found', label: '🤝 保護犬猫' },
]

// ─── Detail search state ───────────────────────────────────────────────────────
interface DetailSearch {
  type: PetType | ''
  species: PetSpecies | ''
  status: PetStatus | ''
  prefecture: string
  city: string
}

const EMPTY_DETAIL: DetailSearch = { type: '', species: '', status: '', prefecture: '', city: '' }

const TYPE_OPTIONS = [
  { value: '' as const, label: 'すべて' },
  { value: 'lost' as PetType, label: '迷子' },
  { value: 'found' as PetType, label: '保護' },
]
const SPECIES_OPTIONS = [
  { value: '' as const, label: 'すべて' },
  { value: 'dog' as PetSpecies, label: '🐕 犬' },
  { value: 'cat' as PetSpecies, label: '🐈 猫' },
  { value: 'rabbit' as PetSpecies, label: '🐇 うさぎ' },
  { value: 'bird' as PetSpecies, label: '🐦 鳥' },
  { value: 'other' as PetSpecies, label: '🐾 その他' },
]
const STATUS_OPTIONS = [
  { value: '' as const, label: 'すべて' },
  { value: 'searching' as PetStatus, label: '捜索中' },
  { value: 'protected' as PetStatus, label: '保護済み' },
  { value: 'resolved' as PetStatus, label: '解決済み' },
]

// ─── Build fetchPets params ────────────────────────────────────────────────────
function buildParams(quick: QuickFilter, detail: DetailSearch) {
  const p: Parameters<typeof fetchPets>[0] = { limitCount: 50 }
  if (detail.type) { p.type = detail.type }
  else if (quick === 'lost_dog') { p.type = 'lost'; p.species = 'dog' }
  else if (quick === 'lost_cat') { p.type = 'lost'; p.species = 'cat' }
  else if (quick === 'found') { p.type = 'found' }

  if (detail.species) p.species = detail.species
  if (detail.status) p.status = detail.status
  else p.status = 'searching'
  if (detail.prefecture) p.prefecture = detail.prefecture
  if (detail.city.trim()) p.city = detail.city.trim()
  return p
}

export default function HomeScreen() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [detail, setDetail] = useState<DetailSearch>(EMPTY_DETAIL)
  const [appliedDetail, setAppliedDetail] = useState<DetailSearch>(EMPTY_DETAIL)
  const [showDetail, setShowDetail] = useState(false)
  const [prefModal, setPrefModal] = useState(false)

  const isDetailActive = Object.values(appliedDetail).some(Boolean)

  const load = useCallback(async () => {
    setError('')
    try {
      const params = buildParams(quickFilter, appliedDetail)
      const data = await fetchPets(params)
      setPets(data)
    } catch (e) {
      console.error('fetchPets error:', e)
      setError('データの取得に失敗しました。\nネットワーク接続を確認してください。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [quickFilter, appliedDetail])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const handleApplyDetail = () => {
    setAppliedDetail(detail)
    setShowDetail(false)
    setQuickFilter('all')
  }
  const handleResetDetail = () => {
    setDetail(EMPTY_DETAIL)
    setAppliedDetail(EMPTY_DETAIL)
    setShowDetail(false)
  }

  // ─── List header ──────────────────────────────────────────────────────────────
  const ListHeader = (
    <View>
      {/* ── ヒーローバナー ── */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🐾 みんなで探す・協力者にもメリットがあるプラットフォーム</Text>
          </View>
          <Text style={styles.heroTitle}>ANIMAL GO</Text>
          <Text style={styles.heroSubtitle}>迷子ペットを、みんなの力で見つけよう</Text>
          <Text style={styles.heroDesc}>
            目撃情報を投稿するとポイントが貯まります。{'\n'}有力情報が選ばれると大きくポイントアップ！
          </Text>
          <View style={styles.heroCta}>
            <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/sightings/new')}>
              <Text style={styles.ctaPrimaryText}>👁️ 目撃情報を投稿（+2pt）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/(tabs)/post')}>
              <Text style={styles.ctaSecondaryText}>🔍 迷子を報告する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── ポイントシステム紹介 ── */}
      <View style={styles.pointSection}>
        <Text style={styles.pointTitle}>⭐ 協力するほどポイントが貯まる</Text>
        <View style={styles.pointCards}>
          {[
            { emoji: '👁️', title: '目撃情報を投稿', desc: '見かけたペット情報を投稿するだけで +2pt！', badge: '+2pt' },
            { emoji: '💬', title: '有力コメントが選ばれると', desc: '最有力情報に選ばれたら大幅ポイントアップ！', badge: '+100pt' },
            { emoji: '🔗', title: '後から紐づけOK', desc: '登録なしで投稿→会員登録時に自動紐づけ', badge: '後付けOK' },
          ].map((item) => (
            <View key={item.title} style={styles.pointCard}>
              <Text style={styles.pointCardEmoji}>{item.emoji}</Text>
              <View style={styles.pointBadge}>
                <Text style={styles.pointBadgeText}>{item.badge}</Text>
              </View>
              <Text style={styles.pointCardTitle}>{item.title}</Text>
              <Text style={styles.pointCardDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── フィルタータブ ── */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {QUICK_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, quickFilter === f.key && styles.filterChipActive]}
              onPress={() => { setQuickFilter(f.key); setAppliedDetail(EMPTY_DETAIL) }}
            >
              <Text style={[styles.filterText, quickFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 詳細検索ボタン */}
        <TouchableOpacity
          style={[styles.detailBtn, isDetailActive && styles.detailBtnActive]}
          onPress={() => setShowDetail((v) => !v)}
        >
          <Text style={[styles.detailBtnText, isDetailActive && styles.detailBtnTextActive]}>
            🔍{isDetailActive ? ' 検索中' : ' 詳細'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 詳細検索パネル ── */}
      {showDetail && (
        <View style={styles.detailPanel}>
          {/* 種別 */}
          <Text style={styles.filterLabel}>種別</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.smallChip, detail.type === o.value && styles.smallChipActive]}
                onPress={() => setDetail((p) => ({ ...p, type: o.value }))}
              >
                <Text style={[styles.smallChipText, detail.type === o.value && styles.smallChipTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 動物 */}
          <Text style={styles.filterLabel}>動物</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.smallChip, detail.species === o.value && styles.smallChipActive]}
                onPress={() => setDetail((p) => ({ ...p, species: o.value }))}
              >
                <Text style={[styles.smallChipText, detail.species === o.value && styles.smallChipTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 状態 */}
          <Text style={styles.filterLabel}>状態</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.smallChip, detail.status === o.value && styles.smallChipActive]}
                onPress={() => setDetail((p) => ({ ...p, status: o.value }))}
              >
                <Text style={[styles.smallChipText, detail.status === o.value && styles.smallChipTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 都道府県 */}
          <Text style={styles.filterLabel}>都道府県</Text>
          <TouchableOpacity
            style={styles.prefSelector}
            onPress={() => setPrefModal(true)}
          >
            <Text style={detail.prefecture ? styles.prefSelectorText : styles.prefSelectorPlaceholder}>
              {detail.prefecture || 'すべての都道府県'}
            </Text>
            <Text style={styles.prefSelectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* 市区町村 */}
          <Text style={styles.filterLabel}>市区町村</Text>
          <TextInput
            style={styles.cityInput}
            placeholder="例: 渋谷区"
            placeholderTextColor="#9ca3af"
            value={detail.city}
            onChangeText={(v) => setDetail((p) => ({ ...p, city: v }))}
          />

          {/* ボタン */}
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetDetail}>
              <Text style={styles.resetBtnText}>リセット</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={handleApplyDetail}>
              <Text style={styles.searchBtnText}>検索する</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!loading && !error && (
        <Text style={styles.resultCount}>{pets.length}件の情報が見つかりました</Text>
      )}
    </View>
  )

  // ─── Prefecture modal ──────────────────────────────────────────────────────────
  const PrefModal = (
    <Modal visible={prefModal} transparent animationType="slide" onRequestClose={() => setPrefModal(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setPrefModal(false)}>
        <Pressable style={styles.prefModalPanel} onPress={() => {}}>
          <Text style={styles.prefModalTitle}>都道府県を選択</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.prefOption, !detail.prefecture && styles.prefOptionActive]}
              onPress={() => { setDetail((p) => ({ ...p, prefecture: '' })); setPrefModal(false) }}
            >
              <Text style={[styles.prefOptionText, !detail.prefecture && styles.prefOptionTextActive]}>
                すべての都道府県
              </Text>
            </TouchableOpacity>
            {PREFECTURES.map((pref) => (
              <TouchableOpacity
                key={pref}
                style={[styles.prefOption, detail.prefecture === pref && styles.prefOptionActive]}
                onPress={() => { setDetail((p) => ({ ...p, prefecture: pref })); setPrefModal(false) }}
              >
                <Text style={[styles.prefOptionText, detail.prefecture === pref && styles.prefOptionTextActive]}>
                  {pref}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        {ListHeader}
        <View style={styles.center}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
        {PrefModal}
      </ScrollView>
    )
  }

  if (error) {
    return (
      <ScrollView style={styles.container}>
        {ListHeader}
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load() }}>
            <Text style={styles.retryText}>再読み込み</Text>
          </TouchableOpacity>
        </View>
        {PrefModal}
      </ScrollView>
    )
  }

  if (pets.length === 0) {
    return (
      <ScrollView style={styles.container}>
        {ListHeader}
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyText}>該当するペットがいません</Text>
        </View>
        {PrefModal}
      </ScrollView>
    )
  }

  return (
    <>
      <FlatList
        style={styles.container}
        data={pets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C46B00" />
        }
        renderItem={({ item }) => (
          <PetCard pet={item} onPress={() => router.push(`/pet/${item.id}`)} />
        )}
      />
      {PrefModal}
    </>
  )
}

const W = '#3D2400'
const M = '#7A4500'
const A = '#FFC96B'
const BG = '#FFF3DC'
const BR = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Hero
  hero: { margin: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: BR, backgroundColor: BG },
  heroContent: { padding: 20, alignItems: 'center' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
  heroBadgeText: { fontSize: 10, fontWeight: 'bold', color: M, textAlign: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: W, textAlign: 'center' },
  heroSubtitle: { fontSize: 15, fontWeight: 'bold', color: M, marginTop: 4, textAlign: 'center' },
  heroDesc: { fontSize: 12, color: '#6B4200', marginTop: 8, textAlign: 'center', lineHeight: 18 },
  heroCta: { flexDirection: 'column', gap: 8, marginTop: 14, width: '100%' },
  ctaPrimary: { backgroundColor: A, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', elevation: 4 },
  ctaPrimaryText: { color: W, fontWeight: 'bold', fontSize: 14 },
  ctaSecondary: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1.5, borderColor: BR },
  ctaSecondaryText: { color: '#C46B00', fontWeight: 'bold', fontSize: 14 },

  // Point system
  pointSection: { margin: 12, marginTop: 0, padding: 16, borderRadius: 20, backgroundColor: BG, borderWidth: 1.5, borderColor: BR },
  pointTitle: { fontSize: 14, fontWeight: '900', color: W, textAlign: 'center', marginBottom: 12 },
  pointCards: { flexDirection: 'row', gap: 8 },
  pointCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FFE8A0' },
  pointCardEmoji: { fontSize: 22, marginBottom: 4 },
  pointBadge: { backgroundColor: A, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  pointBadgeText: { fontSize: 10, fontWeight: '900', color: W },
  pointCardTitle: { fontSize: 10, fontWeight: 'bold', color: W, textAlign: 'center', marginBottom: 2 },
  pointCardDesc: { fontSize: 9, color: '#8B6340', textAlign: 'center', lineHeight: 12 },

  // Filter
  filterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterScroll: { flex: 1 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: BG, borderColor: A },
  filterText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: M, fontWeight: 'bold' },

  detailBtn: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 10, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  detailBtnActive: { backgroundColor: BG, borderColor: A },
  detailBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  detailBtnTextActive: { color: M, fontWeight: 'bold' },

  // Detail search panel
  detailPanel: { backgroundColor: '#fff', padding: 14, borderBottomWidth: 1.5, borderBottomColor: BR },
  filterLabel: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginTop: 10, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smallChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  smallChipActive: { backgroundColor: BG, borderColor: A },
  smallChipText: { fontSize: 12, color: '#6b7280' },
  smallChipTextActive: { color: M, fontWeight: 'bold' },
  prefSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, backgroundColor: '#f9fafb' },
  prefSelectorText: { fontSize: 14, color: '#374151' },
  prefSelectorPlaceholder: { fontSize: 14, color: '#9ca3af' },
  prefSelectorArrow: { fontSize: 10, color: '#9ca3af' },
  cityInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, color: '#374151', backgroundColor: '#f9fafb' },
  detailActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  resetBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, alignItems: 'center' },
  resetBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  searchBtn: { flex: 2, backgroundColor: '#C46B00', borderRadius: 10, padding: 10, alignItems: 'center' },
  searchBtnText: { fontSize: 13, color: '#fff', fontWeight: 'bold' },

  resultCount: { fontSize: 11, color: '#8B6340', paddingHorizontal: 14, paddingVertical: 6 },

  // Prefecture modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  prefModalPanel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
  prefModalTitle: { fontSize: 16, fontWeight: 'bold', color: W, textAlign: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  prefOption: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  prefOptionActive: { backgroundColor: BG },
  prefOptionText: { fontSize: 15, color: '#374151' },
  prefOptionTextActive: { color: '#C46B00', fontWeight: 'bold' },

  // States
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#9ca3af' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  retryBtn: { backgroundColor: A, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: W, fontWeight: 'bold', fontSize: 14 },

  // List
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { gap: 10, marginBottom: 10 },
})

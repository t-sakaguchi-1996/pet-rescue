import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { fetchPets } from '../../src/lib/firestore'
import PetCard from '../../src/components/PetCard'
import type { Pet } from '../../src/types'

type FilterKey = 'all' | 'lost_dog' | 'lost_cat' | 'found'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'lost_dog', label: '迷子犬' },
  { key: 'lost_cat', label: '迷子猫' },
  { key: 'found', label: '保護犬猫' },
]

function filterToParams(key: FilterKey) {
  if (key === 'lost_dog') return { type: 'lost' as const, species: 'dog' as const }
  if (key === 'lost_cat') return { type: 'lost' as const, species: 'cat' as const }
  if (key === 'found') return { type: 'found' as const }
  return {}
}

export default function HomeScreen() {
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const load = useCallback(async () => {
    setError('')
    try {
      const params = filterToParams(activeFilter)
      const data = await fetchPets({ status: 'searching', limitCount: 50, ...params })
      setPets(data)
    } catch (e) {
      console.error('fetchPets error:', e)
      setError('データの取得に失敗しました。\nネットワーク接続を確認してください。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeFilter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

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
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => router.push('/sightings/new')}
            >
              <Text style={styles.ctaPrimaryText}>👁️ 目撃情報を投稿（+2pt）</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => router.push('/(tabs)/post')}
            >
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
            { emoji: '🔗', title: '未登録でも後から紐づけOK', desc: '登録なしで投稿→会員登録時に自動紐づけ', badge: '後付けOK' },
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
        <TouchableOpacity
          style={styles.sightingCta}
          onPress={() => router.push('/sightings/new')}
        >
          <Text style={styles.sightingCtaEmoji}>👁️</Text>
          <View style={styles.sightingCtaContent}>
            <Text style={styles.sightingCtaTitle}>ペットを見かけたら目撃情報を投稿しよう！</Text>
            <Text style={styles.sightingCtaDesc}>投稿するだけで +2pt 獲得。登録なしでも投稿できます</Text>
          </View>
          <Text style={styles.sightingCtaArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* ── フィルタータブ ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!loading && !error && (
        <Text style={styles.resultCount}>{pets.length}件の情報が見つかりました</Text>
      )}
    </View>
  )

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        {ListHeader}
        <View style={styles.center}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
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
      </ScrollView>
    )
  }

  return (
    <FlatList
      style={styles.container}
      data={pets}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      ListHeaderComponent={ListHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#C46B00"
        />
      }
      renderItem={({ item }) => (
        <PetCard
          pet={item}
          onPress={() => router.push(`/pet/${item.id}`)}
        />
      )}
    />
  )
}

const WARM_BG = '#FFF3DC'
const WARM_BORDER = '#FFD98A'
const WARM_DARK = '#3D2400'
const WARM_MID = '#7A4500'
const WARM_LIGHT = '#8B6340'
const WARM_ACCENT = '#FFC96B'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Hero
  hero: {
    margin: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: WARM_BORDER,
    backgroundColor: WARM_BG,
  },
  heroContent: { padding: 20, alignItems: 'center' },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  heroBadgeText: { fontSize: 10, fontWeight: 'bold', color: WARM_MID, textAlign: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: WARM_DARK, textAlign: 'center' },
  heroSubtitle: { fontSize: 15, fontWeight: 'bold', color: WARM_MID, marginTop: 4, textAlign: 'center' },
  heroDesc: { fontSize: 12, color: '#6B4200', marginTop: 8, textAlign: 'center', lineHeight: 18 },
  heroCta: { flexDirection: 'column', gap: 8, marginTop: 14, width: '100%' },
  ctaPrimary: {
    backgroundColor: WARM_ACCENT,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: WARM_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPrimaryText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 14 },
  ctaSecondary: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: WARM_BORDER,
  },
  ctaSecondaryText: { color: '#C46B00', fontWeight: 'bold', fontSize: 14 },

  // Point system
  pointSection: {
    margin: 12,
    marginTop: 0,
    padding: 16,
    borderRadius: 20,
    backgroundColor: WARM_BG,
    borderWidth: 1.5,
    borderColor: WARM_BORDER,
  },
  pointTitle: { fontSize: 14, fontWeight: '900', color: WARM_DARK, textAlign: 'center', marginBottom: 12 },
  pointCards: { flexDirection: 'row', gap: 8 },
  pointCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE8A0',
  },
  pointCardEmoji: { fontSize: 22, marginBottom: 4 },
  pointBadge: {
    backgroundColor: WARM_ACCENT,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  pointBadgeText: { fontSize: 10, fontWeight: '900', color: WARM_DARK },
  pointCardTitle: { fontSize: 10, fontWeight: 'bold', color: WARM_DARK, textAlign: 'center', marginBottom: 2 },
  pointCardDesc: { fontSize: 9, color: WARM_LIGHT, textAlign: 'center', lineHeight: 12 },
  sightingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: WARM_BORDER,
    borderStyle: 'dashed',
    gap: 10,
  },
  sightingCtaEmoji: { fontSize: 24 },
  sightingCtaContent: { flex: 1 },
  sightingCtaTitle: { fontSize: 12, fontWeight: 'bold', color: WARM_MID },
  sightingCtaDesc: { fontSize: 10, color: '#B08050', marginTop: 2 },
  sightingCtaArrow: { fontSize: 14, fontWeight: '900', color: '#C46B00' },

  // Filters
  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#FFF3DC', borderColor: WARM_ACCENT },
  filterText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: WARM_MID, fontWeight: 'bold' },

  resultCount: { fontSize: 11, color: WARM_LIGHT, paddingHorizontal: 14, paddingVertical: 6 },

  // States
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#9ca3af' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  retryBtn: { backgroundColor: WARM_ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 14 },

  // List
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { gap: 10, marginBottom: 10 },
})

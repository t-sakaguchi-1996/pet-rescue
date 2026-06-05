import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../../src/lib/firebase'
import { getTitleName, getBadgeDefinition } from '../../src/lib/titles'
import { BADGE_DEFINITIONS, SPECIES_LABELS, TYPE_LABELS } from '../../src/types'
import type { Pet, Sighting } from '../../src/types'
import LoadingIndicator from '../../src/components/LoadingIndicator'

interface PublicProfile {
  displayName: string
  photoURL?: string
  selectedTitle?: string
  titles?: string[]
  badges?: string[]
  sightingCount?: number
  protectedPostCount?: number
  bestInfoCount?: number
  discoveryCount?: number
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getDoc(doc(db, 'users', id)),
      getDocs(query(collection(db, 'pets'), where('userId', '==', id), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'sightings'), where('userId', '==', id), orderBy('createdAt', 'desc'), limit(20))),
    ])
      .then(([userSnap, petsSnap, sightingsSnap]) => {
        if (!userSnap.exists()) return
        const d = userSnap.data()
        setProfile({
          displayName: (d.displayName as string) ?? 'ユーザー',
          photoURL: d.photoURL as string | undefined,
          selectedTitle: d.selectedTitle as string | undefined,
          titles: (d.titles as string[]) ?? [],
          badges: (d.badges as string[]) ?? [],
          sightingCount: d.sightingCount as number | undefined,
          protectedPostCount: d.protectedPostCount as number | undefined,
          bestInfoCount: d.bestInfoCount as number | undefined,
          discoveryCount: d.discoveryCount as number | undefined,
        })
        setPets(petsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Pet)))
        setSightings(sightingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Sighting)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingIndicator />

  const pageTitle = profile ? `${profile.displayName}さんのプロフィール` : 'プロフィール'

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>ユーザーが見つかりません</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>戻る</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const initial = profile.displayName.charAt(0).toUpperCase()
  const titleName = profile.selectedTitle ? getTitleName(profile.selectedTitle) : null
  const earnedBadges = profile.badges ?? []

  const stats = [
    { label: '目撃投稿', value: profile.sightingCount ?? 0, unit: '件', emoji: '👁️' },
    { label: '保護投稿', value: profile.protectedPostCount ?? 0, unit: '件', emoji: '🤝' },
    { label: '最有力情報', value: profile.bestInfoCount ?? 0, unit: '回', emoji: '⭐' },
    { label: '発見貢献', value: profile.discoveryCount ?? 0, unit: '回', emoji: '🎉' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: pageTitle }} />

      {/* プロフィールカード */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {titleName && (
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>🏅 {titleName}</Text>
            </View>
          )}
          {earnedBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {earnedBadges.slice(0, 5).map((bid) => {
                const b = getBadgeDefinition(bid)
                return b ? <Text key={bid} style={styles.badgeEmoji}>{b.emoji}</Text> : null
              })}
              {earnedBadges.length > 5 && (
                <Text style={styles.badgeMore}>+{earnedBadges.length - 5}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 4つの実績 */}
      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statEmoji}>{item.emoji}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>
              {item.value.toLocaleString()}
              <Text style={styles.statUnit}>{item.unit}</Text>
            </Text>
          </View>
        ))}
      </View>

      {/* バッジ */}
      {earnedBadges.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏅 取得済みバッジ</Text>
          <View style={styles.badgeList}>
            {BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.id)).map((b) => (
              <View key={b.id} style={styles.badgeItem}>
                <Text style={styles.badgeItemEmoji}>{b.emoji}</Text>
                <Text style={styles.badgeItemName} numberOfLines={1}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 投稿一覧 */}
      {pets.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🐾 投稿一覧（{pets.length}件）</Text>
          <View style={styles.petGrid}>
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={styles.petCard}
                onPress={() => router.push(`/pet/${pet.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.petImageWrapper}>
                  {pet.images?.[0] ? (
                    <Image source={{ uri: pet.images[0] }} style={styles.petImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.petImage, styles.petImagePlaceholder]}>
                      <Text style={{ fontSize: 24 }}>
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.typeBadge, { backgroundColor: pet.type === 'lost' ? '#ef4444' : '#3b82f6' }]}>
                    <Text style={styles.typeBadgeText}>{TYPE_LABELS[pet.type]}</Text>
                  </View>
                </View>
                <View style={styles.petBody}>
                  <Text style={styles.petName} numberOfLines={1}>{pet.name || '名前不明'}</Text>
                  <Text style={styles.petSpecies}>{SPECIES_LABELS[pet.species]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 目撃情報一覧 */}
      {sightings.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👁️ 目撃情報（{sightings.length}件）</Text>
          <View style={styles.sightingList}>
            {sightings.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.sightingItem}
                onPress={() => router.push(`/sightings/${s.id}`)}
                activeOpacity={0.8}
              >
                {s.photos?.[0] ? (
                  <Image source={{ uri: s.photos[0] }} style={styles.sightingThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.sightingThumb, styles.sightingThumbPlaceholder]}>
                    <Text style={{ fontSize: 20 }}>👁️</Text>
                  </View>
                )}
                <View style={styles.sightingInfo}>
                  <Text style={styles.sightingTitle} numberOfLines={2}>{s.title}</Text>
                  <Text style={styles.sightingLoc} numberOfLines={1}>
                    📍 {s.location?.prefecture} {s.location?.city}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {pets.length === 0 && sightings.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>投稿はまだありません</Text>
        </View>
      )}
    </ScrollView>
  )
}

const W = '#3D2400'
const M = '#7A4500'
const A = '#FFC96B'
const BG = '#FFF3DC'
const BR = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { color: '#6b7280', fontSize: 15 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  backBtnText: { fontSize: 14, color: '#374151', fontWeight: '600' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#FFE0A0',
  },
  avatarWrapper: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', flexShrink: 0 },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: 'bold', color: M },
  profileInfo: { flex: 1, minWidth: 0 },
  displayName: { fontSize: 16, fontWeight: 'bold', color: W, marginBottom: 4 },
  titleBadge: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: BR, marginBottom: 4 },
  titleBadgeText: { fontSize: 11, color: M, fontWeight: 'bold' },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  badgeEmoji: { fontSize: 16 },
  badgeMore: { fontSize: 11, color: '#B08050' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFE0A0' },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#B08050', marginBottom: 2, textAlign: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: W },
  statUnit: { fontSize: 11, fontWeight: 'normal' },

  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#FFE0A0' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#5A3A1A', marginBottom: 10 },

  badgeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#FFF9F0', borderRadius: 20, borderWidth: 1, borderColor: '#FFE0A0' },
  badgeItemEmoji: { fontSize: 16 },
  badgeItemName: { fontSize: 10, fontWeight: 'bold', color: W, maxWidth: 80 },

  petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petCard: { width: '30%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#FFE0A0', backgroundColor: '#fff' },
  petImageWrapper: { position: 'relative' },
  petImage: { width: '100%', aspectRatio: 1, backgroundColor: '#f3f4f6' },
  petImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  typeBadge: { position: 'absolute', top: 4, left: 4, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#fff' },
  petBody: { padding: 6 },
  petName: { fontSize: 11, fontWeight: 'bold', color: W },
  petSpecies: { fontSize: 10, color: '#9ca3af', marginTop: 1 },

  sightingList: { gap: 8 },
  sightingItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: '#FFFAF0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0A0' },
  sightingThumb: { width: 48, height: 48, borderRadius: 8, flexShrink: 0, backgroundColor: '#f3f4f6' },
  sightingThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  sightingInfo: { flex: 1, minWidth: 0 },
  sightingTitle: { fontSize: 12, fontWeight: 'bold', color: W, marginBottom: 2 },
  sightingLoc: { fontSize: 10, color: '#9B8060' },

  emptyContainer: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 13, color: '#9B8060' },
})

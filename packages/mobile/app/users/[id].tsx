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
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../src/lib/firebase'
import { getTitleName, getBadgeDefinition } from '../../src/lib/titles'
import { TITLE_DEFINITIONS, BADGE_DEFINITIONS } from '../../src/types'
import LoadingIndicator from '../../src/components/LoadingIndicator'

interface PublicProfile {
  displayName: string
  photoURL?: string
  points?: number
  totalPointsEarned?: number
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'users', id))
      .then((snap) => {
        if (!snap.exists()) return
        const d = snap.data()
        setProfile({
          displayName: (d.displayName as string) ?? 'ユーザー',
          photoURL: d.photoURL as string | undefined,
          points: d.points as number | undefined,
          totalPointsEarned: d.totalPointsEarned as number | undefined,
          selectedTitle: d.selectedTitle as string | undefined,
          titles: (d.titles as string[]) ?? [],
          badges: (d.badges as string[]) ?? [],
          sightingCount: d.sightingCount as number | undefined,
          protectedPostCount: d.protectedPostCount as number | undefined,
          bestInfoCount: d.bestInfoCount as number | undefined,
          discoveryCount: d.discoveryCount as number | undefined,
        })
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
  const earnedTitles = profile.titles ?? []
  const earnedBadges = profile.badges ?? []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: pageTitle }} />
      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>← 戻る</Text>
      </TouchableOpacity>

      {/* プロフィールヘッダー */}
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

      {/* ポイントサマリー */}
      <View style={styles.summaryGrid}>
        {[
          { label: '保有ポイント', value: `${(profile.points ?? 0).toLocaleString()}pt`, emoji: '⭐', color: '#C46B00' },
          { label: '累計獲得', value: `${(profile.totalPointsEarned ?? 0).toLocaleString()}pt`, emoji: '📈', color: '#8B5E1A' },
          { label: '目撃投稿', value: `${profile.sightingCount ?? 0}件`, emoji: '👁️', color: '#5A8A3A' },
          { label: '最有力情報', value: `${profile.bestInfoCount ?? 0}回`, emoji: '⭐', color: '#4A6FA5' },
        ].map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>{item.emoji}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* 称号一覧 */}
      {earnedTitles.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🎖️ 取得済み称号</Text>
          <View style={styles.titleList}>
            {TITLE_DEFINITIONS.filter((t) => earnedTitles.includes(t.id)).map((t) => (
              <View key={t.id}
                    style={[styles.titleChip, profile.selectedTitle === t.id && styles.titleChipActive]}>
                <Text style={[styles.titleChipText, profile.selectedTitle === t.id && styles.titleChipTextActive]}>
                  {profile.selectedTitle === t.id ? `⭐ ${t.name}` : t.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* バッジ一覧 */}
      {earnedBadges.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏅 取得済みバッジ</Text>
          <View style={styles.badgeGrid}>
            {BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.id)).map((b) => (
              <View key={b.id} style={styles.badgeCard}>
                <Text style={styles.badgeCardEmoji}>{b.emoji}</Text>
                <Text style={styles.badgeCardName} numberOfLines={2}>{b.name}</Text>
              </View>
            ))}
          </View>
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
  backRow: { marginBottom: 12 },
  backText: { fontSize: 14, color: '#6b7280' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  backBtnText: { fontSize: 14, color: '#374151', fontWeight: '600' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#FFE0A0',
  },
  avatarWrapper: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', flexShrink: 0 },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: 'bold', color: M },
  profileInfo: { flex: 1, minWidth: 0 },
  displayName: { fontSize: 17, fontWeight: 'bold', color: W, marginBottom: 4 },
  titleBadge: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: BR, marginBottom: 4 },
  titleBadgeText: { fontSize: 11, color: M, fontWeight: 'bold' },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  badgeEmoji: { fontSize: 18 },
  badgeMore: { fontSize: 11, color: '#B08050' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  summaryCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFE0A0' },
  summaryEmoji: { fontSize: 18, marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: '#B08050', marginBottom: 2, textAlign: 'center' },
  summaryValue: { fontSize: 14, fontWeight: 'bold' },

  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#FFE0A0' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#5A3A1A', marginBottom: 10 },

  titleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  titleChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BR },
  titleChipActive: { backgroundColor: A, borderColor: '#C46B00' },
  titleChipText: { fontSize: 12, color: M, fontWeight: '600' },
  titleChipTextActive: { color: W, fontWeight: 'bold' },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '30%', minHeight: 70, padding: 8, backgroundColor: '#FFF9F0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0A0', alignItems: 'center' },
  badgeCardEmoji: { fontSize: 24, marginBottom: 4 },
  badgeCardName: { fontSize: 10, fontWeight: 'bold', color: W, textAlign: 'center', lineHeight: 13 },
})

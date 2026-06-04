import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { fetchRanking, findUserRank, RANKING_TYPE_LABELS, RANKING_SCORE_UNIT } from '../../src/lib/rankings'
import { getTitleName, getBadgeDefinition } from '../../src/lib/titles'
import type { RankingEntry, RankingType } from '../../src/types'

const RANKING_TABS: { type: RankingType; label: string; emoji: string }[] = [
  { type: 'total_points', label: '総合ポイント', emoji: '🏆' },
  { type: 'monthly_points', label: '今月', emoji: '📅' },
  { type: 'weekly_points', label: '今週', emoji: '🔥' },
  { type: 'sighting_count', label: '目撃投稿', emoji: '👁️' },
  { type: 'protection_count', label: '保護投稿', emoji: '🤝' },
  { type: 'best_info_count', label: '最有力情報', emoji: '⭐' },
  { type: 'discovery_count', label: '発見貢献', emoji: '🎉' },
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function RankingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeType, setActiveType] = useState<RankingType>('total_points')
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<number | null>(null)

  const needsAuth = activeType === 'monthly_points' || activeType === 'weekly_points'

  useEffect(() => {
    if (needsAuth && !user) {
      setEntries([])
      setMyRank(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchRanking(activeType, user?.uid)
      .then((data) => {
        setEntries(data.slice(0, 50))
        if (user?.uid) setMyRank(findUserRank(data, user.uid))
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [activeType, user?.uid, needsAuth])

  const unit = RANKING_SCORE_UNIT[activeType]

  const renderEntry = ({ item, index }: { item: RankingEntry; index: number }) => {
    const isMe = item.isCurrentUser
    const medal = MEDALS[index] ?? null
    const titleName = item.selectedTitle ? getTitleName(item.selectedTitle) : null

    return (
      <View style={[styles.entryCard, isMe && styles.entryCardMe]}>
        {/* 順位 */}
        <View style={styles.rankCell}>
          {medal ? (
            <Text style={styles.medal}>{medal}</Text>
          ) : (
            <Text style={styles.rankNum}>{item.rank}</Text>
          )}
        </View>

        {/* アバター */}
        <View style={styles.avatar}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>
              {item.displayName.charAt(0)}
            </Text>
          )}
        </View>

        {/* 名前・称号・バッジ */}
        <View style={styles.entryInfo}>
          <View style={styles.entryNameRow}>
            <Text style={styles.entryName} numberOfLines={1}>
              {item.displayName}
              {isMe ? ' (あなた)' : ''}
            </Text>
          </View>
          <View style={styles.entryMeta}>
            {titleName && (
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>{titleName}</Text>
              </View>
            )}
            {item.badges?.slice(0, 3).map((badgeId) => {
              const b = getBadgeDefinition(badgeId)
              return b ? <Text key={badgeId} style={styles.badgeEmoji}>{b.emoji}</Text> : null
            })}
            {item.prefecture && (
              <Text style={styles.prefText}>📍 {item.prefecture}</Text>
            )}
          </View>
        </View>

        {/* スコア */}
        <View style={styles.scoreCell}>
          <Text style={styles.score}>{item.score.toLocaleString()}</Text>
          <Text style={styles.scoreUnit}>{unit}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 貢献ランキング</Text>
        <Text style={styles.headerSub}>迷子ペット捜索に協力しているユーザー</Text>
      </View>

      {/* マイランク */}
      {user && myRank !== null && (
        <View style={styles.myRankCard}>
          <Text style={styles.myRankNum}>#{myRank}</Text>
          <View>
            <Text style={styles.myRankLabel}>あなたの順位</Text>
            <Text style={styles.myRankType}>{RANKING_TYPE_LABELS[activeType]}</Text>
          </View>
        </View>
      )}
      {user && myRank === null && !loading && (
        <View style={styles.myRankEmpty}>
          <Text style={styles.myRankEmptyText}>
            このランキングにはまだ参加していません。
            <Text style={styles.myRankLink} onPress={() => router.push('/sightings/new')}>
              {' '}目撃情報を投稿する
            </Text>
          </Text>
        </View>
      )}

      {/* タブ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {RANKING_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.type}
            style={[styles.tab, activeType === tab.type && styles.tabActive]}
            onPress={() => setActiveType(tab.type)}
          >
            <Text style={[styles.tabText, activeType === tab.type && styles.tabTextActive]}>
              {tab.emoji} {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* コンテンツ */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C46B00" size="large" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : needsAuth && !user ? (
        <View style={styles.authRequired}>
          <Text style={styles.authEmoji}>🔒</Text>
          <Text style={styles.authTitle}>ログインが必要です</Text>
          <Text style={styles.authSub}>期間別ランキングは会員のみ閲覧できます</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginBtnText}>ログインして見る</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>まだデータがありません</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            user ? (
              <View style={styles.ctaCard}>
                <Text style={styles.ctaText}>捜索に協力して貢献ポイントを獲得しよう</Text>
                <View style={styles.ctaRow}>
                  <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/sightings/new')}>
                    <Text style={styles.ctaBtnText}>👁️ 目撃情報を投稿（+2pt）</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ctaBtnSub} onPress={() => router.push('/rewards')}>
                    <Text style={styles.ctaBtnSubText}>🎁 貢献特典を見る</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#3D2400' },
  headerSub: { fontSize: 12, color: '#8B6340', marginTop: 2 },

  myRankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, margin: 12, padding: 14,
    borderRadius: 16, backgroundColor: '#FFF3DC', borderWidth: 2, borderColor: '#FFD98A',
  },
  myRankNum: { fontSize: 28, fontWeight: '900', color: '#C46B00' },
  myRankLabel: { fontSize: 12, fontWeight: 'bold', color: '#7A4500' },
  myRankType: { fontSize: 11, color: '#B08050', marginTop: 1 },
  myRankEmpty: {
    margin: 12, padding: 10, borderRadius: 12,
    backgroundColor: '#FFF9F0', borderWidth: 1.5, borderColor: '#FFD98A',
    borderStyle: 'dashed',
  },
  myRankEmptyText: { fontSize: 12, color: '#B08050', textAlign: 'center' },
  myRankLink: { color: '#C46B00', textDecorationLine: 'underline' },

  tabScroll: { maxHeight: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FFF3DC', borderWidth: 1.5, borderColor: '#FFD98A',
  },
  tabActive: { backgroundColor: '#C46B00', borderColor: '#C46B00' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#8B5E1A' },
  tabTextActive: { color: '#fff' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#7A4500', fontSize: 14 },

  authRequired: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  authEmoji: { fontSize: 40, marginBottom: 12 },
  authTitle: { fontSize: 16, fontWeight: 'bold', color: '#5A3A1A', marginBottom: 6 },
  authSub: { fontSize: 13, color: '#8B6340', textAlign: 'center', marginBottom: 16 },
  loginBtn: { backgroundColor: '#FFC96B', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  loginBtnText: { fontWeight: 'bold', color: '#3D2400', fontSize: 14 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#8B6340', fontSize: 14 },

  list: { padding: 12, gap: 8 },

  entryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#FFE0A0',
  },
  entryCardMe: {
    backgroundColor: '#FFF3DC', borderColor: '#FFD98A', borderWidth: 2,
  },

  rankCell: { width: 32, alignItems: 'center', flexShrink: 0 },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 14, fontWeight: 'bold', color: '#B08050' },

  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE0A0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 16, fontWeight: 'bold', color: '#5A3A1A' },

  entryInfo: { flex: 1, minWidth: 0 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center' },
  entryName: { fontSize: 14, fontWeight: 'bold', color: '#3D2400', flex: 1 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  titleBadge: { backgroundColor: '#FFC96B', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  titleBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#3D2400' },
  badgeEmoji: { fontSize: 14 },
  prefText: { fontSize: 10, color: '#B08050' },

  scoreCell: { alignItems: 'flex-end', flexShrink: 0 },
  score: { fontSize: 16, fontWeight: '900', color: '#C46B00' },
  scoreUnit: { fontSize: 11, color: '#B08050', marginTop: 1 },

  ctaCard: {
    marginTop: 8, padding: 16, borderRadius: 16, backgroundColor: '#FFF3DC',
    borderWidth: 1.5, borderColor: '#FFD98A', alignItems: 'center',
  },
  ctaText: { fontSize: 13, fontWeight: 'bold', color: '#7A4500', marginBottom: 10 },
  ctaRow: { flexDirection: 'row', gap: 8 },
  ctaBtn: { backgroundColor: '#FFC96B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  ctaBtnText: { fontSize: 12, fontWeight: 'bold', color: '#3D2400' },
  ctaBtnSub: {
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#FFD98A',
  },
  ctaBtnSubText: { fontSize: 12, fontWeight: 'bold', color: '#C46B00' },
})

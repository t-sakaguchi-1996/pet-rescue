import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { fetchUserPets, fetchUserProfile } from '../../src/lib/firestore'
import PetCard from '../../src/components/PetCard'
import { requestNotificationPermission } from '../../src/lib/notifications'
import type { Pet, UserProfile } from '../../src/types'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'posts'>('overview')

  useEffect(() => {
    if (user) {
      fetchUserPets(user.uid).then(setPets)
      fetchUserProfile(user.uid).then(setProfile)
    }
  }, [user])

  const handleEnableNotifications = async () => {
    if (!user) return
    const enabled = await requestNotificationPermission(user.uid)
    setNotifEnabled(enabled)
    Alert.alert(
      '通知設定',
      enabled ? '近くで迷子ペットが投稿された際に通知します' : '通知が許可されませんでした'
    )
  }

  const handleLogout = async () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await logout()
          setPets([])
          setProfile(null)
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.gray}>読み込み中...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.message}>ログインしてマイページを確認</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryBtnText}>ログイン</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/register')}>
          <Text style={styles.secondaryBtnText}>新規登録</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const points = profile?.points ?? 0
  const totalEarned = profile?.totalPointsEarned ?? 0

  return (
    <View style={styles.container}>
      {/* プロフィールヘッダー */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🐾</Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{user.displayName ?? 'ユーザー'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {profile?.selectedTitle && (
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>🏅 {profile.selectedTitle}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ポイントカード */}
      <View style={styles.pointCard}>
        <View style={styles.pointMain}>
          <Text style={styles.pointLabel}>現在のポイント</Text>
          <Text style={styles.pointValue}>
            ⭐ <Text style={styles.pointNumber}>{points.toLocaleString()}</Text>
            <Text style={styles.pointUnit}> pt</Text>
          </Text>
        </View>
        <View style={styles.pointDivider} />
        <View style={styles.pointStats}>
          <View style={styles.pointStatItem}>
            <Text style={styles.pointStatValue}>{totalEarned.toLocaleString()}</Text>
            <Text style={styles.pointStatLabel}>累計獲得</Text>
          </View>
          <View style={styles.pointStatItem}>
            <Text style={styles.pointStatValue}>{profile?.sightingCount ?? 0}</Text>
            <Text style={styles.pointStatLabel}>目撃投稿</Text>
          </View>
          <View style={styles.pointStatItem}>
            <Text style={styles.pointStatValue}>{profile?.bestInfoCount ?? 0}</Text>
            <Text style={styles.pointStatLabel}>最有力</Text>
          </View>
        </View>
      </View>

      {/* タブ */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>概要</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            投稿 ({pets.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView style={styles.overviewScroll}>
          {/* バッジ・称号 */}
          {(profile?.badges?.length ?? 0) > 0 || (profile?.titles?.length ?? 0) > 0 ? (
            <View style={styles.achievementCard}>
              <Text style={styles.achievementTitle}>🏆 実績</Text>
              {(profile?.titles?.length ?? 0) > 0 && (
                <View style={styles.achievementRow}>
                  <Text style={styles.achievementLabel}>称号</Text>
                  <View style={styles.achievementChips}>
                    {profile!.titles!.map((t) => (
                      <View key={t} style={styles.achievementChip}>
                        <Text style={styles.achievementChipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {(profile?.badges?.length ?? 0) > 0 && (
                <View style={styles.achievementRow}>
                  <Text style={styles.achievementLabel}>バッジ</Text>
                  <View style={styles.achievementChips}>
                    {profile!.badges!.map((b) => (
                      <View key={b} style={[styles.achievementChip, styles.badgeChip]}>
                        <Text style={styles.achievementChipText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {/* 設定 */}
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>設定</Text>
            <TouchableOpacity style={styles.settingItem} onPress={handleEnableNotifications}>
              <Text style={styles.settingItemText}>
                {notifEnabled ? '🔔 通知オン' : '🔕 通知を有効にする'}
              </Text>
              <Text style={styles.settingItemArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/sightings/new')}
            >
              <Text style={styles.settingItemText}>👁️ 目撃情報を投稿する</Text>
              <Text style={styles.settingItemArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PetCard pet={item} onPress={() => router.push(`/pet/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>まだ投稿がありません</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const WARM_DARK = '#3D2400'
const WARM_MID = '#7A4500'
const WARM_ACCENT = '#FFC96B'
const WARM_BG = '#FFF3DC'
const WARM_BORDER = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  message: { color: '#6b7280', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  gray: { color: '#9ca3af' },
  primaryBtn: {
    backgroundColor: WARM_ACCENT, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 10, marginBottom: 10, width: '100%', alignItems: 'center',
  },
  primaryBtnText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },

  // Profile header
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
  },
  avatarWrapper: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: WARM_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  titleBadge: {
    backgroundColor: WARM_BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    marginTop: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: WARM_BORDER,
  },
  titleBadgeText: { fontSize: 11, color: WARM_MID, fontWeight: 'bold' },

  // Points card
  pointCard: {
    margin: 12, padding: 16, borderRadius: 16, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: WARM_BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  pointMain: { alignItems: 'center', paddingBottom: 12 },
  pointLabel: { fontSize: 12, color: WARM_MID, fontWeight: '600', marginBottom: 4 },
  pointValue: { fontSize: 28, color: WARM_DARK },
  pointNumber: { fontWeight: '900' },
  pointUnit: { fontSize: 16, color: WARM_MID },
  pointDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 },
  pointStats: { flexDirection: 'row', justifyContent: 'space-around' },
  pointStatItem: { alignItems: 'center' },
  pointStatValue: { fontSize: 18, fontWeight: 'bold', color: WARM_DARK },
  pointStatLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: WARM_ACCENT },
  tabText: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  tabTextActive: { color: WARM_MID, fontWeight: 'bold' },

  // Overview
  overviewScroll: { flex: 1 },
  achievementCard: {
    margin: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  achievementTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  achievementRow: { marginBottom: 8 },
  achievementLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  achievementChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  achievementChip: {
    backgroundColor: WARM_BG, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: WARM_BORDER,
  },
  badgeChip: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  achievementChipText: { fontSize: 12, color: WARM_MID, fontWeight: '600' },

  settingsCard: {
    margin: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6',
    overflow: 'hidden',
  },
  settingsTitle: { fontSize: 13, color: '#9ca3af', padding: 14, paddingBottom: 6 },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  settingItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  settingItemArrow: { fontSize: 20, color: '#9ca3af' },

  logoutBtn: {
    margin: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  logoutText: { color: '#6b7280', fontWeight: '600' },

  // Posts tab
  list: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#9ca3af' },
})

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { fetchUserPets } from '../../src/lib/firestore'
import PetCard from '../../src/components/PetCard'
import { requestNotificationPermission } from '../../src/lib/notifications'
import * as Device from 'expo-device'
import type { Pet } from '../../src/types'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [notifEnabled, setNotifEnabled] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserPets(user.uid).then(setPets)
    }
  }, [user])

  const handleEnableNotifications = async () => {
    if (!user) return
    const enabled = await requestNotificationPermission(user.uid)
    setNotifEnabled(enabled)
    if (enabled) {
      Alert.alert('通知設定', '近くで迷子ペットが投稿された際に通知します')
    } else {
      Alert.alert('通知設定', '通知が許可されませんでした')
    }
  }

  const handleLogout = async () => {
    await logout()
    setPets([])
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
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.primaryBtnText}>ログイン</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.secondaryBtnText}>新規登録</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* プロフィールカード */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🐾</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>
            {user.displayName ?? 'ユーザー'}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      {/* 通知設定 */}
      <TouchableOpacity
        style={styles.notifBtn}
        onPress={handleEnableNotifications}
      >
        <Text style={styles.notifBtnText}>
          {notifEnabled ? '🔔 通知オン' : '🔕 通知を有効にする'}
        </Text>
      </TouchableOpacity>

      {/* 投稿一覧 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>自分の投稿 ({pets.length}件)</Text>
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PetCard
            pet={item}
            onPress={() => router.push(`/pet/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>まだ投稿がありません</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  message: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  gray: { color: '#9ca3af' },
  primaryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  notifBtn: {
    margin: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  notifBtnText: { color: '#374151', fontWeight: '600' },
  section: { paddingHorizontal: 12, paddingVertical: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  list: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#9ca3af' },
  logoutBtn: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#6b7280', fontWeight: '600' },
})

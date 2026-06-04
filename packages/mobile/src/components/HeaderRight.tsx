import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

const MENU_ITEMS: { emoji: string; label: string; route: string }[] = [
  { emoji: '🏠', label: '一覧', route: '/(tabs)' },
  { emoji: '🗺️', label: '地図で探す', route: '/(tabs)/map' },
  { emoji: '👁️', label: '目撃情報一覧', route: '/(tabs)/sightings' },
  { emoji: '👁️', label: '目撃情報を投稿 (+2pt)', route: '/sightings/new' },
  { emoji: '🏆', label: '貢献ランキング', route: '/(tabs)/ranking' },
  { emoji: '🎁', label: '貢献特典を見る', route: '/rewards' },
  { emoji: '🔍', label: '迷子を報告する', route: '/(tabs)/post' },
]

export default function HeaderRight() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const photoURL = profile?.photoURL ?? user?.photoURL
  const initial = (
    profile?.displayName ?? user?.displayName ?? user?.email ?? 'U'
  )
    .charAt(0)
    .toUpperCase()

  const navTo = (route: string) => {
    setMenuOpen(false)
    router.push(route as never)
  }

  return (
    <View style={styles.container}>
      {user && <NotificationBell />}

      {user && (
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navTo('/(tabs)/profile')}
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* ハンバーガー */}
      <TouchableOpacity
        style={[styles.hamburger, menuOpen && styles.hamburgerActive]}
        onPress={() => setMenuOpen(true)}
      >
        <View style={styles.hLine} />
        <View style={styles.hLine} />
        <View style={styles.hLine} />
      </TouchableOpacity>

      {/* ドロップダウンメニュー */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.route + item.label}
                  style={styles.menuItem}
                  onPress={() => navTo(item.route)}
                >
                  <Text style={styles.menuItemText}>
                    {item.emoji} {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.divider} />

              {user ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navTo('/(tabs)/profile')}
                >
                  <Text style={styles.menuItemText}>👤 マイページ</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navTo('/auth/login')}
                  >
                    <Text style={styles.menuItemText}>🔑 ログイン</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navTo('/auth/register')}
                  >
                    <Text style={styles.menuItemText}>✨ 新規登録</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 8 },

  avatarBtn: { marginHorizontal: 2 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFD98A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 13, fontWeight: 'bold', color: '#5A3A1A' },

  hamburger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  hamburgerActive: { backgroundColor: '#FFD98A' },
  hLine: {
    width: 18,
    height: 2,
    backgroundColor: '#5A3A1A',
    borderRadius: 2,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 52,
  },
  menu: {
    width: 220,
    backgroundColor: 'rgba(255,244,220,0.98)',
    borderRadius: 16,
    marginRight: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: '#FFD98A',
    maxHeight: 480,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  menuItemText: { fontSize: 14, fontWeight: '600', color: '#5A3A1A' },
  divider: { height: 1, backgroundColor: '#FFE8A0', marginVertical: 4, marginHorizontal: 12 },
})

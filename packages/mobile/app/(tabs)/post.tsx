import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import PostForm from '../../src/components/PostForm'

export default function PostScreen() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const params = useLocalSearchParams<{ type?: string }>()
  const defaultIsLost = params.type !== 'found'

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
        <Text style={styles.message}>投稿するにはログインが必要です</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginBtnText}>ログインする</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return <PostForm key={params.type ?? 'lost'} userId={user.uid} defaultIsLost={defaultIsLost} />
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  message: { color: '#6b7280', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  gray: { color: '#9ca3af' },
  loginBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
})

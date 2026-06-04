import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { fetchPetById } from '../src/lib/firestore'
import { useAuth } from '../src/contexts/AuthContext'
import PostForm from '../src/components/PostForm'
import LoadingIndicator from '../src/components/LoadingIndicator'
import type { Pet } from '../src/types'

export default function PetEditScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (!petId) {
      setError('投稿IDが見つかりません')
      setLoading(false)
      return
    }
    fetchPetById(petId)
      .then((data) => {
        if (!data) { setError('投稿が見つかりません'); return }
        if (data.userId !== user.uid) { setError('この投稿を編集する権限がありません'); return }
        setPet(data)
      })
      .catch(() => setError('データの読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [petId, user, authLoading])

  if (authLoading || loading) {
    return <LoadingIndicator />
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  if (!pet || !user) return null

  return <PostForm userId={user.uid} initialPet={pet} />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#7A4500', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
})

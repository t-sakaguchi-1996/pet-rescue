import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import type { ErrorBoundaryProps } from 'expo-router'

export default function ErrorScreen() {
  return null
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter()

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>エラーが発生しました</Text>
      <View style={styles.errorBox}>
        <Text style={styles.errorName}>{error.name}</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        {error.stack ? (
          <Text style={styles.errorStack}>{error.stack}</Text>
        ) : null}
      </View>
      <TouchableOpacity style={styles.retryBtn} onPress={retry}>
        <Text style={styles.retryText}>再試行</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.homeText}>ホームへ戻る</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    marginTop: 60,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: 12,
    lineHeight: 20,
  },
  errorStack: {
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  retryBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  retryText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  homeBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  homeText: { color: '#374151', fontWeight: '600', fontSize: 15 },
})

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ErrorBoundary } from 'expo-router'

export { ErrorBoundary }

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="pet/[id]"
          options={{ title: 'ペット詳細', headerBackTitle: '戻る' }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ title: 'ログイン', headerBackTitle: '戻る' }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ title: '新規登録', headerBackTitle: '戻る' }}
        />
      </Stack>
    </AuthProvider>
  )
}

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '../src/contexts/AuthContext'
export { ErrorBoundary } from './error'

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
        <Stack.Screen
          name="sightings/new"
          options={{ title: '目撃情報を投稿', headerBackTitle: '戻る' }}
        />
        <Stack.Screen
          name="sightings/[id]"
          options={{ title: '目撃情報詳細', headerBackTitle: '戻る' }}
        />
        <Stack.Screen
          name="rewards"
          options={{ title: '貢献特典', headerBackTitle: '戻る' }}
        />
        <Stack.Screen
          name="pet-edit"
          options={{ title: '投稿を編集', headerBackTitle: '戻る' }}
        />
        <Stack.Screen
          name="users/[id]"
          options={{ title: 'プロフィール', headerBackTitle: '戻る' }}
        />
      </Stack>
    </AuthProvider>
  )
}

import { Text } from 'react-native'
import { Tabs } from 'expo-router'

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: active ? 1 : 0.45 }}>{emoji}</Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          paddingBottom: 4,
          height: 58,
        },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '一覧',
          tabBarLabel: '一覧',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" active={focused} />
          ),
          headerTitle: '🐾 ペットレスキュー',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '地図',
          tabBarLabel: '地図',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗺️" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '投稿',
          tabBarLabel: '投稿',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="➕" active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイページ',
          tabBarLabel: 'マイ',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" active={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

import { Tabs } from 'expo-router'

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
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          headerTitle: 'ペット救助',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '地図',
          tabBarLabel: '地図',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '投稿',
          tabBarLabel: '投稿',
          tabBarIcon: ({ color }) => <TabIcon emoji="➕" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイページ',
          tabBarLabel: 'マイ',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  )
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 22, opacity: color === '#ef4444' ? 1 : 0.5 }}>{emoji}</Text>
}

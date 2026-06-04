import { Text } from 'react-native'
import { Tabs } from 'expo-router'

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{emoji}</Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#C46B00',
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" active={focused} />,
          headerTitle: '🐾 ANIMAL GO',
        }}
      />
      <Tabs.Screen
        name="sightings"
        options={{
          title: '目撃',
          tabBarLabel: '目撃',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👁️" active={focused} />,
          headerTitle: '目撃情報一覧',
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '投稿',
          tabBarLabel: '投稿',
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '地図',
          tabBarLabel: '地図',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'ランキング',
          tabBarLabel: 'ランキング',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" active={focused} />,
          headerTitle: '貢献ランキング',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイページ',
          tabBarLabel: 'マイ',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" active={focused} />,
        }}
      />
    </Tabs>
  )
}

import { Text, Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HeaderRight from '../../src/components/HeaderRight'

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{emoji}</Text>
  )
}

const HEADER_STYLE = {
  backgroundColor: 'rgba(255,238,209,0.97)',
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1.5,
  borderBottomColor: '#FFD98A',
} as const

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#C46B00',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#FFD98A',
          backgroundColor: 'rgba(255,248,235,0.97)',
          paddingBottom: 4,
          height: 58,
        },
        headerStyle: Platform.OS === 'ios'
          ? { ...HEADER_STYLE, height: insets.top + 60 }
          : HEADER_STYLE,
        headerTintColor: '#3D2400',
        headerTitleStyle: { fontWeight: '900', color: '#C46B00', fontSize: 17 },
        headerRight: () => <HeaderRight />,
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
          headerTitle: '👁️ 目撃情報一覧',
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '投稿',
          tabBarLabel: '投稿',
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" active={focused} />,
          headerTitle: '🐾 ペット投稿',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '地図',
          tabBarLabel: '地図',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" active={focused} />,
          headerTitle: '🗺️ 地図で探す',
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'ランキング',
          tabBarLabel: 'ランキング',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" active={focused} />,
          headerTitle: '🏆 貢献ランキング',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイページ',
          tabBarLabel: 'マイ',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" active={focused} />,
          headerTitle: '👤 マイページ',
        }}
      />
    </Tabs>
  )
}

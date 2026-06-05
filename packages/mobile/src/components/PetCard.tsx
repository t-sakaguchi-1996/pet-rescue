import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import type { Pet } from '../types'
import { SPECIES_LABELS, STATUS_LABELS } from '../types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 12 * 2 - 10) / 2

interface Props {
  pet: Pet
  onPress: () => void
  currentUserId?: string
}

export default function PetCard({ pet, onPress, currentUserId }: Props) {
  const router = useRouter()
  const isLost = pet.type === 'lost'
  const ownerInitial = (pet.ownerDisplayName ?? 'U').charAt(0).toUpperCase()
  const ownerPhoto = pet.ownerPhotoURL ?? null

  const handleOwnerPress = () => {
    if (!pet.userId) return
    if (pet.userId === currentUserId) {
      router.push(`/users/${pet.userId}`)
      return
    }
    Alert.alert('プロフィール確認', 'プロフィールを確認しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'OK', onPress: () => router.push(`/users/${pet.userId}`) },
    ])
  }

  const statusBg =
    pet.status === 'searching' ? '#fef3c7'
    : pet.status === 'protected' ? '#d1fae5'
    : '#f3f4f6'

  const statusColor =
    pet.status === 'searching' ? '#92400e'
    : pet.status === 'protected' ? '#065f46'
    : '#6b7280'

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageWrapper}>
        {pet.images.length > 0 ? (
          <Image source={{ uri: pet.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={styles.noImageEmoji}>
              {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
            </Text>
          </View>
        )}

        {/* 種別バナー（下部オーバーレイ） */}
        <View style={[styles.typeBanner, isLost ? styles.typeBannerLost : styles.typeBannerFound]}>
          <Text style={styles.typeBannerText}>
            {isLost ? '🔍 迷子' : '🤝 保護'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* 保護の場合は目撃カードと同じ：タイトル（説明文）＋場所＋種別＋日付 */}
        {isLost ? (
          <Text style={styles.name} numberOfLines={1}>
            {pet.name || '名前不明'}
            <Text style={styles.species}> ({SPECIES_LABELS[pet.species]})</Text>
          </Text>
        ) : (
          <Text style={styles.name} numberOfLines={2}>
            {pet.description || pet.name || '保護された動物'}
          </Text>
        )}
        <Text style={styles.location} numberOfLines={1}>
          📍 {pet.location.prefecture} {pet.location.city}
        </Text>
        <View style={styles.footer}>
          {isLost ? (
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[pet.status]}
              </Text>
            </View>
          ) : (
            <Text style={styles.species}>{SPECIES_LABELS[pet.species]}</Text>
          )}
          <Text style={styles.date}>
            {format(new Date(pet.createdAt), 'M/d', { locale: ja })}
          </Text>
        </View>
        {/* オーナー行 */}
        <TouchableOpacity
          style={styles.ownerRow}
          onPress={handleOwnerPress}
          activeOpacity={pet.userId ? 0.7 : 1}
        >
          <View style={styles.ownerAvatar}>
            {ownerPhoto ? (
              <Image source={{ uri: ownerPhoto }} style={styles.ownerAvatarImage} />
            ) : (
              <Text style={styles.ownerInitial}>{ownerInitial}</Text>
            )}
          </View>
          <Text style={styles.ownerName} numberOfLines={1}>
            {pet.ownerDisplayName ?? '投稿者'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  imageWrapper: { position: 'relative' },
  image: { width: '100%', height: CARD_WIDTH, backgroundColor: '#f3f4f6' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  noImageEmoji: { fontSize: 40 },

  typeBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 5,
    alignItems: 'center',
  },
  typeBannerLost: { backgroundColor: 'rgba(239,68,68,0.88)' },
  typeBannerFound: { backgroundColor: 'rgba(37,99,235,0.88)' },
  typeBannerText: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },

  body: { padding: 8 },
  name: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
  species: { fontSize: 11, fontWeight: 'normal', color: '#6b7280' },
  location: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  date: { fontSize: 10, color: '#9ca3af' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  ownerAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFE0A0', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  ownerAvatarImage: { width: 18, height: 18 },
  ownerInitial: { fontSize: 9, fontWeight: 'bold', color: '#7A4500' },
  ownerName: { fontSize: 10, color: '#7A4500', flex: 1 },
})

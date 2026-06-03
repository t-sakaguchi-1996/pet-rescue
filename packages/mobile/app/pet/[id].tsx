import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { fetchPetById } from '../../src/lib/firestore'
import type { Pet } from '../../../shared/src/types'
import {
  SPECIES_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
} from '../../../shared/src/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const { width } = Dimensions.get('window')

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    if (id) {
      fetchPetById(id)
        .then(setPet)
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    )
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.gray}>ペット情報が見つかりません</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 画像 */}
      <View style={styles.imageContainer}>
        {pet.images.length > 0 ? (
          <Image
            source={{ uri: pet.images[imageIndex] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.mainImage, styles.noImage]}>
            <Text style={styles.noImageEmoji}>
              {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
            </Text>
          </View>
        )}

        {/* バッジ */}
        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  pet.type === 'lost' ? '#ef4444' : '#3b82f6',
              },
            ]}
          >
            <Text style={styles.badgeText}>{TYPE_LABELS[pet.type]}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  pet.status === 'searching'
                    ? '#f59e0b'
                    : pet.status === 'protected'
                      ? '#10b981'
                      : '#9ca3af',
              },
            ]}
          >
            <Text style={styles.badgeText}>{STATUS_LABELS[pet.status]}</Text>
          </View>
        </View>
      </View>

      {/* サムネイル */}
      {pet.images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailRow}
        >
          {pet.images.map((img, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setImageIndex(i)}
              style={[
                styles.thumbnail,
                i === imageIndex && styles.thumbnailActive,
              ]}
            >
              <Image source={{ uri: img }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.body}>
        {/* タイトル */}
        <Text style={styles.name}>{pet.name || '名前不明'}</Text>
        <Text style={styles.species}>
          {SPECIES_LABELS[pet.species]}
          {pet.breed ? ` / ${pet.breed}` : ''}
        </Text>

        {/* 基本情報 */}
        <View style={styles.card}>
          <InfoRow label="毛色" value={pet.color} />
          <InfoRow label="性別" value={GENDER_LABELS[pet.gender]} />
          {pet.age ? <InfoRow label="年齢" value={pet.age} /> : null}
          <InfoRow
            label={pet.type === 'lost' ? '迷子になった日' : '保護した日'}
            value={format(new Date(pet.lostDate), 'yyyy年M月d日', {
              locale: ja,
            })}
          />
          <InfoRow
            label="場所"
            value={`${pet.location.prefecture} ${pet.location.city}`}
          />
          {pet.location.address ? (
            <InfoRow label="詳細場所" value={pet.location.address} />
          ) : null}

        </View>

        {/* 特徴・説明 */}
        {pet.description ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>特徴・詳細</Text>
            <Text style={styles.description}>{pet.description}</Text>
          </View>
        ) : null}

        {/* 連絡先 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>連絡先</Text>
          <Text style={styles.contactNote}>
            情報をお持ちの方はご連絡ください
          </Text>
          {pet.contactEmail ? (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`mailto:${pet.contactEmail}`)}
            >
              <Text style={styles.contactBtnText}>
                📧 メールで連絡する
              </Text>
            </TouchableOpacity>
          ) : null}
          {pet.contactPhone ? (
            <TouchableOpacity
              style={[styles.contactBtn, styles.contactBtnPhone]}
              onPress={() => Linking.openURL(`tel:${pet.contactPhone}`)}
            >
              <Text style={styles.contactBtnText}>
                📞 電話で連絡する
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.postedAt}>
          投稿日:{' '}
          {format(new Date(pet.createdAt), 'yyyy年M月d日 H:mm', {
            locale: ja,
          })}
        </Text>
      </View>
    </ScrollView>
  )
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.highlight]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gray: { color: '#9ca3af' },
  imageContainer: { position: 'relative' },
  mainImage: { width, height: width * 0.7, backgroundColor: '#f3f4f6' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  noImageEmoji: { fontSize: 72 },
  badges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  thumbnailRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: { borderColor: '#ef4444' },
  thumbnailImage: { width: '100%', height: '100%' },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  species: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  infoLabel: { width: 100, fontSize: 13, color: '#9ca3af' },
  infoValue: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  highlight: { color: '#ef4444' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },
  contactNote: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  contactBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  contactBtnPhone: { backgroundColor: '#3b82f6' },
  contactBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  postedAt: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
})

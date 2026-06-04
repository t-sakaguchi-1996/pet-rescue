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
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { fetchPetById, fetchRecentSightings, subscribeComments, createComment } from '../../src/lib/firestore'
import { useAuth } from '../../src/contexts/AuthContext'
import type { Pet, Comment, Sighting } from '../../src/types'
import {
  SPECIES_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
} from '../../src/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const { width } = Dimensions.get('window')

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageIndex, setImageIndex] = useState(0)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [nearbySightings, setNearbySightings] = useState<Sighting[]>([])

  useEffect(() => {
    if (!id) return
    fetchPetById(id)
      .then(setPet)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeComments(id, setComments)
  }, [id])

  useEffect(() => {
    if (!pet) return
    fetchRecentSightings(100).then((all) => {
      const nearby = all.filter((s) => {
        if (s.species && pet.species && s.species !== pet.species) return false
        if (s.location.city && pet.location.city && s.location.city === pet.location.city) return true
        if (
          pet.location.lat && pet.location.lng &&
          s.location.lat !== undefined && s.location.lng !== undefined
        ) {
          return haversineKm(pet.location.lat, pet.location.lng, s.location.lat, s.location.lng) <= 5
        }
        return false
      })
      setNearbySightings(nearby.slice(0, 6))
    })
  }, [pet])

  const handleSubmitComment = async () => {
    if (!user || !id || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      await createComment(id, user.uid, user.displayName ?? 'ユーザー', commentText.trim())
      setCommentText('')
    } catch (e) {
      Alert.alert('エラー', 'コメントの投稿に失敗しました')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C46B00" size="large" />
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

  const isLostSearching = pet.type === 'lost' && pet.status === 'searching'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: pet.type === 'lost' ? '#ef4444' : '#3b82f6' }]}>
              <Text style={styles.badgeText}>{TYPE_LABELS[pet.type]}</Text>
            </View>
            <View style={[styles.badge, {
              backgroundColor: pet.status === 'searching' ? '#f59e0b' : pet.status === 'protected' ? '#10b981' : '#9ca3af',
            }]}>
              <Text style={styles.badgeText}>{STATUS_LABELS[pet.status]}</Text>
            </View>
          </View>
        </View>

        {/* サムネイル */}
        {pet.images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
            {pet.images.map((img, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setImageIndex(i)}
                style={[styles.thumbnail, i === imageIndex && styles.thumbnailActive]}
              >
                <Image source={{ uri: img }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.body}>
          <Text style={styles.name}>{pet.name || '名前不明'}</Text>
          <Text style={styles.species}>
            {SPECIES_LABELS[pet.species]}{pet.breed ? ` / ${pet.breed}` : ''}
          </Text>

          {/* 基本情報 */}
          <View style={styles.card}>
            <InfoRow label="毛色" value={pet.color} />
            <InfoRow label="性別" value={GENDER_LABELS[pet.gender]} />
            {pet.age ? <InfoRow label="年齢" value={pet.age} /> : null}
            <InfoRow
              label={pet.type === 'lost' ? '迷子になった日' : '保護した日'}
              value={format(new Date(pet.lostDate), 'yyyy年M月d日', { locale: ja })}
            />
            <InfoRow label="場所" value={`${pet.location.prefecture} ${pet.location.city}`} />
            {pet.location.address ? <InfoRow label="詳細場所" value={pet.location.address} /> : null}
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
            <Text style={styles.contactNote}>情報をお持ちの方はご連絡ください</Text>
            {pet.contactEmail ? (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`mailto:${pet.contactEmail}`)}
              >
                <Text style={styles.contactBtnText}>📧 メールで連絡する</Text>
              </TouchableOpacity>
            ) : null}
            {pet.contactPhone ? (
              <TouchableOpacity
                style={[styles.contactBtn, styles.contactBtnPhone]}
                onPress={() => Linking.openURL(`tel:${pet.contactPhone}`)}
              >
                <Text style={styles.contactBtnText}>📞 電話で連絡する</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 目撃情報投稿CTA（迷子・捜索中のみ） */}
          {isLostSearching && (
            <TouchableOpacity
              style={styles.sightingCta}
              onPress={() => router.push({ pathname: '/sightings/new', params: { species: pet.species } })}
            >
              <Text style={styles.sightingCtaEmoji}>👁️</Text>
              <View style={styles.sightingCtaBody}>
                <Text style={styles.sightingCtaTitle}>このペットを見かけましたか？</Text>
                <Text style={styles.sightingCtaDesc}>目撃情報を投稿して飼い主の再会をサポートしよう！ +2pt</Text>
              </View>
              <Text style={styles.sightingCtaArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* 近くの目撃情報 */}
          {isLostSearching && nearbySightings.length > 0 && (
            <View style={styles.sightingsSection}>
              <Text style={styles.sectionTitle}>👁️ 近くの目撃情報 ({nearbySightings.length}件)</Text>
              {nearbySightings.map((s) => (
                <View key={s.id} style={styles.sightingCard}>
                  <View style={styles.sightingHeader}>
                    <Text style={styles.sightingTitle}>{s.title}</Text>
                    {s.isBestInfo && (
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>⭐ 最有力</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sightingMeta}>
                    📍 {s.location.prefecture} {s.location.city}
                    {s.location.address ? ` · ${s.location.address}` : ''}
                  </Text>
                  {s.description ? (
                    <Text style={styles.sightingDesc} numberOfLines={2}>{s.description}</Text>
                  ) : null}
                  <Text style={styles.sightingBy}>
                    by {s.posterName} ·{' '}
                    {format(new Date(s.createdAt), 'M月d日 H:mm', { locale: ja })}
                  </Text>
                  {s.photos.length > 0 && (
                    <Image source={{ uri: s.photos[0] }} style={styles.sightingPhoto} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* コメントセクション */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>
              💬 コメント {comments.length > 0 ? `(${comments.length}件)` : ''}
            </Text>

            {comments.length === 0 ? (
              <Text style={styles.noComments}>まだコメントがありません</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={[styles.commentCard, c.parentId && styles.commentReply]}>
                  {c.isBestInfo && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>⭐ 最有力情報</Text>
                    </View>
                  )}
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {(c.userDisplayName ?? '?')[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentName}>{c.userDisplayName}</Text>
                      <Text style={styles.commentDate}>
                        {format(new Date(c.createdAt), 'M月d日 H:mm', { locale: ja })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))
            )}

            {/* コメント入力 */}
            {user ? (
              <View style={styles.commentInput}>
                <TextInput
                  style={styles.commentTextField}
                  placeholder="コメントを入力..."
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.commentSubmitBtn, (!commentText.trim() || submittingComment) && styles.btnDisabled]}
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || submittingComment}
                >
                  <Text style={styles.commentSubmitText}>
                    {submittingComment ? '送信中...' : '送信'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.loginPrompt}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.loginPromptText}>ログインしてコメントする</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.postedAt}>
            投稿日: {format(new Date(pet.createdAt), 'yyyy年M月d日 H:mm', { locale: ja })}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.highlight]}>{value}</Text>
    </View>
  )
}

const WARM_DARK = '#3D2400'
const WARM_MID = '#7A4500'
const WARM_ACCENT = '#FFC96B'
const WARM_BG = '#FFF3DC'
const WARM_BORDER = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gray: { color: '#9ca3af' },
  imageContainer: { position: 'relative' },
  mainImage: { width, height: width * 0.7, backgroundColor: '#f3f4f6' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  noImageEmoji: { fontSize: 72 },
  badges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  thumbnailRow: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  thumbnail: { width: 64, height: 64, borderRadius: 8, marginRight: 8, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  thumbnailActive: { borderColor: '#C46B00' },
  thumbnailImage: { width: '100%', height: '100%' },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  species: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  infoRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  infoLabel: { width: 100, fontSize: 13, color: '#9ca3af' },
  infoValue: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  highlight: { color: '#C46B00' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },
  contactNote: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  contactBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 8 },
  contactBtnPhone: { backgroundColor: '#3b82f6' },
  contactBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Sighting CTA
  sightingCta: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WARM_BG,
    borderRadius: 14, padding: 14, marginBottom: 12, gap: 10,
    borderWidth: 1.5, borderColor: WARM_BORDER,
  },
  sightingCtaEmoji: { fontSize: 28 },
  sightingCtaBody: { flex: 1 },
  sightingCtaTitle: { fontSize: 13, fontWeight: 'bold', color: WARM_MID },
  sightingCtaDesc: { fontSize: 11, color: '#B08050', marginTop: 2 },
  sightingCtaArrow: { fontSize: 14, fontWeight: '900', color: '#C46B00' },

  // Sightings section
  sightingsSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  sightingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  sightingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  sightingTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 },
  sightingMeta: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  sightingDesc: { fontSize: 13, color: '#374151', marginBottom: 4 },
  sightingBy: { fontSize: 11, color: '#9ca3af' },
  sightingPhoto: { width: '100%', height: 120, borderRadius: 8, marginTop: 8, backgroundColor: '#f3f4f6' },
  bestBadge: { backgroundColor: WARM_BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: WARM_BORDER },
  bestBadgeText: { fontSize: 10, fontWeight: 'bold', color: WARM_MID },

  // Comments
  commentsSection: { marginBottom: 12 },
  noComments: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
  commentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  commentReply: { marginLeft: 16, borderLeftWidth: 3, borderLeftColor: '#e5e7eb' },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF3DC',
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 13, fontWeight: 'bold', color: WARM_MID },
  commentMeta: { flex: 1 },
  commentName: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
  commentDate: { fontSize: 11, color: '#9ca3af' },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  commentInput: { marginTop: 8, gap: 8 },
  commentTextField: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#374151', backgroundColor: '#fff', minHeight: 80, textAlignVertical: 'top',
  },
  commentSubmitBtn: {
    backgroundColor: WARM_ACCENT, borderRadius: 10, padding: 12, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  commentSubmitText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 14 },
  loginPrompt: {
    borderWidth: 1, borderColor: WARM_BORDER, borderRadius: 10, padding: 12,
    alignItems: 'center', marginTop: 8, backgroundColor: WARM_BG,
  },
  loginPromptText: { color: WARM_MID, fontWeight: '600', fontSize: 14 },
  postedAt: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 32 },
})

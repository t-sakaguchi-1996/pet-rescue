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
import {
  fetchPetById,
  fetchRecentSightings,
  subscribeComments,
  createComment,
  updatePet,
  selectBestInfoSighting,
  selectBestInfoComment,
  markSightingBestInfoPointGranted,
  markPetBestInfoPointGranted,
} from '../../src/lib/firestore'
import { grantBestSightingPoints, grantBestCommentPoints, grantDiscoveryBonus } from '../../src/lib/points'
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
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../src/lib/firebase'

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

  // Best info state
  const [localBestInfoId, setLocalBestInfoId] = useState<string | undefined>(undefined)
  const [localBestInfoType, setLocalBestInfoType] = useState<'comment' | 'sighting' | undefined>(undefined)
  const [localBestPointGranted, setLocalBestPointGranted] = useState(false)
  const [processingBestInfo, setProcessingBestInfo] = useState<string | null>(null)

  // Discovery confirm state
  const [discoveryDone, setDiscoveryDone] = useState(false)
  const [processingDiscovery, setProcessingDiscovery] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchPetById(id)
      .then((p) => {
        setPet(p)
        if (p) {
          setLocalBestInfoId(p.bestInfoId)
          setLocalBestInfoType(p.bestInfoType)
          setLocalBestPointGranted(Boolean(p.bestInfoPointGranted))
          setDiscoveryDone(Boolean(p.discoveryBonusGranted))
        }
      })
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

  const isPetOwner = Boolean(user && pet && user.uid === pet.userId)
  const isLostSearching = pet ? (pet.type === 'lost' && pet.status === 'searching') : false

  const handleSelectBestInfoSighting = async (sighting: Sighting) => {
    if (!user || !isPetOwner || !id) return
    const isAlready = localBestInfoId === sighting.id && localBestInfoType === 'sighting'
    if (isAlready) return
    const existingLabel = localBestInfoType === 'sighting' ? '目撃情報' : 'コメント'
    const msg = localBestInfoId && localBestInfoId !== sighting.id
      ? `この目撃情報を最有力情報に変更しますか？\n（現在の${existingLabel}は解除されます）\n\n※この操作は取り消せません。\n投稿者に +100pt を付与します。`
      : `「${sighting.posterName}」の目撃情報を最有力情報に選びますか？\n\n※この操作は取り消せません。\n投稿者に +100pt を付与します。`
    Alert.alert('最有力情報を選ぶ', msg, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '選ぶ', style: 'default',
        onPress: async () => {
          setProcessingBestInfo(sighting.id)
          try {
            const authorUserId = await selectBestInfoSighting(id, sighting.id, localBestInfoId, localBestInfoType)
            if (!localBestPointGranted && authorUserId && !sighting.bestInfoPointGranted) {
              await grantBestSightingPoints(authorUserId, sighting.id)
              await markSightingBestInfoPointGranted(sighting.id)
              await markPetBestInfoPointGranted(id)
              setLocalBestPointGranted(true)
            }
            setLocalBestInfoId(sighting.id)
            setLocalBestInfoType('sighting')
            setNearbySightings((prev) => prev.map((s) => ({ ...s, isBestInfo: s.id === sighting.id })))
          } catch {
            Alert.alert('エラー', '処理に失敗しました。もう一度お試しください。')
          } finally {
            setProcessingBestInfo(null)
          }
        },
      },
    ])
  }

  const handleSelectBestInfoComment = async (comment: Comment) => {
    if (!user || !isPetOwner || !id) return
    const msg = `「${comment.userDisplayName}」のコメントを最有力情報に選びますか？\n\n※この操作は取り消せません。\nコメント投稿者に +100pt を付与します。`
    Alert.alert('最有力情報を選ぶ', msg, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '選ぶ', style: 'default',
        onPress: async () => {
          setProcessingBestInfo(comment.id)
          try {
            const authorUserId = await selectBestInfoComment(id, comment.id, localBestInfoId, localBestInfoType)
            if (!localBestPointGranted && authorUserId && !comment.bestInfoPointGranted) {
              await grantBestCommentPoints(authorUserId, comment.id)
              setLocalBestPointGranted(true)
            }
            setLocalBestInfoId(comment.id)
            setLocalBestInfoType('comment')
            setComments((prev) => prev.map((c) => ({ ...c, isBestInfo: c.id === comment.id })))
          } catch {
            Alert.alert('エラー', '処理に失敗しました。もう一度お試しください。')
          } finally {
            setProcessingBestInfo(null)
          }
        },
      },
    ])
  }

  const handleConfirmDiscovery = async () => {
    if (!user || !isPetOwner || !id || !pet?.bestInfoId) return
    Alert.alert(
      '発見・保護を確認する',
      `「${pet.name || '名前不明'}」の発見・保護につながった情報として確認しますか？\n\n最有力情報の提供者に +300pt の発見貢献ボーナスが付与されます。\nこの操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '確認する', style: 'default',
          onPress: async () => {
            setProcessingDiscovery(true)
            try {
              let contributorUserId: string | undefined
              if (pet.bestInfoType === 'comment') {
                const snap = await getDoc(doc(db, 'pets', id, 'comments', pet.bestInfoId!))
                if (snap.exists()) contributorUserId = snap.data().userId as string | undefined
              } else {
                const snap = await getDoc(doc(db, 'sightings', pet.bestInfoId!))
                if (snap.exists()) contributorUserId = snap.data().userId as string | undefined
              }
              await updateDoc(doc(db, 'pets', id), {
                status: 'resolved',
                discoveryBonusGranted: true,
                updatedAt: Timestamp.now(),
              })
              if (contributorUserId) {
                await grantDiscoveryBonus(contributorUserId, id)
              }
              setDiscoveryDone(true)
            } catch {
              Alert.alert('エラー', '処理に失敗しました。もう一度お試しください。')
            } finally {
              setProcessingDiscovery(false)
            }
          },
        },
      ]
    )
  }

  const handleSubmitComment = async () => {
    if (!user || !id || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      await createComment(id, user.uid, user.displayName ?? 'ユーザー', commentText.trim())
      setCommentText('')
    } catch {
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

  const topLevelComments = comments.filter((c) => !c.parentId)
  const repliesFor = (parentId: string) => comments.filter((c) => c.parentId === parentId)

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 画像 */}
        <View style={styles.imageContainer}>
          {pet.images.length > 0 ? (
            <Image source={{ uri: pet.images[imageIndex] }} style={styles.mainImage} resizeMode="cover" />
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
          {/* 編集ボタン（オーナーのみ） */}
          {isPetOwner && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/pet-edit', params: { petId: id } })}
            >
              <Text style={styles.editBtnText}>✏️ 編集</Text>
            </TouchableOpacity>
          )}
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
            {isPetOwner ? (
              <>
                <Text style={styles.contactOwnerNote}>あなたにのみ表示されています</Text>
                {pet.contactEmail ? (
                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() => Linking.openURL(`mailto:${pet.contactEmail}`)}
                  >
                    <Text style={styles.contactBtnText}>📧 {pet.contactEmail}</Text>
                  </TouchableOpacity>
                ) : null}
                {pet.contactPhone ? (
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.contactBtnPhone]}
                    onPress={() => Linking.openURL(`tel:${pet.contactPhone}`)}
                  >
                    <Text style={styles.contactBtnText}>📞 {pet.contactPhone}</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <Text style={styles.contactNote}>
                連絡先は投稿者本人にのみ表示されます。{'\n'}
                情報をお持ちの方は下のコメント欄からご連絡ください。
              </Text>
            )}
          </View>

          {/* 発見確認ボタン（オーナー向け・最有力情報が選ばれている場合） */}
          {isPetOwner && pet.bestInfoId && pet.status !== 'resolved' && (
            discoveryDone ? (
              <View style={styles.discoveryDoneCard}>
                <Text style={styles.discoveryDoneTitle}>🎉 発見・保護への貢献を確認済みです</Text>
                <Text style={styles.discoveryDoneDesc}>情報提供者に +300pt の発見貢献ボーナスが付与されました</Text>
              </View>
            ) : (
              <View style={styles.discoveryCard}>
                <Text style={styles.discoveryTitle}>🎉 ペットが発見・保護されましたか？</Text>
                <Text style={styles.discoveryDesc}>
                  最有力情報が実際の発見・保護につながった場合は確認ボタンを押してください。
                  情報提供者に <Text style={{ fontWeight: 'bold' }}>+300pt</Text> の発見貢献ボーナスが付与されます。
                </Text>
                <TouchableOpacity
                  style={[styles.discoveryBtn, processingDiscovery && styles.btnDisabled]}
                  onPress={handleConfirmDiscovery}
                  disabled={processingDiscovery}
                >
                  <Text style={styles.discoveryBtnText}>
                    {processingDiscovery ? '処理中...' : '✅ 発見・保護を確認する（+300pt 付与）'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {/* 目撃情報投稿CTA（迷子・捜索中のみ・非オーナー） */}
          {isLostSearching && !isPetOwner && (
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👁️ 近くの目撃情報 ({nearbySightings.length}件)</Text>
                {!isPetOwner && (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/sightings/new', params: { species: pet.species } })}
                  >
                    <Text style={styles.sectionLink}>目撃情報を投稿（+2pt）</Text>
                  </TouchableOpacity>
                )}
              </View>
              {nearbySightings.map((s) => {
                const isCurrent = localBestInfoId === s.id && localBestInfoType === 'sighting'
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sightingCard, isCurrent && styles.sightingCardBest]}
                    onPress={() => router.push(`/sightings/${s.id}`)}
                    activeOpacity={0.8}
                  >
                    {isCurrent && (
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>⭐ 最有力情報</Text>
                      </View>
                    )}
                    <View style={styles.sightingHeader}>
                      <Text style={styles.sightingTitle} numberOfLines={2}>{s.title}</Text>
                    </View>
                    {s.photos.length > 0 && (
                      <Image source={{ uri: s.photos[0] }} style={styles.sightingPhoto} />
                    )}
                    <Text style={styles.sightingMeta}>
                      📍 {s.location.prefecture} {s.location.city}
                    </Text>
                    <Text style={styles.sightingBy}>
                      by {s.posterName} · {format(new Date(s.createdAt), 'M月d日 H:mm', { locale: ja })}
                    </Text>
                    {/* オーナー向け最有力情報ボタン */}
                    {isPetOwner && !isCurrent && (
                      <TouchableOpacity
                        style={[styles.bestInfoBtn, processingBestInfo === s.id && styles.btnDisabled]}
                        onPress={(e) => { e.stopPropagation?.(); handleSelectBestInfoSighting(s) }}
                        disabled={processingBestInfo === s.id}
                      >
                        <Text style={styles.bestInfoBtnText}>
                          {processingBestInfo === s.id ? '処理中...' : '⭐ 最有力情報に選ぶ'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {/* コメントセクション */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>
              💬 コメント {comments.length > 0 ? `(${comments.length}件)` : ''}
            </Text>

            {isPetOwner && (
              <View style={styles.ownerNote}>
                <Text style={styles.ownerNoteText}>
                  💡 最も有力な情報のコメントに「最有力情報」を選ぶと、コメント投稿者に +100pt 付与されます。
                </Text>
              </View>
            )}

            {topLevelComments.length === 0 ? (
              <Text style={styles.noComments}>まだコメントがありません</Text>
            ) : (
              topLevelComments.map((c) => {
                const replies = repliesFor(c.id)
                return (
                  <View key={c.id}>
                    <View style={[styles.commentCard, c.isBestInfo && styles.commentCardBest]}>
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
                      {/* オーナー向け最有力情報ボタン */}
                      {isPetOwner && !c.isBestInfo && (
                        <TouchableOpacity
                          style={[styles.bestInfoBtnSmall, processingBestInfo === c.id && styles.btnDisabled]}
                          onPress={() => handleSelectBestInfoComment(c)}
                          disabled={processingBestInfo === c.id}
                        >
                          <Text style={styles.bestInfoBtnSmallText}>
                            {processingBestInfo === c.id ? '処理中...' : '⭐ 最有力情報に選ぶ（+100pt付与）'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {replies.map((r) => (
                      <View key={r.id} style={styles.commentReply}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>
                              {(r.userDisplayName ?? '?')[0]?.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.commentMeta}>
                            <Text style={styles.commentName}>{r.userDisplayName}</Text>
                            <Text style={styles.commentDate}>
                              {format(new Date(r.createdAt), 'M月d日 H:mm', { locale: ja })}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.commentText}>{r.text}</Text>
                      </View>
                    ))}
                  </View>
                )
              })
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
                  underlineColorAndroid="transparent"
                  textAlignVertical="top"
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
  editBtn: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: WARM_BORDER,
  },
  editBtnText: { fontSize: 12, fontWeight: 'bold', color: WARM_MID },
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
  infoValue: { flex: 1, fontSize: 13, color: '#111827' },
  highlight: { color: '#C46B00' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },
  contactNote: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  contactOwnerNote: { fontSize: 11, color: '#9ca3af', marginBottom: 10 },
  contactBtn: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, alignItems: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  contactBtnPhone: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  contactBtnText: { color: '#374151', fontWeight: 'bold', fontSize: 14 },

  // Discovery confirm
  discoveryCard: {
    backgroundColor: WARM_BG, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: WARM_BORDER,
  },
  discoveryTitle: { fontSize: 14, fontWeight: 'bold', color: WARM_MID, marginBottom: 6 },
  discoveryDesc: { fontSize: 12, color: '#8B5E1A', lineHeight: 18, marginBottom: 12 },
  discoveryBtn: {
    backgroundColor: WARM_ACCENT, borderRadius: 10, padding: 12, alignItems: 'center',
  },
  discoveryBtnText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 13 },
  discoveryDoneCard: {
    backgroundColor: '#F0FFF4', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#9ADFC0', alignItems: 'center',
  },
  discoveryDoneTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A7A3C', marginBottom: 4 },
  discoveryDoneDesc: { fontSize: 12, color: '#2AAA6E', textAlign: 'center' },

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
  sightingCtaArrow: { fontSize: 14, fontWeight: 'bold', color: '#C46B00' },

  // Sightings section
  sightingsSection: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  sectionLink: { fontSize: 12, fontWeight: 'bold', color: WARM_MID, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: WARM_ACCENT, borderRadius: 20 },
  sightingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#FFE0A0',
  },
  sightingCardBest: { borderColor: '#FFD700', borderWidth: 2 },
  sightingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  sightingTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 },
  sightingMeta: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  sightingBy: { fontSize: 11, color: '#9ca3af' },
  sightingPhoto: { width: '100%', height: 100, borderRadius: 8, marginVertical: 6, backgroundColor: '#f3f4f6' },
  bestBadge: { backgroundColor: '#FFF8DC', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFD700' },
  bestBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#7A5800' },
  bestInfoBtn: {
    marginTop: 8, backgroundColor: WARM_BG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center', borderWidth: 1, borderColor: WARM_BORDER,
  },
  bestInfoBtnText: { fontSize: 12, fontWeight: 'bold', color: WARM_MID },

  // Comments
  commentsSection: { marginBottom: 12 },
  ownerNote: { backgroundColor: WARM_BG, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: WARM_BORDER },
  ownerNoteText: { fontSize: 11, color: WARM_MID, lineHeight: 16 },
  noComments: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
  commentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  commentCardBest: { borderColor: '#FFC96B', borderWidth: 1.5, backgroundColor: '#FFFAF0' },
  commentReply: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, marginLeft: 20,
    borderLeftWidth: 3, borderLeftColor: '#e5e7eb', borderTopWidth: 1, borderTopColor: '#f3f4f6',
    borderRightWidth: 1, borderRightColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
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
  bestInfoBtnSmall: { marginTop: 8, paddingVertical: 5 },
  bestInfoBtnSmallText: { fontSize: 12, color: '#9B8060', fontWeight: 'bold' },
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
  loginPromptText: { color: WARM_MID, fontWeight: 'bold', fontSize: 14 },
  postedAt: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 32 },
})

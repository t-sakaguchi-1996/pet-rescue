import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native'
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  fetchSightingById,
  fetchPets,
  deleteSighting,
  selectBestInfoSighting,
  markSightingBestInfoPointGranted,
  markPetBestInfoPointGranted,
} from '../../src/lib/firestore'
import { grantBestSightingPoints } from '../../src/lib/points'
import LoadingIndicator from '../../src/components/LoadingIndicator'
import { useAuth } from '../../src/contexts/AuthContext'
import { SPECIES_LABELS, type Sighting, type Pet } from '../../src/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', other: '🐾',
}

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

export default function SightingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [sighting, setSighting] = useState<Sighting | null>(null)
  const [nearbyPets, setNearbyPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [processingBestInfo, setProcessingBestInfo] = useState<string | null>(null)
  const [bestInfoDone, setBestInfoDone] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchSightingById(id).then(async (s) => {
      if (!s) { setLoading(false); return }
      setSighting(s)
      const allLost = await fetchPets({ type: 'lost', status: 'searching', limitCount: 100 })
      const nearby = allLost.filter((pet) => {
        if (s.species && pet.species !== s.species) return false
        if (s.location.city && pet.location.city === s.location.city) return true
        if (s.location.lat !== undefined && s.location.lng !== undefined && pet.location.lat && pet.location.lng) {
          return haversineKm(s.location.lat, s.location.lng, pet.location.lat, pet.location.lng) <= 5
        }
        return false
      }).slice(0, 5)
      setNearbyPets(nearby)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const isOwner = Boolean(user && sighting?.userId && user.uid === sighting.userId)
  const myNearbyPets = user ? nearbyPets.filter((p) => p.userId === user.uid) : []
  const hasLocation = sighting?.location.lat !== undefined && sighting?.location.lng !== undefined

  const handleDelete = () => {
    if (!id) return
    Alert.alert(
      '目撃情報を削除',
      'この目撃情報を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除', style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteSighting(id)
              router.back()
            } catch {
              Alert.alert('エラー', '削除に失敗しました')
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleSelectBestInfo = async (pet: Pet) => {
    if (!user || !id || !sighting) return
    const isAlready = pet.bestInfoId === id
    if (isAlready) return
    const msg = pet.bestInfoId && pet.bestInfoId !== id
      ? `「${pet.name || '名前不明'}」の最有力情報をこの目撃情報に変更しますか？\n\n※この操作は取り消せません。\n投稿者「${sighting.posterName}」に +100pt を付与します。`
      : `「${pet.name || '名前不明'}」の最有力情報にこの目撃情報を選びますか？\n\n※この操作は取り消せません。\n投稿者に +100pt を付与します。`
    Alert.alert('最有力情報を選ぶ', msg, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '選ぶ', style: 'default',
        onPress: async () => {
          setProcessingBestInfo(pet.id)
          try {
            const authorUserId = await selectBestInfoSighting(
              pet.id, id, pet.bestInfoId, pet.bestInfoType
            )
            if (!pet.bestInfoPointGranted && authorUserId && !sighting.bestInfoPointGranted) {
              await grantBestSightingPoints(authorUserId, id)
              await markSightingBestInfoPointGranted(id)
              await markPetBestInfoPointGranted(pet.id)
            }
            setBestInfoDone(true)
          } catch {
            Alert.alert('エラー', '処理に失敗しました。もう一度お試しください。')
          } finally {
            setProcessingBestInfo(null)
          }
        },
      },
    ])
  }

  if (loading) {
    return <LoadingIndicator />
  }

  if (!sighting) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundEmoji}>👁️</Text>
        <Text style={styles.notFoundText}>目撃情報が見つかりません</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← 戻る</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ヘッダーアクション */}
      {isOwner && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteBtnText}>{deleting ? '削除中...' : '🗑️ 削除'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 写真ギャラリー */}
      {sighting.photos.length > 0 ? (
        <View>
          <Image source={{ uri: sighting.photos[photoIndex] }} style={styles.mainPhoto} />
          <View style={styles.photoBadges}>
            <View style={styles.sightingBadge}>
              <Text style={styles.sightingBadgeText}>目撃情報</Text>
            </View>
            {sighting.species && (
              <View style={styles.speciesBadge}>
                <Text style={styles.speciesBadgeText}>{SPECIES_LABELS[sighting.species]}</Text>
              </View>
            )}
            {sighting.isBestInfo && (
              <View style={styles.bestPhotoBadge}>
                <Text style={styles.bestPhotoBadgeText}>⭐ 最有力情報</Text>
              </View>
            )}
          </View>
          {sighting.photos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}
              contentContainerStyle={styles.thumbContent}>
              {sighting.photos.map((url, i) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)}>
                  <Image source={{ uri: url }} style={[styles.thumb, i === photoIndex && styles.thumbActive]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoEmoji}>
            {sighting.species ? (SPECIES_EMOJI[sighting.species] ?? '👁️') : '👁️'}
          </Text>
        </View>
      )}

      {/* 本文 */}
      <View style={styles.body}>
        <Text style={styles.title}>{sighting.title}</Text>

        {/* 基本情報 */}
        <View style={styles.infoBox}>
          {sighting.species && (
            <InfoRow label="動物種" value={SPECIES_LABELS[sighting.species]} />
          )}
          <InfoRow
            label="場所"
            value={[sighting.location.prefecture, sighting.location.city, sighting.location.address].filter(Boolean).join(' ')}
          />
          <InfoRow label="投稿者" value={sighting.posterName} />
          <InfoRow
            label="投稿日時"
            value={format(new Date(sighting.createdAt), 'yyyy年M月d日 H:mm', { locale: ja })}
          />
        </View>

        {/* 説明 */}
        {sighting.description ? (
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>コメント・補足情報</Text>
            <Text style={styles.descText}>{sighting.description}</Text>
          </View>
        ) : null}

        {/* 目撃場所の地図 */}
        {hasLocation && (
          <View style={styles.mapSection}>
            <Text style={styles.mapLabel}>目撃場所（半径5km）</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: sighting.location.lat!,
                  longitude: sighting.location.lng!,
                  latitudeDelta: 0.08,
                  longitudeDelta: 0.08,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={{ latitude: sighting.location.lat!, longitude: sighting.location.lng! }}>
                  <View style={styles.mapMarker}>
                    <Text style={styles.mapMarkerEmoji}>👁️</Text>
                  </View>
                </Marker>
                <Circle
                  center={{ latitude: sighting.location.lat!, longitude: sighting.location.lng! }}
                  radius={5000}
                  fillColor="rgba(255,201,107,0.15)"
                  strokeColor="rgba(196,107,0,0.4)"
                  strokeWidth={2}
                />
              </MapView>
            </View>
          </View>
        )}

        {/* 近隣の迷子投稿 */}
        {nearbyPets.length > 0 && (
          <View style={styles.nearbySection}>
            <Text style={styles.nearbySectionTitle}>📍 近隣の迷子投稿（{nearbyPets.length}件）</Text>
            {nearbyPets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={styles.nearbyCard}
                onPress={() => router.push(`/pet/${pet.id}`)}
                activeOpacity={0.8}
              >
                {pet.images[0] ? (
                  <Image source={{ uri: pet.images[0] }} style={styles.nearbyImage} />
                ) : (
                  <View style={styles.nearbyImagePlaceholder}>
                    <Text style={styles.nearbyImageEmoji}>{SPECIES_EMOJI[pet.species] ?? '🐾'}</Text>
                  </View>
                )}
                <View style={styles.nearbyInfo}>
                  <Text style={styles.nearbyName}>{pet.name || '名前不明'}</Text>
                  <Text style={styles.nearbyMeta}>
                    {SPECIES_LABELS[pet.species]} · {pet.location.prefecture} {pet.location.city}
                  </Text>
                </View>
                <Text style={styles.nearbyArrow}>詳細 →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SightingBestInfoPanel（ログインユーザーが近隣の迷子投稿を所有している場合） */}
        {user && myNearbyPets.length > 0 && (
          bestInfoDone ? (
            <View style={styles.bestInfoDonePanel}>
              <Text style={styles.bestInfoDoneTitle}>⭐ 最有力情報に選びました</Text>
              <Text style={styles.bestInfoDoneDesc}>投稿者にポイントが付与されました。</Text>
            </View>
          ) : (
            <View style={styles.bestInfoPanel}>
              <Text style={styles.bestInfoPanelTitle}>⭐ あなたの迷子投稿の最有力情報にする</Text>
              <Text style={styles.bestInfoPanelDesc}>
                この目撃情報を最有力情報に選ぶと、投稿者に +100pt が付与されます。
              </Text>
              {myNearbyPets.map((pet) => {
                const isSelected = pet.bestInfoId === id
                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={[
                      styles.bestInfoPetBtn,
                      isSelected && styles.bestInfoPetBtnSelected,
                      processingBestInfo === pet.id && styles.btnDisabled,
                    ]}
                    onPress={() => handleSelectBestInfo(pet)}
                    disabled={isSelected || processingBestInfo === pet.id}
                  >
                    <Text style={[styles.bestInfoPetBtnName, isSelected && styles.bestInfoPetBtnNameSelected]}>
                      {sighting.species ? (SPECIES_LABELS[sighting.species] + ' ') : ''}{pet.name || '名前不明'}
                    </Text>
                    <Text style={[styles.bestInfoPetBtnAction, isSelected && styles.bestInfoPetBtnActionSelected]}>
                      {isSelected ? '✓ 選択済み' : processingBestInfo === pet.id ? '処理中...' : '最有力情報に選ぶ →'}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )
        )}
      </View>
    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#7A4500', fontSize: 14 },
  notFoundEmoji: { fontSize: 48 },
  notFoundText: { color: '#6b7280', fontSize: 16 },
  backBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFF3DC', borderRadius: 20 },
  backBtnText: { color: '#7A4500', fontWeight: 'bold' },

  headerActions: {
    flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  deleteBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5',
  },
  deleteBtnText: { fontSize: 13, fontWeight: 'bold', color: '#ef4444' },
  btnDisabled: { opacity: 0.5 },

  mainPhoto: { width: '100%', aspectRatio: 16 / 9 },
  photoBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sightingBadge: { backgroundColor: '#FFC96B', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  sightingBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#3D2400' },
  speciesBadge: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  speciesBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  bestPhotoBadge: { backgroundColor: '#FFD700', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  bestPhotoBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#3D2400' },
  thumbRow: { borderBottomWidth: 1, borderBottomColor: '#FFE0A0' },
  thumbContent: { padding: 10, gap: 8 },
  thumb: { width: 60, height: 60, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: '#C46B00' },

  noPhoto: { width: '100%', height: 150, backgroundColor: '#FFF8ED', alignItems: 'center', justifyContent: 'center' },
  noPhotoEmoji: { fontSize: 52 },

  body: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#3D2400', marginBottom: 16 },

  infoBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FFE0A0', marginBottom: 16, gap: 8,
  },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoLabel: { fontSize: 13, color: '#9B8060', width: 60, flexShrink: 0 },
  infoValue: { fontSize: 13, fontWeight: 'bold', color: '#3D2400', flex: 1 },

  descBox: {
    backgroundColor: '#FFFAF0', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFE8B0', marginBottom: 16,
  },
  descLabel: { fontSize: 13, fontWeight: 'bold', color: '#7A4500', marginBottom: 6 },
  descText: { fontSize: 14, color: '#3D2400', lineHeight: 21 },

  // Map
  mapSection: { marginBottom: 16 },
  mapLabel: { fontSize: 13, fontWeight: 'bold', color: '#7A4500', marginBottom: 8 },
  mapContainer: { borderRadius: 14, overflow: 'hidden', height: 200, borderWidth: 1.5, borderColor: '#FFE0A0' },
  map: { flex: 1 },
  mapMarker: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFC96B',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  mapMarkerEmoji: { fontSize: 18 },

  nearbySection: { marginBottom: 16 },
  nearbySectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#7A4500', marginBottom: 10 },
  nearbyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10,
    backgroundColor: '#FFFAF0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0A0', marginBottom: 8,
  },
  nearbyImage: { width: 48, height: 48, borderRadius: 8 },
  nearbyImagePlaceholder: {
    width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFE0A0',
    alignItems: 'center', justifyContent: 'center',
  },
  nearbyImageEmoji: { fontSize: 22 },
  nearbyInfo: { flex: 1 },
  nearbyName: { fontSize: 14, fontWeight: 'bold', color: '#3D2400' },
  nearbyMeta: { fontSize: 12, color: '#8B6340', marginTop: 2 },
  nearbyArrow: {
    fontSize: 11, fontWeight: 'bold', color: '#7A4500',
    backgroundColor: '#FFE0A0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },

  // Best info panel
  bestInfoPanel: {
    backgroundColor: '#FFF3DC', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#FFD98A', marginBottom: 16,
  },
  bestInfoPanelTitle: { fontSize: 14, fontWeight: 'bold', color: '#7A4500', marginBottom: 6 },
  bestInfoPanelDesc: { fontSize: 12, color: '#8B6340', marginBottom: 12, lineHeight: 18 },
  bestInfoPetBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFC96B', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 8,
  },
  bestInfoPetBtnSelected: { backgroundColor: '#E8E8E8' },
  bestInfoPetBtnName: { fontSize: 14, fontWeight: 'bold', color: '#3D2400' },
  bestInfoPetBtnNameSelected: { color: '#888' },
  bestInfoPetBtnAction: { fontSize: 12, color: '#3D2400' },
  bestInfoPetBtnActionSelected: { color: '#888' },
  bestInfoDonePanel: {
    backgroundColor: '#F0FFF4', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#9ADFC0', marginBottom: 16,
  },
  bestInfoDoneTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A7A3C', marginBottom: 4 },
  bestInfoDoneDesc: { fontSize: 12, color: '#2AAA6E' },
})

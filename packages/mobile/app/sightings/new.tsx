import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../src/lib/firebase'
import { createSighting } from '../../src/lib/firestore'
import { useAuth } from '../../src/contexts/AuthContext'
import LocationMapPicker, { type LocationData } from '../../src/components/LocationMapPicker'
import type { PetSpecies } from '../../src/types'
import { PREFECTURES, CITIES_BY_PREFECTURE } from '../../src/types'

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: 'dog', label: '犬', emoji: '🐕' },
  { value: 'cat', label: '猫', emoji: '🐈' },
  { value: 'rabbit', label: 'うさぎ', emoji: '🐇' },
  { value: 'bird', label: '鳥', emoji: '🐦' },
  { value: 'other', label: 'その他', emoji: '🐾' },
]

export default function NewSightingScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ species?: string }>()
  const { user } = useAuth()

  const defaultSpecies = (params.species as PetSpecies) ?? 'dog'

  const [species, setSpecies] = useState<PetSpecies>(defaultSpecies)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [prefModal, setPrefModal] = useState(false)
  const [cityModal, setCityModal] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const forwardGeocode = async (query: string) => {
    if (!GOOGLE_MAPS_API_KEY || !query.trim()) return
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&language=ja&region=JP`
      const res = await fetch(url)
      const data = (await res.json()) as { results: { geometry: { location: { lat: number; lng: number } } }[] }
      if (data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location
        setPinLocation({ lat, lng })
      }
    } catch {
      // silent fail
    }
  }

  const handlePinChange = (loc: LocationData) => {
    setPinLocation({ lat: loc.lat, lng: loc.lng })
    if (loc.address) setAddress(loc.address)
    if (loc.prefecture) {
      setPrefecture(loc.prefecture)
      const cities = CITIES_BY_PREFECTURE[loc.prefecture] ?? []
      setCity(cities.includes(loc.city) ? loc.city : '')
    }
  }

  const pickImage = async () => {
    if (photos.length >= 3) { Alert.alert('最大3枚まで追加できます'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri])
    }
  }

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('エラー', 'タイトルを入力してください'); return }
    if (!city.trim()) { Alert.alert('エラー', '市区町村を入力してください'); return }
    if (!user && !guestEmail.trim()) { Alert.alert('エラー', 'メールアドレスを入力してください'); return }

    setSubmitting(true)
    try {
      const photoUrls: string[] = []
      for (const uri of photos) {
        const ownerKey = user?.uid ?? `guest_${Date.now()}`
        const ext = uri.split('.').pop() ?? 'jpg'
        const path = `sightings/${ownerKey}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const storageRef = ref(storage, path)
        const response = await fetch(uri)
        const blob = await response.blob()
        await uploadBytes(storageRef, blob)
        const url = await getDownloadURL(storageRef)
        photoUrls.push(url)
      }

      await createSighting({
        species,
        title: title.trim(),
        description: description.trim() || undefined,
        location: {
          prefecture: prefecture.trim(),
          city: city.trim(),
          address: address.trim(),
          lat: pinLocation?.lat,
          lng: pinLocation?.lng,
        },
        photos: photoUrls,
        userId: user?.uid,
        guestEmail: !user ? guestEmail.trim() : undefined,
        posterName: user?.displayName ?? guestEmail.trim() ?? '未登録ユーザー',
      })

      setSubmitted(true)
    } catch (e) {
      console.error('createSighting error:', e)
      Alert.alert('エラー', '投稿に失敗しました。しばらくしてからお試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>投稿ありがとうございます！</Text>
        <Text style={styles.successDesc}>情報が飼い主さんに届きますように。</Text>
        {user ? (
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>⭐ +2pt 獲得しました！</Text>
          </View>
        ) : (
          <View style={styles.registerPrompt}>
            <Text style={styles.registerPromptTitle}>💡 会員登録でポイントをゲット！</Text>
            <Text style={styles.registerPromptDesc}>
              この投稿をあなたのアカウントに紐づけると +2pt 受け取れます。
            </Text>
            <TouchableOpacity style={styles.registerBtn} onPress={() => router.replace('/auth/register')}>
              <Text style={styles.registerBtnText}>今すぐ登録してポイントを受け取る</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>一覧に戻る</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 都道府県 Modal */}
      <Modal visible={prefModal} transparent animationType="slide" onRequestClose={() => setPrefModal(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setPrefModal(false)}>
          <Pressable style={modalStyles.panel} onPress={() => {}}>
            <Text style={modalStyles.title}>都道府県を選択</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PREFECTURES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[modalStyles.option, prefecture === p && modalStyles.optionActive]}
                  onPress={() => { setPrefecture(p); setCity(''); setPrefModal(false); void forwardGeocode(p) }}
                >
                  <Text style={[modalStyles.optionText, prefecture === p && modalStyles.optionTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 市区町村 Modal */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => setCityModal(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setCityModal(false)}>
          <Pressable style={modalStyles.panel} onPress={() => {}}>
            <Text style={modalStyles.title}>市区町村を選択</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(CITIES_BY_PREFECTURE[prefecture] ?? []).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[modalStyles.option, city === c && modalStyles.optionActive]}
                  onPress={() => { setCity(c); setCityModal(false); void forwardGeocode(`${prefecture}${c}`) }}
                >
                  <Text style={[modalStyles.optionText, city === c && modalStyles.optionTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👁️ 目撃情報を投稿</Text>
          <Text style={styles.headerDesc}>見かけたペットの情報を投稿して、飼い主の再会をサポートしましょう。</Text>
          <View style={styles.pointBanner}>
            <Text style={styles.pointBannerEmoji}>⭐</Text>
            <View>
              <Text style={styles.pointBannerTitle}>投稿すると +2pt 獲得！（1日最大10pt）</Text>
              <Text style={styles.pointBannerDesc}>会員登録なしでも投稿できます。後から登録してポイントを受け取ることも可能です。</Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          {/* 動物種 */}
          <View style={styles.field}>
            <Text style={styles.label}>動物種 <Text style={styles.required}>*</Text></Text>
            <View style={styles.speciesRow}>
              {SPECIES_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.speciesChip, species === opt.value && styles.speciesChipActive]}
                  onPress={() => setSpecies(opt.value)}
                >
                  <Text style={styles.speciesEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.speciesLabel, species === opt.value && styles.speciesLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* タイトル */}
          <View style={styles.field}>
            <Text style={styles.label}>タイトル <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="例: 公園で柴犬を見かけました"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* 場所（地図） */}
          <View style={styles.field}>
            <Text style={styles.label}>見かけた場所 <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>地図をタップして場所を指定してください</Text>
            <LocationMapPicker
              pinLocation={pinLocation}
              onPinChange={handlePinChange}
            />
          </View>

          {/* 都道府県 */}
          <View style={styles.field}>
            <Text style={styles.label}>都道府県 <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.selector} onPress={() => setPrefModal(true)}>
              <Text style={[styles.selectorText, !prefecture && styles.selectorPlaceholder]}>
                {prefecture || '都道府県を選択（地図から自動入力）'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* 市区町村 */}
          <View style={styles.field}>
            <Text style={styles.label}>市区町村 <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.selector, !prefecture && { opacity: 0.5 }]}
              onPress={() => prefecture && setCityModal(true)}
            >
              <Text style={[styles.selectorText, !city && styles.selectorPlaceholder]}>
                {city || (prefecture ? '市区町村を選択' : '都道府県を先に選択')}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* 詳細な場所 */}
          <View style={styles.field}>
            <Text style={styles.label}>詳細な場所</Text>
            <TextInput
              style={styles.input}
              placeholder="例: ○○公園付近"
              placeholderTextColor="#9ca3af"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* 詳細説明 */}
          <View style={styles.field}>
            <Text style={styles.label}>詳細説明</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="ペットの特徴、状態などを入力してください"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* 写真 */}
          <View style={styles.field}>
            <Text style={styles.label}>写真（最大3枚）</Text>
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoThumbImage} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 3 && (
                <TouchableOpacity style={styles.photoAdd} onPress={pickImage}>
                  <Text style={styles.photoAddIcon}>📷</Text>
                  <Text style={styles.photoAddText}>追加</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ゲストメール */}
          {!user && (
            <View style={styles.field}>
              <Text style={styles.label}>メールアドレス <Text style={styles.required}>*</Text></Text>
              <Text style={styles.fieldHint}>後から登録する際に同じアドレスを使うとポイントが紐づきます</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#9ca3af"
                value={guestEmail}
                onChangeText={setGuestEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* 送信ボタン */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? '投稿中...' : '目撃情報を投稿する'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const WARM_DARK = '#3D2400'
const WARM_MID = '#7A4500'
const WARM_ACCENT = '#FFC96B'
const WARM_BG = '#FFF3DC'
const WARM_BORDER = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: WARM_DARK, marginBottom: 4 },
  headerDesc: { fontSize: 13, color: '#8B6340', marginBottom: 10 },
  pointBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: WARM_BG, borderRadius: 12, borderWidth: 1, borderColor: WARM_BORDER },
  pointBannerEmoji: { fontSize: 24 },
  pointBannerTitle: { fontSize: 12, fontWeight: 'bold', color: WARM_MID },
  pointBannerDesc: { fontSize: 11, color: '#A06830', marginTop: 2 },

  form: { padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  required: { color: '#ef4444' },
  fieldHint: { fontSize: 11, color: '#9ca3af', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#374151', backgroundColor: '#fff' },
  textarea: { minHeight: 100 },

  speciesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speciesChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  speciesChipActive: { backgroundColor: WARM_BG, borderColor: WARM_ACCENT },
  speciesEmoji: { fontSize: 16 },
  speciesLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  speciesLabelActive: { color: WARM_MID, fontWeight: 'bold' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photoThumbImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  photoAdd: { width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  photoAddIcon: { fontSize: 22 },
  photoAddText: { fontSize: 10, color: '#9ca3af', marginTop: 2 },

  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  selectorText: { fontSize: 14, color: '#374151', flex: 1 },
  selectorPlaceholder: { color: '#9ca3af' },
  selectorArrow: { fontSize: 10, color: '#9ca3af', marginLeft: 4 },

  submitBtn: { backgroundColor: WARM_ACCENT, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 16 },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  successEmoji: { fontSize: 64, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '900', color: WARM_DARK, marginBottom: 8, textAlign: 'center' },
  successDesc: { fontSize: 14, color: '#8B6340', marginBottom: 20, textAlign: 'center' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: WARM_BG, borderRadius: 20, borderWidth: 1.5, borderColor: WARM_BORDER, marginBottom: 20 },
  pointsBadgeText: { fontSize: 15, fontWeight: 'bold', color: '#C46B00' },
  registerPrompt: { width: '100%', padding: 16, backgroundColor: WARM_BG, borderRadius: 16, borderWidth: 1.5, borderColor: WARM_BORDER, marginBottom: 16 },
  registerPromptTitle: { fontSize: 14, fontWeight: '900', color: WARM_MID, marginBottom: 6 },
  registerPromptDesc: { fontSize: 12, color: '#8B5E1A', marginBottom: 12 },
  registerBtn: { backgroundColor: WARM_ACCENT, borderRadius: 20, padding: 12, alignItems: 'center' },
  registerBtnText: { color: WARM_DARK, fontWeight: 'bold', fontSize: 13 },
  backBtn: { borderWidth: 1, borderColor: WARM_BORDER, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { color: WARM_MID, fontWeight: '600', fontSize: 14 },
})

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#3D2400', textAlign: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  option: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  optionActive: { backgroundColor: '#FFF3DC' },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextActive: { color: '#C46B00', fontWeight: 'bold' },
})

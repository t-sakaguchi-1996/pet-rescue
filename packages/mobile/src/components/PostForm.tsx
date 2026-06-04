import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Switch,
  Modal,
  Pressable,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { getAuth } from 'firebase/auth'
import { createPet, updatePet } from '../lib/firestore'
import { uploadPetImages } from '../lib/storage'
import LocationMapPicker, { type LocationData } from './LocationMapPicker'
import type { Pet } from '../types'
import { PREFECTURES, CITIES_BY_PREFECTURE } from '../types'

const SEARCH_RADIUS_OPTIONS = [
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
  { value: 15, label: '15km' },
  { value: 20, label: '20km' },
  { value: 30, label: 'それ以上' },
] as const

interface Props {
  userId: string
  initialPet?: Pet
}

export default function PostForm({ userId, initialPet }: Props) {
  const router = useRouter()
  const isEditMode = Boolean(initialPet)
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(initialPet?.images ?? [])
  const [isLost, setIsLost] = useState(initialPet ? initialPet.type === 'lost' : true)
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(
    initialPet?.location.lat && initialPet?.location.lng
      ? { lat: initialPet.location.lat, lng: initialPet.location.lng }
      : null,
  )
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(initialPet?.searchRadiusKm ?? 5)
  const [useUserInfo, setUseUserInfo] = useState(false)
  const [emailBeforeAutoFill, setEmailBeforeAutoFill] = useState('')
  const [prefModal, setPrefModal] = useState(false)
  const [cityModal, setCityModal] = useState(false)
  const [form, setForm] = useState({
    species: (initialPet?.species ?? 'dog') as Pet['species'],
    name: initialPet?.name ?? '',
    breed: initialPet?.breed ?? '',
    color: initialPet?.color ?? '',
    gender: (initialPet?.gender ?? 'unknown') as Pet['gender'],
    age: initialPet?.age ?? '',
    description: initialPet?.description ?? '',
    lostDate: initialPet?.lostDate
      ? new Date(initialPet.lostDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    prefecture: initialPet?.location.prefecture ?? '東京都',
    city: initialPet?.location.city ?? '',
    address: initialPet?.location.address ?? '',
    contactEmail: initialPet?.contactEmail ?? '',
    contactPhone: initialPet?.contactPhone ?? '',
  })

  const currentUser = getAuth().currentUser
  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleUseUserInfo = (checked: boolean) => {
    setUseUserInfo(checked)
    if (checked && currentUser) {
      setEmailBeforeAutoFill(form.contactEmail)
      set('contactEmail', currentUser.email ?? '')
    } else if (!checked) {
      set('contactEmail', emailBeforeAutoFill)
      setEmailBeforeAutoFill('')
    }
  }

  const handlePinChange = (loc: LocationData) => {
    setPinLocation({ lat: loc.lat, lng: loc.lng })
    if (loc.address) set('address', loc.address)
    if (loc.prefecture) {
      set('prefecture', loc.prefecture)
      const cities = CITIES_BY_PREFECTURE[loc.prefecture] ?? []
      set('city', cities.includes(loc.city) ? loc.city : '')
    }
  }

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('権限エラー', '写真へのアクセス権限が必要です'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    })
    if (!result.canceled) setImages(result.assets.map((a) => a.uri).slice(0, 5))
  }

  const handleSubmit = async () => {
    if (!form.color || !form.description || !form.city || !form.contactEmail) {
      Alert.alert('入力エラー', '必須項目を入力してください（毛色・説明・市区町村・メール）')
      return
    }
    if (!pinLocation) {
      Alert.alert('場所未設定', '地図をタップするか「現在地」ボタンで場所を設定してください')
      return
    }
    setSubmitting(true)
    try {
      const newImageUrls = images.length > 0 ? await uploadPetImages(userId, images) : []
      const allImages = [...existingImages, ...newImageUrls]
      const locationData = {
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        address: form.address,
        prefecture: form.prefecture,
        city: form.city,
      }

      if (isEditMode && initialPet) {
        await updatePet(initialPet.id, {
          type: isLost ? 'lost' : 'found',
          species: form.species,
          name: form.name,
          breed: form.breed,
          color: form.color,
          gender: form.gender,
          age: form.age,
          description: form.description,
          images: allImages,
          location: locationData,
          lostDate: form.lostDate,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          searchRadiusKm,
        })
        Alert.alert('更新完了', '投稿を更新しました', [{ text: 'OK', onPress: () => router.back() }])
      } else {
        await createPet({
          type: isLost ? 'lost' : 'found',
          species: form.species,
          name: form.name,
          breed: form.breed,
          color: form.color,
          gender: form.gender,
          age: form.age,
          description: form.description,
          images: allImages,
          location: locationData,
          lostDate: form.lostDate,
          status: 'searching',
          userId,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          searchRadiusKm,
        })
        Alert.alert('投稿完了', '投稿しました', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }])
      }
    } catch {
      Alert.alert('エラー', `${isEditMode ? '更新' : '投稿'}に失敗しました。もう一度お試しください`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 種別トグル */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>種別</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, isLost && styles.typeBtnLost]}
            onPress={() => setIsLost(true)}
          >
            <Text style={[styles.typeBtnText, isLost && styles.typeBtnTextActive]}>
              🔍 迷子になった
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isLost && styles.typeBtnFound]}
            onPress={() => setIsLost(false)}
          >
            <Text style={[styles.typeBtnText, !isLost && styles.typeBtnTextActive]}>
              🤝 保護した
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 基本情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <Text style={styles.label}>動物種</Text>
        <View style={styles.chipRow}>
          {(['dog', 'cat', 'rabbit', 'bird', 'other'] as Pet['species'][]).map((s) => {
            const labels = { dog: '🐕 犬', cat: '🐈 猫', rabbit: '🐇 うさぎ', bird: '🐦 鳥', other: '🐾 その他' }
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, form.species === s && styles.chipActive]}
                onPress={() => set('species', s)}
              >
                <Text style={[styles.chipText, form.species === s && styles.chipTextActive]}>
                  {labels[s]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <Field label="名前" value={form.name} onChange={(v) => set('name', v)} placeholder="例: チョコ" />
        <Field label="品種" value={form.breed} onChange={(v) => set('breed', v)} placeholder="例: トイプードル" />
        <Field label="毛色 *" value={form.color} onChange={(v) => set('color', v)} placeholder="例: 茶色と白" />
        <Field label="年齢・月齢" value={form.age} onChange={(v) => set('age', v)} placeholder="例: 3歳" />
        <Field
          label={isLost ? '迷子になった日 *' : '保護した日 *'}
          value={form.lostDate}
          onChange={(v) => set('lostDate', v)}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <Text style={styles.label}>特徴・説明 *</Text>
        <TextInput
          style={styles.textarea}
          value={form.description}
          onChangeText={(v) => set('description', v)}
          placeholder="首輪の色・模様・特徴など詳しく記入してください"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
        />
      </View>

      {/* 写真 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>写真（最大5枚）</Text>
        {existingImages.length > 0 && (
          <>
            <Text style={styles.label}>現在の写真</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
              {existingImages.map((uri, i) => (
                <View key={i} style={styles.thumbnailWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setExistingImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={styles.removeImageBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}
        <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
          <Text style={styles.photoBtnText}>📷 写真を追加する</Text>
        </TouchableOpacity>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumbnail} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 場所 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>場所情報</Text>
        <Text style={styles.mapDesc}>地図をタップして場所を指定してください</Text>

        <LocationMapPicker
          pinLocation={pinLocation}
          onPinChange={handlePinChange}
          showRadiusCircle
          searchRadiusKm={searchRadiusKm}
        />

        <Text style={styles.label}>都道府県 *</Text>
        <TouchableOpacity style={styles.prefSelector} onPress={() => setPrefModal(true)}>
          <Text style={form.prefecture ? styles.prefText : styles.prefPlaceholder}>
            {form.prefecture || '都道府県を選択'}
          </Text>
          <Text style={styles.prefArrow}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.label}>市区町村 *</Text>
        <TouchableOpacity
          style={[styles.prefSelector, !form.prefecture && { opacity: 0.5 }]}
          onPress={() => form.prefecture && setCityModal(true)}
        >
          <Text style={form.city ? styles.prefText : styles.prefPlaceholder}>
            {form.city || (form.prefecture ? '市区町村を選択' : '都道府県を先に選択')}
          </Text>
          <Text style={styles.prefArrow}>▼</Text>
        </TouchableOpacity>
        <Field label="詳細場所・目印" value={form.address} onChange={(v) => set('address', v)} placeholder="例: ○○公園付近" />
      </View>

      {/* 探知範囲 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>目撃情報の探知範囲</Text>
        <Text style={styles.radiusHint}>この範囲内で目撃情報が投稿された場合に通知します</Text>
        <View style={styles.chipRow}>
          {SEARCH_RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, searchRadiusKm === opt.value && styles.chipActive]}
              onPress={() => setSearchRadiusKm(opt.value)}
            >
              <Text style={[styles.chipText, searchRadiusKm === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 連絡先 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>連絡先</Text>
        {currentUser ? (
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleUseUserInfo(!useUserInfo)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, useUserInfo && styles.checkboxChecked]}>
              {useUserInfo && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>会員情報と同じものを使用する</Text>
          </TouchableOpacity>
        ) : null}
        <Field label="メールアドレス *" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} placeholder="example@email.com" keyboardType="email-address" />
        <Field label="電話番号" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} placeholder="090-0000-0000" keyboardType="phone-pad" />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitBtnText}>
          {submitting ? (isEditMode ? '更新中...' : '投稿中...') : (isEditMode ? '更新する' : '投稿する')}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* 都道府県モーダル */}
      <Modal visible={prefModal} transparent animationType="slide" onRequestClose={() => setPrefModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPrefModal(false)}>
          <Pressable style={styles.prefModalPanel} onPress={() => {}}>
            <Text style={styles.prefModalTitle}>都道府県を選択</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PREFECTURES.map((pref) => (
                <TouchableOpacity
                  key={pref}
                  style={[styles.prefOption, form.prefecture === pref && styles.prefOptionActive]}
                  onPress={() => { set('prefecture', pref); set('city', ''); setPrefModal(false) }}
                >
                  <Text style={[styles.prefOptionText, form.prefecture === pref && styles.prefOptionTextActive]}>
                    {pref}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 市区町村モーダル */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => setCityModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCityModal(false)}>
          <Pressable style={styles.prefModalPanel} onPress={() => {}}>
            <Text style={styles.prefModalTitle}>市区町村を選択</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(CITIES_BY_PREFECTURE[form.prefecture] ?? []).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.prefOption, form.city === c && styles.prefOptionActive]}
                  onPress={() => { set('city', c); setCityModal(false) }}
                >
                  <Text style={[styles.prefOptionText, form.city === c && styles.prefOptionTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

function Field({
  label, value, onChange, placeholder, keyboardType,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  keyboardType?: TextInput['props']['keyboardType']
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', marginTop: 8, padding: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 12 },

  typeToggle: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  typeBtnLost: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  typeBtnFound: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { fontWeight: 'bold', color: '#374151' },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  radiusHint: { fontSize: 12, color: '#6b7280', marginBottom: 10, marginTop: -4 },
  mapDesc: { fontSize: 12, color: '#8B6340', marginBottom: 10, marginTop: -4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkboxMark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 13, color: '#374151' },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#FFF3DC', borderColor: '#FFC96B' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#7A4500', fontWeight: '600' },

  fieldWrapper: {},
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827' },
  textarea: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', height: 96, textAlignVertical: 'top' },

  photoBtn: { borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center' },
  photoBtnText: { color: '#6b7280', fontWeight: '600' },
  imageRow: { marginTop: 8 },
  thumbnailWrapper: { position: 'relative', marginRight: 8 },
  thumbnail: { width: 72, height: 72, borderRadius: 8 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  removeImageBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  prefSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, backgroundColor: '#f9fafb' },
  prefText: { fontSize: 14, color: '#111827' },
  prefPlaceholder: { fontSize: 14, color: '#9ca3af' },
  prefArrow: { fontSize: 10, color: '#9ca3af' },

  submitBtn: { backgroundColor: '#C46B00', margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  prefModalPanel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
  prefModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#3D2400', textAlign: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  prefOption: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  prefOptionActive: { backgroundColor: '#FFF3DC' },
  prefOptionText: { fontSize: 15, color: '#374151' },
  prefOptionTextActive: { color: '#C46B00', fontWeight: 'bold' },
})

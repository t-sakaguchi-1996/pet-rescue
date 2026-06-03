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
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { getAuth } from 'firebase/auth'
import { createPet } from '../lib/firestore'
import { uploadPetImages } from '../lib/storage'
import type { Pet } from '../types'

const SEARCH_RADIUS_OPTIONS = [
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
  { value: 15, label: '15km' },
  { value: 20, label: '20km' },
  { value: 30, label: 'それ以上' },
] as const

interface Props {
  userId: string
}

export default function PostForm({ userId }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [isLost, setIsLost] = useState(true)
  const [pinLocation, setPinLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(5)
  const [useUserInfo, setUseUserInfo] = useState(false)
  const [emailBeforeAutoFill, setEmailBeforeAutoFill] = useState('')
  const [form, setForm] = useState({
    species: 'dog' as Pet['species'],
    name: '',
    breed: '',
    color: '',
    gender: 'unknown' as Pet['gender'],
    age: '',
    description: '',
    lostDate: new Date().toISOString().split('T')[0],
    prefecture: '東京都',
    city: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
  })

  const currentUser = getAuth().currentUser

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

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

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('権限エラー', '写真へのアクセス権限が必要です')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    })
    if (!result.canceled) {
      setImages(result.assets.map((a) => a.uri).slice(0, 5))
    }
  }

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('位置情報エラー', '位置情報へのアクセス権限が必要です')
      return
    }
    const loc = await Location.getCurrentPositionAsync({})
    const { latitude, longitude } = loc.coords
    setPinLocation({ latitude, longitude })
    Alert.alert('位置設定完了', `現在地を設定しました`)
  }

  const handleSubmit = async () => {
    if (!form.color || !form.description || !form.city || !form.contactEmail) {
      Alert.alert('入力エラー', '必須項目を入力してください（毛色・説明・市区町村・メール）')
      return
    }
    if (!pinLocation) {
      Alert.alert('場所未設定', '「現在地を使う」ボタンで場所を設定してください')
      return
    }
    setSubmitting(true)
    try {
      const imageUrls = images.length > 0
        ? await uploadPetImages(userId, images)
        : []
      await createPet({
        type: isLost ? 'lost' : 'found',
        species: form.species,
        name: form.name,
        breed: form.breed,
        color: form.color,
        gender: form.gender,
        age: form.age,
        description: form.description,
        images: imageUrls,
        location: {
          lat: pinLocation.latitude,
          lng: pinLocation.longitude,
          address: form.address,
          prefecture: form.prefecture,
          city: form.city,
        },
        lostDate: form.lostDate,
        status: 'searching',
        userId,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        searchRadiusKm,
      })
      Alert.alert('投稿完了', '投稿しました', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ])
    } catch {
      Alert.alert('エラー', '投稿に失敗しました。もう一度お試しください')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 種別トグル */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>種別</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {isLost ? '🔍 迷子になった' : '🤝 保護した'}
          </Text>
          <Switch
            value={!isLost}
            onValueChange={(v) => setIsLost(!v)}
            trackColor={{ false: '#fca5a5', true: '#93c5fd' }}
            thumbColor={isLost ? '#ef4444' : '#3b82f6'}
          />
        </View>
      </View>

      {/* 基本情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <Text style={styles.label}>動物種</Text>
        <View style={styles.chipRow}>
          {(['dog', 'cat', 'rabbit', 'bird', 'other'] as Pet['species'][]).map((s) => {
            const labels = { dog: '犬', cat: '猫', rabbit: 'うさぎ', bird: '鳥', other: 'その他' }
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
        <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
          <Text style={styles.photoBtnText}>📷 写真を選択する</Text>
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
        <Field label="市区町村 *" value={form.city} onChange={(v) => set('city', v)} placeholder="例: 新宿区" />
        <Field label="詳細場所・目印" value={form.address} onChange={(v) => set('address', v)} placeholder="例: ○○公園付近" />

        <TouchableOpacity style={styles.locationBtn} onPress={useCurrentLocation}>
          <Text style={styles.locationBtnText}>📍 現在地を使う</Text>
        </TouchableOpacity>

        <View style={styles.locationStatus}>
          {pinLocation ? (
            <Text style={styles.locationSet}>✓ 位置設定済み</Text>
          ) : (
            <Text style={styles.locationUnset}>⚠ 「現在地を使う」ボタンで場所を設定してください（必須）</Text>
          )}
        </View>

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
        <Text style={styles.submitBtnText}>{submitting ? '投稿中...' : '投稿する'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
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
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  radiusHint: { fontSize: 12, color: '#6b7280', marginBottom: 10, marginTop: -4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkboxMark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 13, color: '#374151' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#ef4444', fontWeight: '600' },
  fieldWrapper: {},
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 8, padding: 10, fontSize: 14, color: '#111827',
  },
  textarea: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 8, padding: 10, fontSize: 14, color: '#111827',
    height: 96, textAlignVertical: 'top',
  },
  photoBtn: {
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
    borderRadius: 10, padding: 16, alignItems: 'center',
  },
  photoBtnText: { color: '#6b7280', fontWeight: '600' },
  imageRow: { marginTop: 8 },
  thumbnail: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  locationBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10,
    alignItems: 'center', marginTop: 8,
  },
  locationBtnText: { color: '#374151', fontWeight: '600' },
  locationStatus: {
    marginTop: 10, padding: 10, backgroundColor: '#f9fafb',
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  locationSet: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  locationUnset: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  mapHint: { fontSize: 13, color: '#6b7280', marginTop: 10, marginBottom: 6 },
  mapWrapper: {
    height: 220, borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  map: { flex: 1 },
  submitBtn: {
    backgroundColor: '#ef4444', margin: 16, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})

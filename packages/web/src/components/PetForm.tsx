'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  APIProvider,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import type { Pet } from '@pet-rescue/shared'
import { PREFECTURES, CITIES_BY_PREFECTURE } from '@pet-rescue/shared'
import { createPet, updatePet } from '@/lib/firestore'
import { uploadPetImages } from '@/lib/storage'
import { grantProtectedPostPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/titles'
import { useAuth } from '@/contexts/AuthContext'
import { useLoadingState } from '@/contexts/LoadingContext'
import LocationMapPicker, { type LocationData } from './LocationMapPicker'
import {
  getMatchedPostCount,
  createNewMatchedNotificationsAfterEdit,
} from '@/lib/editMatchNotifications'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface Props {
  userId: string
  ownerDisplayName?: string
  defaultType?: 'lost' | 'found'
  pet?: Pet
}

export default function PetForm(props: Props) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <FormInner {...props} />
    </APIProvider>
  )
}

const SEARCH_RADIUS_OPTIONS = [
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
  { value: 15, label: '15km' },
  { value: 20, label: '20km' },
  { value: 30, label: 'それ以上（30km）' },
] as const

interface FormData {
  type: 'lost' | 'found'
  species: Pet['species']
  name: string
  breed: string
  color: string
  gender: Pet['gender']
  age: string
  description: string
  lostDate: string
  prefecture: string
  city: string
  address: string
  contactEmail: string
  contactPhone: string
  status: Pet['status']
  searchRadiusKm: number
}

function matchMessageStyle(msg: string): { bg: string; text: string; icon: string } {
  if (msg.startsWith('新たに')) {
    return { bg: 'bg-orange-50 border border-orange-100', text: 'text-orange-700', icon: '🔔' }
  }
  if (msg.endsWith('はありません')) {
    return { bg: 'bg-gray-50 border border-gray-200', text: 'text-gray-500', icon: 'ℹ️' }
  }
  return { bg: 'bg-blue-50 border border-blue-100', text: 'text-blue-700', icon: 'ℹ️' }
}

function FormInner({ userId, ownerDisplayName, defaultType = 'lost', pet }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { startLoading, stopLoading } = useLoadingState()
  const isEdit = Boolean(pet)
  const geocodingLib = useMapsLibrary('geocoding')
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [existingImages, setExistingImages] = useState<string[]>(pet?.images ?? [])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(
    pet?.location ? { lat: pet.location.lat, lng: pet.location.lng } : null
  )

  const [useUserInfoChecked, setUseUserInfoChecked] = useState(false)
  const emailBeforeAutoFill = useRef('')

  const [form, setForm] = useState<FormData>({
    type: pet?.type ?? defaultType,
    species: pet?.species ?? 'dog',
    name: pet?.name ?? '',
    breed: pet?.breed ?? '',
    color: pet?.color ?? '',
    gender: pet?.gender ?? 'unknown',
    age: pet?.age ?? '',
    description: pet?.description ?? '',
    lostDate: pet
      ? new Date(pet.lostDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    prefecture: pet?.location.prefecture ?? '東京都',
    city: pet?.location.city ?? '',
    address: pet?.location.address ?? '',
    contactEmail: pet?.contactEmail ?? '',
    contactPhone: pet?.contactPhone ?? '',
    status: pet?.status ?? 'searching',
    searchRadiusKm: pet?.searchRadiusKm ?? 5,
  })

  // --- 周辺情報件数表示（編集モードのみ） ---
  const [matchInfoMessage, setMatchInfoMessage] = useState<string | null>(null)
  const [isFetchingCount, setIsFetchingCount] = useState(false)
  const prevCountRef = useRef<number | null>(null)
  const prevPinKeyRef = useRef<string>(
    pet?.location
      ? `${pet.location.lat.toFixed(6)},${pet.location.lng.toFixed(6)}`
      : ''
  )
  const prevRadiusRef = useRef<number>(pet?.searchRadiusKm ?? 5)
  const pinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const radiusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder())
  }, [geocodingLib])

  // 編集時：初回マウントで初期件数を取得（メッセージは表示しない）
  useEffect(() => {
    if (!isEdit || !pet?.location?.lat) return
    getMatchedPostCount(
      pet.location.lat, pet.location.lng, pet.searchRadiusKm ?? 5, pet.type, pet.id, pet.species,
    ).then((count) => { prevCountRef.current = count }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ピン位置が変わったとき：debounce 後に件数取得 → 「このエリアには○○件」表示
  useEffect(() => {
    if (!isEdit || !pinLocation) return
    const key = `${pinLocation.lat.toFixed(6)},${pinLocation.lng.toFixed(6)}`
    if (key === prevPinKeyRef.current) return
    prevPinKeyRef.current = key

    if (pinDebounceRef.current) clearTimeout(pinDebounceRef.current)
    const captureLat = pinLocation.lat
    const captureLng = pinLocation.lng
    const captureRadius = form.searchRadiusKm

    pinDebounceRef.current = setTimeout(() => {
      setIsFetchingCount(true)
      getMatchedPostCount(captureLat, captureLng, captureRadius, pet?.type, pet?.id, pet?.species)
        .then((count) => {
          setMatchInfoMessage(count > 0 ? `このエリアには${count}件の目撃や保護情報があります` : 'このエリアには目撃や保護情報はありません')
          prevCountRef.current = count
        })
        .catch(() => setMatchInfoMessage(null))
        .finally(() => setIsFetchingCount(false))
    }, 500)

    return () => { if (pinDebounceRef.current) clearTimeout(pinDebounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinLocation])

  // 探知範囲が変わったとき：debounce 後に件数取得 → 差分を表示
  useEffect(() => {
    if (!isEdit) return
    if (form.searchRadiusKm === prevRadiusRef.current) return
    prevRadiusRef.current = form.searchRadiusKm

    if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current)
    if (!pinLocation) return

    const captureLat = pinLocation.lat
    const captureLng = pinLocation.lng
    const captureRadius = form.searchRadiusKm

    radiusDebounceRef.current = setTimeout(() => {
      setIsFetchingCount(true)
      getMatchedPostCount(captureLat, captureLng, captureRadius, pet?.type, pet?.id, pet?.species)
        .then((newCount) => {
          const prevCount = prevCountRef.current
          if (prevCount !== null && newCount - prevCount > 0) {
            setMatchInfoMessage(`新たに${newCount - prevCount}件の目撃や保護情報があります`)
          } else if (newCount > 0) {
            setMatchInfoMessage(`このエリアには${newCount}件の目撃や保護情報があります`)
          } else {
            setMatchInfoMessage('このエリアには目撃や保護情報はありません')
          }
          prevCountRef.current = newCount
        })
        .catch(() => setMatchInfoMessage(null))
        .finally(() => setIsFetchingCount(false))
    }, 500)

    return () => { if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.searchRadiusKm])

  // Forward geocoding: address/city → pin
  const geocodeAddress = useCallback(
    async (addressStr: string) => {
      if (!geocoder || !addressStr.trim()) return
      setGeocoding(true)
      startLoading()
      try {
        const result = await geocoder.geocode({ address: addressStr, region: 'JP' })
        if (result.results[0]) {
          const loc = result.results[0].geometry.location
          setPinLocation({ lat: loc.lat(), lng: loc.lng() })
        }
      } catch (e) {
        console.warn('Geocoding failed:', e)
      } finally {
        setGeocoding(false)
        stopLoading()
      }
    },
    [geocoder, startLoading, stopLoading]
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'searchRadiusKm' ? Number(value) : value,
    }))
  }

  const handlePrefectureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPref = e.target.value
    setForm((prev) => ({ ...prev, prefecture: newPref }))
    void geocodeAddress(`${newPref}${form.city}`)
  }

  const handleCityBlur = () => {
    if (form.city) void geocodeAddress(`${form.prefecture}${form.city}`)
  }

  const handleAddressBlur = () => {
    const q = `${form.prefecture}${form.city}${form.address}`
    if (form.address || form.city) void geocodeAddress(q)
  }

  // Called by LocationMapPicker when user clicks map or uses current location
  const handlePinChange = useCallback((loc: LocationData) => {
    setPinLocation({ lat: loc.lat, lng: loc.lng })
    setForm((prev) => {
      const newPref = loc.prefecture || prev.prefecture
      const cities = CITIES_BY_PREFECTURE[newPref] ?? []
      const newCity = cities.includes(loc.city) ? loc.city : ''
      return {
        ...prev,
        prefecture: newPref,
        city: newCity || prev.city,
        address: loc.address || prev.address,
      }
    })
  }, [])

  const handleUseUserInfo = (checked: boolean) => {
    setUseUserInfoChecked(checked)
    if (checked && user) {
      emailBeforeAutoFill.current = form.contactEmail
      setForm((prev) => ({ ...prev, contactEmail: user.email ?? '' }))
    } else if (!checked) {
      setForm((prev) => ({ ...prev, contactEmail: emailBeforeAutoFill.current }))
      emailBeforeAutoFill.current = ''
    }
  }

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const remaining = 5 - existingImages.length
    const toAdd = selected.slice(0, remaining)
    setNewImageFiles((prev) => [...prev, ...toAdd].slice(0, remaining))
    toAdd.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (ev) =>
        setNewImagePreviews((prev) =>
          [...prev, ev.target?.result as string].slice(0, remaining)
        )
      reader.readAsDataURL(f)
    })
    e.target.value = ''
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinLocation) {
      alert('地図上で場所をクリックするか、住所を入力して位置を設定してください')
      return
    }
    setSubmitting(true)
    startLoading()
    try {
      const newUrls =
        newImageFiles.length > 0 ? await uploadPetImages(userId, newImageFiles) : []
      const allImages = [...existingImages, ...newUrls]

      if (isEdit && pet) {
        await updatePet(pet.id, {
          type: form.type,
          species: form.species,
          name: form.name,
          breed: form.breed,
          color: form.color,
          gender: form.gender,
          age: form.age,
          description: form.description,
          images: allImages,
          location: {
            lat: pinLocation.lat,
            lng: pinLocation.lng,
            address: form.address,
            prefecture: form.prefecture,
            city: form.city,
          },
          lostDate: form.lostDate,
          status: form.status,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          searchRadiusKm: form.searchRadiusKm,
        })

        // 位置・探知範囲の変更により新たに範囲内に入った目撃情報・保護投稿に通知（fire-and-forget）
        createNewMatchedNotificationsAfterEdit({
          targetPostType: pet.type,
          targetPostId: pet.id,
          targetPostName: pet.name || '名前不明',
          targetPostUserId: pet.userId,
          species: pet.species,
          beforeLat: pet.location.lat,
          beforeLng: pet.location.lng,
          beforeRadiusKm: pet.searchRadiusKm ?? 5,
          afterLat: pinLocation.lat,
          afterLng: pinLocation.lng,
          afterRadiusKm: form.searchRadiusKm,
        }).catch(console.error)

        router.push(`/posts/${pet.id}`)
      } else {
        const newPetId = await createPet({
          type: form.type,
          species: form.species,
          name: form.name,
          breed: form.breed,
          color: form.color,
          gender: form.gender,
          age: form.age,
          description: form.description,
          images: allImages,
          location: {
            lat: pinLocation.lat,
            lng: pinLocation.lng,
            address: form.address,
            prefecture: form.prefecture,
            city: form.city,
          },
          lostDate: form.lostDate,
          status: 'searching',
          userId,
          ownerDisplayName: ownerDisplayName ?? undefined,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          searchRadiusKm: form.searchRadiusKm,
        })

        if (form.type === 'found') {
          const today = new Date().toISOString().split('T')[0]
          await grantProtectedPostPoints(userId, newPetId, today).catch(() => {})
          await checkAndAwardBadges(userId, {
            isFirstPost: true,
            isFirstProtection: true,
          }).catch(() => {})
        } else {
          await checkAndAwardBadges(userId, { isFirstPost: true }).catch(() => {})
        }

        router.push('/')
      }
    } catch (err) {
      console.error(err)
      alert('保存に失敗しました。もう一度お試しください')
    } finally {
      setSubmitting(false)
      stopLoading()
    }
  }

  const totalImages = existingImages.length + newImageFiles.length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">基本情報</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(['lost', 'found'] as const).map((t) => (
            <label
              key={t}
              className={`flex items-center justify-center gap-2 border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                form.type === t
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={form.type === t}
                onChange={handleChange}
                className="hidden"
              />
              <span className="font-semibold text-gray-700">
                {t === 'lost' ? '🔍 迷子になった' : '🤝 保護した'}
              </span>
            </label>
          ))}
        </div>

        {isEdit && (
          <div className="mb-4">
            <label className="label">ステータス</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="select-field"
            >
              <option value="searching">捜索中</option>
              <option value="protected">保護済み</option>
              <option value="resolved">解決済み</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">動物種 *</label>
            <select
              name="species"
              value={form.species}
              onChange={handleChange}
              className="select-field"
              required
            >
              <option value="dog">犬</option>
              <option value="cat">猫</option>
              <option value="rabbit">うさぎ</option>
              <option value="bird">鳥</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="label">性別</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="select-field"
            >
              <option value="unknown">不明</option>
              <option value="male">オス</option>
              <option value="female">メス</option>
            </select>
          </div>
          <div>
            <label className="label">名前</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input-field"
              placeholder="例: チョコ"
            />
          </div>
          <div>
            <label className="label">品種</label>
            <input
              name="breed"
              value={form.breed}
              onChange={handleChange}
              className="input-field"
              placeholder="例: トイプードル"
            />
          </div>
          <div>
            <label className="label">毛色 *</label>
            <input
              name="color"
              value={form.color}
              onChange={handleChange}
              className="input-field"
              placeholder="例: 茶色と白"
              required
            />
          </div>
          <div>
            <label className="label">年齢・月齢</label>
            <input
              name="age"
              value={form.age}
              onChange={handleChange}
              className="input-field"
              placeholder="例: 3歳"
            />
          </div>
          <div>
            <label className="label">
              {form.type === 'lost' ? '迷子になった日' : '保護した日'} *
            </label>
            <input
              type="date"
              name="lostDate"
              value={form.lostDate}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">特徴・詳細説明 *</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input-field min-h-24 resize-none"
            placeholder="首輪の色・模様・特徴など詳しく記入してください"
            required
          />
        </div>
      </div>

      {/* 写真 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">写真（最大5枚）</h2>

        {(existingImages.length > 0 || newImagePreviews.length > 0) && (
          <div className="flex gap-2 flex-wrap mb-3">
            {existingImages.map((url, i) => (
              <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
            {newImagePreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {totalImages < 5 && (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-red-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm text-gray-500">クリックして写真を追加</p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG, WEBP（残り {5 - totalImages} 枚）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleNewImages}
            />
          </div>
        )}
      </div>

      {/* 場所 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">場所情報</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">都道府県 *</label>
            <select
              name="prefecture"
              value={form.prefecture}
              onChange={handlePrefectureChange}
              className="select-field"
              required
            >
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">市区町村 *</label>
            <select
              name="city"
              value={form.city}
              onChange={handleChange}
              className="select-field"
              required
              disabled={!form.prefecture}
            >
              <option value="">市区町村を選択</option>
              {(CITIES_BY_PREFECTURE[form.prefecture] ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">詳しい場所・目印</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              onBlur={handleAddressBlur}
              className="input-field"
              placeholder="例: ○○公園付近（入力するとピンが移動します）"
            />
          </div>
        </div>
        {geocoding && (
          <p className="text-xs text-gray-400 animate-pulse mb-2">住所を検索中...</p>
        )}
        <LocationMapPicker
          mapInstanceId="pet-form-map"
          pinLocation={pinLocation}
          species={form.species}
          searchRadiusKm={form.searchRadiusKm}
          showRadiusCircle
          draggable
          autoDetectOnMount={!pet}
          onPinChange={handlePinChange}
        />
      </div>

      {/* 探知範囲 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-1">目撃情報の探知範囲</h2>
        <p className="text-xs text-gray-500 mb-4">
          この範囲内で目撃情報が投稿された場合に通知します
        </p>
        <select
          name="searchRadiusKm"
          value={form.searchRadiusKm}
          onChange={handleChange}
          className="select-field"
        >
          {SEARCH_RADIUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 周辺情報件数メッセージ（編集モードのみ） */}
        {isEdit && (
          isFetchingCount ? (
            <p className="text-xs text-gray-400 animate-pulse mt-3">周辺情報を検索中...</p>
          ) : matchInfoMessage ? (() => {
            const style = matchMessageStyle(matchInfoMessage)
            return (
              <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 ${style.bg}`}>
                <span className="text-sm shrink-0">{style.icon}</span>
                <p className={`text-xs ${style.text}`}>{matchInfoMessage}</p>
              </div>
            )
          })() : null
        )}
      </div>

      {/* 連絡先 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">連絡先情報</h2>

        {user ? (
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useUserInfoChecked}
              onChange={(e) => handleUseUserInfo(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-gray-700">会員情報と同じものを使用する</span>
          </label>
        ) : (
          <div className="flex items-center gap-2 mb-4 opacity-50">
            <input type="checkbox" disabled className="w-4 h-4" />
            <span className="text-sm text-gray-500">
              会員情報と同じものを使用する（ログイン後に利用できます）
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ownerDisplayName && (
            <div className="sm:col-span-2">
              <label className="label">投稿者名</label>
              <p className="input-field bg-gray-50 text-gray-700 cursor-default select-none">
                {ownerDisplayName}
              </p>
            </div>
          )}
          <div>
            <label className="label">メールアドレス *</label>
            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              className="input-field"
              placeholder="example@email.com"
              required
            />
          </div>
          <div>
            <label className="label">電話番号</label>
            <input
              type="tel"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              className="input-field"
              placeholder="090-0000-0000"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1 py-3 text-base"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary flex-[2] py-3 text-base"
        >
          {submitting
            ? isEdit
              ? '保存中...'
              : '投稿中...'
            : isEdit
              ? '変更を保存する'
              : '投稿する'}
        </button>
      </div>
    </form>
  )
}

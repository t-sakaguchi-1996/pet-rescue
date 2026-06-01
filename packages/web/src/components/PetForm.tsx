'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps'
import type { Pet } from '@pet-rescue/shared'
import { PREFECTURES } from '@pet-rescue/shared'
import { createPet, updatePet } from '@/lib/firestore'
import { uploadPetImages } from '@/lib/storage'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const DEFAULT_CENTER = { lat: 35.6812362, lng: 139.7671248 }

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
  reward: string
  status: Pet['status']
}

function FormInner({ userId, ownerDisplayName, defaultType = 'lost', pet }: Props) {
  const router = useRouter()
  const isEdit = Boolean(pet)
  const map = useMap('pet-form-map')
  const geocodingLib = useMapsLibrary('geocoding')
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [existingImages, setExistingImages] = useState<string[]>(
    pet?.images ?? []
  )
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [pinLocation, setPinLocation] = useState<{
    lat: number
    lng: number
  } | null>(pet?.location ? { lat: pet.location.lat, lng: pet.location.lng } : null)

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
    reward: pet?.reward ?? '',
    status: pet?.status ?? 'searching',
  })

  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder())
  }, [geocodingLib])

  const geocodeAddress = useCallback(
    async (addressStr: string) => {
      if (!geocoder || !addressStr.trim()) return
      setGeocoding(true)
      try {
        const result = await geocoder.geocode({
          address: addressStr,
          region: 'JP',
        })
        if (result.results[0]) {
          const loc = result.results[0].geometry.location
          const pos = { lat: loc.lat(), lng: loc.lng() }
          setPinLocation(pos)
          map?.panTo(pos)
          map?.setZoom(15)
        }
      } catch (e) {
        console.warn('Geocoding failed:', e)
      } finally {
        setGeocoding(false)
      }
    },
    [geocoder, map]
  )

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
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
    const query = `${form.prefecture}${form.city}${form.address}`
    if (form.address || form.city) void geocodeAddress(query)
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

  const handleMapClick = (e: {
    detail: { latLng: { lat: number; lng: number } | null }
  }) => {
    const pos = e.detail.latLng
    if (pos) setPinLocation({ lat: pos.lat, lng: pos.lng })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinLocation) {
      alert('地図上で場所をクリックするか、住所を入力して位置を設定してください')
      return
    }
    setSubmitting(true)
    try {
      const newUrls =
        newImageFiles.length > 0
          ? await uploadPetImages(userId, newImageFiles)
          : []
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
          reward: form.reward || undefined,
        })
        router.push(`/posts/${pet.id}`)
      } else {
        await createPet({
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
          reward: form.reward || undefined,
        })
        router.push('/')
      }
    } catch (err) {
      console.error(err)
      alert('保存に失敗しました。もう一度お試しください')
    } finally {
      setSubmitting(false)
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
        <h2 className="font-semibold text-gray-800 mb-4">
          写真（最大5枚）
        </h2>

        {(existingImages.length > 0 || newImagePreviews.length > 0) && (
          <div className="flex gap-2 flex-wrap mb-3">
            {existingImages.map((url, i) => (
              <div
                key={`existing-${i}`}
                className="relative w-20 h-20 rounded-lg overflow-hidden"
              >
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
              <div
                key={`new-${i}`}
                className="relative w-20 h-20 rounded-lg overflow-hidden"
              >
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
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              onBlur={handleCityBlur}
              className="input-field"
              placeholder="例: 新宿区"
              required
            />
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

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            地図をクリックして正確な場所を指定{' '}
            {!pinLocation && (
              <span className="text-red-500 font-medium">*必須</span>
            )}
            {pinLocation && (
              <span className="text-green-600 font-medium">✓ 設定済み</span>
            )}
          </p>
          {geocoding && (
            <span className="text-xs text-gray-400 animate-pulse">
              住所を検索中...
            </span>
          )}
        </div>

        <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
          <Map
            id="pet-form-map"
            defaultCenter={
              pet?.location
                ? { lat: pet.location.lat, lng: pet.location.lng }
                : DEFAULT_CENTER
            }
            defaultZoom={pet?.location ? 15 : 12}
            mapId="pet-form-map"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            onClick={handleMapClick}
          >
            {pinLocation && <AdvancedMarker position={pinLocation} />}
          </Map>
        </div>
      </div>

      {/* 連絡先 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">連絡先情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="sm:col-span-2">
            <label className="label">お礼（任意）</label>
            <input
              name="reward"
              value={form.reward}
              onChange={handleChange}
              className="input-field"
              placeholder="例: お礼あり"
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

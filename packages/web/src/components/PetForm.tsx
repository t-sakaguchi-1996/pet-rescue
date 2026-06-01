'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from '@vis.gl/react-google-maps'
import type { Pet } from '@pet-rescue/shared'
import { PREFECTURES } from '@pet-rescue/shared'
import { createPet } from '@/lib/firestore'
import { uploadPetImages } from '@/lib/storage'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface Props {
  userId: string
  defaultType: 'lost' | 'found'
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
}

export default function PetForm({ userId, defaultType }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [mapCenter, setMapCenter] = useState({ lat: 35.6812362, lng: 139.7671248 })
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState<FormData>({
    type: defaultType,
    species: 'dog',
    name: '',
    breed: '',
    color: '',
    gender: 'unknown',
    age: '',
    description: '',
    lostDate: new Date().toISOString().split('T')[0],
    prefecture: '東京都',
    city: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    reward: '',
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5)
    setImageFiles(files)
    setPreviewImages(files.map((f) => URL.createObjectURL(f)))
  }

  const handleMapClick = (e: { detail: { latLng: { lat: number; lng: number } | null } }) => {
    const pos = e.detail.latLng
    if (pos) setPinLocation({ lat: pos.lat, lng: pos.lng })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinLocation) {
      alert('地図上で場所をクリックしてください')
      return
    }
    setSubmitting(true)
    try {
      const imageUrls =
        imageFiles.length > 0
          ? await uploadPetImages(userId, imageFiles)
          : []

      await createPet({
        type: form.type,
        species: form.species,
        name: form.name,
        breed: form.breed,
        color: form.color,
        gender: form.gender,
        age: form.age,
        description: form.description,
        images: imageUrls,
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
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        reward: form.reward || undefined,
      })

      router.push('/')
    } catch (err) {
      console.error(err)
      alert('投稿に失敗しました。もう一度お試しください')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 種別 */}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">動物種 *</label>
            <select name="species" value={form.species} onChange={handleChange} className="select-field" required>
              <option value="dog">犬</option>
              <option value="cat">猫</option>
              <option value="rabbit">うさぎ</option>
              <option value="bird">鳥</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="label">性別</label>
            <select name="gender" value={form.gender} onChange={handleChange} className="select-field">
              <option value="unknown">不明</option>
              <option value="male">オス</option>
              <option value="female">メス</option>
            </select>
          </div>
          <div>
            <label className="label">名前</label>
            <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="例: チョコ" />
          </div>
          <div>
            <label className="label">品種</label>
            <input name="breed" value={form.breed} onChange={handleChange} className="input-field" placeholder="例: トイプードル" />
          </div>
          <div>
            <label className="label">毛色 *</label>
            <input name="color" value={form.color} onChange={handleChange} className="input-field" placeholder="例: 茶色と白" required />
          </div>
          <div>
            <label className="label">年齢・月齢</label>
            <input name="age" value={form.age} onChange={handleChange} className="input-field" placeholder="例: 3歳" />
          </div>
          <div>
            <label className="label">{form.type === 'lost' ? '迷子になった日' : '保護した日'} *</label>
            <input type="date" name="lostDate" value={form.lostDate} onChange={handleChange} className="input-field" required />
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
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-red-300 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm text-gray-500">クリックして写真を選択</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (最大5枚)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
        {previewImages.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {previewImages.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 場所 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">場所情報</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">都道府県 *</label>
            <select name="prefecture" value={form.prefecture} onChange={handleChange} className="select-field" required>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">市区町村 *</label>
            <input name="city" value={form.city} onChange={handleChange} className="input-field" placeholder="例: 新宿区" required />
          </div>
          <div className="col-span-2">
            <label className="label">詳しい場所・目印</label>
            <input name="address" value={form.address} onChange={handleChange} className="input-field" placeholder="例: ○○公園付近" />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          地図をクリックして正確な場所を指定してください{' '}
          {!pinLocation && <span className="text-red-500 font-medium">*必須</span>}
          {pinLocation && <span className="text-green-600 font-medium">✓ 設定済み</span>}
        </p>
        <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={12}
              mapId="pet-form-map"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              onClick={handleMapClick}
            >
              {pinLocation && (
                <AdvancedMarker position={pinLocation} />
              )}
            </Map>
          </APIProvider>
        </div>
      </div>

      {/* 連絡先 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">連絡先情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">メールアドレス *</label>
            <input type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} className="input-field" placeholder="example@email.com" required />
          </div>
          <div>
            <label className="label">電話番号</label>
            <input type="tel" name="contactPhone" value={form.contactPhone} onChange={handleChange} className="input-field" placeholder="090-0000-0000" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">お礼（任意）</label>
            <input name="reward" value={form.reward} onChange={handleChange} className="input-field" placeholder="例: お礼あり" />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full py-3 text-base"
      >
        {submitting ? '投稿中...' : '投稿する'}
      </button>
    </form>
  )
}

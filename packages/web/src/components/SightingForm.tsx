'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { createSighting, uploadSightingImage } from '@/lib/sightings'
import { grantSightingPoints } from '@/lib/points'
import { PREFECTURES, SPECIES_LABELS, type PetSpecies } from '@pet-rescue/shared'

interface Props {
  onSuccess?: (sightingId: string, wasGuest: boolean) => void
  defaultSpecies?: PetSpecies
}

async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string; city: string; prefecture: string
} | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=ja`
    )
    const data = await res.json()
    if (data.status !== 'OK' || !data.results[0]) return null
    const comps = data.results[0].address_components as { types: string[]; long_name: string }[]
    const prefecture = comps.find((c) => c.types.includes('administrative_area_level_1'))?.long_name ?? ''
    const city =
      comps.find((c) => c.types.includes('locality'))?.long_name ??
      comps.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ?? ''
    return { address: data.results[0].formatted_address, city, prefecture }
  } catch {
    return null
  }
}

const SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: 'dog',    label: '犬',     emoji: '🐕' },
  { value: 'cat',    label: '猫',     emoji: '🐈' },
  { value: 'rabbit', label: 'うさぎ', emoji: '🐇' },
  { value: 'bird',   label: '鳥',     emoji: '🐦' },
  { value: 'other',  label: 'その他', emoji: '🐾' },
]

export default function SightingForm({ onSuccess, defaultSpecies }: Props) {
  const { user, profile } = useAuth()
  const [species, setSpecies] = useState<PetSpecies>(defaultSpecies ?? 'dog')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [prefecture, setPrefecture] = useState('東京都')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('この端末では現在位置の取得に対応していません')
      return
    }
    setGettingLocation(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude)
        setLng(longitude)
        const geo = await reverseGeocode(latitude, longitude)
        if (geo) {
          setAddress(geo.address)
          setCity(geo.city)
          if (PREFECTURES.includes(geo.prefecture)) setPrefecture(geo.prefecture)
        }
        setGettingLocation(false)
      },
      () => {
        setError('現在位置の取得に失敗しました。手動で入力してください。')
        setGettingLocation(false)
      },
      { timeout: 10000 }
    )
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const remaining = 3 - photos.length
    const toAdd = Array.from(files).slice(0, remaining)
    setPhotos((prev) => [...prev, ...toAdd].slice(0, 3))
    toAdd.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (e) =>
        setPreviews((prev) => [...prev, e.target?.result as string].slice(0, 3))
      reader.readAsDataURL(f)
    })
  }

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i))
    setPreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (!address.trim() && lat === null) { setError('場所を入力してください'); return }
    if (!user && !guestEmail.trim()) { setError('メールアドレスを入力してください'); return }

    setSubmitting(true)
    setError('')

    try {
      let temporaryId = ''
      if (!user) {
        temporaryId = localStorage.getItem('animal_go_temp_id') ?? ''
        if (!temporaryId) {
          temporaryId = crypto.randomUUID()
          localStorage.setItem('animal_go_temp_id', temporaryId)
        }
      }

      const ownerKey = user?.uid ?? temporaryId
      const photoUrls = await Promise.all(photos.map((f) => uploadSightingImage(ownerKey, f)))

      const sightingId = await createSighting({
        species,
        title: title.trim(),
        photos: photoUrls,
        location: {
          address: address.trim() || `${prefecture} ${city}`,
          city: city.trim(),
          prefecture,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
        },
        description: description.trim() || undefined,
        userId: user?.uid,
        guestEmail: user ? undefined : guestEmail.trim(),
        temporaryId: user ? undefined : temporaryId,
        posterName: user
          ? (profile?.displayName ?? user.displayName ?? user.email ?? '匿名')
          : '未登録ユーザー',
      })

      // ログイン済みならすぐにポイントを付与
      if (user) {
        const today = new Date().toISOString().split('T')[0]
        await grantSightingPoints(user.uid, sightingId, today)
      }

      onSuccess?.(sightingId, !user)
    } catch (err) {
      setError('投稿に失敗しました。もう一度お試しください。')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 動物種 */}
      <div>
        <label className="label">
          動物種 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {SPECIES_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSpecies(opt.value)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: species === opt.value ? '#FFC96B' : '#FFF3DC',
                border: `1.5px solid ${species === opt.value ? '#E8A93A' : '#FFD98A'}`,
                color: species === opt.value ? '#3D2400' : '#8B6340',
              }}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* タイトル */}
      <div>
        <label className="label">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          placeholder={`例: ${SPECIES_LABELS[species]}を見かけました`}
          required
        />
      </div>

      {/* 写真 */}
      <div>
        <label className="label">写真（最大3枚）</label>
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                <Image src={src} alt="" fill sizes="96px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed rounded-xl p-4 text-sm text-center transition-colors"
            style={{ borderColor: '#FFD98A', color: '#8B6340' }}
          >
            📷 写真を追加 ({photos.length}/3)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* 場所 */}
      <div>
        <label className="label">
          場所 <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={gettingLocation}
          className="mb-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          style={{ background: '#FFF3DC', color: '#7A4500', border: '1.5px solid #FFD98A' }}
        >
          📍 {gettingLocation ? '取得中...' : '現在位置を自動取得'}
        </button>
        {lat !== null && (
          <p className="text-xs mb-2" style={{ color: '#2AAA6E' }}>
            ✓ 位置情報を取得しました
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="input-field"
          >
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
            placeholder="市区町村"
          />
        </div>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input-field"
          placeholder="詳しい場所（例: ○○公園付近）"
        />
      </div>

      {/* コメント・補足 */}
      <div>
        <label className="label">コメント・補足説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          rows={3}
          placeholder="特徴や状況など（任意）..."
        />
      </div>

      {/* 未ログイン時のメールアドレス */}
      {!user && (
        <div>
          <label className="label">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <p className="text-xs mb-2" style={{ color: '#8B6340' }}>
            会員登録時に同じメールアドレスを使うと、この投稿が紐づけられポイントを受け取れます
          </p>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="input-field"
            placeholder="example@email.com"
            required
          />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full text-center disabled:opacity-50"
      >
        {submitting ? '投稿中...' : '目撃情報を投稿する'}
      </button>

      {user && (
        <p className="text-xs text-center" style={{ color: '#8B6340' }}>
          投稿すると <strong>+2pt</strong> 獲得（1日最大10pt）
        </p>
      )}
    </form>
  )
}

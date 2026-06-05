'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { useAuth } from '@/contexts/AuthContext'
import { useLoadingState } from '@/contexts/LoadingContext'
import { createSighting, uploadSightingImage } from '@/lib/sightings'
import { grantSightingPoints, grantProtectedPostPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/titles'
import { PREFECTURES, CITIES_BY_PREFECTURE, SPECIES_LABELS, type PetSpecies } from '@pet-rescue/shared'
import LocationMapPicker, { type LocationData } from './LocationMapPicker'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

interface Props {
  onSuccess?: (sightingId: string, wasGuest: boolean) => void
  defaultSpecies?: PetSpecies
  sightingType?: 'sighting' | 'found'
}

const SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: 'dog', label: '犬', emoji: '🐕' },
  { value: 'cat', label: '猫', emoji: '🐈' },
  { value: 'rabbit', label: 'うさぎ', emoji: '🐇' },
  { value: 'bird', label: '鳥', emoji: '🐦' },
  { value: 'other', label: 'その他', emoji: '🐾' },
]

export default function SightingForm({ onSuccess, defaultSpecies, sightingType = 'sighting' }: Props) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <SightingFormInner onSuccess={onSuccess} defaultSpecies={defaultSpecies} sightingType={sightingType} />
    </APIProvider>
  )
}

function SightingFormInner({ onSuccess, defaultSpecies, sightingType = 'sighting' }: Props) {
  const { user, profile } = useAuth()
  const { startLoading, stopLoading } = useLoadingState()
  const [species, setSpecies] = useState<PetSpecies>(defaultSpecies ?? 'dog')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [prefecture, setPrefecture] = useState('東京都')
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null)

  const geocodingLib = useMapsLibrary('geocoding')
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null)
  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder())
  }, [geocodingLib])

  const geocodeAddress = useCallback(async (q: string) => {
    if (!geocoder || !q.trim()) return
    try {
      const result = await geocoder.geocode({ address: q, region: 'JP' })
      if (result.results[0]) {
        const loc = result.results[0].geometry.location
        setPinLocation({ lat: loc.lat(), lng: loc.lng() })
      }
    } catch (e) {
      console.warn('Geocoding failed:', e)
    }
  }, [geocoder])

  const handlePrefectureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPref = e.target.value
    setPrefecture(newPref)
    setCity('')
    void geocodeAddress(newPref)
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value
    setCity(newCity)
    if (newCity) void geocodeAddress(`${prefecture}${newCity}`)
  }
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePinChange = useCallback((loc: LocationData) => {
    setPinLocation({ lat: loc.lat, lng: loc.lng })
    if (loc.address) setAddress(loc.address)
    if (loc.prefecture && PREFECTURES.includes(loc.prefecture)) {
      setPrefecture(loc.prefecture)
      const cities = CITIES_BY_PREFECTURE[loc.prefecture] ?? []
      setCity(cities.includes(loc.city) ? loc.city : '')
    }
  }, [])

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
    if (!address.trim() && pinLocation === null) { setError('場所を入力してください'); return }
    if (!user && !guestEmail.trim()) { setError('メールアドレスを入力してください'); return }

    setSubmitting(true)
    setError('')
    startLoading()

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
        sightingType,
        species,
        title: title.trim(),
        photos: photoUrls,
        location: {
          address: address.trim() || `${prefecture} ${city}`,
          city: city.trim(),
          prefecture,
          lat: pinLocation?.lat,
          lng: pinLocation?.lng,
        },
        description: description.trim() || undefined,
        userId: user?.uid,
        guestEmail: user ? undefined : guestEmail.trim(),
        temporaryId: user ? undefined : temporaryId,
        posterName: user
          ? (profile?.displayName ?? user.displayName ?? user.email ?? '匿名')
          : '未登録ユーザー',
        posterPhotoURL: user ? (profile?.photoURL ?? user.photoURL ?? undefined) : undefined,
      })

      if (user) {
        const today = new Date().toISOString().split('T')[0]
        if (sightingType === 'found') {
          await grantProtectedPostPoints(user.uid, sightingId, today).catch(() => {})
          await checkAndAwardBadges(user.uid, {
            isFirstPost: true,
            isFirstProtection: true,
          }).catch(() => {})
        } else {
          await grantSightingPoints(user.uid, sightingId, today)
          await checkAndAwardBadges(user.uid, {
            isFirstPost: true,
            isFirstSighting: true,
          }).catch(() => {})
        }
      }

      onSuccess?.(sightingId, !user)
    } catch (err) {
      setError('投稿に失敗しました。もう一度お試しください。')
      console.error(err)
    } finally {
      setSubmitting(false)
      stopLoading()
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
          placeholder={sightingType === 'found'
            ? `例: ${SPECIES_LABELS[species]}を保護しました`
            : `例: ${SPECIES_LABELS[species]}を見かけました`}
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

        <LocationMapPicker
          mapInstanceId="sighting-form-map"
          pinLocation={pinLocation}
          species={species}
          showRadiusCircle={false}
          draggable
          autoDetectOnMount
          onPinChange={handlePinChange}
        />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <select
            value={prefecture}
            onChange={handlePrefectureChange}
            className="input-field"
          >
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={city}
            onChange={handleCityChange}
            className="select-field"
            disabled={!prefecture}
          >
            <option value="">市区町村を選択</option>
            {(CITIES_BY_PREFECTURE[prefecture] ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input-field mt-2"
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
        {submitting ? '投稿中...' : sightingType === 'found' ? '保護情報を投稿する' : '目撃情報を投稿する'}
      </button>

      {user && (
        <p className="text-xs text-center" style={{ color: '#8B6340' }}>
          投稿すると <strong>+{sightingType === 'found' ? '10' : '2'}pt</strong> 獲得{sightingType !== 'found' && '（1日最大10pt）'}
        </p>
      )}
    </form>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import SightingCard from '@/components/SightingCard'
import { fetchSightingsFiltered } from '@/lib/sightings'
import type { Sighting, PetSpecies } from '@pet-rescue/shared'
import { PREFECTURES, CITIES_BY_PREFECTURE, SPECIES_LABELS } from '@pet-rescue/shared'

export default function SightingsPage() {
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [species, setSpecies] = useState<PetSpecies | ''>('')
  const [applied, setApplied] = useState<{ prefecture: string; city: string; species: PetSpecies | '' }>({ prefecture: '', city: '', species: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchSightingsFiltered({
        prefecture: applied.prefecture || undefined,
        city: applied.city.trim() || undefined,
        species: (applied.species as PetSpecies) || undefined,
        sightingType: 'sighting',  // 目撃のみ
        limitCount: 100,
      })
      setSightings(result)
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => {
    void load()
  }, [load])

  const handlePrefectureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrefecture(e.target.value)
    setCity('')
  }

  const handleSearch = () => {
    setApplied({ prefecture, city, species })
  }

  const handleReset = () => {
    setPrefecture('')
    setCity('')
    setSpecies('')
    setApplied({ prefecture: '', city: '', species: '' })
  }

  const isApplied = !!(applied.prefecture || applied.city || applied.species)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#3D2400' }}>
            👁️ 目撃情報一覧
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B6340' }}>
            みんなが投稿した目撃情報をチェックしよう
          </p>
        </div>
        <Link
          href="/sightings/new"
          className="font-bold text-sm px-4 py-2 rounded-full"
          style={{ background: '#FFC96B', color: '#3D2400' }}
        >
          ＋ 目撃情報を投稿（+2pt）
        </Link>
      </div>

      {/* 検索フィルター */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: 'white', border: '1.5px solid #FFE0A0' }}>
        {/* 動物種チップ */}
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            { value: '' as const, label: 'すべて', emoji: '🐾' },
            { value: 'dog' as PetSpecies, label: '犬', emoji: '🐕' },
            { value: 'cat' as PetSpecies, label: '猫', emoji: '🐈' },
            { value: 'rabbit' as PetSpecies, label: 'うさぎ', emoji: '🐇' },
            { value: 'bird' as PetSpecies, label: '鳥', emoji: '🐦' },
            { value: 'other' as PetSpecies, label: 'その他', emoji: '🐾' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSpecies(opt.value)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: species === opt.value ? '#C46B00' : '#FFF3DC',
                color: species === opt.value ? '#fff' : '#7A4500',
                border: `1.5px solid ${species === opt.value ? '#C46B00' : '#FFD98A'}`,
              }}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* 場所フィルター */}
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={prefecture}
            onChange={handlePrefectureChange}
            className="text-sm rounded-full px-3 py-1.5 font-semibold"
            style={{
              background: prefecture ? '#C46B00' : '#FFF3DC',
              color: prefecture ? '#fff' : '#7A4500',
              border: `1.5px solid ${prefecture ? '#C46B00' : '#FFD98A'}`,
              outline: 'none',
            }}
          >
            <option value="">都道府県</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!prefecture}
            className="text-sm rounded-full px-3 py-1.5 font-semibold"
            style={{
              background: city ? '#C46B00' : '#FFF3DC',
              color: city ? '#fff' : '#7A4500',
              border: `1.5px solid ${city ? '#C46B00' : '#FFD98A'}`,
              outline: 'none',
              opacity: prefecture ? 1 : 0.5,
            }}
          >
            <option value="">市区町村</option>
            {(CITIES_BY_PREFECTURE[prefecture] ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={handleSearch}
            className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all"
            style={{ background: '#C46B00', color: '#fff', border: '1.5px solid #C46B00' }}
          >
            🔍 検索
          </button>
          {isApplied && (
            <button
              onClick={handleReset}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{ background: '#FEE2E2', color: '#991B1B', border: '1.5px solid #FCA5A5' }}
            >
              × リセット
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                 style={{ background: 'white', border: '1.5px solid #FFE0A0' }}>
              <div className="aspect-[4/3]" style={{ background: '#FFF3DC' }} />
              <div className="p-3 space-y-2">
                <div className="h-3 rounded-full w-3/4" style={{ background: '#FFECC0' }} />
                <div className="h-2.5 rounded-full w-1/2" style={{ background: '#FFECC0' }} />
              </div>
            </div>
          ))}
        </div>
      ) : sightings.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ border: '1.5px dashed #FFD98A' }}>
          <p className="text-5xl mb-4">👁️</p>
          <p className="text-gray-500 mb-4">
            {isApplied ? '条件に一致する目撃情報がありません' : 'まだ目撃情報はありません'}
          </p>
          <Link
            href="/sightings/new"
            className="inline-flex font-bold text-sm px-5 py-2.5 rounded-full"
            style={{ background: '#FFC96B', color: '#3D2400' }}
          >
            最初の目撃情報を投稿する
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs mb-3 px-1" style={{ color: '#B08050' }}>
            {sightings.length}件の目撃情報が見つかりました
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sightings.map((s) => (
              <Link key={s.id} href={`/sightings/${s.id}`}>
                <SightingCard sighting={s} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

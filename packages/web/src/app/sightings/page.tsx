'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import SightingCard from '@/components/SightingCard'
import { fetchSightingsFiltered } from '@/lib/sightings'
import type { Sighting, PetSpecies } from '@pet-rescue/shared'
import { PREFECTURES, SPECIES_LABELS } from '@pet-rescue/shared'

export default function SightingsPage() {
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [species, setSpecies] = useState<PetSpecies | ''>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchSightingsFiltered({
        prefecture: prefecture || undefined,
        city: city.trim() || undefined,
        species: (species as PetSpecies) || undefined,
        limitCount: 100,
      })
      setSightings(result)
    } finally {
      setLoading(false)
    }
  }, [prefecture, city, species])

  useEffect(() => {
    void load()
  }, [load])

  const handlePrefectureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrefecture(e.target.value)
    setCity('')
  }

  const handleReset = () => {
    setPrefecture('')
    setCity('')
    setSpecies('')
  }

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
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">都道府県</label>
            <select
              value={prefecture}
              onChange={handlePrefectureChange}
              className="select-field text-sm py-2"
            >
              <option value="">すべて</option>
              {PREFECTURES.map((pref) => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs">市区町村</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={prefecture ? '例: 新宿区' : '都道府県を先に選択'}
              disabled={!prefecture}
              className="input-field text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="label text-xs">動物種</label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value as PetSpecies | '')}
              className="select-field text-sm py-2"
            >
              <option value="">すべて</option>
              {(Object.entries(SPECIES_LABELS) as [PetSpecies, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="btn-secondary text-sm py-2 px-4 w-full"
            >
              リセット
            </button>
          </div>
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
            {prefecture || city || species ? '条件に一致する目撃情報がありません' : 'まだ目撃情報はありません'}
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

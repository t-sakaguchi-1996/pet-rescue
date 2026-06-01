'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PREFECTURES } from '@pet-rescue/shared'

interface Props {
  currentParams: {
    type?: string
    species?: string
    prefecture?: string
    status?: string
  }
}

export default function SearchFilter({ currentParams }: Props) {
  const router = useRouter()
  const [type, setType] = useState(currentParams.type ?? '')
  const [species, setSpecies] = useState(currentParams.species ?? '')
  const [prefecture, setPrefecture] = useState(currentParams.prefecture ?? '')
  const [status, setStatus] = useState(currentParams.status ?? 'searching')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (species) params.set('species', species)
    if (prefecture) params.set('prefecture', prefecture)
    if (status) params.set('status', status)
    router.push(`/?${params.toString()}`)
  }

  const handleReset = () => {
    setType('')
    setSpecies('')
    setPrefecture('')
    setStatus('searching')
    router.push('/')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label text-xs">種別</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="select-field text-sm py-2"
          >
            <option value="">すべて</option>
            <option value="lost">迷子</option>
            <option value="found">保護</option>
          </select>
        </div>

        <div>
          <label className="label text-xs">動物</label>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="select-field text-sm py-2"
          >
            <option value="">すべて</option>
            <option value="dog">犬</option>
            <option value="cat">猫</option>
            <option value="rabbit">うさぎ</option>
            <option value="bird">鳥</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label className="label text-xs">都道府県</label>
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="select-field text-sm py-2"
          >
            <option value="">すべて</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-xs">状態</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select-field text-sm py-2"
          >
            <option value="">すべて</option>
            <option value="searching">捜索中</option>
            <option value="protected">保護済み</option>
            <option value="resolved">解決済み</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={handleReset} className="btn-secondary text-sm py-2 px-4">
          リセット
        </button>
        <button onClick={handleSearch} className="btn-primary text-sm py-2 px-4">
          検索
        </button>
      </div>
    </div>
  )
}

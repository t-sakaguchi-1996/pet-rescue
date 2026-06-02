'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSightings, selectBestInfoSighting, markSightingBestInfoPointGranted, markPetBestInfoPointGranted } from '@/lib/sightings'
import { grantBestSightingPoints } from '@/lib/points'
import { notifyBestInfoSelected } from '@/lib/notifications'
import { SPECIES_LABELS } from '@pet-rescue/shared'
import type { Sighting } from '@pet-rescue/shared'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface Props {
  petId: string
  petName: string
  petOwnerId: string
  petCity: string
  petPrefecture: string
  petLat?: number
  petLng?: number
  petSpecies?: string
  petBestInfoId?: string
  petBestInfoType?: 'comment' | 'sighting'
  petBestInfoPointGranted?: boolean
}

export default function SightingsSection({
  petId,
  petName,
  petOwnerId,
  petCity,
  petPrefecture,
  petLat,
  petLng,
  petSpecies,
  petBestInfoId,
  petBestInfoType,
  petBestInfoPointGranted = false,
}: Props) {
  const { user } = useAuth()
  const isPetOwner = Boolean(user && user.uid === petOwnerId)
  const newSightingHref = petSpecies ? `/sightings/new?species=${petSpecies}` : '/sightings/new'

  const [sightings, setSightings] = useState<Sighting[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [localBestInfoId, setLocalBestInfoId] = useState(petBestInfoId)
  const [localBestInfoType, setLocalBestInfoType] = useState(petBestInfoType)
  const [localPointGranted, setLocalPointGranted] = useState(petBestInfoPointGranted)

  useEffect(() => {
    fetchSightings(50)
      .then((all) => {
        const nearby = all.filter((s) => {
          if (s.species && petSpecies && s.species !== petSpecies) return false
          if (s.location.city && petCity && s.location.city === petCity) return true
          if (petLat && petLng && s.location.lat !== undefined && s.location.lng !== undefined) {
            return haversineKm(petLat, petLng, s.location.lat, s.location.lng) <= 5
          }
          return false
        })
        setSightings(nearby.slice(0, 6))
      })
      .finally(() => setLoading(false))
  }, [petCity, petPrefecture, petLat, petLng, petSpecies])

  const handleSelectBestInfo = async (sighting: Sighting) => {
    if (!user || !isPetOwner) return

    const isCurrentlySelected = localBestInfoId === sighting.id && localBestInfoType === 'sighting'
    if (isCurrentlySelected) return

    const isGuest = !sighting.userId
    const existingLabel = localBestInfoType === 'sighting' ? '目撃情報' : 'コメント'
    const msg = localBestInfoId && localBestInfoId !== sighting.id
      ? `この目撃情報を最有力情報に変更しますか？\n（現在の${existingLabel}は解除されます）\n\n※この操作は取り消せません。\n${isGuest ? '投稿者が会員登録した際に +100pt が付与されます。' : `投稿者「${sighting.posterName}」に +100pt を付与します。`}`
      : `「${sighting.posterName}」の目撃情報を最有力情報に選びますか？\n\n※この操作は取り消せません。\n${isGuest ? '投稿者が会員登録した際に +100pt が付与されます。' : `投稿者に +100pt を付与します。`}`

    if (!window.confirm(msg)) return

    setProcessing(sighting.id)
    try {
      const authorUserId = await selectBestInfoSighting(
        petId,
        sighting.id,
        localBestInfoId,
        localBestInfoType,
      )
      if (!localPointGranted && authorUserId && !sighting.bestInfoPointGranted) {
        await grantBestSightingPoints(authorUserId, sighting.id)
        await markSightingBestInfoPointGranted(sighting.id)
        await markPetBestInfoPointGranted(petId)
        setLocalPointGranted(true)
      }
      // 最有力情報選択を投稿者に通知（ログイン済みの場合のみ）
      if (authorUserId) {
        await notifyBestInfoSelected({
          recipientUserId: authorUserId,
          petId,
          petName,
          sightingId: sighting.id,
          amount: 100,
        })
      }
      setLocalBestInfoId(sighting.id)
      setLocalBestInfoType('sighting')
      setSightings((prev) =>
        prev.map((s) => ({
          ...s,
          isBestInfo: s.id === sighting.id,
        }))
      )
    } catch (err) {
      console.error('最有力情報の選択に失敗しました', err)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return null
  if (sightings.length === 0) {
    return (
      <div className="mt-8 pt-6 border-t">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">👁️ 近隣の目撃情報</h2>
          {!isPetOwner && (
            <Link href={newSightingHref} className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: '#FFC96B', color: '#3D2400' }}>
              目撃情報を投稿（+2pt）
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-400">
          近くに目撃情報はまだありません。
          {!isPetOwner && (
            <Link href={newSightingHref} className="underline ml-1" style={{ color: '#C46B00' }}>
              最初の目撃情報を投稿する
            </Link>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">
          👁️ 近隣の目撃情報
          <span className="ml-2 text-sm font-normal text-gray-400">({sightings.length}件)</span>
        </h2>
        {!isPetOwner && (
          <Link href={newSightingHref} className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: '#FFC96B', color: '#3D2400' }}>
            目撃情報を投稿（+2pt）
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sightings.map((s) => {
          const isCurrent = localBestInfoId === s.id && localBestInfoType === 'sighting'
          return (
            <div key={s.id} className="rounded-xl overflow-hidden relative"
                 style={{ border: isCurrent ? '2px solid #FFD700' : '1.5px solid #FFE0A0', background: 'white' }}>
              {isCurrent && (
                <div className="absolute top-2 right-2 z-10 text-xs font-bold px-1.5 py-0.5 rounded-full"
                     style={{ background: '#FFD700', color: '#3D2400' }}>
                  ⭐ 最有力
                </div>
              )}
              <Link href={`/sightings/${s.id}`} className="block">
                <div className="relative aspect-video bg-gray-50">
                  {s.photos.length > 0 ? (
                    <Image src={s.photos[0]} alt={s.title} fill sizes="200px" className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl text-gray-300">👁️</div>
                  )}
                  {s.species && (
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                      {SPECIES_LABELS[s.species]}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold line-clamp-2 mb-0.5" style={{ color: '#3D2400' }}>
                    {s.title}
                  </p>
                  <p className="text-[10px]" style={{ color: '#8B6340' }}>
                    📍 {s.location.city || s.location.prefecture}
                  </p>
                  <p className="text-[10px]" style={{ color: '#C8A87A' }}>
                    {format(new Date(s.createdAt), 'M/d H:mm', { locale: ja })}
                  </p>
                </div>
              </Link>

              {/* ペットオーナーの最有力情報選択ボタン */}
              {isPetOwner && !isCurrent && (
                <div className="px-2 pb-2">
                  <button
                    onClick={() => handleSelectBestInfo(s)}
                    disabled={processing === s.id}
                    className="w-full text-[10px] font-bold py-1 rounded-full transition-all disabled:opacity-50"
                    style={{ background: '#FFF3DC', color: '#7A4500', border: '1px solid #FFD98A' }}
                  >
                    {processing === s.id ? '処理中...' : '⭐ 最有力情報に選ぶ'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { selectBestInfoSighting, markSightingBestInfoPointGranted, markPetBestInfoPointGranted } from '@/lib/sightings'
import { grantBestSightingPoints } from '@/lib/points'
import { notifyBestInfoSelected } from '@/lib/notifications'
import { SPECIES_LABELS } from '@pet-rescue/shared'
import type { PetSpecies } from '@pet-rescue/shared'

interface SightingInfo {
  id: string
  isBestInfo?: boolean
  bestInfoPointGranted?: boolean
  userId?: string
  posterName: string
}

interface NearbyPet {
  id: string
  name: string
  species: PetSpecies
  bestInfoId?: string
  bestInfoType?: 'comment' | 'sighting'
  bestInfoPointGranted?: boolean
  userId: string
}

interface Props {
  sighting: SightingInfo
  nearbyPetIds: string[]
  nearbyPets: NearbyPet[]
}

export default function SightingBestInfoPanel({ sighting, nearbyPets }: Props) {
  const { user } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  // ログインユーザーが owner の迷子投稿のみ表示
  const myLostPets = nearbyPets.filter((p) => p.userId === user?.uid)
  if (!user || myLostPets.length === 0) return null

  const handleSelect = async (pet: NearbyPet) => {
    const isGuest = !sighting.userId
    const existingLabel = pet.bestInfoType === 'sighting' ? '目撃情報' : 'コメント'
    const msg = pet.bestInfoId && pet.bestInfoId !== sighting.id
      ? `「${pet.name}」の最有力情報を\nこの目撃情報に変更しますか？\n\n（現在の${existingLabel}は解除されます）\n※この操作は取り消せません。\n${isGuest ? '投稿者が会員登録した際に +100pt が付与されます。' : `投稿者「${sighting.posterName}」に +100pt を付与します。`}`
      : `「${pet.name}」の最有力情報にこの目撃情報を選びますか？\n\n※この操作は取り消せません。\n${isGuest ? '投稿者が会員登録した際に +100pt が付与されます。' : `投稿者「${sighting.posterName}」に +100pt を付与します。`}`

    if (!window.confirm(msg)) return

    setProcessing(true)
    try {
      const authorUserId = await selectBestInfoSighting(
        pet.id,
        sighting.id,
        pet.bestInfoId,
        pet.bestInfoType,
      )
      // ポイント付与（同じ迷子投稿で未付与の場合のみ）
      if (!pet.bestInfoPointGranted && authorUserId && !sighting.bestInfoPointGranted) {
        await grantBestSightingPoints(authorUserId, sighting.id)
        await markSightingBestInfoPointGranted(sighting.id)
        await markPetBestInfoPointGranted(pet.id)
      }
      // 最有力情報選択を投稿者に通知（ログイン済みの場合のみ）
      if (authorUserId) {
        await notifyBestInfoSelected({
          recipientUserId: authorUserId,
          petId: pet.id,
          petName: pet.name,
          sightingId: sighting.id,
          amount: 100,
        })
      }
      setDone(true)
    } catch (err) {
      console.error('最有力情報の選択に失敗しました', err)
      alert('処理に失敗しました。もう一度お試しください。')
    } finally {
      setProcessing(false)
    }
  }

  if (done) {
    return (
      <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#F0FFF4', border: '1px solid #9ADFC0' }}>
        <p className="font-bold" style={{ color: '#1A7A3C' }}>⭐ 最有力情報に選びました</p>
        <p className="text-xs mt-1" style={{ color: '#2AAA6E' }}>
          投稿者にポイントが付与されました。
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 rounded-xl" style={{ background: '#FFF3DC', border: '1.5px solid #FFD98A' }}>
      <p className="text-sm font-bold mb-1" style={{ color: '#7A4500' }}>
        ⭐ あなたの迷子投稿の最有力情報にする
      </p>
      <p className="text-xs mb-3" style={{ color: '#8B6340' }}>
        この目撃情報を最有力情報に選ぶと、投稿者に +100pt が付与されます。
      </p>
      <div className="space-y-2">
        {myLostPets.map((pet) => (
          <button
            key={pet.id}
            onClick={() => handleSelect(pet)}
            disabled={processing || pet.bestInfoId === sighting.id}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-bold transition-all disabled:opacity-50"
            style={{
              background: pet.bestInfoId === sighting.id ? '#E8E8E8' : '#FFC96B',
              color: pet.bestInfoId === sighting.id ? '#888' : '#3D2400',
            }}
          >
            <span>
              {pet.species && SPECIES_LABELS[pet.species]} {pet.name}
            </span>
            <span className="text-xs">
              {pet.bestInfoId === sighting.id
                ? '✓ 選択済み'
                : processing
                  ? '処理中...'
                  : '最有力情報に選ぶ →'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

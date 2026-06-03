'use client'

import { useState } from 'react'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useLoadingState } from '@/contexts/LoadingContext'
import { grantDiscoveryBonus } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/titles'
import { notifyBestInfoSelected } from '@/lib/notifications'

interface Props {
  petId: string
  petName: string
  petOwnerId: string
  bestInfoId?: string
  bestInfoType?: 'comment' | 'sighting'
  discoveryBonusGranted?: boolean
}

export default function DiscoveryConfirmButton({
  petId,
  petName,
  petOwnerId,
  bestInfoId,
  bestInfoType,
  discoveryBonusGranted = false,
}: Props) {
  const { user } = useAuth()
  const { startLoading, stopLoading } = useLoadingState()
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(discoveryBonusGranted)

  const isPetOwner = Boolean(user && user.uid === petOwnerId)

  if (!isPetOwner || !bestInfoId || !bestInfoType) return null
  if (done) {
    return (
      <div className="mt-6 p-4 rounded-2xl text-center"
           style={{ background: 'linear-gradient(135deg, #E8FFE8, #CCFFCC)', border: '1.5px solid #66CC66' }}>
        <p className="text-sm font-bold" style={{ color: '#226622' }}>
          🎉 発見・保護への貢献を確認済みです
        </p>
        <p className="text-xs mt-1" style={{ color: '#448844' }}>
          情報提供者に +300pt の発見貢献ボーナスが付与されました
        </p>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!user) return
    if (!window.confirm(
      `「${petName}」の発見・保護につながった情報として確認しますか？\n\n最有力情報の提供者に +300pt の発見貢献ボーナスが付与されます。\nこの操作は取り消せません。`
    )) return

    setProcessing(true)
    startLoading()
    try {
      // 最有力情報の投稿者 userId を取得
      let contributorUserId: string | undefined

      if (bestInfoType === 'comment') {
        const commentSnap = await getDoc(doc(db, 'pets', petId, 'comments', bestInfoId))
        if (commentSnap.exists()) {
          contributorUserId = commentSnap.data().userId as string | undefined
        }
      } else {
        const sightingSnap = await getDoc(doc(db, 'sightings', bestInfoId))
        if (sightingSnap.exists()) {
          contributorUserId = sightingSnap.data().userId as string | undefined
        }
      }

      // ペットを解決済みにマーク
      await updateDoc(doc(db, 'pets', petId), {
        status: 'resolved',
        discoveryBonusGranted: true,
        updatedAt: Timestamp.now(),
      })

      // 貢献者にポイント付与
      if (contributorUserId) {
        await grantDiscoveryBonus(contributorUserId, petId)
        await checkAndAwardBadges(contributorUserId, { isDiscovery: true }).catch(() => {})
        await notifyBestInfoSelected({
          recipientUserId: contributorUserId,
          petId,
          petName,
          amount: 300,
        }).catch(() => {})
      }

      setDone(true)
    } catch (err) {
      console.error('発見確認に失敗しました', err)
      alert('処理に失敗しました。もう一度お試しください。')
    } finally {
      setProcessing(false)
      stopLoading()
    }
  }

  return (
    <div className="mt-6 p-4 rounded-2xl"
         style={{ background: 'linear-gradient(135deg, #FFF3DC, #FFECC0)', border: '1.5px solid #FFD98A' }}>
      <p className="text-sm font-bold mb-1" style={{ color: '#7A4500' }}>
        🎉 ペットが発見・保護されましたか？
      </p>
      <p className="text-xs mb-3" style={{ color: '#8B5E1A' }}>
        最有力情報が実際の発見・保護につながった場合は確認ボタンを押してください。
        情報提供者に <strong>+300pt</strong> の発見貢献ボーナスが付与されます。
      </p>
      <button
        onClick={handleConfirm}
        disabled={processing}
        className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
        style={{ background: '#FFC96B', color: '#3D2400' }}
      >
        {processing ? '処理中...' : '✅ 発見・保護を確認する（+300pt 付与）'}
      </button>
    </div>
  )
}

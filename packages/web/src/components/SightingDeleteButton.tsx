'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLoadingState } from '@/contexts/LoadingContext'
import { deleteSighting } from '@/lib/sightings'

interface Props {
  sightingId: string
  sightingUserId?: string
}

export default function SightingDeleteButton({ sightingId, sightingUserId }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const { startLoading, stopLoading } = useLoadingState()
  const [deleting, setDeleting] = useState(false)

  if (!user || user.uid !== sightingUserId) return null

  const handleDelete = async () => {
    if (!window.confirm('この目撃情報を削除しますか？\nこの操作は取り消せません。')) return
    setDeleting(true)
    startLoading()
    try {
      await deleteSighting(sightingId)
      router.push('/sightings')
    } catch {
      alert('削除に失敗しました。もう一度お試しください。')
      setDeleting(false)
      stopLoading()
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
      style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'white' }}
    >
      {deleting ? '削除中...' : '🗑️ この投稿を削除'}
    </button>
  )
}

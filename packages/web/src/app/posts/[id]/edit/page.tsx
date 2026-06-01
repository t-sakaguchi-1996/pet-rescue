'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { fetchPetById } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'

const PetForm = dynamic(() => import('@/components/PetForm'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-gray-400 text-sm">フォームを読み込み中...</div>
    </div>
  ),
})

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!id || authLoading) return
    fetchPetById(id)
      .then((data) => {
        if (!data) {
          setError('投稿が見つかりません')
          return
        }
        setPet(data)
      })
      .catch(() => setError('データの読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [id, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!pet || !user) return null

  if (pet.userId !== user.uid) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">この投稿を編集する権限がありません</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">投稿を編集する</h1>
      <PetForm userId={user.uid} pet={pet} />
    </div>
  )
}

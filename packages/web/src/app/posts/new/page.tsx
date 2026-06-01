'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PetForm from '@/components/PetForm'

function NewPostContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const defaultType = searchParams.get('type') === 'found' ? 'found' : 'lost'

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {defaultType === 'lost' ? '迷子ペットを報告する' : '保護したペットを報告する'}
      </h1>
      <PetForm userId={user.uid} defaultType={defaultType} />
    </div>
  )
}

export default function NewPostPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-400 text-sm">読み込み中...</div>
        </div>
      }
    >
      <NewPostContent />
    </Suspense>
  )
}

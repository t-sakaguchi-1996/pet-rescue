'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'

const PetForm = dynamic(() => import('@/components/PetForm'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-gray-400 text-sm">フォームを読み込み中...</div>
    </div>
  ),
})

function NewPostContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading } = useAuth()
  const typeParam = searchParams.get('type')

  useEffect(() => {
    // 保護投稿は sightings/new?type=found へ転送
    if (typeParam === 'found') {
      router.replace('/sightings/new?type=found')
      return
    }
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [typeParam, user, loading, router])

  if (typeParam === 'found' || loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        迷子ペットを報告する
      </h1>
      <PetForm
        userId={user.uid}
        ownerDisplayName={profile?.displayName ?? user.displayName ?? user.email ?? undefined}
        ownerPhotoURL={profile?.photoURL ?? user.photoURL ?? undefined}
        defaultType="lost"
      />
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

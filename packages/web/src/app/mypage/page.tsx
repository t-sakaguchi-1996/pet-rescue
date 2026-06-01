'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserPets } from '@/lib/firestore'
import PetCard from '@/components/PetCard'
import type { Pet } from '@pet-rescue/shared'

export default function MyPage() {
  const router = useRouter()
  const { user, profile, loading, logout } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [petsLoading, setPetsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchUserPets(user.uid)
        .then(setPets)
        .finally(() => setPetsLoading(false))
    }
  }, [user])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl">
            🐾
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-lg">
              {profile?.displayName ?? user.displayName ?? 'ユーザー'}
            </p>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary text-sm"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* 投稿一覧 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">
            自分の投稿 ({pets.length}件)
          </h2>
          <Link href="/posts/new" className="btn-primary text-sm">
            新規投稿
          </Link>
        </div>
        {petsLoading ? (
          <p className="text-center text-gray-400 py-8">読み込み中...</p>
        ) : pets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>まだ投稿がありません</p>
            <Link
              href="/posts/new"
              className="inline-block mt-4 btn-primary text-sm"
            >
              最初の投稿をする
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} showEditLink />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

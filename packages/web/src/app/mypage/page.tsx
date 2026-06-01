'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserPets, deletePet } from '@/lib/firestore'
import PetCard from '@/components/PetCard'
import type { Pet } from '@pet-rescue/shared'

export default function MyPage() {
  const router = useRouter()
  const { user, profile, loading, logout, updateUserProfile } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [petsLoading, setPetsLoading] = useState(true)

  // Account edit state
  const [editingAccount, setEditingAccount] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  useEffect(() => {
    if (profile || user) {
      setDisplayName(
        profile?.displayName ?? user?.displayName ?? ''
      )
    }
  }, [profile, user])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      await updateUserProfile(displayName.trim())
      setSaveSuccess(true)
      setEditingAccount(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePet = async (petId: string) => {
    if (!confirm('この投稿を削除しますか？この操作は取り消せません。')) return
    try {
      await deletePet(petId)
      setPets((prev) => prev.filter((p) => p.id !== petId))
    } catch {
      alert('削除に失敗しました。')
    }
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
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl flex-shrink-0">
            🐾
          </div>

          {editingAccount ? (
            <div className="flex-1">
              <div className="mb-3">
                <label className="label">表示名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field"
                  placeholder="表示名を入力"
                  maxLength={30}
                />
              </div>
              <div className="mb-2">
                <label className="label">メールアドレス</label>
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {user.email}
                  <span className="text-xs text-gray-400 ml-2">
                    （変更するには再認証が必要です）
                  </span>
                </p>
              </div>
              {saveError && (
                <p className="text-xs text-red-500 mb-2">{saveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingAccount(false)
                    setDisplayName(
                      profile?.displayName ?? user?.displayName ?? ''
                    )
                    setSaveError('')
                  }}
                  className="btn-secondary text-sm flex-1"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || !displayName.trim()}
                  className="btn-primary text-sm flex-[2] disabled:opacity-50"
                >
                  {saving ? '保存中...' : '変更を保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">
                {profile?.displayName ?? user.displayName ?? 'ユーザー'}
              </p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              {saveSuccess && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ プロフィールを更新しました
                </p>
              )}
            </div>
          )}

          {!editingAccount && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => setEditingAccount(true)}
                className="btn-secondary text-sm"
              >
                アカウント編集
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-gray-600 text-center"
              >
                ログアウト
              </button>
            </div>
          )}
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
              <div key={pet.id} className="relative">
                <PetCard pet={pet} showEditLink />
                <button
                  onClick={() => handleDeletePet(pet.id)}
                  className="absolute bottom-3 right-3 text-xs text-gray-300 hover:text-red-400 transition-colors"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

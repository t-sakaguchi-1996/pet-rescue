'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserPets, deletePet } from '@/lib/firestore'
import { uploadAvatarImage } from '@/lib/storage'
import PetCard from '@/components/PetCard'
import type { Pet } from '@pet-rescue/shared'

export default function MyPage() {
  const router = useRouter()
  const { user, profile, loading, logout, updateUserProfile, updateUserPhotoURL, updateUserEmail } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [petsLoading, setPetsLoading] = useState(true)

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Email change
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      const ownName = profile?.displayName ?? user.displayName ?? undefined
      fetchUserPets(user.uid)
        .then((fetched) =>
          setPets(
            fetched.map((p) => ({
              ...p,
              ownerDisplayName: p.ownerDisplayName ?? ownName,
            }))
          )
        )
        .finally(() => setPetsLoading(false))
    }
  }, [user, profile])

  useEffect(() => {
    setDisplayName(profile?.displayName ?? user?.displayName ?? '')
  }, [profile, user])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  // Avatar
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatarImage(user.uid, avatarFile)
      await updateUserPhotoURL(url)
      setAvatarPreview(null)
      setAvatarFile(null)
    } catch {
      alert('画像のアップロードに失敗しました。もう一度お試しください。')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const cancelAvatarPreview = () => {
    setAvatarPreview(null)
    setAvatarFile(null)
  }

  // Display name
  const handleSaveProfile = async () => {
    if (!displayName.trim()) return
    setSavingProfile(true)
    setProfileError('')
    try {
      await updateUserProfile(displayName.trim())
      setProfileSuccess(true)
      setEditingProfile(false)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      setProfileError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSavingProfile(false)
    }
  }

  // Email
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !currentPassword) return
    setSavingEmail(true)
    setEmailError('')
    try {
      await updateUserEmail(newEmail.trim(), currentPassword)
      setEmailSuccess(true)
      setShowEmailForm(false)
      setNewEmail('')
      setCurrentPassword('')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setEmailError('パスワードが正しくありません。')
      } else if (code === 'auth/email-already-in-use') {
        setEmailError('このメールアドレスはすでに使用されています。')
      } else if (code === 'auth/invalid-email') {
        setEmailError('メールアドレスの形式が正しくありません。')
      } else {
        setEmailError('変更に失敗しました。しばらくしてからお試しください。')
      }
    } finally {
      setSavingEmail(false)
    }
  }

  // Posts
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

  const currentPhotoURL = avatarPreview ?? profile?.photoURL ?? user.photoURL
  const currentInitial = (
    profile?.displayName ?? user.displayName ?? user.email ?? 'U'
  ).charAt(0).toUpperCase()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex items-start gap-5">
          {/* アバター */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden bg-red-100 flex items-center justify-center cursor-pointer group"
              onClick={() => avatarInputRef.current?.click()}
            >
              {currentPhotoURL ? (
                <Image
                  src={currentPhotoURL}
                  alt="プロフィール画像"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-3xl font-bold text-red-400">
                  {currentInitial}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            {avatarPreview ? (
              <div className="flex gap-1">
                <button
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="text-xs btn-primary px-2 py-1 disabled:opacity-50"
                >
                  {uploadingAvatar ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={cancelAvatarPreview}
                  className="text-xs btn-secondary px-2 py-1"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                画像を変更
              </button>
            )}
          </div>

          {/* プロフィール情報 */}
          <div className="flex-1 min-w-0">
            {editingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="label">表示名</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field"
                    placeholder="表示名を入力"
                    maxLength={30}
                    autoFocus
                  />
                </div>
                {profileError && (
                  <p className="text-xs text-red-500">{profileError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingProfile(false)
                      setDisplayName(profile?.displayName ?? user?.displayName ?? '')
                      setProfileError('')
                    }}
                    className="btn-secondary text-sm flex-1"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile || !displayName.trim()}
                    className="btn-primary text-sm flex-[2] disabled:opacity-50"
                  >
                    {savingProfile ? '保存中...' : '保存する'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {profile?.displayName ?? user.displayName ?? 'ユーザー'}
                </p>
                <p className="text-gray-500 text-sm">{user.email}</p>
                {profileSuccess && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ プロフィールを更新しました
                  </p>
                )}
                {emailSuccess && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ 確認メールを送信しました。受信トレイをご確認ください。
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 操作ボタン */}
          {!editingProfile && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => setEditingProfile(true)}
                className="btn-secondary text-sm whitespace-nowrap"
              >
                名前を編集
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

        {/* メールアドレス変更 */}
        <div className="mt-5 pt-5 border-t">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700">メールアドレス</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            {!showEmailForm && (
              <button
                onClick={() => {
                  setShowEmailForm(true)
                  setEmailSuccess(false)
                }}
                className="btn-secondary text-sm"
              >
                変更する
              </button>
            )}
          </div>

          {showEmailForm && (
            <form onSubmit={handleEmailChange} className="mt-3 space-y-3 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">
                セキュリティのため、現在のパスワードを入力して本人確認を行います。
                変更後、新しいメールアドレスに確認メールが送信されます。
              </p>
              <div>
                <label className="label">現在のパスワード</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="現在のパスワードを入力"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">新しいメールアドレス</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field"
                  placeholder="new@example.com"
                  required
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false)
                    setNewEmail('')
                    setCurrentPassword('')
                    setEmailError('')
                  }}
                  className="btn-secondary text-sm flex-1"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingEmail || !newEmail.trim() || !currentPassword}
                  className="btn-primary text-sm flex-[2] disabled:opacity-50"
                >
                  {savingEmail ? '送信中...' : '確認メールを送信'}
                </button>
              </div>
            </form>
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
            <Link href="/posts/new" className="inline-block mt-4 btn-primary text-sm">
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

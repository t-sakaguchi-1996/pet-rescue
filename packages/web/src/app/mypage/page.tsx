'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserPets, deletePet } from '@/lib/firestore'
import { uploadAvatarImage } from '@/lib/storage'
import { getPointTransactions } from '@/lib/points'
import { fetchUserRewardExchanges } from '@/lib/rewards'
import { fetchRanking, findUserRank, RANKING_TYPE_LABELS } from '@/lib/rankings'
import { getTitleName, getBadgeDefinition } from '@/lib/titles'
import PetCard from '@/components/PetCard'
import AdminDashboard from '@/components/AdminDashboard'
import type { Pet, PointTransaction, RewardExchange, RankingType } from '@pet-rescue/shared'
import { TITLE_DEFINITIONS, BADGE_DEFINITIONS, TRANSACTION_TYPE_LABELS } from '@pet-rescue/shared'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

type MyPageTab = 'overview' | 'points' | 'titles' | 'rewards' | 'settings' | 'posts'

export default function MyPage() {
  const router = useRouter()
  const { user, profile, loading, logout, updateUserProfile, updateUserPhotoURL, updateUserEmail, updateSelectedTitle, updateShowInRanking, refreshProfile } = useAuth()
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false
  const [pets, setPets] = useState<Pet[]>([])
  const [petsLoading, setPetsLoading] = useState(true)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [exchanges, setExchanges] = useState<RewardExchange[]>([])
  const [myTotalRank, setMyTotalRank] = useState<number | null>(null)
  const [myMonthlyRank, setMyMonthlyRank] = useState<number | null>(null)
  const [tab, setTab] = useState<MyPageTab>('overview')

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Avatar
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

  // Title selection
  const [selectedTitleEdit, setSelectedTitleEdit] = useState<string | null>(null)
  const [savingTitle, setSavingTitle] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || isAdmin) return
    const displayNameVal = profile?.displayName ?? user.displayName ?? ''
    setDisplayName(displayNameVal)
    setSelectedTitleEdit(profile?.selectedTitle ?? null)

    fetchUserPets(user.uid)
      .then((fetched) => setPets(fetched.map((p) => ({
        ...p,
        ownerDisplayName: p.ownerDisplayName ?? displayNameVal,
      }))))
      .finally(() => setPetsLoading(false))

    getPointTransactions(user.uid)
      .then(setTransactions)
      .catch(() => {})

    fetchUserRewardExchanges(user.uid)
      .then(setExchanges)
      .catch(() => {})

    // ランキング順位取得
    Promise.all([
      fetchRanking('total_points', user.uid),
      fetchRanking('monthly_points', user.uid),
    ]).then(([total, monthly]) => {
      setMyTotalRank(findUserRank(total, user.uid))
      setMyMonthlyRank(findUserRank(monthly, user.uid))
    }).catch(() => {})
  }, [user, profile])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

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
      alert('画像のアップロードに失敗しました。')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return
    setSavingProfile(true)
    setProfileError('')
    try {
      await updateUserProfile(displayName.trim())
      setEditingProfile(false)
    } catch {
      setProfileError('保存に失敗しました。')
    } finally {
      setSavingProfile(false)
    }
  }

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
      } else {
        setEmailError('変更に失敗しました。しばらくしてからお試しください。')
      }
    } finally {
      setSavingEmail(false)
    }
  }

  const handleDeletePet = async (petId: string) => {
    if (!confirm('この投稿を削除しますか？')) return
    try {
      await deletePet(petId)
      setPets((prev) => prev.filter((p) => p.id !== petId))
    } catch {
      alert('削除に失敗しました。')
    }
  }

  const handleSaveTitle = async () => {
    setSavingTitle(true)
    try {
      await updateSelectedTitle(selectedTitleEdit)
    } finally {
      setSavingTitle(false)
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
  const currentInitial = (profile?.displayName ?? user.displayName ?? user.email ?? 'U').charAt(0).toUpperCase()
  const currentPoints = profile?.points ?? 0
  const totalPointsEarned = profile?.totalPointsEarned ?? 0
  const earnedTitles = profile?.titles ?? []
  const earnedBadges = profile?.badges ?? []
  const selectedTitleName = profile?.selectedTitle ? getTitleName(profile.selectedTitle) : null

  // 今月のポイントを計算
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthlyPoints = transactions
    .filter((t) => !t.isCancelled && t.amount > 0 && t.date >= monthStart)
    .reduce((s, t) => s + t.amount, 0)

  const TABS: { id: MyPageTab; label: string; emoji: string }[] = [
    { id: 'overview', label: '概要', emoji: '🏠' },
    { id: 'points', label: 'ポイント', emoji: '⭐' },
    { id: 'titles', label: '称号・バッジ', emoji: '🎖️' },
    { id: 'rewards', label: '交換履歴', emoji: '🎁' },
    { id: 'posts', label: '投稿', emoji: '📋' },
    { id: 'settings', label: '設定', emoji: '⚙️' },
  ]

  if (isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AdminDashboard />
        <div className="mt-8 pt-6 border-t" style={{ borderColor: '#FFE0A0' }}>
          <button
            onClick={async () => { await logout(); router.push('/') }}
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: '#FFE8E8', color: '#CC3333' }}
          >
            ログアウト
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex items-start gap-4">
          {/* アバター */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden bg-red-100 flex items-center justify-center cursor-pointer group"
              onClick={() => avatarInputRef.current?.click()}
            >
              {currentPhotoURL ? (
                <Image src={currentPhotoURL} alt="プロフィール" width={80} height={80}
                       className="object-cover w-full h-full" />
              ) : (
                <span className="text-3xl font-bold text-red-400">{currentInitial}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">変更</span>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            {avatarPreview && (
              <div className="flex gap-1">
                <button onClick={handleAvatarUpload} disabled={uploadingAvatar} className="text-xs btn-primary px-2 py-1">
                  {uploadingAvatar ? '...' : '保存'}
                </button>
                <button onClick={() => { setAvatarPreview(null); setAvatarFile(null) }} className="text-xs btn-secondary px-2 py-1">取消</button>
              </div>
            )}
          </div>

          {/* 名前・称号 */}
          <div className="flex-1 min-w-0">
            {editingProfile ? (
              <div className="space-y-2">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                       className="input-field" placeholder="表示名" maxLength={30} autoFocus />
                {profileError && <p className="text-xs text-red-500">{profileError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setEditingProfile(false)} className="btn-secondary text-sm flex-1">キャンセル</button>
                  <button onClick={handleSaveProfile} disabled={savingProfile || !displayName.trim()}
                          className="btn-primary text-sm flex-[2] disabled:opacity-50">
                    {savingProfile ? '保存中...' : '保存する'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-black text-xl" style={{ color: '#3D2400' }}>
                  {profile?.displayName ?? user.displayName ?? 'ユーザー'}
                </p>
                {selectedTitleName && (
                  <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1"
                        style={{ background: '#FFC96B', color: '#3D2400' }}>
                    {selectedTitleName}
                  </span>
                )}
                {earnedBadges.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {earnedBadges.slice(0, 5).map((id) => {
                      const b = getBadgeDefinition(id)
                      return b ? <span key={id} title={b.name} className="text-lg">{b.emoji}</span> : null
                    })}
                    {earnedBadges.length > 5 && (
                      <span className="text-xs" style={{ color: '#B08050' }}>+{earnedBadges.length - 5}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {!editingProfile && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={() => setEditingProfile(true)} className="btn-secondary text-xs whitespace-nowrap">
                名前を編集
              </button>
              <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ポイントサマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: '保有ポイント', value: `${currentPoints.toLocaleString()}pt`, emoji: '⭐', color: '#C46B00' },
          { label: '累計獲得', value: `${totalPointsEarned.toLocaleString()}pt`, emoji: '📈', color: '#8B5E1A' },
          { label: '今月の獲得', value: `${monthlyPoints.toLocaleString()}pt`, emoji: '📅', color: '#5A8A3A' },
          { label: '総合順位', value: myTotalRank ? `${myTotalRank}位` : '-', emoji: '🏆', color: '#4A6FA5' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-2xl text-center bg-white"
               style={{ border: '1.5px solid #FFE0A0' }}>
            <div className="text-xl mb-1">{item.emoji}</div>
            <p className="text-[10px] mb-0.5" style={{ color: '#B08050' }}>{item.label}</p>
            <p className="text-base font-black" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 活動実績 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: '目撃投稿', value: profile?.sightingCount ?? 0, unit: '件', emoji: '👁️' },
          { label: '保護投稿', value: profile?.protectedPostCount ?? 0, unit: '件', emoji: '🤝' },
          { label: '最有力情報', value: profile?.bestInfoCount ?? 0, unit: '回', emoji: '⭐' },
          { label: '発見貢献', value: profile?.discoveryCount ?? 0, unit: '回', emoji: '🎉' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-2xl text-center"
               style={{ background: '#FFF9F0', border: '1.5px solid #FFE0A0' }}>
            <div className="text-xl mb-1">{item.emoji}</div>
            <p className="text-[10px] mb-0.5" style={{ color: '#B08050' }}>{item.label}</p>
            <p className="text-lg font-black" style={{ color: '#5A3A1A' }}>
              {item.value}<span className="text-xs ml-0.5">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* タブナビ */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: tab === t.id ? '#C46B00' : '#FFF3DC',
                    color: tab === t.id ? 'white' : '#8B5E1A',
                    border: `1.5px solid ${tab === t.id ? '#C46B00' : '#FFD98A'}`,
                  }}>
            <span>{t.emoji}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ━━━ 概要タブ ━━━ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* 目撃情報を投稿するCTA */}
          <Link href="/sightings/new"
                className="flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.99]"
                style={{ background: 'white', border: '1.5px dashed #FFD98A' }}>
            <div className="text-3xl">👁️</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#7A4500' }}>
                捜索に協力して貢献ポイントを獲得
              </p>
              <p className="text-xs" style={{ color: '#B08050' }}>目撃情報を投稿 +2pt / 保護投稿 +10pt</p>
            </div>
            <span className="font-black" style={{ color: '#C46B00' }}>→</span>
          </Link>

          {/* ランキング */}
          <div className="p-4 rounded-2xl" style={{ background: 'white', border: '1.5px solid #FFE0A0' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: '#5A3A1A' }}>🏆 ランキング順位</p>
              <Link href="/ranking" className="text-xs underline" style={{ color: '#C46B00' }}>ランキングを見る</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '総合順位', rank: myTotalRank, type: 'total_points' as RankingType },
                { label: '今月の順位', rank: myMonthlyRank, type: 'monthly_points' as RankingType },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl text-center"
                     style={{ background: '#FFF9F0', border: '1px solid #FFE0A0' }}>
                  <p className="text-xs mb-1" style={{ color: '#B08050' }}>{item.label}</p>
                  <p className="text-2xl font-black" style={{ color: item.rank ? '#C46B00' : '#CCC' }}>
                    {item.rank ? `#${item.rank}` : '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 最近のポイント履歴 */}
          <div className="p-4 rounded-2xl" style={{ background: 'white', border: '1.5px solid #FFE0A0' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: '#5A3A1A' }}>⭐ 最近のポイント</p>
              <button onClick={() => setTab('points')} className="text-xs underline" style={{ color: '#C46B00' }}>
                全件見る
              </button>
            </div>
            {transactions.slice(0, 5).length === 0 ? (
              <p className="text-xs text-gray-400">ポイント履歴はまだありません</p>
            ) : (
              <div className="space-y-1.5">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center px-3 py-1.5 rounded-xl"
                       style={{ background: '#FFF9F0', opacity: tx.isCancelled ? 0.5 : 1 }}>
                    <span className="text-xs" style={{ color: '#5A3A1A' }}>
                      {TRANSACTION_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                      {tx.isCancelled && ' [取消]'}
                    </span>
                    <span className="text-xs font-bold" style={{ color: tx.amount >= 0 ? '#C46B00' : '#CC3333' }}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}pt
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━━ ポイントタブ ━━━ */}
      {tab === 'points' && (
        <div>
          <div className="mb-4 p-4 rounded-2xl"
               style={{ background: 'linear-gradient(135deg, #FFF3DC, #FFECC0)', border: '1.5px solid #FFD98A' }}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs font-bold" style={{ color: '#7A4500' }}>保有ポイント</p>
                <p className="text-2xl font-black" style={{ color: '#C46B00' }}>{currentPoints.toLocaleString()}<span className="text-sm">pt</span></p>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: '#7A4500' }}>累計獲得</p>
                <p className="text-2xl font-black" style={{ color: '#8B5E1A' }}>{totalPointsEarned.toLocaleString()}<span className="text-sm">pt</span></p>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: '#7A4500' }}>今月の獲得</p>
                <p className="text-2xl font-black" style={{ color: '#5A8A3A' }}>{monthlyPoints.toLocaleString()}<span className="text-sm">pt</span></p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: '#8B6340' }}>ポイント履歴はまだありません</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id}
                     className="flex justify-between items-center px-4 py-3 rounded-2xl"
                     style={{ background: 'white', border: '1.5px solid #FFE0A0', opacity: tx.isCancelled ? 0.5 : 1 }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#3D2400' }}>
                      {TRANSACTION_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                      {tx.isCancelled && <span className="text-xs text-red-500 ml-1">[取消済]</span>}
                    </p>
                    {tx.description && (
                      <p className="text-xs" style={{ color: '#B08050' }}>{tx.description}</p>
                    )}
                    <p className="text-xs" style={{ color: '#C8A87A' }}>{tx.date}</p>
                  </div>
                  <span className="text-base font-black" style={{ color: tx.amount >= 0 ? '#C46B00' : '#CC3333' }}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}pt
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <Link href="/rewards" className="flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-sm"
                  style={{ background: '#FFF3DC', color: '#7A4500', border: '1.5px dashed #FFD98A' }}>
              🎁 貢献ポイントを特典と交換する
            </Link>
          </div>
        </div>
      )}

      {/* ━━━ 称号・バッジタブ ━━━ */}
      {tab === 'titles' && (
        <div className="space-y-5">
          {/* 称号一覧 */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>🎖️ 取得済み称号</p>
            <div className="space-y-2">
              {TITLE_DEFINITIONS.map((title) => {
                const earned = earnedTitles.includes(title.id)
                const isSelected = profile?.selectedTitle === title.id
                return (
                  <div key={title.id}
                       className="flex items-center justify-between p-3 rounded-xl"
                       style={{
                         background: earned ? (isSelected ? '#FFF3DC' : 'white') : '#F5F5F5',
                         border: isSelected ? '2px solid #FFD98A' : `1.5px solid ${earned ? '#FFE0A0' : '#E0E0E0'}`,
                         opacity: earned ? 1 : 0.5,
                       }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: earned ? '#3D2400' : '#999' }}>
                        {title.name}
                      </p>
                      <p className="text-xs" style={{ color: '#B08050' }}>
                        {earned ? '✓ 取得済み' : `必要: ${title.requiredPoints.toLocaleString()}pt`}
                      </p>
                    </div>
                    {earned && (
                      <button
                        onClick={() => setSelectedTitleEdit(isSelected ? null : title.id)}
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{
                          background: isSelected ? '#FFD98A' : '#FFF3DC',
                          color: '#7A4500',
                          border: '1px solid #FFD98A',
                        }}
                      >
                        {isSelected ? '表示中' : '表示する'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {selectedTitleEdit !== profile?.selectedTitle && (
              <button onClick={handleSaveTitle} disabled={savingTitle}
                      className="mt-3 w-full btn-primary text-sm disabled:opacity-50">
                {savingTitle ? '保存中...' : '称号の表示設定を保存'}
              </button>
            )}
          </div>

          {/* バッジ一覧 */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: '#5A3A1A' }}>🏅 取得済みバッジ</p>
            <div className="grid grid-cols-3 gap-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const earned = earnedBadges.includes(badge.id)
                return (
                  <div key={badge.id}
                       className="p-3 rounded-2xl text-center"
                       style={{
                         background: earned ? 'white' : '#F5F5F5',
                         border: `1.5px solid ${earned ? '#FFE0A0' : '#E0E0E0'}`,
                         opacity: earned ? 1 : 0.4,
                       }}>
                    <div className="text-3xl mb-1">{badge.emoji}</div>
                    <p className="text-xs font-bold" style={{ color: earned ? '#3D2400' : '#999' }}>
                      {badge.name}
                    </p>
                    {!earned && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#CCC' }}>未取得</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ━━━ 交換履歴タブ ━━━ */}
      {tab === 'rewards' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold" style={{ color: '#5A3A1A' }}>🎁 景品交換履歴</p>
            <Link href="/rewards" className="text-xs underline" style={{ color: '#C46B00' }}>
              特典一覧へ
            </Link>
          </div>
          {exchanges.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-5xl mb-3">🎁</p>
              <p className="text-sm mb-3" style={{ color: '#8B6340' }}>交換履歴はまだありません</p>
              <Link href="/rewards" className="btn-primary text-sm">特典一覧を見る</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {exchanges.map((ex) => (
                <div key={ex.id} className="p-4 rounded-2xl bg-white" style={{ border: '1.5px solid #FFE0A0' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#3D2400' }}>{ex.rewardName}</p>
                      <p className="text-xs" style={{ color: '#8B6340' }}>{ex.requiredPoints.toLocaleString()}pt</p>
                      <p className="text-xs" style={{ color: '#C8A87A' }}>
                        {new Date(ex.requestedAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#FFF3DC', color: '#7A4500' }}>
                      {ex.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━ 投稿タブ ━━━ */}
      {tab === 'posts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: '#5A3A1A' }}>自分の投稿 ({pets.length}件)</h2>
            <Link href="/posts/new" className="btn-primary text-sm">新規投稿</Link>
          </div>
          {petsLoading ? (
            <p className="text-center text-gray-400 py-8">読み込み中...</p>
          ) : pets.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm mb-3" style={{ color: '#8B6340' }}>まだ投稿がありません</p>
              <Link href="/posts/new" className="btn-primary text-sm">最初の投稿をする</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pets.map((pet) => (
                <div key={pet.id} className="relative">
                  <PetCard pet={pet} showEditLink />
                  <button onClick={() => handleDeletePet(pet.id)}
                          className="absolute bottom-3 right-3 text-xs text-gray-300 hover:text-red-400">
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━ 設定タブ ━━━ */}
      {tab === 'settings' && (
        <div className="space-y-4">
          {/* ランキング表示設定 */}
          <div className="p-4 rounded-2xl bg-white" style={{ border: '1.5px solid #FFE0A0' }}>
            <p className="text-sm font-bold mb-1" style={{ color: '#5A3A1A' }}>🏆 ランキング表示設定</p>
            <p className="text-xs mb-3" style={{ color: '#8B6340' }}>
              オフにすると、ランキングでは「匿名ユーザー」として表示されます（自分の順位は確認できます）
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => updateShowInRanking(!(profile?.showInRanking ?? true))}
                className="relative w-12 h-6 rounded-full transition-all cursor-pointer"
                style={{ background: (profile?.showInRanking ?? true) ? '#C46B00' : '#DDD' }}
              >
                <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow"
                     style={{ left: (profile?.showInRanking ?? true) ? '28px' : '4px' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#5A3A1A' }}>
                {(profile?.showInRanking ?? true) ? 'ランキングに表示する' : 'ランキングに表示しない'}
              </span>
            </label>
          </div>

          {/* メールアドレス変更 */}
          <div className="p-4 rounded-2xl bg-white" style={{ border: '1.5px solid #FFE0A0' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium" style={{ color: '#5A3A1A' }}>メールアドレス</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              {!showEmailForm && (
                <button onClick={() => { setShowEmailForm(true); setEmailSuccess(false) }}
                        className="btn-secondary text-sm">変更する</button>
              )}
            </div>
            {emailSuccess && <p className="text-xs text-green-600">✓ 確認メールを送信しました</p>}
            {showEmailForm && (
              <form onSubmit={handleEmailChange} className="mt-3 space-y-3 bg-gray-50 rounded-xl p-4">
                <div>
                  <label className="label">現在のパスワード</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                         className="input-field" required autoFocus />
                </div>
                <div>
                  <label className="label">新しいメールアドレス</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                         className="input-field" required />
                </div>
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowEmailForm(false); setEmailError('') }}
                          className="btn-secondary text-sm flex-1">キャンセル</button>
                  <button type="submit" disabled={savingEmail}
                          className="btn-primary text-sm flex-[2] disabled:opacity-50">
                    {savingEmail ? '送信中...' : '確認メールを送信'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

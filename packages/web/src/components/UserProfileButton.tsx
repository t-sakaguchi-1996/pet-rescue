'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  userId?: string
  displayName: string
  photoURL?: string
  size?: 'sm' | 'md'
}

export default function UserProfileButton({ userId, displayName, photoURL, size = 'md' }: Props) {
  const router = useRouter()
  const { user } = useAuth()

  const isGuest = !userId || displayName === '未登録ユーザー'
  const initial = (displayName && displayName !== '未登録ユーザー' ? displayName : 'U').charAt(0).toUpperCase()

  const avatarSize = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-9 h-9 text-sm'
  const nameSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const handleClick = () => {
    if (isGuest || !userId) return
    if (userId === user?.uid) { router.push(`/users/${userId}`); return }
    if (window.confirm('プロフィールを確認しますか？')) {
      router.push(`/users/${userId}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isGuest}
      className={`flex items-center gap-2 ${!isGuest ? 'hover:opacity-70 transition-opacity cursor-pointer' : 'cursor-default'}`}
    >
      <div
        className={`${avatarSize} rounded-full flex-shrink-0 flex items-center justify-center font-bold overflow-hidden`}
        style={{ background: '#FFE0A0', color: '#7A4500' }}
      >
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <span className={`${nameSize} font-semibold truncate`} style={{ color: '#7A4500' }}>
        {displayName}
      </span>
      {!isGuest && (
        <span className="text-xs flex-shrink-0" style={{ color: '#C8A070' }}>›</span>
      )}
    </button>
  )
}

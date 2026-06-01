'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const { user, profile, loading } = useAuth()

  const photoURL = profile?.photoURL ?? user?.photoURL
  const initial = (
    profile?.displayName ??
    user?.displayName ??
    user?.email ??
    'U'
  ).charAt(0).toUpperCase()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-red-500">
          <span>🐾</span>
          <span>ペット救助</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            一覧
          </Link>
          <Link href="/map" className="text-gray-600 hover:text-gray-900">
            地図
          </Link>
          <Link href="/posts/new?type=lost" className="text-gray-600 hover:text-gray-900">
            迷子を報告
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <NotificationBell />
              <Link
                href="/mypage"
                className="w-8 h-8 rounded-full overflow-hidden bg-red-100 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-red-400 transition-all"
                aria-label="マイページ"
              >
                {photoURL ? (
                  <Image
                    src={photoURL}
                    alt={profile?.displayName ?? 'プロフィール'}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-sm font-bold text-red-500">
                    {initial}
                  </span>
                )}
              </Link>
              <Link href="/posts/new" className="btn-primary text-sm">
                投稿する
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                ログイン
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm">
                新規登録
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const { user, loading } = useAuth()

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
              <Link
                href="/mypage"
                className="text-sm text-gray-600 hover:text-gray-900 font-medium hidden sm:block"
              >
                マイページ
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

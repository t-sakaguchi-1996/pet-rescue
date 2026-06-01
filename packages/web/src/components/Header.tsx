'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const { user, profile, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const photoURL = profile?.photoURL ?? user?.photoURL
  const initial = (
    profile?.displayName ?? user?.displayName ?? user?.email ?? 'U'
  ).charAt(0).toUpperCase()

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className="bg-white/95 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-50 shadow-soft">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* ロゴ */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-1.5 font-black text-lg"
          >
            <span className="text-2xl">🐾</span>
            <span className="bg-gradient-to-r from-primary-500 to-peach-400 bg-clip-text text-transparent">
              ペットレスキュー
            </span>
          </Link>

          {/* PC ナビ */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
            <Link href="/" className="text-gray-500 hover:text-primary-500 transition-colors">
              一覧
            </Link>
            <Link href="/map" className="text-gray-500 hover:text-primary-500 transition-colors">
              地図
            </Link>
            <Link href="/posts/new?type=lost" className="text-gray-500 hover:text-primary-500 transition-colors">
              迷子を報告
            </Link>
            <Link href="/posts/new?type=found" className="text-gray-500 hover:text-primary-500 transition-colors">
              保護を報告
            </Link>
          </nav>

          {/* 右側アクション */}
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <>
                <NotificationBell />
                <Link
                  href="/mypage"
                  onClick={closeMenu}
                  className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-primary-400 transition-all"
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
                    <span className="text-sm font-bold text-primary-500">{initial}</span>
                  )}
                </Link>
                <Link href="/posts/new" onClick={closeMenu} className="btn-primary text-xs px-4 py-2 hidden sm:flex">
                  ＋ 投稿
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-gray-500 hover:text-primary-500 font-semibold hidden sm:block">
                  ログイン
                </Link>
                <Link href="/auth/register" className="btn-primary text-xs px-4 py-2">
                  新規登録
                </Link>
              </>
            )}

            {/* モバイル ハンバーガー */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 ml-1"
              aria-label="メニュー"
              aria-expanded={menuOpen}
            >
              <span
                className={`block w-5 h-0.5 bg-gray-500 transition-all duration-200 ${
                  menuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-gray-500 transition-all duration-200 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-gray-500 transition-all duration-200 ${
                  menuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* モバイル ドロップダウンメニュー */}
        {menuOpen && (
          <div className="md:hidden border-t border-pink-100 bg-white/98 backdrop-blur-sm">
            <nav className="px-4 py-3 space-y-0.5">
              <MobileNavLink href="/" onClick={closeMenu}>🏠 一覧</MobileNavLink>
              <MobileNavLink href="/map" onClick={closeMenu}>🗺️ 地図で探す</MobileNavLink>
              <MobileNavLink href="/posts/new?type=lost" onClick={closeMenu}>🔍 迷子を報告する</MobileNavLink>
              <MobileNavLink href="/posts/new?type=found" onClick={closeMenu}>🤝 保護した子を報告</MobileNavLink>
              {user && (
                <MobileNavLink href="/mypage" onClick={closeMenu}>👤 マイページ</MobileNavLink>
              )}
              {!user && (
                <>
                  <MobileNavLink href="/auth/login" onClick={closeMenu}>🔑 ログイン</MobileNavLink>
                  <MobileNavLink href="/auth/register" onClick={closeMenu}>✨ 新規登録</MobileNavLink>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* メニューオーバーレイ */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20"
          onClick={closeMenu}
        />
      )}
    </>
  )
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-3 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
    >
      {children}
    </Link>
  )
}

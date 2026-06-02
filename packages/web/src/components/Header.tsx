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
  const points = profile?.points ?? 0

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)
  const isAdmin = user?.email ? adminEmails.includes(user.email) : false

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className="sticky top-0 z-50"
              style={{ background: 'rgba(255,238,209,0.95)', borderBottom: '1.5px solid #FFD98A', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* ロゴ */}
          {isAdmin ? (
            <span className="flex items-center gap-1.5 font-black text-lg cursor-default select-none">
              <span className="text-2xl">🐾</span>
              <span style={{ color: '#C46B00' }}>ANIMAL MyGO</span>
            </span>
          ) : (
            <Link href="/" onClick={closeMenu} className="flex items-center gap-1.5 font-black text-lg">
              <span className="text-2xl">🐾</span>
              <span style={{ color: '#C46B00' }}>ANIMAL MyGO</span>
            </Link>
          )}

          {/* PC ナビ（管理者には非表示） */}
          {!isAdmin && (
            <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
              {[
                { href: '/', label: '一覧' },
                { href: '/map', label: '地図' },
                { href: '/sightings', label: '👁️ 目撃情報' },
                { href: '/ranking', label: '🏆 ランキング' },
                { href: '/rewards', label: '🎁 貢献特典' },
                { href: '/posts/new?type=lost', label: '迷子を報告' },
                { href: '/posts/new?type=found', label: '保護を報告' },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                      className="transition-colors hover:opacity-70"
                      style={{ color: '#8B5E1A' }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* 右アクション */}
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <>
                {/* ポイント表示（管理者には非表示） */}
                {!isAdmin && (
                  <Link href="/mypage"
                        className="hidden sm:flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: '#FFF3DC', color: '#C46B00', border: '1px solid #FFD98A' }}>
                    <span>⭐</span>
                    <span>{points.toLocaleString()}pt</span>
                  </Link>
                )}
                {isAdmin && (
                  <span className="hidden sm:flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: '#FFE0E0', color: '#C00000', border: '1px solid #FFC0C0' }}>
                    ⚙️ ADMIN
                  </span>
                )}
                <NotificationBell />
                <Link href="/mypage" onClick={closeMenu}
                      className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all hover:ring-2"
                      style={{ background: '#FFD98A' }}
                      aria-label="マイページ">
                  {photoURL ? (
                    <Image src={photoURL} alt="プロフィール" width={32} height={32} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: '#5A3A1A' }}>{initial}</span>
                  )}
                </Link>
                {!isAdmin && (
                  <Link href="/sightings/new" onClick={closeMenu}
                        className="hidden sm:inline-flex items-center gap-1 font-bold text-xs px-4 py-2 rounded-full transition-all active:scale-95"
                        style={{ background: '#FFC96B', color: '#3D2400', boxShadow: '0 3px 10px rgba(255,201,107,0.4)' }}>
                    👁️ 目撃情報を投稿
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/auth/login"
                      className="hidden sm:block text-sm font-semibold transition-colors hover:opacity-70"
                      style={{ color: '#8B5E1A' }}>
                  ログイン
                </Link>
                <Link href="/auth/register"
                      className="inline-flex items-center font-bold text-xs px-4 py-2 rounded-full transition-all active:scale-95"
                      style={{ background: '#FFC96B', color: '#3D2400', boxShadow: '0 3px 10px rgba(255,201,107,0.4)' }}>
                  新規登録
                </Link>
              </>
            )}

            {/* ハンバーガー（管理者には非表示） */}
            {!isAdmin && (
              <button onClick={() => setMenuOpen((v) => !v)}
                      className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-[5px] ml-1 rounded-full transition-colors"
                      style={{ background: menuOpen ? '#FFD98A' : 'transparent' }}
                      aria-label="メニュー">
                <span className={`block w-4.5 h-0.5 rounded-full transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}
                      style={{ background: '#5A3A1A', width: '18px' }} />
                <span className={`block h-0.5 rounded-full transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`}
                      style={{ background: '#5A3A1A', width: '18px' }} />
                <span className={`block h-0.5 rounded-full transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}
                      style={{ background: '#5A3A1A', width: '18px' }} />
              </button>
            )}
          </div>
        </div>

        {/* モバイルメニュー（管理者には非表示） */}
        {menuOpen && !isAdmin && (
          <div style={{ borderTop: '1.5px solid #FFD98A', background: 'rgba(255,244,220,0.98)' }}>
            <nav className="px-4 py-3 space-y-0.5">
              {[
                { href: '/', label: '🏠 一覧' },
                { href: '/map', label: '🗺️ 地図で探す' },
                { href: '/sightings', label: '👁️ 目撃情報一覧' },
                { href: '/sightings/new', label: '👁️ 目撃情報を投稿（+2pt）' },
                { href: '/ranking', label: '🏆 貢献ランキング' },
                { href: '/rewards', label: '🎁 貢献特典を見る' },
                { href: '/posts/new?type=lost', label: '🔍 迷子を報告する' },
                { href: '/posts/new?type=found', label: '🤝 保護した子を報告（+10pt）' },
                ...(user ? [
                  { href: '/mypage', label: '👤 マイページ' },
                ] : [
                  { href: '/auth/login', label: '🔑 ログイン' },
                  { href: '/auth/register', label: '✨ 新規登録' },
                ]),
              ].map((item) => (
                <Link key={item.href} href={item.href} onClick={closeMenu}
                      className="flex items-center gap-2 px-3 py-3 rounded-2xl text-sm font-semibold transition-colors"
                      style={{ color: '#5A3A1A' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FFE0A0' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/10" onClick={closeMenu} />
      )}
    </>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'ANIMAL GO - みんなで迷子ペットを探そう',
  description:
    '迷子ペットをみんなで探す・協力者にもポイントが貯まるプラットフォーム。目撃情報や保護情報を投稿してペットと飼い主の再会を支援します。',
  keywords: '迷子ペット, 迷子犬, 迷子猫, ペット捜索, 目撃情報, 保護犬, 保護猫, ポイント',
  openGraph: {
    title: 'ANIMAL GO - みんなで迷子ペットを探そう',
    description: '迷子ペットをみんなで探す・協力者にもポイントが貯まるプラットフォーム',
    type: 'website',
    locale: 'ja_JP',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-[calc(100vh-56px)]">{children}</main>
          <footer className="py-8 mt-12" style={{ background: '#C46B00' }}>
            <div className="max-w-6xl mx-auto px-4 text-center">
              <p className="text-2xl mb-1">🐾</p>
              <p className="font-black text-white text-base mb-1">ANIMAL GO</p>
              <p className="text-xs" style={{ color: '#FFD98A' }}>みんなで迷子ペットを探し、協力者にもポイントが貯まるプラットフォーム</p>
              <p className="text-xs mt-4" style={{ color: '#E8A93A' }}>© 2025 ANIMAL GO</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}

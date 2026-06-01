import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'ペットレスキュー - 迷子のペットを探す・保護する',
  description:
    '迷子のペット情報を掲載・検索できるサービス。犬・猫・その他のペットの迷子情報を地図で確認できます。',
  keywords: '迷子ペット, 迷子犬, 迷子猫, ペット捜索, 保護犬, 保護猫',
  openGraph: {
    title: 'ペットレスキュー - 迷子のペットを探す・保護する',
    description: '迷子のペット情報を掲載・検索できるサービス',
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
              <p className="font-black text-white text-base mb-1">ペットレスキュー</p>
              <p className="text-xs" style={{ color: '#FFD98A' }}>迷子のペットを探す・保護するためのプラットフォーム</p>
              <p className="text-xs mt-4" style={{ color: '#E8A93A' }}>© 2025 ペットレスキュー</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}

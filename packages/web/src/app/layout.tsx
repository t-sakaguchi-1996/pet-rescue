import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'ペット救助 - 迷子のペットを探す・保護する',
  description:
    '迷子のペット情報を掲載・検索できるサービス。犬・猫・その他のペットの迷子情報を地図で確認できます。',
  keywords: '迷子ペット, 迷子犬, 迷子猫, ペット捜索, 保護犬, 保護猫',
  openGraph: {
    title: 'ペット救助 - 迷子のペットを探す・保護する',
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
      <body className={notoSansJP.className}>
        <AuthProvider>
          <Header />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <footer className="bg-gray-800 text-gray-300 py-8 mt-12">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <p className="font-bold text-white text-lg mb-1">ペット救助</p>
              <p className="text-sm">迷子のペットを探す・保護するためのプラットフォーム</p>
              <p className="text-xs mt-4 text-gray-500">© 2025 ペット救助</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}

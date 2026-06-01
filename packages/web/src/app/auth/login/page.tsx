'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/')
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🐾</div>
            <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
            <p className="text-gray-500 text-sm mt-1">
              アカウントにサインインしてください
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="example@email.com"
                required
              />
            </div>
            <div>
              <label className="label">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="パスワード"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            アカウントをお持ちでない方は{' '}
            <Link
              href="/auth/register"
              className="text-red-500 hover:text-red-600 font-medium"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLoadingState } from '@/contexts/LoadingContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const { startLoading, stopLoading } = useLoadingState()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で設定してください')
      return
    }
    setLoading(true)
    startLoading()
    try {
      await register(email, password, displayName)
      router.push('/')
    } catch {
      setError('登録に失敗しました。別のメールアドレスをお試しください')
    } finally {
      setLoading(false)
      stopLoading()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🐾</div>
            <h1 className="text-2xl font-bold text-gray-900">新規登録</h1>
            <p className="text-gray-500 text-sm mt-1">
              無料でアカウントを作成できます
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">ニックネーム</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="太郎"
                required
              />
            </div>
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
              <label className="label">パスワード（6文字以上）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="パスワード"
                required
              />
            </div>
            <div>
              <label className="label">パスワード（確認）</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="パスワードを再入力"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center"
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            すでにアカウントをお持ちの方は{' '}
            <Link
              href="/auth/login"
              className="text-red-500 hover:text-red-600 font-medium"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

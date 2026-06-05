'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import SightingForm from '@/components/SightingForm'
import type { PetSpecies } from '@pet-rescue/shared'

const VALID_SPECIES: PetSpecies[] = ['dog', 'cat', 'rabbit', 'bird', 'other']

function NewSightingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const speciesParam = searchParams.get('species') as PetSpecies | null
  const defaultSpecies = speciesParam && VALID_SPECIES.includes(speciesParam) ? speciesParam : undefined
  const sightingType = searchParams.get('type') === 'found' ? 'found' as const : 'sighting' as const
  const isFound = sightingType === 'found'

  const [submitted, setSubmitted] = useState(false)
  const [wasGuest, setWasGuest] = useState(false)

  const handleSuccess = (_sightingId: string, isGuest: boolean) => {
    router.refresh()
    setSubmitted(true)
    setWasGuest(isGuest)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/"
            className="inline-flex items-center text-sm mb-6 transition-colors hover:opacity-70"
            style={{ color: '#8B5E1A' }}>
        ← 一覧に戻る
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1.5px solid #FFE0A0' }}>
        {!submitted ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-black mb-1" style={{ color: '#3D2400' }}>
                {isFound ? '🤝 保護情報を投稿' : '👁️ 目撃情報を投稿'}
              </h1>
              <p className="text-sm" style={{ color: '#8B6340' }}>
                {isFound
                  ? '保護した動物の情報を投稿して、飼い主との再会をサポートしましょう。'
                  : '見かけたペットの情報を投稿して、飼い主の再会をサポートしましょう。'}
              </p>
              <div className="flex items-center gap-3 mt-3 p-3 rounded-2xl"
                   style={{ background: '#FFF3DC', border: '1px solid #FFD98A' }}>
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#7A4500' }}>
                    投稿すると +{isFound ? '10' : '2'}pt 獲得！{!isFound && '（1日最大10pt）'}
                  </p>
                  <p className="text-xs" style={{ color: '#A06830' }}>
                    会員登録なしでも投稿できます。後から登録してポイントを受け取ることも可能です。
                  </p>
                </div>
              </div>
            </div>

            <SightingForm onSuccess={handleSuccess} defaultSpecies={defaultSpecies} sightingType={sightingType} />
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-lg font-black mb-2" style={{ color: '#3D2400' }}>
              投稿ありがとうございます！
            </h2>
            <p className="text-sm mb-4" style={{ color: '#8B6340' }}>
              情報が飼い主さんに届きますように。
            </p>

            {wasGuest ? (
              <div className="mt-4 p-5 rounded-2xl text-left"
                   style={{ background: '#FFF3DC', border: '1.5px solid #FFD98A' }}>
                <p className="font-black text-base mb-2" style={{ color: '#7A4500' }}>
                  💡 会員登録でポイントをゲット！
                </p>
                <p className="text-sm mb-3" style={{ color: '#8B5E1A' }}>
                  この投稿をあなたのアカウントに紐づけると <strong>+{isFound ? '10' : '2'}pt</strong> 受け取れます。
                  登録時に同じメールアドレスを使うだけで自動的に紐づけられます。
                </p>
                <div className="space-y-2">
                  <Link href="/auth/register"
                        className="block w-full text-center font-bold text-sm px-4 py-3 rounded-full transition-all"
                        style={{ background: '#FFC96B', color: '#3D2400' }}>
                    今すぐ登録してポイントを受け取る
                  </Link>
                  <Link href="/"
                        className="block w-full text-center text-sm px-4 py-2 rounded-full"
                        style={{ color: '#8B5E1A', border: '1px solid #FFD98A' }}>
                    登録せずに一覧に戻る
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="inline-flex items-center gap-2 font-bold text-base px-5 py-2 rounded-full mb-4"
                     style={{ background: '#FFF3DC', color: '#C46B00', border: '1.5px solid #FFD98A' }}>
                  ⭐ +{isFound ? '10' : '2'}pt 獲得しました！
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={isFound ? '/sightings/new?type=found' : '/sightings/new'}
                        className="block text-center font-bold text-sm px-4 py-2.5 rounded-full"
                        style={{ background: '#FFC96B', color: '#3D2400' }}>
                    もう1件投稿する（+{isFound ? '10' : '2'}pt）
                  </Link>
                  <Link href="/"
                        className="block text-center text-sm px-4 py-2 rounded-full"
                        style={{ color: '#8B5E1A', border: '1px solid #FFD98A' }}>
                    一覧に戻る
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ポイントシステム説明 */}
      {!submitted && (
        <div className="mt-6 rounded-2xl p-5" style={{ background: '#FFFAED', border: '1px solid #FFE8A0' }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: '#7A4500' }}>
            ⭐ ポイントシステムについて
          </h3>
          <div className="space-y-2 text-xs" style={{ color: '#8B6340' }}>
            {isFound ? (
              <>
                <p>• 保護情報を投稿すると <strong>+10pt</strong></p>
                <p>• 迷子投稿にコメントして「最有力情報」に選ばれると <strong>+100pt</strong></p>
                <p>• 未登録での投稿も後から会員登録で紐づけ・ポイント受け取り可能</p>
              </>
            ) : (
              <>
                <p>• 目撃情報を投稿すると <strong>+2pt</strong>（1日最大10ptまで）</p>
                <p>• 迷子投稿にコメントして「最有力情報」に選ばれると <strong>+100pt</strong></p>
                <p>• 未登録での投稿も後から会員登録で紐づけ・ポイント受け取り可能</p>
                <p>• 同じメールアドレスで登録すると自動的に紐づけられます</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewSightingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    }>
      <NewSightingContent />
    </Suspense>
  )
}

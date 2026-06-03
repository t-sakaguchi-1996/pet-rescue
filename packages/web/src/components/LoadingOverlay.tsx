'use client'

import Image from 'next/image'
import { useLoadingState } from '@/contexts/LoadingContext'

export default function LoadingOverlay() {
  const { isLoading } = useLoadingState()
  if (!isLoading) return null

  return (
    <div
      className="loading-overlay"
      role="status"
      aria-busy="true"
      aria-label="読み込み中"
    >
      <div className="loading-content">
        <div className="loading-icon">
          <Image
            src="/icon_walk-neko.svg"
            alt="読み込み中"
            width={80}
            height={80}
            className="loading-neko"
            priority
          />
        </div>
        <p className="loading-text">Loading…</p>
      </div>
    </div>
  )
}

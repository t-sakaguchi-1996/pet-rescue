'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLoadingState } from '@/contexts/LoadingContext'

export default function NavigationLoadingWatcher() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { startLoading, stopLoading } = useLoadingState()
  const prevUrl = useRef(pathname + searchParams.toString())
  const isNavigating = useRef(false)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const url = pathname + searchParams.toString()
    if (url === prevUrl.current) return
    prevUrl.current = url

    if (isNavigating.current) {
      isNavigating.current = false
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
      stopLoading()
    }
  }, [pathname, searchParams, stopLoading])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute('href') ?? ''
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) return
      if (link.target === '_blank') return

      isNavigating.current = true
      startLoading()

      // 10秒でフォールバック解除
      fallbackTimer.current = setTimeout(() => {
        if (isNavigating.current) {
          isNavigating.current = false
          stopLoading()
        }
      }, 10000)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [startLoading, stopLoading])

  return null
}

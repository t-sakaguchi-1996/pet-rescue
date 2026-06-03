'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface LoadingContextValue {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
})

export function LoadingProvider({ children }: { children: ReactNode }) {
  const countRef = useRef(0)
  const [isLoading, setIsLoading] = useState(false)

  const startLoading = useCallback(() => {
    countRef.current += 1
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1)
    if (countRef.current === 0) setIsLoading(false)
  }, [])

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoadingState() {
  return useContext(LoadingContext)
}

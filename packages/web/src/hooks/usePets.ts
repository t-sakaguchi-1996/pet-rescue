'use client'

import { useState, useEffect } from 'react'
import { fetchPets, type PetFilter } from '@/lib/firestore'
import type { Pet } from '@pet-rescue/shared'

export function usePets(filter: PetFilter = {}) {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const filterKey = JSON.stringify(filter)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPets(filter)
      .then((data) => {
        if (!cancelled) {
          setPets(data)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  return { pets, loading, error, refetch: () => fetchPets(filter).then(setPets) }
}

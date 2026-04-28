'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface FavoritesContextType {
  favoriteSlugs: string[]
  toggleFavorite: (slug: string) => void
  loading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const STORAGE_KEY = 'todopolis_favorites'

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setFavoriteSlugs(parsed)
        }
      }
    } catch {
      // localStorage not available or invalid JSON — ignore
    } finally {
      setLoading(false)
    }
  }, [])

  // Persist to localStorage whenever favorites change (skip initial load)
  useEffect(() => {
    if (loading) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteSlugs))
    } catch {
      // ignore
    }
  }, [favoriteSlugs, loading])

  const toggleFavorite = (slug: string) => {
    setFavoriteSlugs(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    )
  }

  return (
    <FavoritesContext.Provider value={{ favoriteSlugs, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

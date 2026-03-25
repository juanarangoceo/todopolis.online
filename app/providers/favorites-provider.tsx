'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface FavoritesContextType {
  favoriteSlugs: string[]
  toggleFavorite: (slug: string) => Promise<void>
  loading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadFavorites() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('product_slug')
      
      if (!error && data) {
        setFavoriteSlugs(data.map(f => f.product_slug))
      }
      setLoading(false)
    }

    loadFavorites()

    // Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadFavorites()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const toggleFavorite = async (slug: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // If not logged in, redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    const isFavorited = favoriteSlugs.includes(slug)

    // Optimistic UI update
    if (isFavorited) {
      setFavoriteSlugs(prev => prev.filter(s => s !== slug))
      await supabase.from('favorites').delete().match({ user_id: user.id, product_slug: slug })
    } else {
      setFavoriteSlugs(prev => [...prev, slug])
      await supabase.from('favorites').insert({ user_id: user.id, product_slug: slug })
    }
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

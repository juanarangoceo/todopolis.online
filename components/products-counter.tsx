'use client'

import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'

interface ProductsCounterProps {
  variant?: 'desktop' | 'mobile-drawer'
  initialCount?: number
}

// Pequeño contador "vivo" — hace fetch al montar y refresca al recuperar foco
// (cambio de tab, lock/unlock móvil, vuelta de pestaña). El endpoint mismo está
// cacheado 60s con tag 'products', así que el costo real es mínimo.
export function ProductsCounter({ variant = 'desktop', initialCount = 0 }: ProductsCounterProps) {
  const [count, setCount] = useState<number>(initialCount)
  const [loaded, setLoaded] = useState<boolean>(initialCount > 0)

  useEffect(() => {
    let cancelled = false

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/products/count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && typeof data?.count === 'number') {
          setCount(data.count)
          setLoaded(true)
        }
      } catch {
        /* offline o intermitente: dejamos el valor previo */
      }
    }

    fetchCount()
    const onFocus = () => { fetchCount() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchCount()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (!loaded || count <= 0) return null

  if (variant === 'mobile-drawer') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-todopolis-blue/10 to-todopolis-lavender/15 border border-todopolis-lavender/30">
        <span className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-todopolis-lavender/30 shadow-sm">
          <Package className="w-4 h-4 text-todopolis-lavender-deep" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wider font-bold text-todopolis-lavender-deep">Catálogo</span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {count.toLocaleString('es-CO')} productos
          </span>
        </div>
        <span className="ml-auto relative flex items-center justify-center">
          <span className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-60" />
          <span className="relative w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        </span>
      </div>
    )
  }

  return (
    <div
      className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-todopolis-lavender/15 border border-todopolis-lavender/30"
      title="Productos disponibles en el catálogo"
    >
      <span className="relative flex items-center justify-center">
        <span className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping opacity-60" />
        <span className="relative w-1.5 h-1.5 bg-emerald-500 rounded-full" />
      </span>
      <span className="text-[11px] font-bold text-todopolis-lavender-deep tabular-nums leading-none">
        {count.toLocaleString('es-CO')}
      </span>
      <span className="text-[10px] font-semibold text-todopolis-lavender-deep/80 leading-none uppercase tracking-wider">
        productos
      </span>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { trackViewContent } from '@/lib/fbpixel'

interface Props {
  id: string
  name: string
  price?: number
  category?: string
}

// Dispara ViewContent una vez al montar la landing del producto.
export function TrackViewContent({ id, name, price, category }: Props) {
  useEffect(() => {
    trackViewContent({ id, name, price, category })
    // Solo al cambiar de producto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return null
}

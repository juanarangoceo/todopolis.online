'use client'

import { useEffect, useState } from 'react'
import { VoiceLucy } from './VoiceLucy'

interface VoiceProduct {
  slug: string
  name: string
  price: number
  image?: string | null
  shortDescription?: string | null
}

export function VoiceLucyMount({ product }: { product: VoiceProduct }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/voice-assistant-status?slug=${encodeURIComponent(product.slug)}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((data) => {
        if (!cancelled) setEnabled(Boolean(data?.enabled))
      })
      .catch(() => {
        if (!cancelled) setEnabled(false)
      })
    return () => {
      cancelled = true
    }
  }, [product.slug])

  if (!enabled) return null
  return <VoiceLucy product={product} />
}

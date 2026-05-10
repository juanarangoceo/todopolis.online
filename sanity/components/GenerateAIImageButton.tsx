'use client'

import { useState } from 'react'
import { useFormValue, useClient } from 'sanity'

export function GenerateAIImageButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const name = useFormValue(['name']) as string
  const heroTitle = useFormValue(['heroTitle']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const docId = useFormValue(['_id']) as string
  const images = useFormValue(['images']) as any[]
  const mastershopImageUrl = useFormValue(['mastershopImageUrl']) as string
  const aiLifestyleImage = useFormValue(['aiLifestyleImage']) as any

  useClient({ apiVersion: '2023-01-01' })

  const hasExistingImage = !!aiLifestyleImage?.asset?._ref

  // Prefer the first uploaded Sanity image, fall back to mastershop URL
  const imageRef = images?.[0]?.asset?._ref ?? null
  const hasProductImage = !!(imageRef || mastershopImageUrl)

  const handleGenerate = async () => {
    if (!name) {
      alert('Por favor completa el Nombre del producto antes de generar.')
      return
    }
    if (!docId) {
      alert('Guarda el documento primero antes de generar la imagen.')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/generate-ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          heroTitle,
          shortDescription,
          imageRef,
          mastershopImageUrl,
          docId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Error en la generación')
      }

      setStatus('success')
      setErrorMessage('')
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message ?? 'Error desconocido')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '16px',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      borderRadius: '8px',
      margin: '8px 0',
    }}>
      <p style={{ color: 'white', marginBottom: '6px', fontSize: '14px', fontWeight: 700 }}>
        🎨 Generar Imagen Lifestyle con IA
      </p>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '8px', fontSize: '13px', lineHeight: 1.5 }}>
        Genera una foto hiperrealista de una persona usando el producto. Usa la imagen del producto como referencia para replicarlo fielmente. Formato retrato 4:5.
      </p>

      {/* Data available indicator */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
          background: hasProductImage ? 'rgba(168,255,120,0.25)' : 'rgba(255,255,255,0.15)',
          color: hasProductImage ? '#a8ff78' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${hasProductImage ? '#a8ff78' : 'rgba(255,255,255,0.2)'}`,
        }}>
          {hasProductImage ? '✓ Imagen del producto' : '○ Sin imagen (modo texto)'}
        </span>
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
          background: heroTitle ? 'rgba(168,255,120,0.25)' : 'rgba(255,255,255,0.15)',
          color: heroTitle ? '#a8ff78' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${heroTitle ? '#a8ff78' : 'rgba(255,255,255,0.2)'}`,
        }}>
          {heroTitle ? '✓ Título hero' : '○ Sin título hero'}
        </span>
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
          background: shortDescription ? 'rgba(168,255,120,0.25)' : 'rgba(255,255,255,0.15)',
          color: shortDescription ? '#a8ff78' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${shortDescription ? '#a8ff78' : 'rgba(255,255,255,0.2)'}`,
        }}>
          {shortDescription ? '✓ Descripción' : '○ Sin descripción'}
        </span>
      </div>

      {hasExistingImage && status !== 'success' && (
        <p style={{ color: '#ffe6fa', marginBottom: '10px', fontSize: '12px' }}>
          ⚠️ Ya existe una imagen. Al generar se reemplazará, o carga una manualmente en el campo de abajo.
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          background: loading ? 'rgba(255,255,255,0.3)' : 'white',
          color: '#f5576c',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 24px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '⏳ Generando imagen (puede tardar ~30s)...' : '🖼️ Generar Imagen con IA'}
      </button>

      {status === 'success' && (
        <p style={{ color: '#a8ff78', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ✅ Imagen generada y guardada. Refresca la página para verla en el campo "Imagen Lifestyle IA" abajo.
        </p>
      )}
      {status === 'error' && (
        <p style={{ color: '#ffe8e8', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ❌ {errorMessage || 'Error al generar. Verifica tu OPENAI_API_KEY e intenta de nuevo.'}
        </p>
      )}
    </div>
  )
}

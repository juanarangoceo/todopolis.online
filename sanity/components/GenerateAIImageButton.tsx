'use client'

import { useState } from 'react'
import { useFormValue, useClient } from 'sanity'

export function GenerateAIImageButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const name = useFormValue(['name']) as string
  const category = useFormValue(['category']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const docId = useFormValue(['_id']) as string
  const aiLifestyleImage = useFormValue(['aiLifestyleImage']) as any

  useClient({ apiVersion: '2023-01-01' })

  const hasImage = !!aiLifestyleImage?.asset?._ref

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
        body: JSON.stringify({ name, category, shortDescription, docId }),
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
        🎨 Imagen Lifestyle con gpt-image-1
      </p>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '14px', fontSize: '13px', lineHeight: 1.5 }}>
        Genera automáticamente una imagen hiperrealista de una persona usando o mostrando el producto.
        Se guarda directamente en la galería de Sanity. Formato retrato 4:5 (1024×1536).
      </p>

      {hasImage && status !== 'success' && (
        <p style={{ color: '#ffe6fa', marginBottom: '10px', fontSize: '12px' }}>
          ✅ Ya existe una imagen generada. Al generar nueva, se reemplazará.
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
          ❌ {errorMessage || 'Error al generar. Verifica tu OPENAI_API_KEY (gpt-image-1) e intenta de nuevo.'}
        </p>
      )}
    </div>
  )
}

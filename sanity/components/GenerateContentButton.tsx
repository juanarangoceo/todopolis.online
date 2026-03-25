'use client'

import { useState } from 'react'
import { set, useFormValue, useClient } from 'sanity'

// This is a custom Sanity Studio input component that triggers AI content generation
export function GenerateContentButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Read current document values
  const name = useFormValue(['name']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const images = useFormValue(['images']) as any[]
  const docId = useFormValue(['_id']) as string
  const client = useClient({ apiVersion: '2023-01-01' })
  
  const firstImageRef = images && images.length > 0 ? images[0].asset?._ref : null

  const handleGenerate = async () => {
    if (!name || !shortDescription) {
      alert('Por favor completa el Nombre y la Descripción Breve antes de generar.')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/generate-product-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          shortDescription,
          imageAssetId: firstImageRef,
        }),
      })

      const generated = await response.json()

      if (!response.ok) {
        throw new Error(generated.error || 'Error en la generación')
      }

      if (!docId) {
        throw new Error('No se pudo determinar el ID del documento para guardar.')
      }

      // Add required _key property to array items for Sanity
      const mapWithKeys = (arr: any) => Array.isArray(arr) ? arr.map(item => ({ ...item, _key: crypto.randomUUID() })) : []

      const patchData = {
        shortDescription: generated.improvedDescription || shortDescription,
        heroTitle: generated.heroTitle,
        heroSubtitle: generated.heroSubtitle,
        heroCta: generated.heroCta,
        benefits: mapWithKeys(generated.benefits),
        specifications: mapWithKeys(generated.specifications),
        testimonials: mapWithKeys(generated.testimonials),
        ctaHeadline: generated.ctaHeadline,
        ctaText: generated.ctaText,
      }

      // Patch the document directly
      await client
        .patch(docId)
        .set(patchData)
        .commit()

      // Inform FormBuilder we are done (optional)
      props.onChange(set(null))

      setStatus('success')
      setErrorMessage('')
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || 'Error desconocido')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '8px',
      margin: '8px 0',
    }}>
      <p style={{ color: 'white', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
        🤖 Generación de Contenido con Gemini AI
      </p>
      <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px', fontSize: '13px' }}>
        Sube la imagen del producto y completa la Descripción Breve arriba, luego presiona el botón para generar automáticamente todo el contenido persuasivo de tu landing page.
      </p>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          background: loading ? 'rgba(255,255,255,0.3)' : 'white',
          color: '#764ba2',
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
        {loading ? '⏳ Generando contenido...' : '✨ Generar Landing Page con IA'}
      </button>
      {status === 'success' && (
        <p style={{ color: '#a8ff78', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ✅ Contenido generado. Revisa los campos del grupo "🚀 Landing Page" y guarda el documento.
        </p>
      )}
      {status === 'error' && (
        <p style={{ color: '#ff9a9e', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ❌ {errorMessage || 'Error al generar. Verifica tu GEMINI_API_KEY e intenta de nuevo.'}
        </p>
      )}
    </div>
  )
}

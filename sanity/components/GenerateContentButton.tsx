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
  const category = useFormValue(['category']) as string | undefined
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
          category,
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

      // Add required _key and _type properties to array items for Sanity
      const generateKey = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
      
      const mapArray = (arr: any, typeName: string) => 
        Array.isArray(arr) ? arr.map(item => {
          const processed = { ...item }
          if (typeName === 'testimonial' && processed.rating) {
            processed.rating = Number(processed.rating)
          }
          return {
            ...processed,
            _key: generateKey(),
            _type: typeName
          }
        }) : []

      const patchData: Record<string, any> = {
        shortDescription: generated.improvedDescription || shortDescription,
        heroTitle: generated.heroTitle,
        heroSubtitle: generated.heroSubtitle,
        heroCta: generated.heroCta,
        benefits: mapArray(generated.benefits, 'benefit'),
        specifications: mapArray(generated.specifications, 'specification'),
        testimonials: mapArray(generated.testimonials, 'testimonial'),
        ctaHeadline: generated.ctaHeadline,
        ctaText: generated.ctaText,
        faqs: mapArray(generated.faqs, 'faq'),
      }

      // Etiquetas (best-effort): la API devuelve referencias listas (_type/_ref/_key).
      // Solo las escribimos si el auto-tagging devolvió algo, para no borrar las
      // etiquetas existentes cuando la clasificación falla.
      if (Array.isArray(generated.tags) && generated.tags.length > 0) {
        patchData.tags = generated.tags
      }

      let draftId = docId
      if (!docId.startsWith('drafts.')) {
        draftId = `drafts.${docId}`
        // Asegurarnos de que el borrador exista copiando el documento publicado
        const publishedDoc = await client.getDocument(docId)
        if (publishedDoc) {
          await client.createIfNotExists({ ...publishedDoc, _id: draftId })
        }
      }

      // Patch the document directly
      await client
        .patch(draftId)
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
        Sube la imagen del producto y completa la Descripción Breve arriba, luego presiona el botón para generar automáticamente toda la landing page: hero, beneficios, especificaciones, testimonios, preguntas frecuentes y etiquetas — igual que al importar desde Mastershop.
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
          ✅ Contenido generado (incluye FAQs y etiquetas). Revisa los campos de "🚀 Landing Page" y "🏷️ Etiquetas" y guarda el documento.
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

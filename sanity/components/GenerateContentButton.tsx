'use client'

import { useState } from 'react'
import { set, useFormValue, useClient } from 'sanity'
import { ensureDraftId } from '../lib/draft'
import { slugifyProductName } from '../../lib/slugify'

// This is a custom Sanity Studio input component that triggers AI content generation
export function GenerateContentButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [summary, setSummary] = useState<string[]>([])

  // Read current document values
  const name = useFormValue(['name']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const category = useFormValue(['category']) as string | undefined
  const slug = useFormValue(['slug']) as { current?: string } | undefined
  const images = useFormValue(['images']) as any[]
  const mastershopImageUrl = useFormValue(['mastershopImageUrl']) as string | undefined
  const docId = useFormValue(['_id']) as string
  const client = useClient({ apiVersion: '2023-01-01' })

  // Las fotos son la mitad del input: la IA las mira para sacar material, color,
  // piezas incluidas y medidas legibles. La ruta se queda con las 3 primeras.
  const imageRefs: string[] = Array.isArray(images)
    ? images.map((img) => img?.asset?._ref).filter((ref: unknown): ref is string => typeof ref === 'string')
    : []

  const hasPhotos = imageRefs.length > 0 || !!mastershopImageUrl

  const handleGenerate = async () => {
    if (!name || !shortDescription) {
      alert('Por favor completa el Nombre y la Descripción Breve antes de generar.')
      return
    }

    setLoading(true)
    setStatus('idle')
    setSummary([])

    try {
      const response = await fetch('/api/generate-product-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          shortDescription,
          category,
          imageRefs,
          mastershopImageUrl,
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

      const cambios: string[] = []

      // Nombre estratégico: el import de Mastershop siempre lo aplicó y el botón
      // lo descartaba, así que el mismo producto quedaba peor creado a mano.
      const finalName: string = generated.improvedName || name
      if (generated.improvedName && generated.improvedName !== name) {
        patchData.name = generated.improvedName
        cambios.push(`Nombre → «${generated.improvedName}»`)
      }

      // El slug solo se rellena si está vacío. En un producto ya publicado la URL
      // no se toca aunque cambie el nombre: romperla pierde el tráfico que tenga.
      if (!slug?.current) {
        patchData.slug = { _type: 'slug', current: slugifyProductName(finalName) }
        cambios.push(`Slug → /producto/${slugifyProductName(finalName)}`)
      }

      // La categoría sugerida no pisa la que eligió el editor.
      if (!category && generated.suggestedCategory) {
        patchData.category = generated.suggestedCategory
        cambios.push(`Categoría → ${generated.suggestedCategory}`)
      }

      // Etiquetas (best-effort): la API devuelve referencias listas (_type/_ref/_key).
      // Solo las escribimos si el auto-tagging devolvió algo, para no borrar las
      // etiquetas existentes cuando la clasificación falla.
      if (Array.isArray(generated.tags) && generated.tags.length > 0) {
        patchData.tags = generated.tags
        cambios.push(`${generated.tags.length} etiquetas`)
      }

      const analizadas: number = generated.imagesAnalyzed ?? 0
      cambios.unshift(
        analizadas > 0
          ? `${analizadas} foto${analizadas > 1 ? 's' : ''} analizada${analizadas > 1 ? 's' : ''} por la IA`
          : 'Sin fotos: el copy salió solo del texto',
      )

      // Siempre se escribe sobre el BORRADOR, nunca sobre el publicado.
      const draftId = await ensureDraftId(client, docId)

      await client
        .patch(draftId)
        .set(patchData)
        .commit()

      // Inform FormBuilder we are done (optional)
      props.onChange(set(null))

      setSummary(cambios)
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
      <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '12px', fontSize: '13px' }}>
        Sube las fotos y completa la Descripción Breve arriba. La IA <strong>mira las fotos</strong> (material, color, piezas incluidas, medidas legibles) y con eso escribe toda la landing: nombre, hero, beneficios, especificaciones, testimonios, preguntas frecuentes, etiquetas y categoría.
      </p>

      {/* Qué tiene la IA para trabajar, antes de gastar la llamada */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {[
          {
            ok: hasPhotos,
            label: hasPhotos
              ? `✓ ${imageRefs.length || 1} foto${(imageRefs.length || 1) > 1 ? 's' : ''}`
              : '○ Sin fotos (la IA escribirá a ciegas)',
          },
          { ok: !!shortDescription, label: shortDescription ? '✓ Descripción' : '○ Sin descripción' },
          { ok: !!category, label: category ? `✓ Categoría: ${category}` : '○ La IA la sugerirá' },
        ].map(({ ok, label }) => (
          <span key={label} style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
            background: ok ? 'rgba(168,255,120,0.25)' : 'rgba(255,255,255,0.15)',
            color: ok ? '#a8ff78' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${ok ? '#a8ff78' : 'rgba(255,255,255,0.25)'}`,
          }}>{label}</span>
        ))}
      </div>

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
        <div style={{ marginTop: '12px' }}>
          <p style={{ color: '#a8ff78', fontSize: '13px', fontWeight: 600, margin: '0 0 6px' }}>
            ✅ Listo, en el borrador. Revísalo y dale Publish.
          </p>
          <ul style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', margin: 0, paddingLeft: '18px' }}>
            {summary.map((linea) => <li key={linea}>{linea}</li>)}
            <li>Landing completa en la pestaña «🚀 Landing Page»</li>
          </ul>
        </div>
      )}
      {status === 'error' && (
        <p style={{ color: '#ff9a9e', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ❌ {errorMessage || 'Error al generar. Verifica tu GEMINI_API_KEY e intenta de nuevo.'}
        </p>
      )}
    </div>
  )
}

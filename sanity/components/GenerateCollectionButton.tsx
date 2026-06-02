'use client'

import { useState } from 'react'
import { set, useFormValue, useClient } from 'sanity'

// Componente de input del Studio que dispara la generación IA de una Colección
// de Marca. Lee los productos referenciados, los resuelve vía GROQ y manda sus
// datos a /api/generate-collection-content; luego parchea el documento con el
// contenido generado. Mismo patrón que GenerateContentButton (producto).
export function GenerateCollectionButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const segmentHint = useFormValue(['segmentHint']) as string | undefined
  const products = useFormValue(['products']) as { _ref?: string }[] | undefined
  const docId = useFormValue(['_id']) as string
  const client = useClient({ apiVersion: '2023-01-01' })

  const handleGenerate = async () => {
    const refs = (products ?? []).map((p) => p?._ref).filter(Boolean) as string[]
    if (refs.length < 3) {
      alert('Elige al menos 3 productos antes de generar.')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      // Resolver los productos referenciados conservando el ORDEN del array.
      const resolved = await client.fetch(
        `*[_id in $ids]{ _id, name, shortDescription, price, category, specifications }`,
        { ids: refs }
      )
      const byId = new Map<string, any>(resolved.map((p: any) => [p._id, p]))
      const orderedProducts = refs
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((p: any) => ({
          name: p.name,
          shortDescription: p.shortDescription ?? '',
          price: p.price,
          category: p.category,
          specifications: Array.isArray(p.specifications) ? p.specifications : [],
        }))

      const response = await fetch('/api/generate-collection-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentHint, products: orderedProducts }),
      })

      const generated = await response.json()
      if (!response.ok) {
        throw new Error(generated.error || 'Error en la generación')
      }
      if (!docId) {
        throw new Error('No se pudo determinar el ID del documento para guardar.')
      }

      const generateKey = () => Math.random().toString(36).substring(2, 12) + Date.now().toString(36)

      const mapArray = (arr: any, typeName: string) =>
        Array.isArray(arr)
          ? arr.map((item) => {
              const processed = { ...item }
              // Los valores de la tabla comparativa son un array de strings: no
              // necesitan _key (los strings primitivos no lo llevan).
              return { ...processed, _key: generateKey(), _type: typeName }
            })
          : []

      const patchData = {
        heroEyebrow: generated.heroEyebrow,
        heroTitle: generated.heroTitle,
        heroSubtitle: generated.heroSubtitle,
        heroCta: generated.heroCta,
        brandIntro: generated.brandIntro,
        segmentBenefits: mapArray(generated.segmentBenefits, 'segmentBenefit'),
        buyersGuide: mapArray(generated.buyersGuide, 'guideItem'),
        comparisonRows: mapArray(generated.comparisonRows, 'comparisonRow'),
        faqs: mapArray(generated.faqs, 'faq'),
        ctaHeadline: generated.ctaHeadline,
        ctaText: generated.ctaText,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
      }

      let draftId = docId
      if (!docId.startsWith('drafts.')) {
        draftId = `drafts.${docId}`
        const publishedDoc = await client.getDocument(docId)
        if (publishedDoc) {
          await client.createIfNotExists({ ...publishedDoc, _id: draftId })
        }
      }

      await client.patch(draftId).set(patchData).commit()

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
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
        borderRadius: '8px',
        margin: '8px 0',
      }}
    >
      <p style={{ color: 'white', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
        🛍️ Generación de Colección con Gemini AI
      </p>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '16px', fontSize: '13px' }}>
        Elige entre 3 y 6 productos del mismo segmento arriba (y opcionalmente la pista de segmento),
        luego presiona el botón para generar la landing de marca completa: hero, guía de compra, tabla
        comparativa y preguntas frecuentes.
      </p>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          background: loading ? 'rgba(255,255,255,0.3)' : 'white',
          color: '#4338ca',
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
        {loading ? '⏳ Generando colección...' : '✨ Generar Landing de Colección con IA'}
      </button>
      {status === 'success' && (
        <p style={{ color: '#a8ff78', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ✅ Contenido generado. Revisa los campos del grupo "🚀 Contenido IA" y guarda el documento.
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

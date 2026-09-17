'use client'

import { useState } from 'react'
import { useFormValue } from 'sanity'

// Botón del Studio para generar el artículo de blog de un producto.
//
// Existe porque el blog era la última diferencia real entre crear un producto a
// mano y importarlo de Mastershop: `generateAndSaveArticle` solo lo llamaba el
// import, así que los 185 productos creados en el Studio se quedaron sin
// artículo. Y sin artículo, la ficha no pinta el enlace "Leer artículo →" que
// abre la ventana emergente — el bloque simplemente no aparece.
//
// Llama a `/api/generate-article`, que ya existía para el panel de Mastershop.
// Es idempotente: si el producto ya tiene artículo devuelve el que hay en vez
// de crear un duplicado.

export function GenerateArticleButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'existing' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const docId = useFormValue(['_id']) as string | undefined
  const name = useFormValue(['name']) as string | undefined
  const slug = useFormValue(['slug']) as { current?: string } | undefined

  // El artículo apunta al documento PUBLICADO: `relatedProduct._ref` tiene que
  // resolver desde la web, y la web no ve borradores.
  const publishedId = docId?.replace(/^drafts\./, '')

  const handleGenerate = async () => {
    if (!publishedId || !name) {
      alert('Completa el nombre del producto antes de generar el artículo.')
      return
    }
    if (!slug?.current) {
      alert('El producto necesita slug. Genera primero el contenido con IA o escríbelo a mano.')
      return
    }

    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sanityId: publishedId }),
      })
      const data = await res.json()

      if (!res.ok) {
        // El caso frecuente: el producto todavía no está publicado, así que la
        // consulta por id publicado no encuentra nada.
        if (res.status === 404) {
          throw new Error('Publica el producto primero. El artículo tiene que apuntar a la versión publicada, no al borrador.')
        }
        throw new Error(data.error || 'Error generando el artículo')
      }

      setMessage(data.articleSlug ?? '')
      setStatus(data.alreadyExists ? 'existing' : 'ok')
    } catch (err: any) {
      setMessage(err.message || 'Error desconocido')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '16px',
      background: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
      borderRadius: '8px',
      margin: '8px 0',
    }}>
      <p style={{ color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>
        📝 Generar Artículo de Blog
      </p>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '14px', fontSize: '13px', lineHeight: 1.5 }}>
        Escribe un artículo de blog atado a este producto. Es lo que hace aparecer el enlace
        «Leer artículo →» en la ficha, que abre el artículo en ventana emergente sin sacar al
        comprador de la página. El producto debe estar <strong>publicado</strong>.
      </p>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          background: loading ? 'rgba(255,255,255,0.3)' : 'white',
          color: '#0b7a48',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 24px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading ? '⏳ Escribiendo el artículo...' : '✍️ Generar artículo del blog'}
      </button>

      {status === 'ok' && (
        <p style={{ color: '#d5ffe8', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ✅ Artículo creado: /blog/{message} — ya aparece en la ficha del producto.
        </p>
      )}
      {status === 'existing' && (
        <p style={{ color: '#d5ffe8', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ℹ️ Este producto ya tenía artículo: /blog/{message}
        </p>
      )}
      {status === 'error' && (
        <p style={{ color: '#ffe0e0', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ❌ {message}
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { set, useFormValue, useClient } from 'sanity'

type Status = 'idle' | 'generating' | 'preview' | 'confirming' | 'confirmed' | 'error'

export function GenerateAIImageButton(props: any) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null)

  const name = useFormValue(['name']) as string
  const heroTitle = useFormValue(['heroTitle']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const docId = useFormValue(['_id']) as string
  const images = useFormValue(['images']) as any[]
  const mastershopImageUrl = useFormValue(['mastershopImageUrl']) as string
  const aiLifestyleImage = useFormValue(['aiLifestyleImage']) as any

  const client = useClient({ apiVersion: '2025-01-01' })

  const hasExistingImage = !!aiLifestyleImage?.asset?._ref
  const imageRef = images?.[0]?.asset?._ref ?? null
  const hasProductImage = !!(imageRef || mastershopImageUrl)

  const handleGenerate = async () => {
    if (!name) { alert('Por favor completa el Nombre del producto antes de generar.'); return }
    if (!docId) { alert('Guarda el documento primero antes de generar la imagen.'); return }

    setStatus('generating')
    setPreviewUrl(null)
    setPreviewAssetId(null)
    setErrorMessage('')

    try {
      const res = await fetch('/api/generate-ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, heroTitle, shortDescription, imageRef, mastershopImageUrl, docId }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Error en la generación')

      setPreviewUrl(result.assetUrl)
      setPreviewAssetId(result.assetId)
      setStatus('preview')
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Error desconocido')
      setStatus('error')
    }
  }

  const handleConfirm = async () => {
    if (!previewAssetId || !docId) return
    setStatus('confirming')

    try {
      let draftId = docId
      if (!docId.startsWith('drafts.')) {
        draftId = `drafts.${docId}`
        // Asegurarnos de que el borrador exista, copiando el doc publicado
        const publishedDoc = await client.getDocument(docId)
        if (publishedDoc) {
          await client.createIfNotExists({ ...publishedDoc, _id: draftId })
        }
      }

      await client
        .patch(draftId)
        .set({
          aiLifestyleImage: {
            _type: 'image',
            asset: { _type: 'reference', _ref: previewAssetId },
          },
        })
        .commit()

      props.onChange(set(null))
      setStatus('confirmed')
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Error al confirmar')
      setStatus('error')
    }
  }

  const handleDiscard = () => {
    setPreviewUrl(null)
    setPreviewAssetId(null)
    setStatus('idle')
  }

  const gradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'

  return (
    <div style={{ padding: '16px', background: gradient, borderRadius: '8px', margin: '8px 0' }}>
      <p style={{ color: 'white', marginBottom: '6px', fontSize: '14px', fontWeight: 700 }}>
        🎨 Generar Imagen Lifestyle con IA
      </p>

      {/* Estado: idle o error — mostrar botón de generación */}
      {(status === 'idle' || status === 'error') && (
        <>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '8px', fontSize: '13px', lineHeight: 1.5 }}>
            Genera una foto hiperrealista de una persona usando el producto. Usa la imagen como referencia visual. Formato 4:5.
          </p>

          {/* Indicadores de datos disponibles */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[
              { ok: hasProductImage, label: hasProductImage ? '✓ Imagen del producto' : '○ Sin imagen (solo texto)' },
              { ok: !!heroTitle, label: heroTitle ? '✓ Título hero' : '○ Sin título hero' },
              { ok: !!shortDescription, label: shortDescription ? '✓ Descripción' : '○ Sin descripción' },
            ].map(({ ok, label }) => (
              <span key={label} style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                background: ok ? 'rgba(168,255,120,0.25)' : 'rgba(255,255,255,0.15)',
                color: ok ? '#a8ff78' : 'rgba(255,255,255,0.55)',
                border: `1px solid ${ok ? '#a8ff78' : 'rgba(255,255,255,0.2)'}`,
              }}>{label}</span>
            ))}
          </div>

          {hasExistingImage && (
            <p style={{ color: '#ffe6fa', marginBottom: '10px', fontSize: '12px' }}>
              ⚠️ Ya existe una imagen publicada. Puedes regenerar o cargarla manualmente en el campo de abajo.
            </p>
          )}

          <button onClick={handleGenerate} style={btnStyle('#f5576c')}>
            🖼️ Generar Imagen con IA
          </button>

          {status === 'error' && (
            <p style={{ color: '#ffe8e8', marginTop: '10px', fontSize: '13px', fontWeight: 600 }}>
              ❌ {errorMessage}
            </p>
          )}
        </>
      )}

      {/* Estado: generando */}
      {status === 'generating' && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <p style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
            ⏳ Generando imagen con IA...
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>
            Puede tardar entre 20 y 40 segundos
          </p>
        </div>
      )}

      {/* Estado: preview — mostrar imagen generada con acciones */}
      {(status === 'preview' || status === 'confirming') && previewUrl && (
        <>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '10px', fontSize: '13px' }}>
            ¿Te gusta esta imagen? Confírmala para publicarla en la landing page.
          </p>

          {/* Preview de la imagen */}
          <div style={{
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '12px',
            border: '2px solid rgba(255,255,255,0.4)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview imagen generada"
              style={{ width: '100%', display: 'block' }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleConfirm}
              disabled={status === 'confirming'}
              style={{
                ...btnStyle('#22c55e'),
                flex: 1,
                background: status === 'confirming' ? 'rgba(34,197,94,0.5)' : '#22c55e',
              }}
            >
              {status === 'confirming' ? '⏳ Guardando...' : '✅ Confirmar y guardar borrador'}
            </button>

            <button
              onClick={handleGenerate}
              disabled={status === 'confirming'}
              style={{ ...btnStyle('rgba(255,255,255,0.2)'), flex: 1, color: 'white' }}
            >
              🔄 Regenerar
            </button>

            <button
              onClick={handleDiscard}
              disabled={status === 'confirming'}
              style={{ ...btnStyle('rgba(255,255,255,0.15)'), flex: 0, padding: '10px 14px', color: 'white' }}
            >
              ✕
            </button>
          </div>
        </>
      )}

      {/* Estado: confirmado */}
      {status === 'confirmed' && (
        <div>
          <p style={{ color: '#a8ff78', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
            ✅ Imagen guardada en el campo "Imagen Lifestyle IA" abajo.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '12px' }}>
            Guarda y publica el documento para que aparezca en la landing page.
          </p>
          <button onClick={handleDiscard} style={{ ...btnStyle('rgba(255,255,255,0.25)'), color: 'white' }}>
            🔄 Generar otra imagen
          </button>
        </div>
      )}
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: bg.startsWith('rgba') ? 'white' : 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.2s',
  }
}

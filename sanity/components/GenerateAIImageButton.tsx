'use client'

import { useState } from 'react'
import { useFormValue, useClient } from 'sanity'
import { ensureDraftId } from '../lib/draft'

type Status = 'idle' | 'generating' | 'preview' | 'confirming' | 'confirmed' | 'error'
type Target = 'main' | 'gallery'

// Mismas claves que SCENES en app/api/generate-ai-image/route.ts. La galería
// lifestyle pide fotos que cuenten cosas distintas: sin escena, cinco
// generaciones seguidas salen cinco versiones del mismo retrato.
const SCENE_OPTIONS = [
  { value: '', label: 'Libre (la de siempre)' },
  { value: 'uso', label: 'En uso, en plena acción' },
  { value: 'detalle', label: 'Detalle en las manos' },
  { value: 'ambiente', label: 'Ambientada, sin persona' },
  { value: 'momento', label: 'Momento compartido' },
  { value: 'exterior', label: 'Al aire libre' },
]

function randomKey() {
  return Math.random().toString(36).slice(2, 12)
}

export function GenerateAIImageButton(props: any) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null)
  const [scene, setScene] = useState('')
  const [savedTo, setSavedTo] = useState<Target>('main')

  const name = useFormValue(['name']) as string
  const heroTitle = useFormValue(['heroTitle']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const docId = useFormValue(['_id']) as string
  const images = useFormValue(['images']) as any[]
  const mastershopImageUrl = useFormValue(['mastershopImageUrl']) as string
  const aiLifestyleImage = useFormValue(['aiLifestyleImage']) as any
  const gallery = useFormValue(['aiLifestyleGallery']) as any[] | undefined

  const client = useClient({ apiVersion: '2025-01-01' })

  const hasExistingImage = !!aiLifestyleImage?.asset?._ref
  const galleryCount = gallery?.length ?? 0
  const imageRef = images?.[0]?.asset?._ref ?? null
  // Hasta 3 fotos de referencia: con una sola, el modelo inventa lo que no se
  // ve desde ese ángulo.
  const imageRefs = (images ?? []).map((i) => i?.asset?._ref).filter(Boolean).slice(0, 3)
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
        body: JSON.stringify({ name, heroTitle, shortDescription, imageRef, imageRefs, mastershopImageUrl, docId, scene: scene || undefined }),
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

  // `main` reemplaza la imagen principal (la que también usan los carriles del
  // home); `gallery` la AÑADE al final del carrusel de la landing.
  const handleConfirm = async (target: Target) => {
    if (!previewAssetId || !docId) return
    setStatus('confirming')

    try {
      // El botón promete "guardar borrador" — hay que escribir en el borrador.
      // Parchear el id publicado publicaba la imagen sin pasar por Publish.
      const draftId = await ensureDraftId(client, docId)
      const image = {
        _type: 'image',
        asset: { _type: 'reference', _ref: previewAssetId },
      }
      if (target === 'main') {
        await client.patch(draftId).set({ aiLifestyleImage: image }).commit()
      } else {
        await client
          .patch(draftId)
          .setIfMissing({ aiLifestyleGallery: [] })
          .append('aiLifestyleGallery', [{ ...image, _key: randomKey() }])
          .commit()
      }
      setSavedTo(target)
      setStatus('confirmed')
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Error al guardar imagen')
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
            Genera fotos hiperrealistas del producto en uso, con la foto del producto como referencia. Cambia la escena en cada una para armar una galería variada.
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
              Ya hay imagen principal{galleryCount > 0 ? ` y ${galleryCount} en la galería` : ''}. Lo que generes ahora lo puedes añadir a la galería o usarlo como principal. También puedes subir fotos directamente en «Galería lifestyle» (pestaña Landing).
            </p>
          )}

          <label style={{ display: 'block', color: 'white', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            Escena
          </label>
          <select
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            style={{
              width: '100%', marginBottom: '10px', padding: '8px 10px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.95)',
              color: '#2D2D2D', fontSize: '13px', fontWeight: 600,
            }}
          >
            {SCENE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

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
            ¿Te gusta? Elige dónde guardarla (queda en el borrador hasta que publiques).
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

          {/* Botones de acción. Sin imagen principal todavía, la primera
              va ahí: una galería sin portada no se pinta. */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {hasExistingImage && (
              <button
                onClick={() => handleConfirm('gallery')}
                disabled={status === 'confirming'}
                style={{ ...btnStyle('#22c55e'), flex: '1 1 100%', opacity: status === 'confirming' ? 0.6 : 1 }}
              >
                ➕ Añadir a la galería
              </button>
            )}
            <button
              onClick={() => handleConfirm('main')}
              disabled={status === 'confirming'}
              style={{
                ...btnStyle(hasExistingImage ? 'rgba(255,255,255,0.25)' : '#22c55e'),
                flex: 1,
                opacity: status === 'confirming' ? 0.6 : 1,
              }}
            >
              {hasExistingImage ? '⭐ Usar como principal' : '✅ Guardar como principal'}
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
            {savedTo === 'gallery'
              ? '✅ Añadida al final de la "Galería lifestyle" (pestaña Landing).'
              : '✅ Guardada como imagen principal ("Imagen Lifestyle IA", pestaña Landing).'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '12px' }}>
            Guarda y publica el documento para que aparezca en la landing page.
          </p>
          <button onClick={handleDiscard} style={{ ...btnStyle('rgba(255,255,255,0.25)'), color: 'white' }}>
            ➕ Generar otra para la galería
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

'use client'

import { useState } from 'react'
import { useFormValue, useClient } from 'sanity'
import { ensureDraftId } from '../lib/draft'

// «🤖 Completar Destacado con IA».
//
// Marcar un producto como Destacado activaba la landing de campaña, pero todos
// sus bloques extra eran manuales: la mayoría de Destacados salía a pautar
// con la mitad vacía. Este botón llena LO QUE FALTA —nunca pisa lo que el
// editor escribió—:
//
//   1. Texto (una llamada a /api/generate-destacado-content): titular de
//      campaña, historia, pasos de uso y lista de la caja.
//   2. Opcional: 3 fotos lifestyle con escenas distintas (una llamada a
//      /api/generate-ai-image por foto, en serie para no pasar el límite de
//      60 s por request). La primera va de principal si no hay; el resto a la
//      galería.
//
// Todo se escribe en el BORRADOR (`ensureDraftId`): el editor revisa y publica.

const GALLERY_SCENES = [
  { scene: 'uso', label: 'En uso' },
  { scene: 'detalle', label: 'Detalle en las manos' },
  { scene: 'momento', label: 'Momento compartido' },
]

type Step = { label: string; state: 'pending' | 'running' | 'done' | 'skipped' | 'error'; note?: string }

const key = () => Math.random().toString(36).slice(2, 12)

export function CompleteDestacadoButton() {
  const client = useClient({ apiVersion: '2025-01-01' })
  const docId = useFormValue(['_id']) as string
  const name = useFormValue(['name']) as string
  const shortDescription = useFormValue(['shortDescription']) as string
  const heroTitle = useFormValue(['heroTitle']) as string
  const specifications = useFormValue(['specifications']) as any[]
  const benefits = useFormValue(['benefits']) as any[]
  const images = useFormValue(['images']) as any[]
  const mastershopImageUrl = useFormValue(['mastershopImageUrl']) as string
  const isVip = useFormValue(['isVip']) as boolean
  const headline = useFormValue(['destacadoHeadline']) as string
  const story = useFormValue(['vipStory']) as any
  const steps = useFormValue(['vipSteps']) as any[]
  const box = useFormValue(['vipBoxContents']) as any
  const mainImage = useFormValue(['aiLifestyleImage']) as any
  const gallery = useFormValue(['aiLifestyleGallery']) as any[]

  const needs = {
    headline: !headline?.trim(),
    story: !story?.problemTitle,
    steps: !(steps?.length > 0),
    box: !(box?.items?.length > 0),
  }
  const textNeeded = Object.values(needs).some(Boolean)
  const photoCount = (mainImage?.asset?._ref ? 1 : 0) + (gallery?.length ?? 0)
  const [withPhotos, setWithPhotos] = useState(photoCount < 4)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<Step[]>([])
  const [error, setError] = useState('')

  const imageRefs = (images ?? []).map((i) => i?.asset?._ref).filter(Boolean).slice(0, 3)

  const update = (i: number, patch: Partial<Step>) =>
    setLog((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const run = async () => {
    if (!name || !docId) { setError('Guarda el producto (con nombre) antes de completar.'); return }
    setError('')
    setRunning(true)
    const plan: Step[] = [
      { label: textNeeded ? 'Titular, historia, pasos y caja' : 'Texto (ya estaba completo)', state: textNeeded ? 'pending' : 'skipped' },
      ...(withPhotos ? GALLERY_SCENES.map((s) => ({ label: `Foto: ${s.label}`, state: 'pending' as const })) : []),
    ]
    setLog(plan)

    try {
      const draftId = await ensureDraftId(client, docId)

      // ── 1. Texto ──────────────────────────────────────────────────────────
      if (textNeeded) {
        update(0, { state: 'running' })
        const res = await fetch('/api/generate-destacado-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, shortDescription, heroTitle, specifications, benefits, imageRefs, mastershopImageUrl, needs }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error generando el texto')

        const set: Record<string, unknown> = {}
        const filled: string[] = []
        if (data.headline) { set.destacadoHeadline = data.headline; filled.push('titular') }
        if (data.story) { set.vipStory = data.story; filled.push('historia') }
        if (data.steps) {
          set.vipSteps = data.steps.map((s: any) => ({ _type: 'step', _key: key(), title: s.title, description: s.description }))
          filled.push(`${data.steps.length} pasos`)
        }
        if (data.box) {
          // La foto del kit, si el editor ya la subió, se conserva.
          set.vipBoxContents = { ...(box ?? {}), title: box?.title || data.box.title, intro: box?.intro || data.box.intro, items: data.box.items }
          filled.push('caja')
        }
        if (Object.keys(set).length) await client.patch(draftId).set(set).commit()
        update(0, { state: 'done', note: filled.length ? filled.join(', ') : 'nada utilizable, revisa el producto' })
      }

      // ── 2. Fotos ─────────────────────────────────────────────────────────
      let hasMain = !!mainImage?.asset?._ref
      for (let i = 0; i < (withPhotos ? GALLERY_SCENES.length : 0); i++) {
        const idx = i + 1
        update(idx, { state: 'running' })
        try {
          const res = await fetch('/api/generate-ai-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, heroTitle, shortDescription, imageRefs, mastershopImageUrl, docId, scene: GALLERY_SCENES[i].scene }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Error generando la foto')
          const image = { _type: 'image', asset: { _type: 'reference', _ref: data.assetId } }
          if (!hasMain) {
            await client.patch(draftId).set({ aiLifestyleImage: image }).commit()
            hasMain = true
            update(idx, { state: 'done', note: 'guardada como principal' })
          } else {
            await client.patch(draftId).setIfMissing({ aiLifestyleGallery: [] })
              .append('aiLifestyleGallery', [{ ...image, _key: key() }]).commit()
            update(idx, { state: 'done', note: 'añadida a la galería' })
          }
        } catch (err: any) {
          // Una foto que falla no tumba las demás.
          update(idx, { state: 'error', note: err?.message ?? 'error' })
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Error desconocido')
      setLog((prev) => prev.map((s) => (s.state === 'running' ? { ...s, state: 'error' } : s)))
    } finally {
      setRunning(false)
    }
  }

  const icon: Record<Step['state'], string> = { pending: '○', running: '⏳', done: '✅', skipped: '—', error: '❌' }

  return (
    <div style={{ padding: 16, borderRadius: 8, margin: '8px 0', background: 'linear-gradient(135deg, #1E5A9C 0%, #6B3F8A 100%)', color: 'white' }}>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🤖 Completar Destacado con IA</p>
      <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9, marginBottom: 10 }}>
        Llena solo lo que está vacío y lo deja en el borrador para que lo revises antes de publicar.
      </p>
      {!isVip && (
        <p style={{ fontSize: 12, marginBottom: 10, color: '#ffe6a8' }}>
          ⚠️ El producto aún no está marcado como Destacado. Puedes completarlo igual; se verá cuando actives el interruptor.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {[
          ['Titular', !needs.headline],
          ['Historia', !needs.story],
          ['Pasos', !needs.steps],
          ['Caja', !needs.box],
          [`Fotos (${photoCount})`, photoCount >= 4],
        ].map(([label, ok]) => (
          <span key={String(label)} style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 99,
            background: ok ? 'rgba(168,255,120,0.2)' : 'rgba(255,255,255,0.12)',
            border: `1px solid ${ok ? '#a8ff78' : 'rgba(255,255,255,0.3)'}`,
          }}>{ok ? '✓' : '○'} {String(label)}</span>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} disabled={running} />
        Generar también 3 fotos para la galería (≈1-2 min, usa OpenAI)
      </label>

      <button
        type="button"
        onClick={run}
        disabled={running || (!textNeeded && !withPhotos)}
        style={{
          width: '100%', padding: '10px 16px', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13,
          cursor: running ? 'wait' : 'pointer', background: running ? 'rgba(255,255,255,0.3)' : '#ffffff', color: '#1E5A9C',
        }}
      >
        {running ? 'Trabajando…' : !textNeeded && !withPhotos ? 'Todo completo' : 'Completar lo que falta'}
      </button>

      {log.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', fontSize: 13, lineHeight: 1.7 }}>
          {log.map((s, i) => (
            <li key={i}>{icon[s.state]} {s.label}{s.note ? ` — ${s.note}` : ''}</li>
          ))}
        </ul>
      )}
      {!running && log.length > 0 && !error && (
        <p style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>Revisa los campos de la pestaña Destacados y Landing, y publica.</p>
      )}
      {error && <p style={{ fontSize: 13, marginTop: 10, color: '#ffd1d1', fontWeight: 600 }}>❌ {error}</p>}
    </div>
  )
}

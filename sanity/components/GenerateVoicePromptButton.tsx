'use client'

import { useState } from 'react'
import { set, useFormValue, useClient } from 'sanity'

export function GenerateVoicePromptButton(props: any) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const productRef = useFormValue(['product']) as { _ref?: string } | undefined
  const docId = useFormValue(['_id']) as string | undefined
  const client = useClient({ apiVersion: '2023-01-01' })

  const handleGenerate = async () => {
    if (!productRef?._ref) {
      alert('Primero elige el producto al que se anclará la llamada.')
      return
    }
    if (!docId) {
      alert('Guarda el documento al menos una vez antes de generar el prompt.')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      const res = await fetch('/api/generate-voice-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productRef._ref }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error generando el prompt')
      if (!data.prompt) throw new Error('El modelo no devolvió texto.')

      let draftId = docId
      if (!docId.startsWith('drafts.')) {
        draftId = `drafts.${docId}`
        const publishedDoc = await client.getDocument(docId)
        if (publishedDoc) {
          await client.createIfNotExists({ ...publishedDoc, _id: draftId })
        }
      }

      await client.patch(draftId).set({ prompt: data.prompt }).commit()

      props.onChange(set(null))
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
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: '8px',
        margin: '8px 0',
      }}
    >
      <p style={{ color: 'white', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
        🎙️ Generar Prompt para Lucy con Gemini
      </p>
      <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '16px', fontSize: '13px' }}>
        Elige el producto arriba y guarda. Gemini leerá toda la ficha (descripción, beneficios, FAQs, precio, oferta) y escribirá el guion completo para Lucy. Lo encontrarás abajo en el campo "Prompt de Lucy" — puedes editarlo antes de publicar.
      </p>
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
        {loading ? '⏳ Generando guion...' : '✨ Generar guion de Lucy'}
      </button>
      {status === 'success' && (
        <p style={{ color: '#a8ff78', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ✅ Prompt generado. Revísalo abajo y publica para activar la llamada.
        </p>
      )}
      {status === 'error' && (
        <p style={{ color: '#fff3a0', marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>
          ❌ {errorMessage || 'Error generando. Verifica GEMINI_API_KEY e intenta de nuevo.'}
        </p>
      )}
    </div>
  )
}

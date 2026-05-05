'use client'

import { useRef, useState } from 'react'
import { useClient, useFormValue } from 'sanity'

export function MultiImageUploader(props: any) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const docId = useFormValue(['_id']) as string | undefined
  const images = useFormValue(['images']) as any[] | undefined
  const client = useClient({ apiVersion: '2025-01-01' })

  const handleFiles = async (files: FileList) => {
    if (!files.length) return
    if (!docId) {
      alert('Guarda el documento primero (clic en "Publish" o "Save draft") para habilitar la carga múltiple.')
      return
    }

    const fileArray = Array.from(files)
    setUploading(true)
    setError('')
    setProgress({ done: 0, total: fileArray.length })

    try {
      // Upload all images in parallel to Sanity asset store
      const newItems = await Promise.all(
        fileArray.map(async (file) => {
          const asset = await client.assets.upload('image', file, { filename: file.name })
          setProgress(p => ({ ...p, done: p.done + 1 }))
          return {
            _type: 'image',
            _key: crypto.randomUUID(),
            asset: { _type: 'reference', _ref: asset._id },
          }
        })
      )

      // Append to existing images keeping any already uploaded
      const existing = Array.isArray(images) ? images : []
      await client
        .patch(docId)
        .set({ images: [...existing, ...newItems] })
        .commit()

    } catch (err: any) {
      console.error('Multi-upload error:', err)
      setError(err?.message ?? 'Error al subir las imágenes.')
    } finally {
      setUploading(false)
      setProgress({ done: 0, total: 0 })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const documentSaved = !!docId

  return (
    <div>
      {/* Standard Sanity array input — fully preserved */}
      {props.renderDefault(props)}

      {/* Multi-upload zone */}
      <div
        style={{
          marginTop: 10,
          padding: '12px 14px',
          borderRadius: 8,
          background: '#f0f4ff',
          border: '1px dashed #6b8cff',
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !documentSaved}
          style={{
            display: 'block',
            width: '100%',
            padding: '9px 0',
            borderRadius: 6,
            border: 'none',
            background: uploading ? '#a5b4fc' : '#4f46e5',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            cursor: uploading || !documentSaved ? 'not-allowed' : 'pointer',
            letterSpacing: 0.3,
          }}
        >
          {uploading
            ? `⏳ Subiendo ${progress.done} de ${progress.total}...`
            : '📤 Subir varias imágenes a la vez'}
        </button>

        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
          {documentSaved
            ? 'También puedes arrastrar y soltar imágenes aquí'
            : '⚠️ Guarda el documento primero para habilitar esta función'}
        </p>

        {error && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
            ❌ {error}
          </p>
        )}
      </div>
    </div>
  )
}

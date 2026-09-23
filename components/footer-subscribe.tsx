'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Check } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

// Suscripción al boletín, en el pie. Antes era una tarjeta de «Acceso
// prioritario» al final de cada ficha normal: tres campos, degradados y una
// pantalla entera de móvil justo donde el comprador ya había decidido, entre el
// carrusel y el pie. Aquí es una franja: quien la busca la encuentra, y a quien
// viene a comprar no le estorba.
//
// El WhatsApp opcional se fue: nadie envía hoy mensajes desde Todópolis (ver
// «Recuperación por WhatsApp» en CLAUDE.md), así que pedirlo era pedir un dato
// que no se usa. La API lo sigue aceptando si algún día vuelve.
export function FooterSubscribe({ productSlug }: { productSlug?: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [terms, setTerms] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return
    if (!terms) {
      setStatus('error')
      setMessage('Marca la casilla para que podamos escribirte.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          productSlug,
          source: 'footer',
          termsAccepted: terms,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error ?? 'Algo falló. Inténtalo en un momento.')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setMessage('No pudimos conectar. Revisa tu internet e intenta de nuevo.')
    }
  }

  const input =
    'min-w-0 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors'

  return (
    <div className="grid gap-5 border-b border-white/10 pb-10 mb-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center md:gap-10">
      <div>
        <p className="font-sans text-lg font-bold leading-snug">Ofertas y novedades, primero para ti</p>
        <p className="mt-1 text-sm leading-relaxed text-white/55">
          Un correo cuando hay algo bueno: descuentos, lo que acaba de llegar y lo que vuelve a tener stock.
        </p>
      </div>

      {status === 'success' ? (
        <p className="flex items-center gap-2.5 text-sm text-white/85" role="status">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2D2D2D]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          Listo{name ? `, ${name.split(' ')[0]}` : ''}. Te escribimos cuando haya algo que valga la pena.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sm:w-2/5">
              <span className="sr-only">Tu nombre</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="given-name"
                maxLength={80}
                className={input}
              />
            </label>
            <label className="flex-1">
              <span className="sr-only">Tu email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                inputMode="email"
                maxLength={200}
                className={input}
              />
            </label>
            {/* Blanco sobre el pie oscuro, no rojo: el rojo es solo el botón de
                compra (CLAUDE.md → «Color: tres significados»). */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2D2D2D] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Guardando…' : (
                <>
                  Suscribirme
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          <label className="mt-3 flex cursor-pointer select-none items-start gap-2">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-white"
            />
            <span className="text-[11px] leading-relaxed text-white/45">
              Acepto recibir correos de Todópolis y la{' '}
              <Link href="/privacidad" className="underline underline-offset-2 hover:text-white/70">
                política de privacidad
              </Link>
              . Te sales cuando quieras.
            </span>
          </label>

          {status === 'error' && message && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-[#FFB4AC]" role="alert">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  )
}

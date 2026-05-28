'use client'

import { useState } from 'react'
import { Sparkles, Mail, User, MessageCircle, Check, AlertCircle } from 'lucide-react'

interface ProductSubscriptionProps {
  productSlug: string
  productName: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

// Card-only (sin <section>): el padre define el layout. Pensado para vivir
// dentro de un grid junto con SuggestedBlogs.
export function ProductSubscription({ productSlug, productName }: ProductSubscriptionProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [terms, setTerms] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return

    if (!terms) {
      setStatus('error')
      setMessage('Necesitamos que aceptes los términos para escribirte.')
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
          whatsapp,
          productSlug,
          source: 'product_landing',
          termsAccepted: terms,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error ?? 'Algo falló. Inténtalo en un momento.')
        return
      }
      setStatus('success')
      setMessage('¡Listo! Te avisamos primero cuando haya novedades ✨')
    } catch {
      setStatus('error')
      setMessage('No pudimos conectar. Revisa tu internet e intenta de nuevo.')
    }
  }

  if (status === 'success') {
    return (
      <div className="relative h-full rounded-3xl p-8 md:p-10 text-center overflow-hidden border border-todopolis-lavender/40 shadow-md bg-gradient-to-br from-todopolis-blue/15 via-surface to-todopolis-lavender/25">
        <div aria-hidden className="absolute top-0 right-0 w-48 h-48 bg-todopolis-lavender/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-40 h-40 bg-todopolis-blue/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        <div className="relative flex flex-col items-center justify-center h-full min-h-[320px]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-md bg-todopolis-lavender-deep">
            <Check className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">
            Bienvenido al círculo{name ? `, ${name.split(' ')[0]}` : ''}.
          </h3>
          <p className="text-foreground/70 leading-relaxed">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full rounded-3xl p-7 md:p-8 overflow-hidden border border-todopolis-lavender/40 shadow-md bg-gradient-to-br from-todopolis-blue/15 via-surface to-todopolis-lavender/25">
      {/* Decorative blobs — paleta brand */}
      <div aria-hidden className="absolute top-0 right-0 w-56 h-56 bg-todopolis-lavender/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 left-0 w-48 h-48 bg-todopolis-blue/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/85 backdrop-blur border border-todopolis-lavender/40 mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-todopolis-lavender-deep" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-todopolis-lavender-deep">
              Acceso prioritario
            </span>
          </div>
          <h3 className="font-serif text-2xl md:text-[1.75rem] font-bold text-foreground leading-tight mb-2 text-balance">
            Las próximas ofertas, primero para ti.
          </h3>
          <p className="text-foreground/65 text-sm leading-relaxed">
            Te escribimos solo cuando hay algo realmente bueno: novedades, descuentos privados y avisos cuando vuelve el stock de productos como{' '}
            <span className="font-semibold text-foreground/85">{productName}</span>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <label className="relative block">
            <span className="sr-only">Tu nombre</span>
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-todopolis-lavender-deep/70 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="given-name"
              maxLength={80}
              className="w-full bg-surface border border-todopolis-lavender/40 rounded-xl pl-10 pr-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-todopolis-lavender-deep/30 focus:border-todopolis-lavender-deep/50 placeholder:text-foreground/40 transition-all"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Tu email</span>
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-todopolis-lavender-deep/70 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              inputMode="email"
              maxLength={200}
              className="w-full bg-surface border border-todopolis-lavender/40 rounded-xl pl-10 pr-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-todopolis-lavender-deep/30 focus:border-todopolis-lavender-deep/50 placeholder:text-foreground/40 transition-all"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Tu WhatsApp (opcional)</span>
            <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-todopolis-lavender-deep/70 pointer-events-none" />
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp (opcional, ej. +573001234567)"
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              className="w-full bg-surface border border-todopolis-lavender/40 rounded-xl pl-10 pr-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-todopolis-lavender-deep/30 focus:border-todopolis-lavender-deep/50 placeholder:text-foreground/40 transition-all"
            />
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer select-none px-1 py-1">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-todopolis-lavender/50 text-todopolis-lavender-deep focus:ring-todopolis-lavender-deep/30 cursor-pointer accent-current"
            />
            <span className="text-[11px] text-foreground/65 leading-relaxed">
              Acepto recibir comunicaciones de Todopolis y la{' '}
              <a
                href="#site-footer"
                className="text-todopolis-lavender-deep hover:underline font-semibold"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('site-footer')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                política de privacidad
              </a>
              . Tus datos son tuyos: no los compartimos con nadie y puedes salirte cuando quieras.
            </span>
          </label>

          {status === 'error' && message && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-sale-soft border border-sale/30 text-sale text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3.5 rounded-xl bg-todopolis-lavender-deep text-white font-bold text-sm shadow-md hover:bg-todopolis-blue-deep hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Quiero entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

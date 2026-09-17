'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, shouldShowNotice, type ConsentChoice } from '@/lib/consent'

// Aviso de cookies.
//
// NO ES UN MURO. Es una franja estrecha abajo a la derecha que no tapa el
// contenido, no oscurece la pantalla y no obliga a decidir para poder navegar.
// Un aviso que bloquea la tienda cuesta ventas y no lo pide ninguna norma
// colombiana; lo que sí hace falta es informar y que el rechazo funcione.
//
// En móvil va abajo del todo pero POR ENCIMA del botón fijo de compra en la
// ficha de producto (que está en bottom-4), así que se sitúa con espacio de
// sobra y se puede cerrar de un toque.
//
// Si nadie decide, no reaparece a cada rato: se guarda 'granted' al cerrarlo,
// igual que al aceptar. Insistir es lo que convierte un aviso en una molestia.
export function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
      ?.split('=')[1]

    if (!shouldShowNotice(stored)) return
    // Pequeño retraso: aparecer a la vez que carga la página compite con lo
    // que la persona vino a ver.
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const decide = (choice: ConsentChoice) => {
    try {
      document.cookie = `${CONSENT_COOKIE}=${choice}; path=/; max-age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax`
    } catch {
      /* cookies bloqueadas: nada que guardar */
    }
    setVisible(false)
    // Al rechazar hay que recargar: el Píxel puede haberse cargado ya en esta
    // visita, y lo único que lo descarga de verdad es empezar de cero.
    if (choice === 'denied') window.location.reload()
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed z-[60] bottom-28 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="rounded-2xl border border-nav-inactive-border bg-surface/95 backdrop-blur-xl shadow-2xl p-4">
        <p className="text-[13px] leading-relaxed text-foreground/75">
          Usamos cookies para que la tienda funcione y para medir qué anuncios
          traen gente. Puedes rechazar la medición y seguir comprando igual.{' '}
          <Link href="/privacidad" className="font-semibold text-todopolis-lavender-deep hover:underline">
            Más detalle
          </Link>
          .
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => decide('granted')}
            className="flex-1 px-3 py-2 rounded-xl bg-todopolis-lavender-deep text-white text-xs font-bold hover:bg-todopolis-blue-deep transition-colors"
          >
            Entendido
          </button>
          <button
            onClick={() => decide('denied')}
            className="px-3 py-2 rounded-xl border border-nav-inactive-border text-foreground/60 text-xs font-semibold hover:bg-surface-muted transition-colors"
          >
            Rechazar medición
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useSyncExternalStore } from 'react'
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_UNKNOWN,
  hasTrackingConsent,
  isConsentResolved,
} from '@/lib/consent'

// Enlace de preferencias de cookies, en el pie.
//
// AQUÍ HUBO UN AVISO FLOTANTE Y SE QUITÓ (sep-2026). Colombia no exige el
// consentimiento previo europeo —basta informar y permitir revocar—, así que
// una franja que interrumpe a alguien que venía a comprar costaba conversión
// sin comprar nada a cambio.
//
// Lo que NO se quitó es el mecanismo. Rechazar tiene que seguir siendo posible
// desde el propio sitio por tres razones: la Ley 1581 pide poder revocar, los
// Términos de Herramientas de Negocio de Meta piden un medio real de exclusión,
// y /privacidad afirma por escrito que existe. Una política que promete un
// botón inexistente es peor que no tener política.
//
// En el pie no interrumpe a nadie y sigue siendo verdad.

/**
 * La cookie es estado EXTERNO a React, así que se lee con
 * `useSyncExternalStore` y no con un efecto que llama a setState — mismo
 * criterio que `whatsapp-button.tsx` con el `<title>`.
 *
 * El snapshot del servidor devuelve `null` para que el primer render coincida
 * con el del cliente y no haya error de hidratación; en cuanto hidrata, el
 * valor real entra y el enlace se pinta.
 */
function subscribe(): () => void {
  // Nadie cambia esta cookie desde fuera durante la vida de la página: al
  // pulsar el enlace se recarga entera. No hay a qué suscribirse.
  return () => {}
}

function readConsentCookie(): string | null {
  const row = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  return row ? row.split('=')[1] : null
}

export function CookiePreferences() {
  const stored = useSyncExternalStore(
    subscribe,
    readConsentCookie,
    () => CONSENT_UNKNOWN
  )

  // Antes de hidratar no se pinta: el texto del enlace depende del estado y
  // cambiarlo después daría un salto en el pie.
  if (!isConsentResolved(stored)) return null

  const allowed = hasTrackingConsent(stored)

  const toggle = () => {
    const next = allowed ? 'denied' : 'granted'
    try {
      document.cookie = `${CONSENT_COOKIE}=${next}; path=/; max-age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax`
    } catch {
      /* cookies bloqueadas: no hay nada que guardar */
    }
    // Recarga siempre: al desactivar hay que descargar el Píxel que ya estaba
    // en la página, y al reactivar hay que cargarlo.
    window.location.reload()
  }

  return (
    <button
      onClick={toggle}
      className="text-sm text-white/60 hover:text-[#A2D2FF] transition-colors font-serif flex items-center gap-2 group text-left"
    >
      <span className="w-0 group-hover:w-2 h-0.5 bg-[#A2D2FF] transition-all duration-300 shrink-0" />
      {allowed ? 'Desactivar cookies de medición' : 'Activar cookies de medición'}
    </button>
  )
}

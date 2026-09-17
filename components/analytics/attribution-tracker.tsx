'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_WINDOW_DAYS,
  nextAttribution,
  parseAttribution,
  readStoredAttribution,
  serializeAttribution,
} from '@/lib/attribution'

// Guarda de qué anuncio vino el visitante, para poder apuntarle la venta
// después. La lógica de qué se guarda y cuándo caduca está en `lib/attribution.ts`
// con su tabla de casos; aquí solo queda el acceso al navegador.
//
// SE ESCRIBE EN UNA COOKIE, no en localStorage: el pedido se crea en una acción
// de servidor (`app/actions/create-order.ts`) y una acción de servidor no puede
// leer localStorage. La cookie viaja sola en la petición.
//
// No es httpOnly porque la escribe este código en el navegador, y por eso
// tampoco guarda nada sensible: son parámetros de campaña que ya venían
// escritos en la dirección, a la vista de cualquiera.
/** Valor de una cookie por nombre, ya descodificado. `null` si no está. */
function readCookie(name: string): string | null {
  const row = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  if (!row) return null
  // `slice(1).join('=')` y no `split('=')[1]`: el valor va codificado en JSON y
  // puede contener '=' de relleno.
  const raw = row.split('=').slice(1).join('=')
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

function AttributionCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    try {
      const now = Date.now()
      const incoming = parseAttribution(window.location.href, {
        referrer: document.referrer || null,
      })

      const stored = readStoredAttribution(readCookie(ATTRIBUTION_COOKIE), now)

      const result = nextAttribution(stored, incoming)
      if (!result?.shouldWrite) return

      const value = encodeURIComponent(serializeAttribution(result.attribution, now))
      const maxAge = ATTRIBUTION_WINDOW_DAYS * 86_400
      document.cookie = `${ATTRIBUTION_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
    } catch {
      // Cookies bloqueadas o modo privado: la tienda sigue funcionando, solo se
      // pierde la atribución de esa visita. Nunca debe romper una compra.
    }
  }, [pathname, searchParams])

  return null
}

export function AttributionTracker() {
  return (
    <Suspense fallback={null}>
      <AttributionCapture />
    </Suspense>
  )
}

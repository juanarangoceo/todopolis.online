// Helpers de tracking de Meta (lado navegador) + espejo a Conversions API.
//
// Cada evento lleva un `eventID` (uuid) que se envía idéntico al Pixel del
// navegador y a la CAPI server-side → Meta deduplica y no cuenta doble.
// Todo es no-op si no hay Pixel ID configurado.

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

type FbqFn = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: FbqFn & { callMethod?: (...args: unknown[]) => void; queue?: unknown[] }
    _fbq?: unknown
  }
}

export interface PixelUserData {
  // Datos de matching avanzado (se hashean server-side para la CAPI).
  phone?: string
  name?: string
  city?: string
  email?: string
}

export interface TrackOptions {
  eventID?: string
  userData?: PixelUserData
  /** Si false, no se espeja a la CAPI (p. ej. PageView). Default true. */
  capi?: boolean
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function pageview() {
  if (!FB_PIXEL_ID || typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', 'PageView')
}

// Dispara un evento estándar en el navegador y (por defecto) lo espeja en la
// Conversions API con el mismo eventID para deduplicación.
export function track(
  name: string,
  customData: Record<string, unknown> = {},
  options: TrackOptions = {},
) {
  if (!FB_PIXEL_ID || typeof window === 'undefined') return

  const eventID = options.eventID ?? newEventId()

  // 1) Pixel del navegador
  if (window.fbq) {
    window.fbq('track', name, customData, { eventID })
  }

  // 2) Espejo server-side (CAPI) — best-effort, no bloquea la UI
  if (options.capi !== false) {
    try {
      const body = JSON.stringify({
        eventName: name,
        eventId: eventID,
        eventSourceUrl: window.location.href,
        customData,
        userData: options.userData,
      })
      // keepalive permite que el POST sobreviva a navegaciones (p. ej. Purchase)
      fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* noop */
    }
  }

  return eventID
}

// ─── Helpers de eventos estándar ────────────────────────────────────────────

const COP = 'COP'

export function trackViewContent(p: {
  id: string
  name: string
  price?: number
  category?: string
}) {
  return track('ViewContent', {
    content_ids: [p.id],
    content_name: p.name,
    content_type: 'product',
    content_category: p.category,
    value: p.price ?? 0,
    currency: COP,
  })
}

export function trackAddToCart(p: { id: string; name?: string; price?: number }) {
  return track('AddToCart', {
    content_ids: [p.id],
    content_name: p.name,
    content_type: 'product',
    value: p.price ?? 0,
    currency: COP,
  })
}

export function trackInitiateCheckout(p: { id: string; value: number; quantity?: number }) {
  return track('InitiateCheckout', {
    content_ids: [p.id],
    content_type: 'product',
    num_items: p.quantity ?? 1,
    value: p.value,
    currency: COP,
  })
}

// Purchase: genera el eventID aquí para poder pasarlo también al server action
// (que envía la CAPI con los datos del cliente). Devuelve el eventID usado.
export function trackPurchase(
  p: { id: string; value: number; quantity?: number; userData?: PixelUserData },
  eventID: string,
) {
  // El Purchase server-side lo envía createOrder (con matching avanzado), así
  // que aquí NO espejamos a la CAPI para no duplicar el POST: solo el navegador.
  return track(
    'Purchase',
    {
      content_ids: [p.id],
      content_type: 'product',
      num_items: p.quantity ?? 1,
      value: p.value,
      currency: COP,
    },
    { eventID, capi: false },
  )
}

export { newEventId }

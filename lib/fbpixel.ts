// Helpers de tracking de Meta (lado navegador) + espejo a Conversions API.
//
// Cada evento lleva un `eventID` (uuid) que se envía idéntico al Pixel del
// navegador y a la CAPI server-side → Meta deduplica y no cuenta doble.
// Todo es no-op si no hay Pixel ID configurado.

// ID del píxel en el navegador.
//
// Hay DOS fuentes y el orden importa: manda lo que el editor escriba en
// «Ajustes de Tienda» del Studio, y si ese campo está vacío se usa la variable
// de entorno. Existe así porque `NEXT_PUBLIC_*` se incrusta en el momento de
// construir: cambiar el píxel por variable obliga a volver a desplegar, y
// cambiar de píxel es justo lo que se hace al abrir una cuenta publicitaria
// nueva o al recuperarse de una inhabilitación — momentos en los que no se
// quiere depender de un despliegue.
//
// El valor de Sanity llega en tiempo de ejecución, así que se guarda aquí al
// arrancar el componente `MetaPixel`. Los ayudantes de eventos lo leen con
// `getPixelId()` en vez de la constante.
const ENV_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

let runtimePixelId: string | undefined

/** La fija `MetaPixel` con lo que venga de Sanity. Sin valor, no hace nada. */
export function setPixelId(id: string | null | undefined) {
  const clean = id?.trim()
  if (clean) runtimePixelId = clean
}

export function getPixelId(): string | undefined {
  return runtimePixelId ?? ENV_PIXEL_ID
}

/** @deprecated Usa `getPixelId()`: esto solo ve la variable de entorno. */
export const FB_PIXEL_ID = ENV_PIXEL_ID

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
  if (!getPixelId() || typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', 'PageView')
}

// Dispara un evento estándar en el navegador y (por defecto) lo espeja en la
// Conversions API con el mismo eventID para deduplicación.
export function track(
  name: string,
  customData: Record<string, unknown> = {},
  options: TrackOptions = {},
) {
  if (!getPixelId() || typeof window === 'undefined') return

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

/**
 * `Lead` — el comprador acaba de enviar el formulario del pedido.
 *
 * ESTE EVENTO ERA UN `Purchase` Y ESTABA MAL. Con contraentrega, enviar el
 * formulario no es pagar: el pedido nace 'pending' y una parte nunca se
 * entrega. Contarlo como compra le decía a Meta que todos los formularios eran
 * ventas, y el algoritmo optimizaba hacia quien llena formularios sin recibir.
 *
 * El `Purchase` de verdad se manda desde el servidor cuando hay dinero:
 * al confirmarse el pago en Confío, o al marcar el pedido como entregado.
 * Ver `lib/meta-purchase.ts`.
 *
 * El eventID se genera fuera y se pasa también al server action, que espeja
 * este mismo Lead por la CAPI con matching avanzado.
 */
export function trackLead(
  p: { id: string; value: number; quantity?: number; userData?: PixelUserData },
  eventID: string,
) {
  // El espejo server-side lo envía createOrder (con matching avanzado), así que
  // aquí NO se manda a la CAPI para no duplicar el POST: solo el navegador.
  return track(
    'Lead',
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

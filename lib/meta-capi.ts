// Conversions API (CAPI) de Meta — envío de eventos server-side.
//
// Espejo server-side de los eventos del Pixel. Comparte el `event_id` con el
// navegador para que Meta deduplique. Los datos personales se hashean con
// SHA-256 antes de salir (requisito de Meta). No-op si faltan credenciales.

import { createHash } from 'crypto'
import { getSanityStoreSettings } from './sanity/queries'

const GRAPH_VERSION = 'v21.0'

const ENV_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE

/**
 * El píxel al que se manda el evento.
 *
 * Tiene que coincidir con el del navegador o la deduplicación por `event_id`
 * no funciona y Meta contaría cada conversión dos veces. Por eso resuelve en el
 * MISMO orden que `lib/fbpixel.ts`: manda «Ajustes de Tienda» del Studio y la
 * variable de entorno es el respaldo.
 *
 * El token NO se busca en Sanity: es un secreto y el Studio lo ven los
 * editores. Vive solo en las variables del servidor.
 */
async function resolvePixelId(): Promise<string | undefined> {
  try {
    const settings = await getSanityStoreSettings()
    const fromSanity = (settings?.metaPixelId as string | undefined)?.trim()
    if (fromSanity) return fromSanity
  } catch {
    // Sanity caído no puede dejar la tienda sin medición: se sigue con el de
    // la variable de entorno.
  }
  return ENV_PIXEL_ID
}

export interface CapiUserData {
  phone?: string
  name?: string
  city?: string
  email?: string
}

export interface SendCapiArgs {
  eventName: string
  eventId: string
  eventSourceUrl?: string
  customData?: Record<string, unknown>
  userData?: CapiUserData
  clientIp?: string
  clientUserAgent?: string
  fbp?: string
  fbc?: string
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// Normaliza + hashea según las reglas de Meta (minúsculas, sin espacios).
function hashField(raw: string | undefined, kind: 'email' | 'phone' | 'text'): string | undefined {
  if (!raw) return undefined
  let v = raw.trim().toLowerCase()
  if (kind === 'phone') {
    v = v.replace(/\D/g, '')
    // Colombia: número local de 10 dígitos → anteponer código de país 57.
    if (v.length === 10) v = `57${v}`
  } else if (kind === 'text') {
    v = v.replace(/\s+/g, '')
  }
  if (!v) return undefined
  return sha256(v)
}

export async function sendCapiEvent(args: SendCapiArgs): Promise<void> {
  if (!ACCESS_TOKEN) return // CAPI no configurada → no-op
  const pixelId = await resolvePixelId()
  if (!pixelId) return

  const u = args.userData ?? {}
  const firstName = u.name?.trim().split(/\s+/)[0]

  const user_data: Record<string, unknown> = {
    em: hashField(u.email, 'email'),
    ph: hashField(u.phone, 'phone'),
    fn: hashField(firstName, 'text'),
    ct: hashField(u.city, 'text'),
    fbp: args.fbp,
    fbc: args.fbc,
    client_ip_address: args.clientIp,
    client_user_agent: args.clientUserAgent,
  }
  // Limpia undefined
  for (const k of Object.keys(user_data)) {
    if (user_data[k] === undefined) delete user_data[k]
  }

  const payload = {
    data: [
      {
        event_name: args.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.eventId,
        action_source: 'website',
        ...(args.eventSourceUrl && { event_source_url: args.eventSourceUrl }),
        user_data,
        ...(args.customData && { custom_data: args.customData }),
      },
    ],
    ...(TEST_EVENT_CODE && { test_event_code: TEST_EVENT_CODE }),
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${ACCESS_TOKEN}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[meta-capi] ${args.eventName} → ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error(`[meta-capi] ${args.eventName} falló:`, err)
  }
}

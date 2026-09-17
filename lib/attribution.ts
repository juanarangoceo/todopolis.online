// Atribución de campañas: de qué anuncio vino un pedido.
//
// Puro y sin React a propósito, igual que `lib/whatsapp.ts`: lo que decide a
// qué campaña se le apunta una venta se prueba en una tabla de casos, no
// haciendo clic en un anuncio real y esperando a que alguien compre.
//
// POR QUÉ SE GUARDA LA PRIMERA VISITA Y NO LA ÚLTIMA. Alguien llega por un
// anuncio, se va, y vuelve al día siguiente escribiendo la dirección a mano.
// Si guardáramos la última visita, esa venta se contaría como tráfico directo y
// el anuncio que de verdad la produjo parecería no vender nada. Por eso la
// atribución se escribe UNA sola vez y no se pisa mientras dure la ventana.

/** Ventana de atribución, en días. Coincide con la de Meta por defecto. */
export const ATTRIBUTION_WINDOW_DAYS = 7

export const ATTRIBUTION_COOKIE = 'tp_attr'

export interface Attribution {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  fbclid?: string
  landing_path?: string
  referrer?: string
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

/** Un valor de UTM no debería ocupar más que esto; lo que pase, se recorta. */
const MAX_LEN = 200

function clean(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const v = raw.trim().slice(0, MAX_LEN)
  return v || undefined
}

/**
 * Lee los parámetros de campaña de una URL.
 *
 * Devuelve `null` si la visita no trae NADA que atribuir, y esa distinción
 * importa: sin ella, entrar al home escribiendo la dirección pisaría la
 * atribución del anuncio por el que la persona llegó ayer.
 */
export function parseAttribution(
  url: string,
  opts: { referrer?: string | null } = {}
): Attribution | null {
  let params: URLSearchParams
  let pathname = '/'
  try {
    const u = new URL(url)
    params = u.searchParams
    pathname = u.pathname
  } catch {
    return null
  }

  const attr: Attribution = {}
  for (const k of UTM_KEYS) {
    const v = clean(params.get(k))
    if (v) attr[k] = v
  }
  const fbclid = clean(params.get('fbclid'))
  if (fbclid) attr.fbclid = fbclid

  // Sin UTMs ni fbclid no hay campaña que apuntar.
  if (Object.keys(attr).length === 0) return null

  attr.landing_path = pathname.slice(0, MAX_LEN)

  // El referente solo se guarda si es de OTRO sitio: guardar un referente
  // interno convertiría cualquier clic dentro de la tienda en un origen nuevo.
  const ref = clean(opts.referrer)
  if (ref) {
    try {
      const rh = new URL(ref).hostname
      const uh = new URL(url).hostname
      if (rh && rh !== uh) attr.referrer = ref
    } catch {
      /* referente ilegible: se ignora */
    }
  }

  return attr
}

interface StoredAttribution {
  /** Momento de la primera visita atribuida, en milisegundos. */
  t: number
  a: Attribution
}

export function serializeAttribution(attr: Attribution, now: number): string {
  return JSON.stringify({ t: now, a: attr } satisfies StoredAttribution)
}

/** Devuelve la atribución guardada si sigue dentro de la ventana. */
export function readStoredAttribution(
  raw: string | null | undefined,
  now: number
): Attribution | null {
  if (!raw) return null
  let parsed: StoredAttribution
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed.t !== 'number' || !parsed.a) return null
  const ageDays = (now - parsed.t) / 86_400_000
  // Una cookie del futuro (reloj del dispositivo mal puesto) se descarta en vez
  // de darse por válida para siempre.
  if (ageDays < 0 || ageDays > ATTRIBUTION_WINDOW_DAYS) return null
  return parsed.a
}

/**
 * Qué atribución debe quedar guardada tras una visita.
 *
 * Gana la que YA estaba mientras siga viva: primera visita, no última. Solo se
 * escribe algo nuevo cuando no hay nada guardado o lo guardado ya caducó.
 */
export function nextAttribution(
  stored: Attribution | null,
  incoming: Attribution | null
): { attribution: Attribution; shouldWrite: boolean } | null {
  if (stored) return { attribution: stored, shouldWrite: false }
  if (incoming) return { attribution: incoming, shouldWrite: true }
  return null
}

/** Columnas de `orders`, con `undefined` donde no hay dato. */
export function attributionToColumns(
  attr: Attribution | null,
  extra: { fbp?: string | null; fbc?: string | null } = {}
): Record<string, string | null> {
  const a = attr ?? {}
  return {
    utm_source: a.utm_source ?? null,
    utm_medium: a.utm_medium ?? null,
    utm_campaign: a.utm_campaign ?? null,
    utm_content: a.utm_content ?? null,
    utm_term: a.utm_term ?? null,
    fbclid: a.fbclid ?? null,
    landing_path: a.landing_path ?? null,
    referrer: a.referrer ?? null,
    fbp: extra.fbp ?? null,
    fbc: extra.fbc ?? null,
  }
}

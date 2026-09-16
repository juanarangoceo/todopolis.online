// ÚNICA puerta HTTP hacia Confío. Nada más en Todopolis llama a esa API.
//
// PORTADO DE nitro_bot/lib/payments/confio/client.ts. Tres reglas que sostiene
// este archivo:
//
//   1. **El token nunca sale de aquí.** No se devuelve, no se registra, no
//      entra en un mensaje de error. Lo que sube al llamador ya es un
//      `AdvancePaymentError` saneado.
//   2. **Timeout corto en el camino caliente.** `createPayment` corre mientras
//      el comprador espera en el checkout. Una pasarela lenta no puede dejar el
//      formulario colgado: se prefiere «no pude generar el link».
//   3. **Ni un reintento ciego sobre la creación.** Un POST que no sabemos si
//      llegó no se repite aquí dentro; se repite arriba, con la MISMA
//      `Idempotency-Key` guardada en la fila del pedido, que es lo que hace que
//      Confío devuelva el pago existente en vez de crear un segundo cobro.

import {
  AdvancePaymentError,
  type AdvancePaymentSnapshot,
  type CreateAdvancePaymentInput,
  type CreatedAdvancePayment,
} from '../types.ts'
import {
  CONFIO_MIN_COP,
  copToCents,
  correlationIdFor,
  isConfioStatus,
  outcomeFor,
  padDescription,
  parsePaymentName,
  storeApiId,
  type ConfioLogisticsStatus,
} from './protocol.ts'

const BASE_URL = 'https://api.confiopagos.com'

/** El comprador está esperando en el checkout. Ver regla 2 de la cabecera. */
const TURN_TIMEOUT_MS = 8_000
/** Reconciliación y logística: corren en crons y pueden esperar más. */
const BACKGROUND_TIMEOUT_MS = 15_000

type Json = Record<string, unknown>

function classify(status: number): AdvancePaymentError['kind'] {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'unavailable'
  return 'invalid_request'
}

/**
 * Mensaje corto y sin secretos a partir de la respuesta de error. Se recorta
 * duro: este texto acaba en los logs y una respuesta de pasarela puede traer el
 * eco de la petición, que incluye datos del comprador.
 */
function describe(status: number, body: string): string {
  const trimmed = body.replace(/\s+/g, ' ').trim().slice(0, 200)
  return trimmed ? `Confío ${status}: ${trimmed}` : `Confío ${status}`
}

async function call(
  token: string,
  path: string,
  init: {
    method: 'GET' | 'POST' | 'PUT'
    body?: Json
    idempotencyKey?: string
    timeoutMs: number
  },
): Promise<Json> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs)
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })
  } catch (e) {
    // Un abort o un fallo de red dejan el resultado DESCONOCIDO: puede que
    // Confío lo haya procesado. El llamador no debe cerrar el pedido por esto.
    const aborted = (e as Error).name === 'AbortError'
    throw new AdvancePaymentError(
      'unavailable',
      aborted ? 'Confío no respondió a tiempo.' : 'No se pudo contactar a Confío.',
    )
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  if (!response.ok) {
    throw new AdvancePaymentError(
      classify(response.status),
      describe(response.status, text),
      response.status,
    )
  }
  try {
    return text ? (JSON.parse(text) as Json) : {}
  } catch {
    throw new AdvancePaymentError('unavailable', 'Confío devolvió una respuesta ilegible.')
  }
}

/**
 * Traduce la respuesta de un pago. Exige `name` y un estado conocido: sin esas
 * dos cosas no hay nada que persistir con seguridad, y persistir a medias es lo
 * que produce un pedido enganchado a un cobro que no se puede consultar.
 */
function readPayment(payload: Json): AdvancePaymentSnapshot {
  const parsed = parsePaymentName(payload.name)
  if (!parsed) {
    throw new AdvancePaymentError('unavailable', 'Confío devolvió un pago sin identificador válido.')
  }
  const status = payload.status
  if (typeof status !== 'string' || !isConfioStatus(status)) {
    throw new AdvancePaymentError(
      'unavailable',
      `Confío devolvió un estado desconocido: ${String(status).slice(0, 40)}`,
    )
  }
  const amount = payload.amountCents
  return {
    paymentId: parsed.paymentId,
    paymentName: payload.name as string,
    providerStatus: status,
    amountCents: typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
    checkoutUrl: typeof payload.url === 'string' ? payload.url : null,
    correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : null,
    outcome: outcomeFor(status),
  }
}

export type ConfioStore = { name: string; displayName: string }

/** GET /v1/stores — se usa para comprobar el token y descubrir la tienda. */
export async function listStores(token: string): Promise<ConfioStore[]> {
  const payload = await call(token, '/v1/stores', {
    method: 'GET',
    timeoutMs: BACKGROUND_TIMEOUT_MS,
  })
  const stores = Array.isArray(payload.stores) ? payload.stores : []
  return stores.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const row = raw as Json
    if (typeof row.name !== 'string') return []
    return [
      { name: row.name, displayName: typeof row.displayName === 'string' ? row.displayName : row.name },
    ]
  })
}

export async function createPayment(params: {
  token: string
  storeName: string
  input: CreateAdvancePaymentInput
  redirectUri?: string | null
}): Promise<CreatedAdvancePayment> {
  const { token, storeName, input } = params

  if (input.totalCop < CONFIO_MIN_COP) {
    // Se corta ANTES de la red: Confío responde 400 y el comprador vería un
    // error de pasarela que no explica nada.
    throw new AdvancePaymentError(
      'invalid_request',
      `MONTO_MINIMO: Confío no acepta cobros por debajo de $${CONFIO_MIN_COP.toLocaleString('es-CO')}.`,
    )
  }

  // mediaAssets es OBLIGATORIO con paymentType PRODUCT aunque la doc lo liste
  // opcional. Sin foto usable se corta antes de la red: es un problema del
  // catálogo (falta subirle la imagen al producto), no del comprador.
  if (!input.mediaAssets?.length) {
    throw new AdvancePaymentError(
      'invalid_request',
      'SIN_IMAGEN: Confío exige al menos una foto del producto para cobrar.',
    )
  }

  const payload = await call(token, `/v1/stores/${storeApiId(storeName)}/payments`, {
    method: 'POST',
    idempotencyKey: input.idempotencyKey,
    timeoutMs: TURN_TIMEOUT_MS,
    body: {
      correlationId: correlationIdFor(input.orderId),
      amountCents: copToCents(input.totalCop),
      currencyCode: 'COP',
      title: input.title.slice(0, 120),
      description: padDescription(input.description),
      buyer: {
        firstName: input.buyerFirstName.slice(0, 60),
        phoneNumber: input.buyerPhone,
      },
      mediaAssets: input.mediaAssets.slice(0, 5),
      ...(params.redirectUri ? { redirectUri: params.redirectUri } : {}),
    },
  })

  const payment = readPayment(payload)
  if (!payment.checkoutUrl) {
    throw new AdvancePaymentError('unavailable', 'Confío creó el pago pero no devolvió el link.')
  }
  return {
    paymentId: payment.paymentId,
    paymentName: payment.paymentName,
    checkoutUrl: payment.checkoutUrl,
    amountCents: payment.amountCents ?? copToCents(input.totalCop),
    providerStatus: payment.providerStatus,
    outcome: payment.outcome,
  }
}

/** GET de un pago. Es la vía por la que Todopolis se entera de que le pagaron. */
export async function getPayment(params: {
  token: string
  storeName: string
  paymentId: string
}): Promise<AdvancePaymentSnapshot> {
  const payload = await call(
    params.token,
    `/v1/stores/${storeApiId(params.storeName)}/payments/${params.paymentId}`,
    { method: 'GET', timeoutMs: BACKGROUND_TIMEOUT_MS },
  )
  return readPayment(payload)
}

/**
 * Avisa a Confío de que el pedido avanzó. Confío NO se entera solo: no consulta
 * a la transportadora. Sin este aviso los fondos se quedan en custodia
 * indefinidamente.
 */
export async function pushLogisticsStatus(params: {
  token: string
  storeName: string
  paymentId: string
  status: ConfioLogisticsStatus
}): Promise<AdvancePaymentSnapshot> {
  const payload = await call(
    params.token,
    `/v1/stores/${storeApiId(params.storeName)}/payments/${params.paymentId}`,
    { method: 'PUT', body: { status: params.status }, timeoutMs: BACKGROUND_TIMEOUT_MS },
  )
  return readPayment(payload)
}

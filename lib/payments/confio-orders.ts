// Orquestación del pago anticipado en Todópolis: crear el cobro y aplicarle a
// un pedido lo que Confío diga de él.
//
// Es el equivalente recortado de nitro_bot/lib/payments/advance-payment.ts
// (942 líneas). Todópolis no tiene tenants, ni subagentes, ni conversaciones:
// un pedido es una fila de `orders` y el cobro vive en esa misma fila.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PURCHASE_ORDER_COLUMNS, sendOrderPurchase, type PurchaseOrder } from '@/lib/meta-purchase'
import { randomUUID } from 'node:crypto'
import { createPayment, getPayment } from './confio/client.ts'
import { CONFIO_MIN_COP, centsToCop, copToCents, outcomeFor, provesPayment } from './confio/protocol.ts'
import { AdvancePaymentError, type AdvancePaymentSnapshot } from './types.ts'

// La configuración vive en `./config`, que no tiene dependencias de Node: el
// prompt de Lucy corre en edge y necesita preguntarla sin arrastrar este módulo.
export { confioConfig, type ConfioConfig } from './config.ts'
import type { ConfioConfig } from './config.ts'

export function admin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Teléfono colombiano → E.164. Confío lo exige con '+'. El checkout valida 10
 * dígitos, así que aquí solo se antepone el indicativo.
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length === 12) return `+${digits}`
  return `+57${digits.slice(-10)}`
}

export type OrderRow = {
  id: string
  product_name: string
  price: number
  quantity: number
  customer_name: string
  customer_phone: string
  status: string
  payment_method: string
  payment_status: string
  provider_payment_id: string | null
  provider_payment_name: string | null
  provider_status: string | null
  checkout_url: string | null
  amount_cents: number | null
  idempotency_key: string | null
}

export const ORDER_COLUMNS =
  'id, product_name, price, quantity, customer_name, customer_phone, status, payment_method, payment_status, provider_payment_id, provider_payment_name, provider_status, checkout_url, amount_cents, idempotency_key'

/**
 * Abre el cobro de un pedido que ya existe en Supabase.
 *
 * La `Idempotency-Key` se guarda ANTES del POST. Un timeout deja el cobro
 * abierto sin link, y el siguiente intento reutiliza la misma clave con el mismo
 * cuerpo — que es el contrato de Confío para devolver el pago existente. Por eso
 * un fallo de red nunca cierra el pedido: cerrarlo obligaría a generar una clave
 * nueva y ahí sí habría DOS cobros vivos por el mismo pedido.
 */
export async function openConfioCharge(params: {
  config: ConfioConfig
  order: OrderRow
  mediaAssets: string[]
  redirectUri?: string | null
}): Promise<{ checkoutUrl: string }> {
  const { config, order } = params
  const db = admin()

  // Ya tiene link: no se vuelve a cobrar, se reutiliza. Reabrir el checkout no
  // puede generar un segundo cobro.
  if (order.checkout_url && order.payment_status === 'awaiting') {
    return { checkoutUrl: order.checkout_url }
  }

  const totalCop = Math.round(order.price * order.quantity)
  if (totalCop < CONFIO_MIN_COP) {
    throw new AdvancePaymentError(
      'invalid_request',
      `MONTO_MINIMO: Confío no acepta cobros por debajo de $${CONFIO_MIN_COP.toLocaleString('es-CO')}.`,
    )
  }

  const idempotencyKey = order.idempotency_key ?? randomUUID()
  if (!order.idempotency_key) {
    await db.from('orders').update({ idempotency_key: idempotencyKey }).eq('id', order.id)
  }

  const firstName = order.customer_name.trim().split(/\s+/)[0] ?? 'Cliente'

  try {
    const payment = await createPayment({
      token: config.token,
      storeName: config.storeName,
      input: {
        orderId: order.id,
        totalCop,
        idempotencyKey,
        title: order.product_name.slice(0, 120),
        description: `${order.product_name} x${order.quantity} — pedido Todópolis`,
        buyerFirstName: firstName,
        buyerPhone: toE164(order.customer_phone),
        mediaAssets: params.mediaAssets,
      },
      redirectUri: params.redirectUri,
    })

    await db
      .from('orders')
      .update({
        payment_provider: 'confio',
        payment_status: 'awaiting',
        provider_payment_id: payment.paymentId,
        provider_payment_name: payment.paymentName,
        provider_status: payment.providerStatus,
        checkout_url: payment.checkoutUrl,
        amount_cents: payment.amountCents,
        provider_synced_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    return { checkoutUrl: payment.checkoutUrl }
  } catch (err) {
    // Rechazo definitivo: Confío no creó nada, así que la clave se ROTA. Si se
    // conservara, el reintento —que lleva un cuerpo corregido— recibiría un 409
    // y ese cobro quedaría atascado para siempre.
    if (err instanceof AdvancePaymentError && !err.keepsIdempotencyKey) {
      await db.from('orders').update({ idempotency_key: null }).eq('id', order.id)
    }
    throw err
  }
}

/**
 * Aplica a un pedido lo que Confío dice de su cobro. Es la ÚNICA función que
 * confirma un pago, la llame la reconciliación o cualquier otra vía futura: dos
 * caminos distintos podrían divergir, uno solo no.
 *
 * Exactamente-una-vez es un CAS sobre `payment_status`, no un flag: solo una
 * ejecución puede pasar 'awaiting' → 'funded', así que dos pasadas del cron a la
 * vez no pueden confirmar dos veces ni disparar dos avisos.
 */
export async function applyConfioSnapshot(params: {
  order: OrderRow
  snapshot: AdvancePaymentSnapshot
}): Promise<{ changed: boolean; funded: boolean; reason: string }> {
  const { order, snapshot } = params
  const db = admin()
  const now = new Date().toISOString()

  await db
    .from('orders')
    .update({ provider_status: snapshot.providerStatus, provider_synced_at: now })
    .eq('id', order.id)

  const outcome = outcomeFor(snapshot.providerStatus)

  if (!provesPayment(snapshot.providerStatus)) {
    if (outcome === 'expired' || outcome === 'cancelled') {
      const { data } = await db
        .from('orders')
        .update({ payment_status: outcome })
        .eq('id', order.id)
        .eq('payment_status', 'awaiting')
        .select('id')
      return { changed: !!data?.length, funded: false, reason: outcome }
    }
    return { changed: false, funded: false, reason: 'pendiente' }
  }

  // Monto distinto = no se confirma nada. Si Confío custodia un importe que no
  // es el del pedido, lo mira una persona: arreglarlo solo sería adivinar.
  const expectedCents = copToCents(Math.round(order.price * order.quantity))
  if (snapshot.amountCents !== null && snapshot.amountCents !== expectedCents) {
    await db
      .from('orders')
      .update({ payment_status: 'mismatch' })
      .eq('id', order.id)
      .eq('payment_status', 'awaiting')
    console.error(
      `[confio] DESCUADRE pedido ${order.id}: Confío custodia ${centsToCop(snapshot.amountCents)} y el pedido vale ${centsToCop(expectedCents)}`,
    )
    return { changed: true, funded: false, reason: 'descuadre_de_monto' }
  }

  // El CAS. Solo un ejecutor gana.
  //
  // `status` pasa a 'confirmed' y no a 'pending': con el dinero ya en custodia,
  // este pedido no está esperando que nadie lo verifique por WhatsApp — está
  // listo para despacharse, y así lo ve quien empaca. Los de contraentrega sí
  // siguen naciendo 'pending' hasta que alguien los confirme.
  const { data } = await db
    .from('orders')
    .update({ payment_status: 'funded', status: 'confirmed', funded_at: now, confirmed_at: now })
    .eq('id', order.id)
    .eq('payment_status', 'awaiting')
    .select(PURCHASE_ORDER_COLUMNS)

  if (!data?.length) return { changed: false, funded: false, reason: 'ya_confirmado' }

  // Purchase de Meta: AQUÍ hay dinero de verdad. Va después del CAS del pago y
  // tiene su propio CAS dentro, así que ni dos pasadas del cron a la vez ni un
  // reintento pueden mandarlo dos veces.
  //
  // Best-effort: un fallo de Meta no puede deshacer una confirmación de pago.
  try {
    await sendOrderPurchase(db, data[0] as PurchaseOrder, 'confio_funded')
  } catch (err) {
    console.error(`[confio] Purchase de Meta falló para el pedido ${order.id}:`, err)
  }

  return { changed: true, funded: true, reason: 'funded' }
}

/** Consulta un cobro en Confío y lo aplica. La usa la reconciliación. */
export async function reconcileOrder(config: ConfioConfig, order: OrderRow) {
  if (!order.provider_payment_id) {
    // Cobro abierto SIN pago: el POST no llegó o no supimos si llegó. No es un
    // error: el siguiente intento del comprador lo resuelve con la misma clave.
    return { changed: false, funded: false, reason: 'sin_pago_en_confio' }
  }
  const snapshot = await getPayment({
    token: config.token,
    storeName: config.storeName,
    paymentId: order.provider_payment_id,
  })
  return applyConfioSnapshot({ order, snapshot })
}

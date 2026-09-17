// El `Purchase` de Meta, enviado cuando hay dinero de verdad.
//
// DOS MOMENTOS, UNA SOLA PUERTA:
//   · Confío         → al pasar el pago a `funded` (el dinero está en custodia)
//   · Contraentrega  → al marcar el pedido 'delivered' en el panel (se cobró)
//
// Antes salía al enviar el formulario, cuando nadie había pagado todavía.
//
// EXACTAMENTE UNA VEZ. Igual que la confirmación de Confío, esto no es una
// bandera booleana sino un CAS sobre `meta_purchase_sent_at`: el UPDATE lleva
// `is null` en el WHERE, así que dos pasadas simultáneas —dos clics en
// "entregado", o el cron y una persona a la vez— no pueden mandar dos compras.
// Meta cobraría la duplicación en forma de métricas infladas y decisiones de
// puja equivocadas.
//
// El evento se manda SOLO si el CAS ganó. Si se mandara antes de escribir la
// marca, un fallo al escribir dejaría la puerta abierta a un segundo envío.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendCapiEvent } from './meta-capi'

export interface PurchaseOrder {
  id: string | number
  product_id: string | null
  product_name?: string | null
  price: number | null
  quantity: number | null
  customer_phone?: string | null
  customer_name?: string | null
  customer_city?: string | null
  fbp?: string | null
  fbc?: string | null
  landing_path?: string | null
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'

export type PurchaseResult = 'sent' | 'already_sent' | 'skipped' | 'failed'

/**
 * Manda el Purchase de un pedido, una sola vez.
 *
 * @param reason Para el registro: qué lo disparó ('confio_funded' | 'delivered').
 */
export async function sendOrderPurchase(
  db: SupabaseClient,
  order: PurchaseOrder,
  reason: string
): Promise<PurchaseResult> {
  const value = (order.price ?? 0) * (order.quantity ?? 1)
  if (!order.product_id || value <= 0) {
    // Un pedido sin producto o sin importe no es una compra que Meta pueda usar
    // para optimizar, y mandarlo con value 0 ensucia el ROAS.
    return 'skipped'
  }

  const eventId = `purchase-${order.id}`
  const now = new Date().toISOString()

  // CAS: solo gana quien encuentre la marca vacía.
  const { data, error } = await db
    .from('orders')
    .update({ meta_purchase_sent_at: now, meta_purchase_event_id: eventId })
    .eq('id', order.id)
    .is('meta_purchase_sent_at', null)
    .select('id')

  if (error) {
    console.error('[meta-purchase] no se pudo marcar el pedido:', error)
    return 'failed'
  }
  if (!data || data.length === 0) return 'already_sent'

  try {
    await sendCapiEvent({
      eventName: 'Purchase',
      eventId,
      // El pedido nació en la web aunque se confirme días después; se usa la
      // página en la que entró, que es la que Meta puede relacionar con el
      // anuncio.
      eventSourceUrl: order.landing_path ? `${BASE_URL}${order.landing_path}` : BASE_URL,
      customData: {
        content_ids: [order.product_id],
        content_name: order.product_name ?? undefined,
        content_type: 'product',
        num_items: order.quantity ?? 1,
        value,
        currency: 'COP',
      },
      userData: {
        phone: order.customer_phone ?? undefined,
        name: order.customer_name ?? undefined,
        city: order.customer_city ?? undefined,
      },
      // Cookies guardadas al crear el pedido: sin ellas, un evento enviado días
      // después no se puede atribuir al anuncio que lo produjo.
      fbp: order.fbp ?? undefined,
      fbc: order.fbc ?? undefined,
    })
    console.info(`[meta-purchase] Purchase enviado (${reason}) pedido=${order.id} valor=${value}`)
    return 'sent'
  } catch (err) {
    // La marca ya quedó escrita. Se prefiere PERDER un evento antes que
    // arriesgar mandarlo dos veces: un Purchase de menos se nota en el volumen,
    // uno de más corrompe el ROAS y las decisiones de puja durante días.
    console.error(`[meta-purchase] envío falló (${reason}) pedido=${order.id}:`, err)
    return 'failed'
  }
}

/** Columnas mínimas que hay que traer de `orders` para poder mandar el evento. */
export const PURCHASE_ORDER_COLUMNS =
  'id, product_id, product_name, price, quantity, customer_phone, customer_name, customer_city, fbp, fbc, landing_path, meta_purchase_sent_at'

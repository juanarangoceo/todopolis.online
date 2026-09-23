import { NextRequest, NextResponse } from 'next/server'
import {
  admin,
  confioConfig,
  openConfioCharge,
  ORDER_COLUMNS,
  type OrderRow,
} from '@/lib/payments/confio-orders'
import { CONFIO_MIN_COP } from '@/lib/payments/confio/protocol'
import { orderTotals, resolveOrderProduct } from '@/lib/checkout/order-pricing'
import { deliveryToOrderColumns, validateDelivery } from '@/lib/checkout/delivery'
import { AdvancePaymentError } from '@/lib/payments/types'

// Crea el pedido y abre el cobro de Confío. Devuelve la URL del checkout para
// que el navegador redirija: el comprador nunca copia un link a mano.
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const config = confioConfig()
  if (!config) {
    // Sin configuración, Todopolis solo cobra contraentrega. El botón no
    // debería ni mostrarse; si llega una petición igual, se dice claro.
    return NextResponse.json(
      { error: 'El pago anticipado no está disponible en este momento.' },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const slug = String(body.productId ?? '').trim()
  const quantity = Math.max(1, Math.min(20, Number(body.quantity) || 1))
  const variantIdRaw = Number(body.variantId)
  const variantId = Number.isFinite(variantIdRaw) && variantIdRaw > 0 ? variantIdRaw : null
  const variantName = body.variantName ? String(body.variantName) : null

  // Mismas reglas que el formulario (`lib/checkout/delivery.ts`).
  const delivery = validateDelivery((body.delivery ?? {}) as Record<string, unknown>)
  if (!slug || !delivery.ok) {
    return NextResponse.json(
      { error: 'Revisa los datos de entrega.', fields: delivery.ok ? undefined : delivery.errors },
      { status: 400 },
    )
  }

  const resolved = await resolveOrderProduct(slug, variantId)
  if (!resolved) {
    return NextResponse.json({ error: 'Producto no disponible' }, { status: 404 })
  }
  if (!resolved.mediaAssets.length) {
    // Problema del catálogo, no del comprador. Se corta antes de la red.
    console.error(`[confio] ${slug} no tiene ninguna foto usable — no se puede cobrar`)
    return NextResponse.json(
      { error: 'Este producto aún no acepta pago anticipado. Puedes pedirlo contraentrega.' },
      { status: 409 },
    )
  }

  // Envío y combos: el mismo cálculo que contraentrega (`order-pricing`).
  const { total: totalCop, pricePerUnit } = orderTotals(resolved, quantity)

  if (totalCop < CONFIO_MIN_COP) {
    return NextResponse.json(
      {
        error: `El pago anticipado aplica desde $${CONFIO_MIN_COP.toLocaleString('es-CO')}. Puedes pedirlo contraentrega.`,
      },
      { status: 409 },
    )
  }

  const db = admin()

  // El pedido nace ANTES del cobro y nace 'pending_payment': hasta que Confío
  // confirme, nadie debe despacharlo.
  const { data: created, error } = await db
    .from('orders')
    .insert({
      product_id: slug,
      product_name: resolved.name,
      // Se guarda el total cobrado dividido por unidad para que `price *
      // quantity` siga siendo el total, que es lo que compara la conciliación.
      price: pricePerUnit,
      quantity,
      ...deliveryToOrderColumns(delivery.data),
      variant_id: variantId,
      variant_name: variantName,
      status: 'pending_payment',
      payment_method: 'confio',
      payment_status: 'awaiting',
      payment_provider: 'confio',
    })
    .select(ORDER_COLUMNS)
    .single<OrderRow>()

  if (error || !created) {
    console.error('[confio] no se pudo crear el pedido:', error)
    return NextResponse.json({ error: 'No pudimos registrar tu pedido' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin

  try {
    const { checkoutUrl } = await openConfioCharge({
      config,
      order: created,
      mediaAssets: resolved.mediaAssets,
      redirectUri: `${origin}/pedido/${created.id}`,
    })
    return NextResponse.json({ orderId: created.id, checkoutUrl, total: totalCop })
  } catch (err) {
    const message =
      err instanceof AdvancePaymentError
        ? err.message.startsWith('MONTO_MINIMO') || err.message.startsWith('SIN_IMAGEN')
          ? 'Este producto no acepta pago anticipado. Puedes pedirlo contraentrega.'
          : 'No pudimos generar el link de pago. Intenta de nuevo o pídelo contraentrega.'
        : 'No pudimos generar el link de pago.'
    console.error(`[confio] fallo abriendo cobro del pedido ${created.id}:`, err)
    // El pedido se queda 'pending_payment' a propósito: NO se borra. Si el POST
    // sí llegó a Confío, borrarlo dejaría un cobro huérfano cobrable.
    return NextResponse.json({ error: message, orderId: created.id }, { status: 502 })
  }
}

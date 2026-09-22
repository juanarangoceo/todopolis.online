import { NextRequest, NextResponse } from 'next/server'
import { getSanityProductBySlug } from '@/lib/sanity/queries'
import type { ProductVariant } from '@/lib/types'
import {
  admin,
  confioConfig,
  openConfioCharge,
  ORDER_COLUMNS,
  type OrderRow,
} from '@/lib/payments/confio-orders'
import { CONFIO_MIN_COP } from '@/lib/payments/confio/protocol'
import { priceForQuantity } from '@/lib/quantity-offers'
import { AdvancePaymentError } from '@/lib/payments/types'

// Crea el pedido y abre el cobro de Confío. Devuelve la URL del checkout para
// que el navegador redirija: el comprador nunca copia un link a mano.
export const maxDuration = 30

// El precio SIEMPRE se resuelve aquí desde Sanity. El del formulario es un dato
// del cliente y este es el número que va a una pasarela de pago: aceptarlo tal
// cual permitiría cobrar $10.000 por cualquier cosa.
async function resolvePrice(slug: string, variantId: number | null) {
  const product = await getSanityProductBySlug(slug)
  if (!product) return null

  // La variante solo se valida (que exista); su `price` NO se usa. Ese campo es
  // el «Precio Mastershop» —el COSTO del proveedor que trae la sincronización—
  // y no el de venta. Esta ruta lo usaba como precio unitario, así que en los
  // 65 productos con variantes Confío cobraba el costo: el reloj infantil de
  // $82.900 salía a $55.000. El precio de venta es `product.price`, el mismo
  // que muestran la ficha y el checkout contraentrega.
  if (variantId && !(product.variants ?? []).some((v: ProductVariant) => v.idVariant === variantId)) {
    return null
  }

  const unitPrice = product.price
  if (typeof unitPrice !== 'number' || unitPrice <= 0) return null

  // Confío EXIGE al menos una foto. Se toman del catálogo en orden.
  const mediaAssets = [
    product.mastershopImageUrl,
    ...(product.images ?? []),
    product.image,
  ].filter((u): u is string => typeof u === 'string' && u.startsWith('http'))

  return {
    name: product.name,
    unitPrice: Math.round(unitPrice),
    quantityOffers: product.quantityOffers,
    isDestacado: product.isDestacado === true,
    mediaAssets: [...new Set(mediaAssets)].slice(0, 5),
  }
}

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
  const customerName = String(body.customerName ?? '').trim()
  const customerPhone = String(body.customerPhone ?? '').replace(/\D/g, '')
  const customerAddress = String(body.customerAddress ?? '').trim()
  const customerCity = String(body.customerCity ?? '').trim()
  const variantIdRaw = Number(body.variantId)
  const variantId = Number.isFinite(variantIdRaw) && variantIdRaw > 0 ? variantIdRaw : null
  const variantName = body.variantName ? String(body.variantName) : null

  if (!slug || !customerName || !customerAddress || !customerCity) {
    return NextResponse.json({ error: 'Por favor completa todos los campos' }, { status: 400 })
  }
  if (!/^\d{10}$/.test(customerPhone)) {
    return NextResponse.json({ error: 'El teléfono debe tener 10 dígitos' }, { status: 400 })
  }

  const resolved = await resolvePrice(slug, variantId)
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

  // El envío sigue la misma regla que el checkout contraentrega: gratis en
  // destacados, $12.000 en el resto. Se cobra junto con el producto.
  const shipping = resolved.isDestacado ? 0 : 12_000
  // Combos por cantidad: mismo cálculo que el checkout (`lib/quantity-offers`).
  const subtotal = priceForQuantity(resolved.unitPrice, quantity, resolved.quantityOffers)
  const totalCop = subtotal + shipping

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
      price: totalCop / quantity,
      quantity,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_city: customerCity,
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

import { getSanityProductBySlug } from '@/lib/sanity/queries'
import type { ProductVariant } from '@/lib/types'
import { priceForQuantity } from '@/lib/quantity-offers'

// El precio de un pedido SIEMPRE se resuelve en el servidor desde Sanity, para
// las dos vías de pago. El del formulario es un dato del navegador: aceptarlo
// permitía pedir contraentrega cualquier producto al precio que uno escribiera
// (el mensajero cobraba lo que decía el pedido), y en Confío es el número que
// va a una pasarela.
//
// La variante solo se valida (que exista); su `price` NO se usa. Ese campo es
// el «Precio Mastershop» —el COSTO del proveedor— y no el de venta: en los 65
// productos con variantes Confío llegó a cobrar el costo. El precio de venta es
// `product.price`, el mismo que muestran la ficha y el checkout.
export async function resolveOrderProduct(slug: string, variantId: number | null) {
  const product = await getSanityProductBySlug(slug)
  if (!product) return null

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
    name: product.name as string,
    unitPrice: Math.round(unitPrice),
    quantityOffers: product.quantityOffers,
    isDestacado: product.isDestacado === true,
    hasVariants: (product.variants ?? []).length > 0,
    mediaAssets: [...new Set(mediaAssets)].slice(0, 5),
  }
}

export type OrderProduct = NonNullable<Awaited<ReturnType<typeof resolveOrderProduct>>>

/** Envío: gratis en Destacados, $12.000 en el resto. El mismo flag que muestra la ficha. */
export function shippingFor(product: Pick<OrderProduct, 'isDestacado'>): number {
  return product.isDestacado ? 0 : 12_000
}

/**
 * Total del pedido (combos por cantidad + envío) y el `price` que se guarda en
 * `orders`. Se guarda el total DIVIDIDO por unidad, en las dos vías, porque el
 * panel, los ingresos y el `Purchase` de Meta calculan `price × quantity`.
 * Contraentrega guardaba el total entero en `price`: un pedido de 2 unidades
 * se habría contado doble.
 */
export function orderTotals(product: OrderProduct, quantity: number) {
  const subtotal = priceForQuantity(product.unitPrice, quantity, product.quantityOffers)
  const shipping = shippingFor(product)
  const total = subtotal + shipping
  return { subtotal, shipping, total, pricePerUnit: total / quantity }
}

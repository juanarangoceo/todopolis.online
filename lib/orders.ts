// Ciclo de vida de un pedido, en UN solo sitio.
//
// Hasta ahora no existía vocabulario: el código escribía 'pending' y
// 'pending_payment', y en la base había 'Enviado' y 'Cancelado' escritos a mano
// desde el panel de Supabase. Mezclar idiomas y mayúsculas hace que cualquier
// filtro se equivoque en silencio — y ese filtro es el que decide a quién se le
// manda un Purchase a Meta.

export const ORDER_STATUSES = [
  'pending_payment',
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Esperando pago',
  pending: 'Sin confirmar',
  confirmed: 'Confirmado',
  shipped: 'Despachado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

/**
 * A qué estados se puede pasar desde cada uno.
 *
 * No es decoración: es lo que impide marcar «entregado» un pedido cancelado, o
 * devolver a «sin confirmar» algo ya despachado. Como 'delivered' dispara el
 * Purchase de Meta, una transición suelta se traduce en una métrica falsa.
 *
 * 'pending_payment' no lleva a ningún sitio a mano: de ahí solo se sale cuando
 * Confío confirma el pago (o cuando el cobro caduca), y eso lo escribe la
 * reconciliación, no una persona.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export function canTransition(from: string, to: string): boolean {
  if (!isOrderStatus(from) || !isOrderStatus(to)) return false
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v)
}

/** Columna de marca de tiempo que acompaña a cada estado, si la hay. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
  confirmed: 'confirmed_at',
  shipped: 'shipped_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
}

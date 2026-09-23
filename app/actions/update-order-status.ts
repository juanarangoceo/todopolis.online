'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { canTransition, isOrderStatus, STATUS_TIMESTAMP, type OrderStatus } from '@/lib/orders'
import { PURCHASE_ORDER_COLUMNS, sendOrderPurchase, type PurchaseOrder } from '@/lib/meta-purchase'

export interface UpdateResult {
  success: boolean
  error?: string
  /** Qué pasó con el Purchase de Meta, para poder decirlo en el panel. */
  purchase?: 'sent' | 'already_sent' | 'skipped' | 'failed'
}

// Cambia el estado de un pedido desde el panel.
//
// Vive en una acción de servidor y no en una ruta de API porque solo la usa el
// panel, que ya está detrás de la cookie de administrador (`proxy.ts`). Aun
// así comprueba la cookie: una acción de servidor es un punto de entrada HTTP
// como cualquier otro, y el proxy protege rutas de página, no invocaciones.
export async function updateOrderStatus(
  orderId: string,
  nextStatus: string,
  opts: { reason?: string } = {}
): Promise<UpdateResult> {
  if (!(await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value))) {
    return { success: false, error: 'No autorizado' }
  }

  if (!isOrderStatus(nextStatus)) {
    return { success: false, error: `Estado desconocido: ${nextStatus}` }
  }

  const db = createAdminClient()

  const { data: order, error: readErr } = await db
    .from('orders')
    .select(`${PURCHASE_ORDER_COLUMNS}, status, payment_method, payment_status`)
    .eq('id', orderId)
    .maybeSingle()

  if (readErr) return { success: false, error: 'No se pudo leer el pedido' }
  if (!order) return { success: false, error: 'El pedido no existe' }

  const current = (order as { status: string }).status
  if (!canTransition(current, nextStatus)) {
    return {
      success: false,
      error: `No se puede pasar de "${current}" a "${nextStatus}"`,
    }
  }

  // Contraentrega: nadie paga hasta que recibe. Si el pedido es de Confío y el
  // pago no está en custodia, marcarlo entregado significaría que se despachó
  // sin cobrar — y dispararía un Purchase por dinero que no entró.
  const o = order as { payment_method?: string; payment_status?: string }
  if (nextStatus === 'delivered' && o.payment_method === 'confio' && o.payment_status !== 'funded') {
    return {
      success: false,
      error: 'Este pedido es de pago anticipado y Confío no ha confirmado el pago.',
    }
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status: nextStatus }
  const stampColumn = STATUS_TIMESTAMP[nextStatus as OrderStatus]
  if (stampColumn) patch[stampColumn] = now
  if (nextStatus === 'cancelled' && opts.reason) patch.cancel_reason = opts.reason.slice(0, 300)

  // El WHERE lleva el estado que se leyó: si alguien lo movió entre la lectura
  // y la escritura, este UPDATE no toca nada en vez de pisar su cambio.
  const { data: updated, error: writeErr } = await db
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('status', current)
    .select('id')

  if (writeErr) return { success: false, error: 'No se pudo guardar el cambio' }
  if (!updated?.length) {
    return { success: false, error: 'Alguien cambió este pedido mientras lo mirabas. Recarga.' }
  }

  // ── Purchase de Meta ──────────────────────────────────────────────────────
  // Solo al ENTREGAR, que es cuando el repartidor cobró. Los pedidos de Confío
  // ya mandaron el suyo al pasar a `funded` (el dinero entró en custodia
  // entonces), y el CAS de `sendOrderPurchase` devuelve 'already_sent' sin
  // volver a mandarlo.
  let purchase: UpdateResult['purchase']
  if (nextStatus === 'delivered') {
    purchase = await sendOrderPurchase(db, order as unknown as PurchaseOrder, 'delivered')
  }

  revalidatePath('/admin/pedidos')
  return { success: true, purchase }
}

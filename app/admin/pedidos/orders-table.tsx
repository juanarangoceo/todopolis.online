'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus } from '@/app/actions/update-order-status'
import {
  ALLOWED_TRANSITIONS,
  ORDER_STATUS_LABEL,
  isOrderStatus,
  type OrderStatus,
} from '@/lib/orders'

export interface OrderRow {
  id: string
  created_at: string
  product_name: string | null
  product_id: string | null
  price: number | null
  quantity: number | null
  customer_name: string | null
  customer_phone: string | null
  customer_city: string | null
  customer_address: string | null
  customer_department: string | null
  customer_neighborhood: string | null
  customer_address_details: string | null
  customer_city_code: string | null
  variant_name: string | null
  status: string
  payment_method: string | null
  payment_status: string | null
  utm_source: string | null
  utm_campaign: string | null
  utm_content: string | null
  fbclid: string | null
  meta_purchase_sent_at: string | null
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: 'bg-amber-100 text-amber-800',
  pending: 'bg-surface-muted text-foreground/70',
  confirmed: 'bg-trust-bg text-trust-fg',
  shipped: 'bg-todopolis-lavender/30 text-todopolis-lavender-deep',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-sale-soft text-sale',
}

function cop(n: number) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [filter, setFilter] = useState<'todos' | OrderStatus>('todos')
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null)

  const visible = filter === 'todos' ? orders : orders.filter((o) => o.status === filter)

  const run = (order: OrderRow, next: OrderStatus) => {
    // Cancelar pide motivo: sin él, a los tres meses nadie sabe si fue el
    // comprador quien se arrepintió o el proveedor quien se quedó sin stock, y
    // esa diferencia es la que dice si una campaña trae mala gente o el
    // catálogo está desactualizado.
    let reason: string | undefined
    if (next === 'cancelled') {
      const r = window.prompt('¿Por qué se cancela? (queda guardado en el pedido)')
      if (r === null) return
      reason = r.trim() || undefined
    }
    if (next === 'delivered' && !window.confirm('¿El pedido se entregó y se cobró?')) return

    setMessage(null)
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, next, { reason })
      if (!res.success) {
        setMessage({ id: order.id, text: res.error ?? 'Error', ok: false })
        return
      }
      const extra =
        res.purchase === 'sent'
          ? ' · Purchase enviado a Meta'
          : res.purchase === 'already_sent'
            ? ' · Purchase ya se había enviado'
            : res.purchase === 'failed'
              ? ' · el Purchase a Meta falló (mira los registros)'
              : ''
      setMessage({ id: order.id, text: `Marcado como ${ORDER_STATUS_LABEL[next]}${extra}`, ok: true })
    })
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['todos', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'pending_payment'] as const).map(
          (f) => {
            const n = f === 'todos' ? orders.length : orders.filter((o) => o.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  filter === f
                    ? 'bg-todopolis-blue text-todopolis-blue-deep'
                    : 'bg-surface-muted text-foreground/60 hover:bg-surface-soft'
                }`}
              >
                {f === 'todos' ? 'Todos' : ORDER_STATUS_LABEL[f]} ({n})
              </button>
            )
          }
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-nav-inactive-border bg-surface">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-bold px-4 py-3">Fecha</th>
              <th className="text-left font-bold px-4 py-3">Producto</th>
              <th className="text-left font-bold px-4 py-3">Cliente</th>
              <th className="text-left font-bold px-4 py-3">Origen</th>
              <th className="text-right font-bold px-4 py-3">Valor</th>
              <th className="text-left font-bold px-4 py-3">Pago</th>
              <th className="text-left font-bold px-4 py-3">Estado</th>
              <th className="text-left font-bold px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => {
              const status = isOrderStatus(o.status) ? o.status : null
              const nexts = status ? ALLOWED_TRANSITIONS[status] : []
              const value = (o.price ?? 0) * (o.quantity ?? 1)
              const origen = o.utm_campaign || (o.fbclid ? 'Meta (sin UTM)' : '—')

              return (
                <tr key={o.id} className="border-t border-nav-inactive-border align-top">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fecha(o.created_at)}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-semibold text-foreground leading-snug">{o.product_name ?? '—'}</p>
                    {o.variant_name && (
                      <p className="text-xs text-muted-foreground">{o.variant_name}</p>
                    )}
                    {o.quantity && o.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">×{o.quantity}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="font-medium text-foreground leading-snug">{o.customer_name ?? '—'}</p>
                    {/* Dirección completa: es lo que se copia a la guía. Antes
                        el panel ni siquiera la mostraba, solo la ciudad. Los
                        pedidos viejos no tienen barrio ni departamento. */}
                    {o.customer_address && (
                      <p className="text-xs text-foreground/80 leading-snug mt-0.5">
                        {o.customer_address}
                        {o.customer_address_details && ` · ${o.customer_address_details}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-snug">
                      {[o.customer_neighborhood, o.customer_city, o.customer_department].filter(Boolean).join(', ')}
                    </p>
                    {o.customer_phone && (
                      <a
                        href={`https://wa.me/${o.customer_phone.replace(/\D/g, '').replace(/^(\d{10})$/, '57$1')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#25D366] hover:underline"
                      >
                        {o.customer_phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-xs text-muted-foreground leading-snug">{origen}</p>
                    {o.utm_content && (
                      <p className="text-[11px] text-muted-foreground/70 leading-snug">{o.utm_content}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground whitespace-nowrap">
                    {cop(value)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-semibold text-foreground">
                      {o.payment_method === 'confio' ? 'Confío' : 'Contraentrega'}
                    </p>
                    {o.payment_method === 'confio' && (
                      <p className="text-[11px] text-muted-foreground">{o.payment_status}</p>
                    )}
                    {o.meta_purchase_sent_at && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Purchase ✓
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        status ? STATUS_STYLE[status] : 'bg-sale-soft text-sale'
                      }`}
                    >
                      {status ? ORDER_STATUS_LABEL[status] : o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {nexts.map((n) => (
                        <button
                          key={n}
                          disabled={pending}
                          onClick={() => run(o, n)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                            n === 'cancelled'
                              ? 'bg-sale-soft text-sale hover:bg-sale hover:text-white'
                              : 'bg-trust-bg text-trust-fg hover:bg-todopolis-blue'
                          }`}
                        >
                          {ORDER_STATUS_LABEL[n]}
                        </button>
                      ))}
                      {nexts.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    {message?.id === o.id && (
                      <p
                        className={`text-[11px] mt-1.5 font-semibold ${
                          message.ok ? 'text-emerald-700' : 'text-sale'
                        }`}
                      >
                        {message.text}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No hay pedidos en este estado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

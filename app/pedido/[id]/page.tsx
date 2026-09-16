import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, ShieldCheck, Truck, XCircle } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { admin } from '@/lib/payments/confio-orders'

// A donde vuelve el comprador desde Confío (`redirectUri`). NO se confía en
// haber llegado aquí como prueba de pago: lo que se muestra es lo que dice
// nuestra propia fila, que solo mueve la reconciliación contra la API.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tu pedido | Todopolis',
  robots: { index: false, follow: false },
}

type OrderView = {
  id: string
  product_name: string
  quantity: number
  customer_name: string
  status: string
  payment_method: string
  payment_status: string
  checkout_url: string | null
}

const COPY: Record<string, { icon: 'ok' | 'wait' | 'fail'; title: string; body: string }> = {
  funded: {
    icon: 'ok',
    title: '¡Pago recibido!',
    body: 'Tu dinero está en custodia de Confío y ya estamos preparando tu pedido. Te escribimos por WhatsApp con el seguimiento.',
  },
  awaiting: {
    icon: 'wait',
    title: 'Estamos confirmando tu pago',
    body: 'Si ya pagaste, puede tardar unos minutos en reflejarse. No hace falta que hagas nada: te avisamos por WhatsApp apenas se confirme.',
  },
  expired: {
    icon: 'fail',
    title: 'El link de pago venció',
    body: 'Los cobros de Confío duran 3 días. Puedes volver a pedirlo, o hacerlo contraentrega y pagar cuando lo recibas.',
  },
  cancelled: {
    icon: 'fail',
    title: 'El pago no se completó',
    body: 'No se hizo ningún cobro. Puedes intentarlo de nuevo, o pedirlo contraentrega y pagar cuando lo recibas.',
  },
  mismatch: {
    icon: 'wait',
    title: 'Estamos revisando tu pago',
    body: 'Detectamos una diferencia en el monto y una persona de nuestro equipo lo está revisando. Te contactamos por WhatsApp muy pronto.',
  },
}

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const { data: order } = await admin()
    .from('orders')
    .select('id, product_name, quantity, customer_name, status, payment_method, payment_status, checkout_url')
    .eq('id', id)
    .maybeSingle<OrderView>()

  if (!order) notFound()

  const state = COPY[order.payment_status] ?? COPY.awaiting
  const Icon = state.icon === 'ok' ? CheckCircle2 : state.icon === 'fail' ? XCircle : Clock
  const tone =
    state.icon === 'ok'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : state.icon === 'fail'
        ? 'text-red-600 bg-red-50 border-red-200'
        : 'text-amber-700 bg-amber-50 border-amber-200'

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-12 md:py-16 max-w-xl">
          <div className="rounded-3xl border border-gray-100 bg-white shadow-sm p-7 md:p-9 text-center">
            <span className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-5 ${tone}`}>
              <Icon className="w-8 h-8" />
            </span>

            <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3 text-balance">
              {state.title}
            </h1>
            <p className="text-foreground/70 leading-relaxed mb-6">{state.body}</p>

            <div className="rounded-2xl bg-surface-soft border border-gray-100 p-4 text-left text-sm">
              <div className="flex justify-between gap-4 mb-1.5">
                <span className="text-foreground/55">Producto</span>
                <span className="font-semibold text-foreground text-right">
                  {order.product_name} ×{order.quantity}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-foreground/55">Pedido</span>
                <span className="font-mono text-xs text-foreground/70">{order.id.slice(0, 8)}</span>
              </div>
            </div>

            {order.payment_status === 'awaiting' && order.checkout_url && (
              <a
                href={order.checkout_url}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-cta text-cta-fg font-bold hover:bg-cta-hover transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Retomar el pago
              </a>
            )}

            <Link
              href="/"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 font-bold text-foreground/70 hover:bg-surface-soft transition-colors"
            >
              <Truck className="w-4 h-4" />
              Seguir comprando
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

import { StorePolicy } from '@/lib/types'
import { advancePaymentEnabled } from '@/lib/payments/config'
import { buildWhatsAppUrl, resolveWhatsAppPhone } from '@/lib/whatsapp'
import { Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones } from 'lucide-react'

// Icon mapper from string to actual Lucide component
const IconMap: Record<string, React.ElementType> = {
  Truck,
  ShieldCheck,
  WalletCards,
  Star,
  RefreshCw,
  Box,
  CheckCircle,
  Headphones,
}

// Fallback policies in case Sanity document is missing
function defaultPolicies(): StorePolicy[] {
  return [
  {
    iconName: 'Truck',
    title: 'Llega en 3 a 7 días hábiles',
    description: 'Envío de $12.000 a todo el país, gratis en los productos Destacados. Te mandamos la guía por WhatsApp al despachar.',
  },
  {
    iconName: 'WalletCards',
    // El texto depende de si el pago anticipado está encendido. Antes decía
    // "Paga en efectivo ÚNICAMENTE cuando recibas", que con Confío activo
    // contradice al bloque de medios de pago que está más arriba en la misma
    // página. Un comprador que lea las dos cosas no sabe cuál creer.
    title: advancePaymentEnabled() ? 'Paga al recibir, o con Confío' : 'Pagas cuando lo recibes',
    description: advancePaymentEnabled()
      ? 'Contraentrega: pagas en efectivo cuando te lo entregan. Con Confío: pagas por PSE, Nequi o Bancolombia y la app retiene tu plata hasta que confirmes que llegó.'
      : 'Compra con total confianza. Paga en efectivo únicamente cuando recibas el producto en casa.',
  },
  {
    // "Garantía de Calidad / control estricto" no decía nada comprobable ni
    // resolvía una duda. El plazo real de devolución sí, y está en el footer.
    iconName: 'RefreshCw',
    title: '30 días para devolver',
    description: 'Si el producto llega con un defecto, escríbenos con fotos por WhatsApp y lo reponemos o te devolvemos el dinero.',
  },
  {
    iconName: 'Headphones',
    title: 'Atención Cercana',
    description: 'Lucy, nuestra IA, te acompaña 24/7. Y si necesitas un humano, también estamos.',
  },
  ]
}

const WHATSAPP_GREEN = '#25D366'

interface StorePoliciesProps {
  policies?: StorePolicy[]
  /**
   * Convierte la tarjeta de atención en un enlace directo a WhatsApp con el
   * primer mensaje ya escrito. Sin esto, la tarjeta se queda como texto.
   */
  whatsapp?: {
    phone?: string | null
    productName?: string | null
    pageUrl: string
  }
}

// La cuarta tarjeta ("Atención Cercana") era la única de las cuatro que no
// resolvía nada: las otras tres responden una duda concreta —cuándo llega,
// cómo se paga, qué pasa si sale malo— y esta solo prometía que hay alguien.
// Convertida en enlace, ese mismo sitio de la página pasa de ser una promesa a
// ser la puerta abierta, con el producto que el comprador está mirando ya
// escrito en el mensaje.
//
// Se reconoce por `iconName: 'Headphones'`, que es el hueco semántico de
// "atención", y no por el título: el título puede venir editado desde
// «Ajustes de Tienda» en el Studio y ahí una comparación de texto se rompería
// sin avisar. Si ninguna política ocupa ese hueco, la tarjeta se añade al
// final en vez de perderse.
//
// EN MÓVIL VA PRIMERA (`order-first md:order-none`). Ahí las cuatro tarjetas
// se apilan en una sola columna al final de una página ya muy larga, y esta es
// la única de las cuatro sobre la que se puede hacer algo: las otras tres
// informan, esta abre el chat. De cuarta se la comía el scroll. Desde `md`,
// con la rejilla de 2 y 4 columnas, vuelve a su sitio de siempre.
//
// Se mueve con `order` y no reordenando el array porque el orden depende del
// ancho de pantalla, y eso solo lo sabe el CSS — este componente se renderiza
// en el servidor. El desajuste entre orden visual y orden del DOM no afecta al
// teclado: de las cuatro tarjetas, esta es la única enfocable.
function WhatsAppCard({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group order-first md:order-none flex flex-col items-center text-center p-4 rounded-2xl border border-transparent hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition-all duration-300"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-md shadow-[#25D366]/30 transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: WHATSAPP_GREEN }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-7 h-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.488" />
        </svg>
      </div>
      <h3 className="font-semibold text-neutral-900 mb-2">¿Dudas? Escríbenos</h3>
      <p className="text-sm text-neutral-500 leading-relaxed mb-3">
        Te respondemos por WhatsApp sobre este mismo producto. Sin formularios.
      </p>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundColor: WHATSAPP_GREEN }}
      >
        Abrir WhatsApp
        <span aria-hidden>→</span>
      </span>
    </a>
  )
}

export function StorePolicies({ policies, whatsapp }: StorePoliciesProps) {
  const displayPolicies = policies && policies.length > 0 ? policies : defaultPolicies()

  const whatsappHref = whatsapp
    ? buildWhatsAppUrl({
        phone: resolveWhatsAppPhone(whatsapp.phone, process.env.NEXT_PUBLIC_WHATSAPP_PHONE),
        pageUrl: whatsapp.pageUrl,
        productName: whatsapp.productName,
      })
    : null

  // Sin número configurado no se pinta el enlace y la tarjeta de texto se
  // queda como estaba: un botón que abre un chat con un número roto es peor
  // que ninguno (misma regla que la burbuja flotante).
  const supportSlot = whatsappHref
    ? displayPolicies.findIndex((p) => p.iconName === 'Headphones')
    : -1

  const cards = displayPolicies.map((policy, idx) => {
    if (whatsappHref && idx === supportSlot) {
      return <WhatsAppCard key="whatsapp" href={whatsappHref} />
    }

    const Icon = IconMap[policy.iconName] || CheckCircle

    return (
      <div key={idx} className="flex flex-col items-center text-center p-4">
        <div className="w-14 h-14 rounded-full bg-trust-bg border border-trust-border flex items-center justify-center mb-4 text-trust-fg">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="font-semibold text-neutral-900 mb-2">{policy.title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">
          {policy.description}
        </p>
      </div>
    )
  })

  if (whatsappHref && supportSlot === -1) {
    cards.push(<WhatsAppCard key="whatsapp" href={whatsappHref} />)
  }

  return (
    <div className="w-full bg-surface rounded-2xl p-6 md:p-8 mt-12 mb-8 border border-nav-inactive-border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards}
      </div>
    </div>
  )
}

'use client'

// Burbuja de WhatsApp de la tienda. Abre la conversación con Lucy en WhatsApp
// —el mismo asesor que atiende la tienda— con el producto que el comprador
// está mirando ya escrito.
//
// DÓNDE SE PINTA, Y POR QUÉ A LA IZQUIERDA. La columna derecha ya está
// ocupada: `LucyChatButton` (bottom-6, solo en la home) con su globo de aviso
// creciendo hacia arriba, y `VoiceLucy` (bottom-24) en los productos que lo
// tengan encendido. Abajo, en móvil, la ficha de producto fija su botón de
// compra a todo el ancho (`product-hero.tsx`, bottom-4). La izquierda está
// libre en todas las rutas; en la ficha de producto se sube en móvil para no
// taparle el botón de compra, que es el que vende.

import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildWhatsAppUrl,
  pathHasNamedSubject,
  productNameFromTitle,
  resolveWhatsAppPhone,
} from '@/lib/whatsapp'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'
// Respaldo: lo que manda es el campo de Sanity que llega por prop.
const PHONE_FALLBACK = process.env.NEXT_PUBLIC_WHATSAPP_PHONE

// El `<title>` es estado EXTERNO a React y lo escribe el router al navegar, así
// que se lee con `useSyncExternalStore` y no con un efecto: el observador
// avisa del cambio de título y el enlace se recalcula solo. En el servidor no
// hay `document`, y el snapshot vacío hace que el primer render coincida con
// el del cliente (sin él, habría error de hidratación).
function subscribeToTitle(onChange: () => void): () => void {
  const target = document.querySelector('title')
  if (!target) return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(target, { childList: true, characterData: true, subtree: true })
  return () => observer.disconnect()
}

export function WhatsAppButton({ phone }: { phone?: string | null }) {
  const pathname = usePathname()
  const title = useSyncExternalStore(
    subscribeToTitle,
    () => document.title,
    () => ''
  )
  const productName = pathHasNamedSubject(pathname) ? productNameFromTitle(title) : null

  const href = buildWhatsAppUrl({
    phone: resolveWhatsAppPhone(phone, PHONE_FALLBACK),
    pageUrl: `${BASE_URL}${pathname}`,
    productName,
  })

  // Sin número configurado no se pinta nada. Una burbuja que abre un chat con
  // un número roto es peor que ninguna burbuja.
  if (!href) return null

  const isProductPage = pathname.startsWith('/producto/')

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribirnos por WhatsApp"
      // En la ficha de producto, en móvil, NO se pinta: WhatsApp va dentro de
      // la barra fija de compra (`product-hero.tsx`). Flotando encima de esa
      // barra tapaba el nombre del producto en la primera pantalla.
      className={`group fixed left-4 sm:left-6 z-[55] items-center gap-2 bottom-6 ${
        isProductPage ? 'hidden md:flex' : 'flex'
      }`}
    >
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-2xl shadow-[#25D366]/40 transition-transform duration-300 hover:scale-110 active:scale-95">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-7 h-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.886-9.885 9.886m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.488" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
      </span>

      {/* Etiqueta en escritorio: aparece al pasar el mouse y no ocupa sitio en móvil. */}
      <span className="hidden md:block max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-surface text-foreground text-sm font-medium shadow-xl border border-todopolis-lavender/40 opacity-0 transition-all duration-300 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:px-4 group-hover:py-2">
        Escríbenos por WhatsApp
      </span>
    </a>
  )
}

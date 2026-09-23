'use client'

// Burbuja de WhatsApp de la tienda. Abre la conversación con Lucy en WhatsApp
// —el mismo asesor que atiende la tienda— con el producto que el comprador
// está mirando ya escrito.
//
// DÓNDE SE PINTA: abajo a la derecha, en todas las rutas. En la ficha de
// producto, en móvil, no: ahí la barra fija de compra ya lleva WhatsApp
// (`product-hero.tsx`). Ojo con `VoiceLucy` (bottom-24, derecha), que solo
// sale en los productos que lo tengan encendido y queda por encima.

import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildWhatsAppUrl,
  pathHasNamedSubject,
  productNameFromTitle,
  resolveWhatsAppPhone,
} from '@/lib/whatsapp'
import { WhatsAppIcon } from '@/components/whatsapp-icon'

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

  // Botón de WhatsApp, abajo a la DERECHA (sep 2026). Antes iba a la
  // izquierda porque la derecha era de Lucy; el chat web se retiró y
  // WhatsApp es el único canal, así que vuelve a donde se le busca.
  //
  // Diseño: verde de WhatsApp para que se reconozca sin leer, sombra neutra
  // (el halo verde fosforescente parecía un anuncio) y sin el punto verde de
  // «en línea», que prometía una respuesta inmediata que nadie garantiza. En
  // escritorio lleva la palabra: un círculo solo no dice qué pasa al tocarlo.
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribirnos por WhatsApp"
      // En la ficha de producto, en móvil, NO se pinta: WhatsApp va dentro de
      // la barra fija de compra (`product-hero.tsx`), o como burbuja propia en
      // los Destacados.
      className={`${isProductPage ? 'hidden md:flex' : 'flex'} fixed right-4 sm:right-6 z-[55] items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 transition-all duration-200 hover:bg-[#1FB959] hover:shadow-xl active:scale-95 h-14 w-14 justify-center md:w-auto md:h-12 md:pl-4 md:pr-5`}
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <WhatsAppIcon className="h-7 w-7 md:h-5 md:w-5" />
      <span className="hidden md:inline text-sm font-bold">Escríbenos</span>
    </a>
  )
}

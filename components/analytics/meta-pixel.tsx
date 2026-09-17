'use client'

import Script from 'next/script'
import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getPixelId, setPixelId, pageview } from '@/lib/fbpixel'
import { CONSENT_COOKIE, CONSENT_UNKNOWN, hasTrackingConsent, isConsentResolved } from '@/lib/consent'

// La cookie de consentimiento no cambia mientras dure la página: al tocar el
// interruptor del pie se recarga entera. No hay a qué suscribirse.
function subscribeToConsent(): () => void {
  return () => {}
}

function readConsentCookie(): string | null {
  const row = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  return row ? row.split('=')[1] : null
}

// Dispara PageView en cada navegación SPA. Va en su propio componente porque
// useSearchParams obliga a un límite de Suspense.
function PixelRouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    pageview()
  }, [pathname, searchParams])

  return null
}

/**
 * Píxel de Meta.
 *
 * `blockedPaths` son rutas donde NO se mide nada: hoy, las fichas de bienestar
 * íntimo. Meta prohíbe anunciar productos para adultos, así que mandarle
 * eventos desde esas páginas no sirve para pautar y sí mete en la cuenta
 * publicitaria un tipo de dato que no debería estar ahí.
 *
 * El bloqueo actúa en dos momentos, porque hacen falta los dos:
 *
 *  1. Si la primera página que alguien abre es una de esas, el script ni
 *     siquiera se descarga.
 *  2. Si llega navegando desde otra página del sitio, `fbevents.js` ya está
 *     cargado; ahí lo que se corta es el `PageView`. El pixel cargado no emite
 *     nada por su cuenta, así que sin PageView ni ViewContent (que la ficha
 *     tampoco monta) no sale ningún evento.
 */
export function MetaPixel({
  blockedPaths = [],
  pixelId,
}: {
  blockedPaths?: string[]
  /** ID desde «Ajustes de Tienda» del Studio. Manda sobre la variable de entorno. */
  pixelId?: string | null
}) {
  const pathname = usePathname()
  const isBlocked = blockedPaths.includes(pathname)

  // Se fija ANTES de cualquier evento: los ayudantes de `lib/fbpixel.ts` que
  // usan el carrito y el checkout leen este valor, no la constante de entorno.
  setPixelId(pixelId)
  const activePixelId = getPixelId()

  // Consentimiento. La cookie es estado EXTERNO a React, así que se lee con
  // `useSyncExternalStore` —igual que `cookie-preferences.tsx` y que el
  // `<title>` en `whatsapp-button.tsx`— y no con un efecto que llama a
  // setState, que provoca renders en cascada.
  //
  // El snapshot del servidor devuelve el centinela CONSENT_UNKNOWN, y el render
  // de hidratación usa ese mismo valor: por eso servidor y cliente coinciden.
  // No vale `null` ahí — `null` significa «no hay cookie», que es un estado en
  // el que SÍ se mide, y el pixel se pintaría al hidratar sobre un servidor que
  // no pintó nada. Con el centinela, el pixel NO sale hasta haber comprobado:
  // quien lo desactivó no lo ve cargarse ni un instante.
  const stored = useSyncExternalStore(subscribeToConsent, readConsentCookie, () => CONSENT_UNKNOWN)
  const allowed = isConsentResolved(stored) ? hasTrackingConsent(stored) : null

  // Bloqueado no se pinta nada. Al salir hacia una página normal, este
  // componente vuelve a montarse entero: si el script nunca se había cargado,
  // se carga y su propio `fbq('track','PageView')` cuenta esa visita; si ya
  // estaba cargado de antes, quien la cuenta es `PixelRouteTracker` al montarse
  // de nuevo (Next no reejecuta un <Script> con el mismo id).
  if (!activePixelId || isBlocked || allowed !== true) return null

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${activePixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
      <Suspense fallback={null}>
        <PixelRouteTracker />
      </Suspense>
    </>
  )
}

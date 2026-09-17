'use client'

import Script from 'next/script'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getPixelId, setPixelId, pageview } from '@/lib/fbpixel'
import { CONSENT_COOKIE, hasTrackingConsent } from '@/lib/consent'

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

  // Consentimiento. Empieza en `null` y se resuelve tras montar, porque la
  // cookie solo existe en el navegador: decidirlo en el primer render daría un
  // error de hidratación. El retraso no cuesta nada — el script ya era
  // `afterInteractive`.
  //
  // `null` = todavía no se sabe → no se pinta. Así, quien rechazó no ve
  // cargarse el pixel ni un instante antes de que se compruebe.
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    const stored = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
      ?.split('=')[1]
    setAllowed(hasTrackingConsent(stored))
  }, [])

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

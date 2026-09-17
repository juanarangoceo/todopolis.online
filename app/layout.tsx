import type { Metadata } from 'next'
import { Nunito, Montserrat } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { FavoritesProvider } from '@/app/providers/favorites-provider'
import { CartProvider } from '@/app/providers/cart-provider'
import { LucyChatButton } from '@/components/lucy/lucy-chat-button'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { MetaPixel } from '@/components/analytics/meta-pixel'
import { getSanityStoreSettings } from '@/lib/sanity/queries'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

// 800 y 900 NO son decoración: `font-serif font-extrabold` y `font-black` se
// usan en el H1 de la ficha de producto, en Novedades, Ofertas y Favoritos.
// Sin cargarlos, el navegador falsificaba el grosor engordando el trazo del
// 700 (faux bold), que a 44 px se ve embarrado y con los contornos sucios.
const montserrat = Montserrat({ 
  subsets: ["latin"],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Todópolis | Tienda Online en Colombia: Hogar, Moda y Tecnología',
    // Las páginas internas ponen solo su nombre; el sufijo lo añade esta
    // plantilla. Antes varias repetían "| Todópolis" en su propio título y el
    // resultado salía duplicado: "Ofertas | Todópolis | Todópolis".
    template: '%s | Todópolis',
  },
  description: 'Tienda online colombiana con hogar, moda, tecnología, belleza y más. Pago contraentrega o pago protegido con PSE, Nequi y Bancolombia. Envío a todo el país en 3 a 7 días.',
  generator: 'Todópolis',
  applicationName: 'Todópolis',
  keywords: ['tienda online colombia', 'hogar', 'moda', 'tecnología', 'belleza', 'contraentrega', 'ofertas'],
  authors: [{ name: 'Todópolis', url: BASE_URL }],
  creator: 'Todópolis',
  publisher: 'Todópolis',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: BASE_URL,
    siteName: 'Todópolis',
    title: 'Todópolis | Tienda Online en Colombia: Hogar, Moda y Tecnología',
    description: 'Tienda online colombiana con hogar, moda, tecnología, belleza y más. Pago contraentrega o pago protegido con PSE, Nequi y Bancolombia. Envío a todo el país en 3 a 7 días.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Todópolis | Tienda Online en Colombia: Hogar, Moda y Tecnología',
    description: 'Tienda online colombiana con hogar, moda, tecnología, belleza y más. Pago contraentrega o pago protegido con PSE, Nequi y Bancolombia. Envío a todo el país en 3 a 7 días.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

// JSON-LD de marca — base para Google y agentes IA (GEO).
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Todópolis',
      url: BASE_URL,
      description:
        'Tienda online colombiana de productos de belleza, hogar, tecnología, moda y bienestar. Pago contraentrega en toda Colombia.',
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'Todópolis',
      url: BASE_URL,
      inLanguage: 'es-CO',
      publisher: { '@id': `${BASE_URL}/#organization` },
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // El fetch está cacheado (revalidate + tag `storeSettings`), así que esto no
  // vuelve dinámicas las páginas estáticas. `getSanityStoreSettings` ya devuelve
  // `null` si Sanity falla: la burbuja cae entonces al número de la variable en
  // vez de desaparecer.
  const storeSettings = await getSanityStoreSettings()

  return (
    <html lang="es" className={`${nunito.variable} ${montserrat.variable} h-full antialiased`}>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}</Script>
        </>
      )}
      <body className="font-sans min-h-full flex flex-col">
        <MetaPixel />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <FavoritesProvider>
          <CartProvider>
            {children}
            <LucyChatButton />
            <WhatsAppButton phone={storeSettings?.whatsappPhone ?? null} />
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  )
}

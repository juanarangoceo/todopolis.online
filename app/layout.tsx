import type { Metadata } from 'next'
import { Nunito, Montserrat } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { FavoritesProvider } from '@/app/providers/favorites-provider'
import { CartProvider } from '@/app/providers/cart-provider'
import { LucyChatButton } from '@/components/lucy/lucy-chat-button'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const montserrat = Montserrat({ 
  subsets: ["latin"],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Todopolis - Tu Destino de Belleza',
    template: '%s | Todopolis',
  },
  description: 'Descubre productos exclusivos de belleza y bienestar en Todopolis. Tu tienda de confianza con los mejores productos seleccionados para ti.',
  generator: 'Todopolis',
  applicationName: 'Todopolis',
  keywords: ['belleza', 'bienestar', 'productos', 'tienda online', 'colombia', 'ofertas'],
  authors: [{ name: 'Todopolis', url: BASE_URL }],
  creator: 'Todopolis',
  publisher: 'Todopolis',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: BASE_URL,
    siteName: 'Todopolis',
    title: 'Todopolis - Tu Destino de Belleza',
    description: 'Descubre productos exclusivos de belleza y bienestar en Todopolis.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Todopolis - Tu Destino de Belleza',
    description: 'Descubre productos exclusivos de belleza y bienestar en Todopolis.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        <FavoritesProvider>
          <CartProvider>
            {children}
            <LucyChatButton />
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  )
}

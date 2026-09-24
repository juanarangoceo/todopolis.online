import type { Metadata, Viewport } from 'next'
import { AdminNav } from './_components/admin-nav'

// Layout del panel. No lleva Header ni Footer de la tienda a propósito: es una
// herramienta de trabajo, y el buscador, el carrito y la burbuja de WhatsApp
// (esa se apaga en `whatsapp-button.tsx` para /admin) solo estorban.
// El panel se instala como app en el celular, igual que el de nitro_bot. El
// manifest es un archivo estático (`public/admin.webmanifest`) y no un Route
// Handler: bajo un segmento Next le añade `vary: rsc, …` y no declara charset,
// y en Nitro eso bastó para que Android no generara la WebAPK. El nombre va
// sin tildes por lo mismo: Google lo hornea dentro del APK.
export const metadata: Metadata = {
  title: 'Panel · Todópolis',
  robots: { index: false, follow: false },
  applicationName: 'Todopolis Admin',
  manifest: '/admin.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Todopolis',
    statusBarStyle: 'default',
  },
  icons: {
    apple: [{ url: '/icons/admin-apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-soft md:flex">
      <AdminNav />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}

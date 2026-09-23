import type { Metadata } from 'next'
import { AdminNav } from './_components/admin-nav'

// Layout del panel. No lleva Header ni Footer de la tienda a propósito: es una
// herramienta de trabajo, y el buscador, el carrito y la burbuja de WhatsApp
// (esa se apaga en `whatsapp-button.tsx` para /admin) solo estorban.
export const metadata: Metadata = {
  title: 'Panel · Todópolis',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-soft md:flex">
      <AdminNav />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}

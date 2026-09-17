import Link from 'next/link'

// Navegación del panel. No existía: a /admin/mastershop se llegaba escribiendo
// la dirección, y con el panel de pedidos ya son dos sitios.
//
// No lleva Header ni Footer de la tienda a propósito: es una herramienta de
// trabajo, no una página de venta, y el buscador y el carrito ahí solo estorban.
const LINKS = [
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/mastershop', label: 'Mastershop' },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-soft">
      <nav className="sticky top-0 z-40 border-b border-nav-inactive-border bg-surface/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 flex items-center gap-1 h-14">
          <Link href="/" className="font-serif text-sm font-extrabold text-ink-title mr-4">
            Todópolis
          </Link>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-xl text-sm font-bold text-foreground/60 hover:text-foreground hover:bg-surface-muted transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  )
}

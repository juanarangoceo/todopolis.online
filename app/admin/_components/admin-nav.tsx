'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Download, ExternalLink, Gauge, LayoutDashboard, LogOut, Package, PenSquare, ShoppingBag } from 'lucide-react'
import { InstallAppButton } from './install-app'

const LOGO_URL = 'https://res.cloudinary.com/dohwyszdj/image/upload/f_auto,q_auto,w_320/v1779801383/logo_nuevo_todopolis_1_ljlqn6.png'

const LINKS = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/mastershop', label: 'Importar productos', icon: Package },
  { href: '/admin/profit', label: 'Nitro Profit', icon: Gauge },
] as const

const EXTERNAL = [
  { href: '/studio', label: 'Studio (contenido)', icon: PenSquare },
  { href: '/', label: 'Ver la tienda', icon: ExternalLink },
] as const

// Navegación del panel: barra lateral en escritorio, fila deslizable en móvil.
export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  if (pathname.startsWith('/admin/login')) return null

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const item = (active: boolean) =>
    `flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-bold transition-colors ${
      active ? 'bg-tag-active-bg text-tag-active-fg' : 'text-foreground/65 hover:bg-surface-muted hover:text-ink-title'
    }`

  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-nav-inactive-border bg-surface px-3 py-5 md:flex">
        <Link href="/admin" className="mb-1 px-3">
          <Image src={LOGO_URL} alt="Todópolis" width={128} height={32} style={{ height: 32, width: 'auto' }} priority />
        </Link>
        <p className="mb-5 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Panel</p>
        <nav className="flex flex-col gap-1" aria-label="Panel">
          {LINKS.map(({ href, label, icon: Icon, ...rest }) => (
            <Link key={href} href={href} className={item(isActive(href, 'exact' in rest))}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-nav-inactive-border pt-4">
          {EXTERNAL.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={item(false)}>
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-1">
          <InstallAppButton className={item(false)}>
            <Download className="h-4 w-4" />
            Instalar app
          </InstallAppButton>
          <button type="button" onClick={logout} className={item(false)}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Móvil */}
      <header className="sticky top-0 z-40 border-b border-nav-inactive-border bg-surface/95 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin">
            <Image src={LOGO_URL} alt="Todópolis" width={112} height={28} style={{ height: 28, width: 'auto' }} priority />
          </Link>
          <div className="flex items-center gap-1">
            <InstallAppButton className="flex items-center gap-1.5 rounded-full border border-nav-inactive-border px-3 py-1.5 text-xs font-bold text-ink-title">
              <Download className="h-3.5 w-3.5" />
              Instalar
            </InstallAppButton>
            <button type="button" onClick={logout} className="rounded-full p-2 text-foreground/60" aria-label="Cerrar sesión">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="-mt-1 flex gap-1 overflow-x-auto px-3 pb-2" style={{ scrollbarWidth: 'none' }} aria-label="Panel">
          {LINKS.map(({ href, label, icon: Icon, ...rest }) => (
            <Link key={href} href={href} className={`${item(isActive(href, 'exact' in rest))} shrink-0 py-1.5`}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Heart, Zap, BookOpen, Menu, X, Home, Star, LayoutGrid } from 'lucide-react'
import { useCart } from '@/app/providers/cart-provider'
import { CartSidebar } from '@/components/cart-sidebar'
import { useFavorites } from '@/app/providers/favorites-provider'
import { ProductsCounter } from '@/components/products-counter'

// Cloudinary admite transforms en el URL para servir un tamaño optimizado.
// w_X,q_auto,f_auto le pide ~X px de ancho, calidad auto y formato (webp/avif) auto.
const LOGO_URL = 'https://res.cloudinary.com/dohwyszdj/image/upload/f_auto,q_auto,w_320/v1779801383/logo_nuevo_todopolis_1_ljlqn6.png'

function Logo({ small = false }: { small?: boolean }) {
  const height = small ? 32 : 40
  const width = small ? 128 : 160
  return (
    <Link
      href="/"
      className="relative z-10 flex items-center group"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('todopolis:reset-home'))
        }
      }}
    >
      <Image
        src={LOGO_URL}
        alt="Todópolis"
        width={width}
        height={height}
        priority
        className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
        style={{ height: `${height}px`, width: 'auto' }}
      />
    </Link>
  )
}

// 38 px: con cinco íconos y el logo, 44 px no caben en 390 px de ancho.
const MOBILE_ICON =
  'relative shrink-0 p-[9px] rounded-2xl bg-surface border border-nav-inactive-border shadow-sm active:scale-95 transition-all'
const DESKTOP_LINK =
  'rounded-full px-3 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted hover:text-ink-title'
const DESKTOP_ICON =
  'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-muted'

const NAV_LINKS = [
  { href: '/ofertas', label: 'Ofertas' },
  { href: '/colecciones', label: 'Colecciones' },
  { href: '/blog', label: 'Blog' },
] as const

export function Header() {
  const { totalItems, openCart } = useCart()
  const { favoriteSlugs } = useFavorites()
  const [menuOpen, setMenuOpen] = useState(false)

  // Bloquea scroll del body cuando el drawer está abierto y cierra con ESC.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className="sticky top-0 z-40 w-full" id="site-header">
        {/* Casi opaco: al 80 % las fotos con texto del catálogo se leían a
            través del logo al bajar la página. */}
        <div className="absolute inset-0 bg-surface/95 backdrop-blur-xl border-b border-nav-inactive-border" />

        <div className="container mx-auto px-4 relative">
          {/* ── Mobile layout ── */}
          <div className="md:hidden flex items-center gap-1 h-16">
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              className={MOBILE_ICON}
              style={{ touchAction: 'manipulation' }}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>

            <div className="flex flex-1 justify-center min-w-0">
              <Logo small />
            </div>

            {/* Lupa de móvil: la pinta `MobileSearchFab` por portal, solo en
                las páginas con buscador y solo cuando la barra ya se fue de la
                pantalla. Antes flotaba en `top-24 right-4`, justo encima del
                corazón de favoritos de la columna derecha del catálogo. */}
            <div id="header-mobile-search-slot" className="contents" />

            {/* Destacados → estrella dorada, acceso directo a la selección */}
            <Link
              href="/destacados"
              className={`${MOBILE_ICON} bg-amber-50 border-amber-300/70`}
              aria-label="Productos Destacados"
              style={{ touchAction: 'manipulation' }}
            >
              <Star className="w-5 h-5 text-amber-600" fill="currentColor" strokeWidth={1.5} />
            </Link>

            {/* Favorites — ícono rosa (semántica emocional) */}
            <Link
              href="/favoritos"
              className={MOBILE_ICON}
              aria-label="Favoritos"
              style={{ touchAction: 'manipulation' }}
            >
              <Heart className="w-5 h-5 text-todopolis-pink-deep" />
              {favoriteSlugs.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-accent-feminine text-todopolis-pink-deep text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {favoriteSlugs.length}
                </span>
              )}
            </Link>

            {/* Cart — ícono salmón (semántica de compra) */}
            <button
              onClick={openCart}
              className={MOBILE_ICON}
              aria-label="Carrito"
              style={{ touchAction: 'manipulation' }}
            >
              <ShoppingBag className="w-5 h-5 text-cta" />
              <span className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-cta text-cta-fg text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm transition-all ${totalItems > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                {totalItems}
              </span>
            </button>
          </div>

          {/* ── Desktop layout ──
              Antes: seis píldoras con borde, en MAYÚSCULAS y cada una de un
              color (dorado, rojo, azul, lila), más un contador de productos
              junto al logo. Nueve cajas compitiendo con el buscador, y
              «Ofertas» en rojo, que es el color reservado al botón de compra.
              Ahora las secciones son texto, los íconos van sin caja, y el
              buscador —la herramienta principal con 578 productos— se queda
              con el espacio. Solo Destacados conserva su dorado: es la
              distinción comercial. */}
          <div className="hidden md:flex h-16 items-center gap-6">
            <div className="shrink-0">
              <Logo />
            </div>

            <div className="flex flex-1 min-w-0 justify-center">
              <div id="header-search-slot" className="w-full max-w-xl" />
            </div>

            <nav aria-label="Secciones" className="flex shrink-0 items-center gap-1 lg:gap-2">
              <Link
                href="/destacados"
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-50"
                title="Productos Destacados — envío gratis"
              >
                <Star className="w-4 h-4 text-amber-500" fill="currentColor" strokeWidth={1.5} />
                Destacados
              </Link>
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className={DESKTOP_LINK}>
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 border-l border-nav-inactive-border pl-3">
              {/* Sin chat aquí: el sitio atiende solo por WhatsApp (burbuja
                  flotante, `whatsapp-button.tsx`). El chat web de Lucy se
                  retiró en sep 2026. */}
              <Link href="/favoritos" className={DESKTOP_ICON} aria-label="Favoritos" title="Favoritos">
                <Heart className="w-5 h-5 text-todopolis-pink-deep" />
                {favoriteSlugs.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-accent-feminine text-todopolis-pink-deep text-[10px] font-bold rounded-full flex items-center justify-center">
                    {favoriteSlugs.length}
                  </span>
                )}
              </Link>

              <button onClick={openCart} className={DESKTOP_ICON} aria-label="Carrito" title="Carrito">
                <ShoppingBag className="w-5 h-5 text-cta" />
                <span className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-cta text-cta-fg text-[10px] font-bold rounded-full flex items-center justify-center transition-all ${totalItems > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                  {totalItems}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed inset-0 z-[55] md:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={closeMenu}
        />

        {/* Panel — fondo neutro, sin manchas de adorno (docs/identidad-de-marca.md §4) */}
        <aside
          className={`absolute top-0 left-0 h-full w-[82%] max-w-sm bg-surface shadow-2xl border-r border-nav-inactive-border flex flex-col transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="dialog"
          aria-modal="true"
        >

          {/* Header del drawer */}
          <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-nav-inactive-border">
            <Logo small />
            <button
              onClick={closeMenu}
              aria-label="Cerrar menú"
              className="p-2 rounded-full bg-surface hover:bg-surface-muted border border-nav-inactive-border text-foreground/60 hover:text-foreground transition-all shadow-sm"
              style={{ touchAction: 'manipulation' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contador de productos en el drawer móvil */}
          <div className="relative px-4 pt-4">
            <ProductsCounter variant="mobile-drawer" />
          </div>

          {/* Menú */}
          <nav className="relative flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface hover:bg-surface-muted border border-nav-inactive-border hover:border-todopolis-blue transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-foreground/70" />
              </span>
              <span className="font-bold text-sm text-foreground">Inicio</span>
            </Link>
            <Link
              href="/destacados"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                borderColor: '#F59E0B66',
              }}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                  borderColor: '#F59E0B',
                }}
              >
                <Star className="w-4 h-4 text-amber-900" fill="currentColor" strokeWidth={1.5} />
              </span>
              <span className="font-bold text-sm text-amber-900">Destacados</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-700">Envío gratis</span>
            </Link>
            <Link
              href="/ofertas"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface hover:bg-surface-muted border border-nav-inactive-border hover:border-foreground/20 transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-foreground/70" />
              </span>
              <span className="font-bold text-sm text-foreground">Ofertas</span>
            </Link>
            <Link
              href="/colecciones"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface hover:bg-todopolis-blue/10 border border-nav-inactive-border hover:border-todopolis-blue transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                <LayoutGrid className="w-4 h-4 text-foreground/70" />
              </span>
              <span className="font-bold text-sm text-foreground">Colecciones</span>
            </Link>
            <Link
              href="/blog"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface hover:bg-todopolis-lavender/15 border border-nav-inactive-border hover:border-todopolis-lavender transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-foreground/70" />
              </span>
              <span className="font-bold text-sm text-foreground">Blog</span>
            </Link>

          </nav>

          {/* Footer del drawer */}
          <div className="relative px-5 py-4 border-t border-nav-inactive-border text-[11px] text-foreground/50 text-center">
            Envío a toda Colombia · Te atendemos por WhatsApp
          </div>
        </aside>
      </div>

      <CartSidebar />
    </>
  )
}

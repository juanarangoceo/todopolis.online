'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Heart, MessageCircle, Zap, BookOpen, Menu, X, Home } from 'lucide-react'
import { useCart } from '@/app/providers/cart-provider'
import { CartSidebar } from '@/components/cart-sidebar'
import { useFavorites } from '@/app/providers/favorites-provider'

function Logo({ small = false }: { small?: boolean }) {
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
      <span className={`font-sans font-black tracking-tight text-foreground relative ${small ? 'text-2xl' : 'text-3xl'}`}>
        Todo
        <span className="bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] bg-clip-text text-transparent">polis</span>
        <span className="absolute -top-1 -right-3 w-2 h-2 bg-[#FFB4AC] rounded-full group-hover:animate-ping" />
      </span>
    </Link>
  )
}

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

  const openLucy = () => {
    closeMenu()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lucy:open-chat'))
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full" id="site-header">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-[#EDD2F3]/30" />

        <div className="container mx-auto px-4 relative">
          {/* ── Mobile layout ── */}
          <div className="md:hidden grid grid-cols-[auto_1fr_auto] items-center gap-3 h-16">
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              className="p-2.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/40 to-[#EDD2F3]/40 hover:from-[#FFB4AC]/70 hover:to-[#EDD2F3]/70 transition-all shadow-sm active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>

            {/* Centered logo */}
            <div className="flex justify-center">
              <Logo small />
            </div>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/50 to-[#FFD5E5]/50 hover:from-[#FFB4AC]/80 hover:to-[#FFD5E5]/80 transition-all shadow-sm active:scale-95"
              aria-label="Carrito"
              style={{ touchAction: 'manipulation' }}
            >
              <ShoppingBag className="w-5 h-5 text-foreground" />
              <span className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-[#FFB4AC] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm transition-all ${totalItems > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                {totalItems}
              </span>
            </button>
          </div>

          {/* ── Desktop layout ── */}
          <div className="hidden md:flex h-16 items-center justify-between gap-3">
            {/* Left — Brand Logo */}
            <div className="flex shrink-0 w-40 justify-start">
              <Logo />
            </div>

            {/* Center — desktop search slot */}
            <div className="flex flex-1 max-w-2xl justify-center px-4">
              <div id="header-search-slot" className="w-full" />
            </div>

            {/* Right — actions */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              <Link
                href="/blog"
                className="group relative flex items-center gap-1 px-3 py-2 rounded-2xl bg-gradient-to-br from-[#6366f1]/10 to-[#8b5cf6]/10 hover:from-[#6366f1]/25 hover:to-[#8b5cf6]/25 border border-[#6366f1]/20 hover:border-[#6366f1]/40 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Blog"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#6366f1] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-[#6366f1] uppercase tracking-wide">Blog</span>
              </Link>

              <Link
                href="/ofertas"
                className="group relative flex items-center gap-1 px-3 py-2 rounded-2xl bg-gradient-to-br from-[#F43F5E]/10 to-[#FFB4AC]/10 hover:from-[#F43F5E]/25 hover:to-[#FFB4AC]/25 border border-[#F43F5E]/20 hover:border-[#F43F5E]/40 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Ver ofertas"
              >
                <Zap className="w-3.5 h-3.5 text-[#F43F5E] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-[#F43F5E] uppercase tracking-wide">Ofertas</span>
              </Link>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('lucy:open-chat'))}
                className="group relative p-2.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/50 to-[#FFD5E5]/50 hover:from-[#FFB4AC]/80 hover:to-[#FFD5E5]/80 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Chat con Lucy"
                title="Hablar con Lucy"
              >
                <MessageCircle className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
              </button>

              <Link
                href="/favoritos"
                className="group relative p-2.5 rounded-2xl bg-gradient-to-br from-[#FFD5E5]/50 to-[#EDD2F3]/50 hover:from-[#FFD5E5]/80 hover:to-[#EDD2F3]/80 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Favoritos"
              >
                <Heart className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                {favoriteSlugs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EDD2F3] text-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {favoriteSlugs.length}
                  </span>
                )}
              </Link>

              <button
                onClick={openCart}
                className="group relative p-2.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/50 to-[#FFD5E5]/50 hover:from-[#FFB4AC]/80 hover:to-[#FFD5E5]/80 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Carrito"
              >
                <ShoppingBag className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                <span className={`absolute -top-1 -right-1 w-4 h-4 bg-[#FFB4AC] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm transition-all ${totalItems > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
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

        {/* Panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-[82%] max-w-sm bg-gradient-to-b from-[#FFF5F8] via-white to-[#FFF8FA] shadow-2xl border-r border-[#EDD2F3]/40 flex flex-col transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="dialog"
          aria-modal="true"
        >
          {/* Decorative blobs */}
          <div aria-hidden className="absolute top-0 right-0 w-48 h-48 bg-[#FFD5E5]/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 left-0 w-40 h-40 bg-[#EDD2F3]/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          {/* Header del drawer */}
          <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EDD2F3]/30">
            <Logo small />
            <button
              onClick={closeMenu}
              aria-label="Cerrar menú"
              className="p-2 rounded-full bg-white/80 hover:bg-white border border-[#EDD2F3]/30 text-foreground/60 hover:text-foreground transition-all shadow-sm"
              style={{ touchAction: 'manipulation' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Menú */}
          <nav className="relative flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/70 hover:bg-white border border-transparent hover:border-[#FFB4AC]/40 transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB4AC]/30 to-[#FFD5E5]/30 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-[#F43F5E]" />
              </span>
              <span className="font-bold text-sm text-foreground">Inicio</span>
            </Link>

            <Link
              href="/ofertas"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/70 hover:bg-white border border-transparent hover:border-[#F43F5E]/40 transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F43F5E]/15 to-[#FFB4AC]/15 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-[#F43F5E]" />
              </span>
              <span className="font-bold text-sm text-foreground">Ofertas</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#F43F5E]">Hot</span>
            </Link>

            <Link
              href="/favoritos"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/70 hover:bg-white border border-transparent hover:border-[#EDD2F3]/60 transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFD5E5]/40 to-[#EDD2F3]/40 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-[#C2185B]" />
              </span>
              <span className="font-bold text-sm text-foreground">Favoritos</span>
              {favoriteSlugs.length > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1.5 bg-[#EDD2F3] text-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favoriteSlugs.length}
                </span>
              )}
            </Link>

            <Link
              href="/blog"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/70 hover:bg-white border border-transparent hover:border-[#6366f1]/40 transition-all shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1]/15 to-[#8b5cf6]/15 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-[#6366f1]" />
              </span>
              <span className="font-bold text-sm text-foreground">Blog</span>
            </Link>

            <button
              onClick={openLucy}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/20 to-[#FFD5E5]/20 hover:from-[#FFB4AC]/40 hover:to-[#FFD5E5]/40 border border-[#FFB4AC]/40 transition-all shadow-sm text-left"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] flex items-center justify-center shrink-0 shadow-md">
                <MessageCircle className="w-4 h-4 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
              </span>
              <span className="flex flex-col">
                <span className="font-bold text-sm text-foreground leading-tight">Hablar con Lucy</span>
                <span className="text-[11px] text-foreground/60 leading-tight">Asesora 24/7</span>
              </span>
            </button>
          </nav>

          {/* Footer del drawer */}
          <div className="relative px-5 py-4 border-t border-[#EDD2F3]/30 text-[11px] text-foreground/50 text-center">
            Envío contraentrega a todo Colombia
          </div>
        </aside>
      </div>

      <CartSidebar />
    </>
  )
}

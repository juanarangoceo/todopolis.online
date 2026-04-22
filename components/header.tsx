'use client'

import Link from 'next/link'
import { ShoppingBag, Heart, Wand2, MessageCircle } from 'lucide-react'
import { useCart } from '@/app/providers/cart-provider'
import { CartSidebar } from '@/components/cart-sidebar'
import { useFavorites } from '@/app/providers/favorites-provider'

export function Header() {
  const { totalItems, openCart } = useCart()
  const { favoriteSlugs } = useFavorites()

  return (
    <>
      <header className="sticky top-0 z-40 w-full" id="site-header">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-[#EDD2F3]/30" />
        
        <div className="container mx-auto px-4 relative">
          <div className="flex h-16 items-center justify-between gap-3">
            
            {/* Left — Brand Logo */}
            <div className="flex shrink-0 w-28 md:w-40 justify-start">
              <Link href="/" className="flex items-center group">
                <span className="font-sans text-2xl md:text-3xl font-black tracking-tight text-foreground relative">
                  Todo
                  <span className="bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] bg-clip-text text-transparent">polis</span>
                  <span className="absolute -top-1 -right-3 w-2 h-2 bg-[#FFB4AC] rounded-full group-hover:animate-ping" />
                </span>
              </Link>
            </div>

            {/* Center — desktop search slot */}
            <div className="hidden md:flex flex-1 max-w-2xl justify-center px-4">
              <div id="header-search-slot" className="w-full" />
            </div>

            {/* Right — Lucy icons + Favorites + Cart */}
            <div className="flex items-center justify-end gap-1.5 md:gap-2 w-28 md:w-40 shrink-0">

              {/* Lucy Chat icon */}
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.dispatchEvent(new CustomEvent('lucy:open-chat'))
                }}
                className="group relative p-2 md:p-2.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/50 to-[#FFD5E5]/50 hover:from-[#FFB4AC]/80 hover:to-[#FFD5E5]/80 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Chat con Lucy"
                title="Hablar con Lucy"
              >
                <MessageCircle className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                {/* Live indicator dot */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
              </Link>

              {/* Favorites */}
              <Link
                href="/favoritos"
                className="group relative p-2 md:p-2.5 rounded-2xl bg-gradient-to-br from-[#FFD5E5]/50 to-[#EDD2F3]/50 hover:from-[#FFD5E5]/80 hover:to-[#EDD2F3]/80 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#FFD5E5]/30"
                aria-label="Favoritos"
              >
                <Heart className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                {favoriteSlugs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EDD2F3] text-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {favoriteSlugs.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <button
                onClick={openCart}
                className="group relative p-2 md:p-2.5 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/50 to-[#FFD5E5]/50 hover:from-[#FFB4AC]/80 hover:to-[#FFD5E5]/80 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#FFB4AC]/30"
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

      <CartSidebar />
    </>
  )
}

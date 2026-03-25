'use client';

import Link from 'next/link';
import { ShoppingBag, Heart } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-[#EDD2F3]/30" />
      
      <div className="container mx-auto px-4 relative">
        <div className="flex h-20 items-center justify-between">
          {/* Left side - Favorites */}
          <div className="flex items-center gap-3 w-28">
            <button 
              className="group p-3 rounded-2xl bg-gradient-to-br from-[#FFD5E5]/50 to-[#EDD2F3]/50 hover:from-[#FFD5E5]/80 hover:to-[#EDD2F3]/80 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#FFD5E5]/30" 
              aria-label="Favoritos"
            >
              <Heart className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Center - Brand Logo */}
          <Link href="/" className="flex items-center justify-center group">
            <span className="font-sans text-3xl md:text-4xl font-black tracking-tight text-foreground relative">
              Todo
              <span className="bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] bg-clip-text text-transparent">polis</span>
              {/* Decorative dot */}
              <span className="absolute -top-1 -right-3 w-2 h-2 bg-[#FFB4AC] rounded-full group-hover:animate-ping" />
            </span>
          </Link>

          {/* Right side - Cart */}
          <div className="flex items-center justify-end gap-3 w-28">
            <button 
              className="group relative p-3 rounded-2xl bg-gradient-to-br from-[#FFB4AC]/50 to-[#FFD5E5]/50 hover:from-[#FFB4AC]/80 hover:to-[#FFD5E5]/80 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#FFB4AC]/30" 
              aria-label="Carrito"
            >
              <ShoppingBag className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFB4AC] text-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                0
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

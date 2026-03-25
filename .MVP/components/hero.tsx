'use client';

import { Sparkles, Star } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Animated background with brand colors */}
      <div className="absolute inset-0 -z-10">
        {/* Main gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFD5E5]/40 via-[#EDD2F3]/30 to-[#A2D2FF]/40" />
        
        {/* Floating orbs */}
        <div className="absolute top-10 left-[10%] w-72 h-72 bg-[#FFD5E5]/50 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-20 right-[15%] w-96 h-96 bg-[#A2D2FF]/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-10 left-[30%] w-80 h-80 bg-[#EDD2F3]/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-[10%] w-64 h-64 bg-[#E7FBBE]/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        {/* Decorative shapes */}
        <div className="absolute top-1/4 left-[5%] w-4 h-4 bg-[#FFB4AC] rounded-full opacity-60" />
        <div className="absolute top-1/3 right-[8%] w-3 h-3 bg-[#A2D2FF] rounded-full opacity-70" />
        <div className="absolute bottom-1/4 left-[15%] w-5 h-5 bg-[#E7FBBE] rounded-full opacity-50" />
        <div className="absolute top-1/2 right-[20%] w-2 h-2 bg-[#EDD2F3] rounded-full opacity-80" />
      </div>
      
      <div className="container mx-auto px-4 text-center relative">
        {/* Floating sparkles around content */}
        <Sparkles className="absolute top-0 left-1/4 w-6 h-6 text-[#FFB4AC]/60 animate-bounce" style={{ animationDuration: '3s' }} />
        <Star className="absolute top-10 right-1/4 w-5 h-5 text-[#A2D2FF]/60 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-10 left-1/3 w-4 h-4 text-[#EDD2F3]/60 animate-bounce" style={{ animationDuration: '2s', animationDelay: '1s' }} />
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-[#FFB4AC]/30 shadow-lg shadow-[#FFD5E5]/20 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB4AC] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFB4AC]"></span>
          </span>
          <span className="text-sm font-bold text-foreground tracking-wide">Tu tienda favorita de todo lo que amas</span>
          <Sparkles className="w-4 h-4 text-[#FFB4AC]" />
        </div>
        
        {/* Main heading */}
        <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-[1.1] text-balance">
          Todo lo que
          <span className="relative inline-block mx-3">
            <span className="relative z-10 bg-gradient-to-r from-[#FFB4AC] via-[#EDD2F3] to-[#A2D2FF] bg-clip-text text-transparent">
              necesitas
            </span>
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#FFB4AC]/30" viewBox="0 0 100 12" preserveAspectRatio="none">
              <path d="M0,8 Q25,0 50,8 T100,8" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
          </span>
          <br className="hidden md:block" />
          en un solo lugar
        </h1>
        
        {/* Subtitle */}
        <p className="mt-8 text-lg md:text-xl lg:text-2xl text-foreground/70 max-w-3xl mx-auto text-pretty font-serif font-medium leading-relaxed">
          Miles de productos seleccionados especialmente para ti. Moda, hogar, tecnologia, belleza y mucho mas.
          <span className="block mt-2 text-[#FFB4AC] font-bold">Encuentra todo lo que buscas aqui.</span>
        </p>
        
        {/* Stats or trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-black text-foreground">500+</span>
            <span className="text-sm text-foreground/60 font-medium">Productos</span>
          </div>
          <div className="w-px h-12 bg-[#EDD2F3]" />
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-black text-foreground">15K+</span>
            <span className="text-sm text-foreground/60 font-medium">Clientas felices</span>
          </div>
          <div className="w-px h-12 bg-[#EDD2F3]" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="text-3xl md:text-4xl font-black text-foreground">4.9</span>
              <Star className="w-6 h-6 fill-[#FFB4AC] text-[#FFB4AC]" />
            </div>
            <span className="text-sm text-foreground/60 font-medium">Calificacion</span>
          </div>
        </div>
      </div>
    </section>
  );
}

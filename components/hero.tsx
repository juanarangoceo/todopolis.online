import { Sparkles, Star } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-4 pb-4 md:pt-8 md:pb-6 overflow-hidden">
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
        <Sparkles className="absolute -top-6 md:-top-2 left-2 md:left-[15%] w-5 h-5 md:w-6 md:h-6 text-[#FFB4AC]/60 animate-bounce" style={{ animationDuration: '3s' }} />
        <Star className="absolute top-6 md:top-10 right-2 md:right-[15%] w-4 h-4 md:w-5 md:h-5 text-[#A2D2FF]/60 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-2 md:bottom-8 left-6 md:left-[20%] w-3 h-3 md:w-4 md:h-4 text-[#EDD2F3]/60 animate-bounce" style={{ animationDuration: '2s', animationDelay: '1s' }} />
        
        {/* Badge removed */}
        
        {/* Main heading */}
        <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-black text-[#0D2651] leading-[1.1] text-balance">
          Todo lo que
          <span className="relative inline-block mx-3">
            <span className="relative z-10 bg-gradient-to-r from-[#FFB4AC] via-[#EDD2F3] to-[#A2D2FF] bg-clip-text text-transparent">
              necesitas
            </span>
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#FFB4AC]/30" viewBox="0 0 100 12" preserveAspectRatio="none">
              <path d="M0,8 Q25,0 50,8 T100,8" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
          </span>
          <br className="block" />
          en un solo lugar
        </h1>
        
        {/* Subtitle */}
        <p className="mt-4 text-base md:text-lg lg:text-xl text-foreground/70 max-w-2xl mx-auto text-pretty font-serif font-medium leading-relaxed">
          Miles de productos seleccionados especialmente para ti.
        </p>
        
      </div>
    </section>
  );
}

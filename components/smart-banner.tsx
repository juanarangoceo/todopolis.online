'use client';

import { HeroBanner, StoreSettings } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function SmartBanner({ banner, settings }: { banner: HeroBanner | null, settings?: StoreSettings | null }) {
  if (!banner || !banner.products || banner.products.length === 0) return null;

  return (
    <section className="w-full pt-4 md:pt-6 pb-2">
      <div className="container mx-auto px-4">
        <div 
          className="relative w-full rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between p-8 md:p-12 lg:p-16 min-h-[300px] md:min-h-[380px]"
          style={{ backgroundColor: banner.backgroundColor || '#FDF4FF' }}
        >
          {/* Background decorations */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-64 h-64 bg-white/40 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-64 h-64 bg-white/40 blur-3xl rounded-full pointer-events-none" />

          {/* Left Content (Text) */}
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left w-full md:w-1/2 mb-10 md:mb-0">

            <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.1] mb-4 drop-shadow-sm">
              {banner.title}
            </h2>
            <p className="text-sm md:text-lg text-neutral-700 max-w-md mb-8 opacity-90 font-medium">
              {banner.subtitle}
            </p>
            <Link 
              href="#products" 
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-8 py-3.5 rounded-full font-bold transition-transform hover:scale-105 shadow-xl shadow-neutral-900/20"
            >
              Productos en Oferta
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right Content (Floating Products) */}
          <div className="relative z-10 w-full md:w-1/2 flex items-center md:justify-end mt-4 md:mt-0">
            {/* Mobile: Snap Carousel — rompe el padding del banner para ir de lado a lado */}
            <div className="w-full flex md:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-6 pt-2 -mx-8 px-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {banner.products.map((product) => {
                const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO');
                return (
                  <Link
                    href={`/producto/${product.slug}`}
                    key={product._id}
                    className="shrink-0 snap-center w-[58vw] transition-transform hover:scale-105"
                  >
                    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white">
                      <Image
                        src={product.mastershopImageUrl || product.image || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded-xl p-1.5 flex justify-center items-center border border-white/20">
                        <span className="text-white text-sm font-bold">{formatPrice(product.price ?? 0)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
              <div className="shrink-0 w-4" />
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex relative w-full h-[320px] justify-center items-center">
              {banner.products.map((product, idx) => {
                // Desktop styles: Spread out horizontally with different rotations and sizes
                const styles = [
                  { zIndex: 30, transform: 'translateX(0) scale(1.1)', rotate: 'rotate-0' }, // Center front
                  { zIndex: 20, transform: 'translateX(-60%) scale(0.95)', rotate: '-rotate-6' }, // Left back
                  { zIndex: 10, transform: 'translateX(60%) scale(0.9)', rotate: 'rotate-12' }, // Right back
                ];
                
                const style = styles[idx] || styles[0];
                const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO');

                return (
                  <Link 
                    href={`/producto/${product.slug}`}
                    key={product._id}
                    className={`absolute transition-transform hover:z-50 hover:!scale-110 duration-500 ${style.rotate} origin-bottom`}
                    style={{ transform: style.transform, zIndex: style.zIndex }}
                  >
                    <div className="relative w-[180px] h-[240px] lg:w-[200px] lg:h-[280px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white group bg-white">
                      <Image 
                        src={product.mastershopImageUrl || product.image || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* Price Tag */}
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded-xl p-1.5 flex justify-center items-center border border-white/20">
                        <span className="text-white text-sm font-bold">{formatPrice(product.price ?? 0)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

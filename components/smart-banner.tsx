'use client';

import { HeroBanner, Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

interface SmartBannerProps {
  banner: HeroBanner | null
  allProducts?: Product[]
}

export function SmartBanner({ banner, allProducts = [] }: SmartBannerProps) {
  if (!banner) return null;

  const gridProducts = allProducts.slice(0, 12);
  const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO');

  return (
    <section className="w-full pt-4 md:pt-5 pb-2">
      <div className="container mx-auto px-4">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-md"
          style={{ background: 'linear-gradient(135deg, #FFF0F8 0%, #F5E9FF 55%, #FFE8F0 100%)' }}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#EDD2F3]/50 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-56 h-56 bg-[#FFB4AC]/30 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />
          <div className="absolute top-1/2 left-0 w-40 h-40 bg-[#EDD2F3]/25 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <div className="relative z-10">

            {/* ── Top — Title + subtitle centered ── */}
            <div className="flex flex-col items-center justify-center px-6 pt-6 pb-3 text-center">
              <h2 className="font-serif text-2xl md:text-3xl font-extrabold text-neutral-900 leading-tight mb-1.5 text-balance">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="text-sm text-neutral-600 leading-relaxed max-w-[38ch]">
                  {banner.subtitle}
                </p>
              )}
            </div>

            {/* ── Bottom — Product squares ── */}
            {gridProducts.length > 0 && (
              <>
                {/* Desktop: 6-col grid → 2 rows, compact */}
                <div className="hidden md:block px-4 pb-4">
                  <div className="grid grid-cols-6 gap-1.5">
                    {gridProducts.map((product) => {
                      const slug = (product as any).slug || product.id
                      return (
                        <Link
                          key={product.id}
                          href={`/producto/${slug}`}
                          className="group relative rounded-xl overflow-hidden aspect-square bg-white/60 border border-white hover:border-[#FFB4AC]/70 hover:shadow-md transition-all duration-200"
                        >
                          <Image
                            src={product.image || '/placeholder.jpg'}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 25vw, 12vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center">
                            <span className="text-white text-[9px] font-bold leading-none">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile: horizontal scroll of small squares */}
                <div className="md:hidden flex overflow-x-auto gap-1.5 px-4 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {gridProducts.map((product) => {
                    const slug = (product as any).slug || product.id
                    return (
                      <Link
                        key={product.id}
                        href={`/producto/${slug}`}
                        className="shrink-0 relative w-[60px] h-[60px] rounded-xl overflow-hidden border border-white/80 bg-white/60"
                      >
                        <Image
                          src={product.image || '/placeholder.jpg'}
                          alt={product.name}
                          fill
                          sizes="60px"
                          className="object-cover"
                          loading="lazy"
                        />
                      </Link>
                    )
                  })}
                  <div className="shrink-0 w-2" />
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}

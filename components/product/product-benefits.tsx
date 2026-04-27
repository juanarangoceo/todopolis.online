'use client';

import { useRef, useState, useCallback } from 'react';
import { Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductBenefitsProps {
  product: Product;
}

export function ProductBenefits({ product }: ProductBenefitsProps) {
  const benefits = product.benefits ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-benefit]') as HTMLElement;
    const w = card?.clientWidth ?? 300;
    el.scrollBy({ left: dir === 'left' ? -w - 16 : w + 16, behavior: 'smooth' });
    setTimeout(updateButtons, 350);
  }, [updateButtons]);

  if (benefits.length === 0) return null;

  // Use slider when benefits > 3 (they'd be cramped in the narrow column)
  const useSlider = benefits.length > 3;

  return (
    <section className="py-8 md:py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Por que te encantara</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Beneficios principales
          </h2>
        </div>

        {useSlider ? (
          <div className="relative max-w-5xl mx-auto">
            {/* Arrow buttons */}
            <button
              onClick={() => scroll('left')}
              className={cn(
                "hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all duration-300",
                "bg-white/90 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:scale-110",
                canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => scroll('right')}
              className={cn(
                "hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all duration-300",
                "bg-white/90 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:scale-110",
                canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>

            <div
              ref={scrollRef}
              onScroll={updateButtons}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  data-benefit
                  className="min-w-[280px] md:min-w-[320px] shrink-0 snap-start flex items-start gap-4 p-4 md:p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-white/20 shadow-lg shadow-primary/5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">{(benefit as any).description ?? benefit}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-4 md:p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-white/20 shadow-lg shadow-primary/5"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <p className="text-foreground font-medium leading-relaxed">{(benefit as any).description ?? benefit}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

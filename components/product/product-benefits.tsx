'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductBenefitsProps {
  product: Product;
}

export function ProductBenefits({ product }: ProductBenefitsProps) {
  const benefits = product.benefits ?? [];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setCurrent(c => (c + 1) % benefits.length);
  }, [benefits.length]);

  // Auto-slide every 2 seconds, pause on hover
  useEffect(() => {
    if (paused || benefits.length <= 3) return;
    const timer = setInterval(advance, 2000);
    return () => clearInterval(timer);
  }, [advance, paused, benefits.length]);

  if (benefits.length === 0) return null;

  const useSlider = benefits.length > 3;
  const benefit = benefits[current] as any;

  return (
    <section className="py-8 md:py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Por qué te encantará</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Beneficios principales
          </h2>
        </div>

        {useSlider ? (
          <div
            className="max-w-2xl mx-auto"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Card — fixed height to prevent layout shift */}
            <div className="flex items-start gap-4 p-5 md:p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-white/20 shadow-lg h-[130px] md:h-[100px] overflow-hidden transition-all duration-500">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <p className="text-foreground font-medium leading-relaxed self-center">
                {benefit.description ?? benefit}
              </p>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {benefits.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                  aria-label={`Beneficio ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-400 ease-in-out",
                    i === current
                      ? "w-7 h-3 bg-[#FFB4AC] shadow-sm shadow-[#FFB4AC]/50"
                      : "w-3 h-3 bg-[#FFB4AC]/30 hover:bg-[#FFB4AC]/60"
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {benefits.map((b, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 md:p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-white/20 shadow-lg shadow-primary/5"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <p className="text-foreground font-medium leading-relaxed">
                  {(b as any).description ?? b}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

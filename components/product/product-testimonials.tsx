'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Quote, CheckCircle } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductTestimonialsProps {
  product: Product;
}

const fallbackTestimonials = [
  {
    id: '1',
    name: 'Maria Garcia',
    rating: 5,
    comment: 'Increible producto! Mi piel se ve radiante desde que lo uso. Totalmente recomendado para todas las mujeres que quieren verse hermosas.',
    date: 'Hace 2 dias',
    verified: true,
  },
  {
    id: '2',
    name: 'Carolina Martinez',
    rating: 5,
    comment: 'La mejor compra que he hecho. La calidad es excelente y los resultados se notan desde la primera aplicacion.',
    date: 'Hace 1 semana',
    verified: true,
  },
  {
    id: '3',
    name: 'Andrea Lopez',
    rating: 4,
    comment: 'Muy buen producto, cumple con lo prometido. El envio fue rapido y el empaque muy lindo. Lo volvere a comprar.',
    date: 'Hace 2 semanas',
    verified: true,
  }
];

export function ProductTestimonials({ product }: ProductTestimonialsProps) {
  const testimonials = (product.testimonials && product.testimonials.length > 0)
    ? product.testimonials
    : fallbackTestimonials;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setCurrent(c => (c + 1) % testimonials.length);
  }, [testimonials.length]);

  // Auto-slide every 2 seconds, pause on hover
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(advance, 2000);
    return () => clearInterval(timer);
  }, [advance, paused]);

  const t = testimonials[current] as any;

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Lo que dicen nuestras clientas
          </h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="font-semibold text-foreground">{product.rating}</span>
            <span className="text-muted-foreground">
              basado en {(product as any).reviewsCount ?? testimonials.length ?? 15} opiniones
            </span>
          </div>
        </div>

        {/* Carousel */}
        <div
          className="max-w-2xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Card — fixed height to prevent layout shift */}
          <div className="relative p-6 md:p-8 rounded-3xl bg-card/80 backdrop-blur-xl border border-white/20 shadow-lg h-[260px] md:h-[220px] overflow-hidden transition-all duration-500">
            <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />

            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-4 h-4",
                    i < (t.rating ?? 5) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
                  )}
                />
              ))}
            </div>

            <p className="text-foreground leading-relaxed mb-6">
              &ldquo;{t.comment ?? t.text}&rdquo;
            </p>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{t.name}</span>
                {t.verified && <CheckCircle className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-sm text-muted-foreground">{t.role ?? t.date}</span>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
                aria-label={`Ir a reseña ${i + 1}`}
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
      </div>
    </section>
  );
}

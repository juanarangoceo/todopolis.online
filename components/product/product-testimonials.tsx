'use client';

import { useState, useEffect } from 'react';
import { Star, Quote, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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

function TestimonialCard({ t, index }: { t: any; index: number }) {
  return (
    <div className="relative flex flex-col p-5 md:p-6 rounded-3xl bg-card/80 backdrop-blur-xl border border-white/20 shadow-md h-full">
      <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn('w-4 h-4', i < (t.rating ?? 5) ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted')}
          />
        ))}
      </div>
      <p className="text-foreground leading-relaxed text-sm md:text-base flex-1 pr-4">
        &ldquo;{t.comment ?? t.text}&rdquo;
      </p>
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/40">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {(t.name ?? 'A').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground text-sm truncate">{t.name}</span>
            {t.verified && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground">{t.role ?? t.date}</span>
        </div>
      </div>
    </div>
  );
}

export function ProductTestimonials({ product }: ProductTestimonialsProps) {
  const testimonials = (product.testimonials && product.testimonials.length > 0)
    ? product.testimonials
    : fallbackTestimonials;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const goTo = (index: number) => {
    setFading(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setFading(false);
    }, 250);
  };

  const prev = () => goTo((currentIndex - 1 + testimonials.length) % testimonials.length);
  const next = () => goTo((currentIndex + 1) % testimonials.length);

  useEffect(() => {
    const interval = setInterval(next, 4500);
    return () => clearInterval(interval);
  }, [currentIndex, testimonials.length]);

  const visibleDesktop = [
    testimonials[currentIndex % testimonials.length],
    testimonials[(currentIndex + 1) % testimonials.length],
  ];

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Lo que dicen nuestras clientas
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="font-semibold text-foreground">{product.rating}</span>
            <span className="text-muted-foreground text-sm">
              basado en {(product as any).reviewsCount ?? testimonials.length ?? 15} opiniones
            </span>
          </div>
        </div>

        {/* Desktop: carousel 2 en pantalla */}
        <div className="hidden md:block max-w-4xl mx-auto">
          <div
            className={cn('grid grid-cols-2 gap-4 transition-opacity duration-250', fading ? 'opacity-0' : 'opacity-100')}
          >
            {visibleDesktop.map((t: any, i) => (
              <TestimonialCard key={`${currentIndex}-${i}`} t={t} index={i} />
            ))}
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button onClick={prev} className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors">
              <ChevronLeft className="w-4 h-4 text-foreground/60" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    i === currentIndex ? 'bg-primary w-5' : 'bg-border hover:bg-primary/40'
                  )}
                />
              ))}
            </div>
            <button onClick={next} className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors">
              <ChevronRight className="w-4 h-4 text-foreground/60" />
            </button>
          </div>
        </div>

        {/* Mobile: stack vertical */}
        <div className="md:hidden flex flex-col gap-4 max-w-xl mx-auto">
          {testimonials.map((t: any, index) => (
            <TestimonialCard key={t.id ?? index} t={t} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

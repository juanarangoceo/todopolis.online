'use client';

import { useState, useRef, useCallback } from 'react';
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
    avatar: 'MG'
  },
  {
    id: '2',
    name: 'Carolina Martinez',
    rating: 5,
    comment: 'La mejor compra que he hecho. La calidad es excelente y los resultados se notan desde la primera aplicacion.',
    date: 'Hace 1 semana',
    verified: true,
    avatar: 'CM'
  },
  {
    id: '3',
    name: 'Andrea Lopez',
    rating: 4,
    comment: 'Muy buen producto, cumple con lo prometido. El envio fue rapido y el empaque muy lindo. Lo volvere a comprar.',
    date: 'Hace 2 semanas',
    verified: true,
    avatar: 'AL'
  }
];

export function ProductTestimonials({ product }: ProductTestimonialsProps) {
  const testimonials = (product.testimonials && product.testimonials.length > 0) ? product.testimonials : fallbackTestimonials;
  const needsSlider = true; // Always use slider — fits better in narrow column layout
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const cardWidth = container.querySelector('div[data-testimonial]')?.clientWidth ?? 380;
    const scrollAmount = direction === 'left' ? -cardWidth - 24 : cardWidth + 24;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
  }, [updateScrollButtons]);

  const renderCard = (testimonial: any, index: number) => (
    <div 
      key={testimonial.id ?? index}
      data-testimonial
      className={cn(
        "relative p-6 md:p-8 rounded-3xl transition-all duration-300",
        "bg-card/80 backdrop-blur-xl border border-white/20",
        "shadow-lg hover:shadow-xl hover:-translate-y-1",
        needsSlider ? "min-w-[320px] md:min-w-[380px] snap-start shrink-0" : ""
      )}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <Quote className="absolute top-4 right-4 md:top-6 md:right-6 w-8 h-8 text-primary/20" />
      
      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={cn(
              "w-4 h-4",
              i < testimonial.rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-muted text-muted"
            )} 
          />
        ))}
      </div>

      {/* Comment */}
      <p className="text-foreground leading-relaxed mb-6">
        {`"${testimonial.comment ?? (testimonial as any).text}"`}
      </p>

      {/* Author */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{testimonial.name}</span>
          {(testimonial as any).verified && (
            <CheckCircle className="w-4 h-4 text-primary" />
          )}
        </div>
        <span className="text-sm text-muted-foreground">{testimonial.role ?? (testimonial as any).date}</span>
      </div>
    </div>
  );

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
      <div className="container mx-auto px-4">
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
            <span className="text-muted-foreground">basado en {(product as any).reviewsCount ?? (product as any).testimonials?.length ?? product.reviews?.length ?? 15} opiniones</span>
          </div>
        </div>

        {/* Slider or Grid based on count */}
        {needsSlider ? (
          <div className="relative max-w-6xl mx-auto">
            {/* Navigation buttons — desktop only */}
            <button
              onClick={() => scroll('left')}
              className={cn(
                "hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full items-center justify-center transition-all duration-300",
                "bg-white/90 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:scale-110",
                canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Anterior reseña"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            
            <button
              onClick={() => scroll('right')}
              className={cn(
                "hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full items-center justify-center transition-all duration-300",
                "bg-white/90 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:scale-110",
                canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="Siguiente reseña"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>

            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              onScroll={updateScrollButtons}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {testimonials.map((t: any, i: number) => renderCard(t, i))}
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    const container = scrollContainerRef.current;
                    if (!container) return;
                    const card = container.querySelectorAll('div[data-testimonial]')[i] as HTMLElement;
                    if (card) {
                      container.scrollTo({ left: card.offsetLeft - container.offsetLeft - 16, behavior: 'smooth' });
                      setTimeout(updateScrollButtons, 350);
                    }
                  }}
                  className="w-2 h-2 rounded-full bg-primary/30 hover:bg-primary/60 transition-colors"
                  aria-label={`Ir a reseña ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((t: any, i: number) => renderCard(t, i))}
          </div>
        )}
      </div>
    </section>
  );
}

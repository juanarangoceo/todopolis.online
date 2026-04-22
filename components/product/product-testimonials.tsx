'use client';

import { Star, Quote, CheckCircle } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductTestimonialsProps {
  product: Product;
}

const testimonials = [
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

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {((product.testimonials && product.testimonials.length > 0) ? product.testimonials : testimonials).map((testimonial: any, index: number) => (
            <div 
              key={testimonial.id}
              className={cn(
                "relative p-6 md:p-8 rounded-3xl transition-all duration-300",
                "bg-card/80 backdrop-blur-xl border border-white/20",
                "shadow-lg hover:shadow-xl hover:-translate-y-1"
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
          ))}
        </div>
      </div>
    </section>
  );
}

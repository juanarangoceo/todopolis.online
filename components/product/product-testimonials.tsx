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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {testimonials.map((t: any, index) => (
            <div
              key={t.id ?? index}
              className="relative flex flex-col p-5 md:p-6 rounded-3xl bg-card/80 backdrop-blur-xl border border-white/20 shadow-md"
            >
              <Quote className="absolute top-4 right-4 w-7 h-7 text-primary/15" />

              <div className="flex gap-1 mb-3">
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

              <p className="text-foreground leading-relaxed text-sm md:text-base flex-1">
                &ldquo;{t.comment ?? t.text}&rdquo;
              </p>

              <div className="flex flex-col gap-0.5 mt-4 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground text-sm">{t.name}</span>
                  {t.verified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </div>
                <span className="text-xs text-muted-foreground">{t.role ?? t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

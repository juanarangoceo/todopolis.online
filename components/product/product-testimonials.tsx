'use client';

import { useState, useEffect } from 'react';
import { Star, Quote, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductTestimonialsProps {
  product: Product;
}

// Tarjetas visibles a la vez en escritorio.
const DESKTOP_VISIBLE = 3;

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
    if (testimonials.length <= DESKTOP_VISIBLE) return;
    const interval = setInterval(next, 4500);
    return () => clearInterval(interval);
  }, [currentIndex, testimonials.length]);

  // En escritorio caben TRES tarjetas, no dos: la sección va a ancho completo
  // bajo el CTA y con dos quedaba una franja muerta a cada lado.
  //
  // Y como el prompt de IA genera siempre exactamente 3 testimonios
  // (`lib/product-content-prompt.ts`), en la inmensa mayoría de las fichas la
  // ventana de 3 los muestra TODOS — un carrusel que rota entre las mismas
  // tres tarjetas solo las hace saltar sin enseñar nada nuevo. Por eso los
  // controles y la rotación automática solo existen si hay más de 3, que es
  // el caso de los productos con testimonios añadidos a mano.
  const isCarousel = testimonials.length > DESKTOP_VISIBLE;
  const visibleDesktop = isCarousel
    ? Array.from(
        { length: DESKTOP_VISIBLE },
        (_, offset) => testimonials[(currentIndex + offset) % testimonials.length]
      )
    : testimonials;

  return (
    <section id="resenas" className="scroll-mt-24 py-8 md:py-12 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-ink-title tracking-tight mb-4">
            Reseñas
          </h2>
          {/* El promedio "4.8 basado en N opiniones" salía de un rating
              hardcodeado. Se quita hasta tener reseñas reales; el bloque de
              testimonios de abajo sigue igual por ahora (ver "Reseñas reales
              — pendiente" en CLAUDE.md). */}
        </div>

        {/* Escritorio: tres tarjetas a la vez.
            `max-w-6xl` y no `4xl`: con tres columnas dentro de 896 px cada
            tarjeta bajaba de 280 px y el testimonio se partía en ocho
            renglones.

            EL CORTE ES `lg`, NO `md`. En tablet (768 px) tres columnas dejan
            232 px de tarjeta y 184 px de texto útil: un testimonio de dos
            frases salía en once renglones. Y bajar a dos columnas tampoco
            servía, porque con tres testimonios —los que genera siempre la IA—
            la segunda fila queda coja, que es justo lo que `bestColumns` evita
            en Novedades. Así que por debajo de `lg` se usa la pila vertical,
            que además es donde la ficha entera pasa a dos columnas: un solo
            punto de corte para toda la página. */}
        <div className="hidden lg:block max-w-6xl mx-auto">
          <div
            className={cn(
              'grid gap-5 transition-opacity duration-250',
              // Con dos testimonios no se fuerzan tres columnas: dejaría un
              // hueco vacío a la derecha que se lee como algo que no cargó.
              visibleDesktop.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
              fading ? 'opacity-0' : 'opacity-100'
            )}
          >
            {visibleDesktop.map((t: any, i) => (
              <TestimonialCard key={`${currentIndex}-${i}`} t={t} index={i} />
            ))}
          </div>

          {/* Controles — solo cuando hay más de tres y por tanto queda algo
              fuera de pantalla. Con tres, las flechas y los puntos prometían
              contenido que no existe. */}
          {isCarousel && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={prev} aria-label="Reseñas anteriores" className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors">
                <ChevronLeft className="w-4 h-4 text-foreground/60" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Ir a la reseña ${i + 1}`}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      i === currentIndex ? 'bg-primary w-5' : 'bg-border hover:bg-primary/40'
                    )}
                  />
                ))}
              </div>
              <button onClick={next} aria-label="Reseñas siguientes" className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors">
                <ChevronRight className="w-4 h-4 text-foreground/60" />
              </button>
            </div>
          )}
        </div>

        {/* Móvil y tablet: pila vertical a ancho legible. */}
        <div className="lg:hidden flex flex-col gap-4 max-w-xl mx-auto">
          {testimonials.map((t: any, index) => (
            <TestimonialCard key={t.id ?? index} t={t} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

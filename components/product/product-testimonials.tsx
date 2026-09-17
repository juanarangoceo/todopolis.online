'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductTestimonialsProps {
  product: Product;
}

// «Para qué lo usan» — antes «Reseñas».
//
// LO QUE HAY AQUÍ NO SON RESEÑAS Y NUNCA LO FUERON. Los escribe Gemini junto
// con el resto del copy (`lib/product-content-prompt.ts`), con nombres y
// ciudades colombianas inventados. Presentarlos bajo el rótulo «Reseñas», con
// estrellas, un nombre propio y un visto de «verificado», es afirmar que una
// persona real compró y opinó. Eso es publicidad engañosa para la SIC y
// afirmación falsa para las políticas de Meta, y con tráfico pagado la ficha es
// justo donde mira un revisor.
//
// No se pierde nada quitándolo: el texto sigue, que es lo que describe usos
// concretos del producto. Lo que se va es la etiqueta falsa — el nombre, la
// ciudad, las estrellas y el sello.
//
// La prueba social auténtica de la ficha vive en otro sitio: `CustomerPhotos`
// («Así les llegó»), que son fotos reales que manda un comprador. Y las reseñas
// de verdad siguen pendientes: pedido entregado → WhatsApp con token de un solo
// uso → «compra verificada» (ver CLAUDE.md). Cuando existan, VUELVEN las
// estrellas y el JSON-LD de `aggregateRating`, ya legítimos.
//
// Tampoco hay ya testimonios de respaldo inventados en el código: un producto
// sin este contenido no pinta la sección, en vez de rellenarla con tres
// personas que no existen.

const DESKTOP_VISIBLE = 3;

function UseCaseCard({ text, index }: { text: string; index: number }) {
  return (
    <div className="relative flex flex-col p-5 md:p-6 rounded-3xl bg-card/80 backdrop-blur-xl border border-nav-inactive-border shadow-md h-full">
      <span
        aria-hidden
        className="w-9 h-9 rounded-xl bg-gradient-to-br from-todopolis-blue/15 to-todopolis-lavender/25 flex items-center justify-center font-serif text-sm font-extrabold text-todopolis-lavender-deep mb-3"
      >
        {index + 1}
      </span>
      <p className="text-foreground leading-relaxed text-sm md:text-base flex-1">{text}</p>
    </div>
  );
}

export function ProductTestimonials({ product }: ProductTestimonialsProps) {
  const cases = (product.testimonials ?? [])
    .map((t) => ((t as { text?: string; comment?: string }).text ?? (t as { comment?: string }).comment ?? '').trim())
    .filter(Boolean);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const goTo = (index: number) => {
    setFading(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setFading(false);
    }, 250);
  };

  const prev = () => goTo((currentIndex - 1 + cases.length) % cases.length);
  const next = () => goTo((currentIndex + 1) % cases.length);

  useEffect(() => {
    if (cases.length <= DESKTOP_VISIBLE) return;
    const interval = setInterval(next, 4500);
    return () => clearInterval(interval);
  }, [currentIndex, cases.length]);

  // Sin contenido no se pinta la sección. Antes caía a tres testimonios de
  // respaldo escritos a mano —«Maria Garcia», «Carolina Martinez»— que salían
  // idénticos en cada producto sin copy.
  if (cases.length === 0) return null;

  const isCarousel = cases.length > DESKTOP_VISIBLE;
  const visibleDesktop = isCarousel
    ? Array.from({ length: DESKTOP_VISIBLE }, (_, o) => cases[(currentIndex + o) % cases.length])
    : cases;

  return (
    <section id="usos" className="scroll-mt-24 py-8 md:py-12 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-ink-title tracking-tight mb-3">
            Para qué lo usan
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed inline-flex items-center gap-1.5 flex-wrap justify-center">
            <Sparkles className="w-3.5 h-3.5 text-todopolis-lavender-deep shrink-0" />
            Situaciones de uso habituales de este producto.
          </p>
        </div>

        {/* Escritorio: tres a la vez. El corte es `lg` y no `md` porque en
            tablet tres columnas dejan 184 px de texto útil. */}
        <div className="hidden lg:block max-w-6xl mx-auto">
          <div
            className={cn(
              'grid gap-5 transition-opacity duration-250',
              visibleDesktop.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
              fading ? 'opacity-0' : 'opacity-100'
            )}
          >
            {visibleDesktop.map((text, i) => (
              <UseCaseCard key={`${currentIndex}-${i}`} text={text} index={i} />
            ))}
          </div>

          {isCarousel && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={prev} aria-label="Anteriores" className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors">
                <ChevronLeft className="w-4 h-4 text-foreground/60" />
              </button>
              <div className="flex gap-2">
                {cases.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Ir al uso ${i + 1}`}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      i === currentIndex ? 'bg-primary w-5' : 'bg-border hover:bg-primary/40'
                    )}
                  />
                ))}
              </div>
              <button onClick={next} aria-label="Siguientes" className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors">
                <ChevronRight className="w-4 h-4 text-foreground/60" />
              </button>
            </div>
          )}
        </div>

        {/* Móvil y tablet: pila vertical. */}
        <div className="lg:hidden flex flex-col gap-4 max-w-xl mx-auto">
          {cases.map((text, i) => (
            <UseCaseCard key={i} text={text} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

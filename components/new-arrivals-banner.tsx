import { Product } from '@/lib/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel';

// Sección de novedades del home.
//
// Antes era un banner decorativo con 12 miniaturas cuadradas, y tenía dos
// problemas de fondo:
//
//   1. DUPLICABA LA CUADRÍCULA. Recibía `initialProducts` completo y cortaba
//      los 12 primeros — exactamente los mismos que abren la cuadrícula justo
//      debajo, porque las dos usan el mismo array ordenado por `_createdAt`.
//      Encima en una versión peor: recorte cuadrado que deforma las fotos, sin
//      nombre y con el precio solo al pasar el ratón, a 9px.
//   2. NO ERA CIERTO. Llamaba "recién llegados" a 12 productos cuando solo
//      unos pocos eran de esa semana; el resto tenía meses.
//
// Ahora recibe SOLO lo realmente reciente (lo filtra `app/page.tsx` por fecha) y
// el titular es un dato que cambia solo, no una frase de marca. Si la semana no
// trajo nada, la sección no se pinta.

interface NewArrivalsBannerProps {
  products?: Product[];
}

export function NewArrivalsBanner({ products = [] }: NewArrivalsBannerProps) {
  // Sin novedades no hay sección. Inventar una sería el mismo error de antes.
  if (products.length === 0) return null;

  const shown = products.slice(0, 12);

  // Franja de fondo gris suave, a todo el ancho, con el mismo encabezado que
  // las secciones de la ficha (antetítulo gris con filete + titular). Antes
  // era una caja con degradado azul-lavanda y dos manchas difuminadas: el
  // único bloque del sitio con ese adorno, y sus tarjetas —blancas
  // translúcidas, precio en negro grueso sin espacio— no se parecían a las
  // del catálogo que venían justo debajo.
  return (
    <section className="w-full bg-surface-soft py-8 md:py-12" aria-labelledby="novedades-titulo">
      <div className="container mx-auto px-4">
          <div>
            {/* El nombre de la marca en el titular: Todópolis es "todo" +
                polis, la ciudad de todo, y es lo único que ningún competidor
                puede copiar.

                No hay subtítulo a propósito. Los dos que hubo antes describían
                el bloque ("Llegaron 12 productos nuevos", "Doce novedades del
                catálogo") — contaban el estante en vez de decirle algo al
                cliente, y el titular ya dice qué es esto. */}
            <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
              <div>
                <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
                  Novedades
                </p>
                <h2
                  id="novedades-titulo"
                  className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title text-balance md:text-[2rem]"
                >
                  Lo último que llegó a Todópolis
                </h2>
              </div>
              <Link
                href="/ofertas"
                className="hidden shrink-0 items-center gap-1.5 pb-1 text-sm font-bold text-todopolis-lavender-deep transition-all hover:gap-2.5 sm:inline-flex"
              >
                Ver también las ofertas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Una sola fila deslizable en TODOS los tamaños, con la misma
                tarjeta que el catálogo. Fue rejilla desde `sm`: 12 tarjetas
                eran 3 filas enteras en escritorio antes de llegar al
                catálogo, que es lo que la gente viene a recorrer. */}
            <SuggestedProductsCarousel
              products={shown}
              itemClassName="w-[44vw] max-w-[210px] sm:w-[240px] sm:max-w-none lg:w-[270px]"
            />

            <Link
              href="/ofertas"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-todopolis-lavender-deep transition-all hover:gap-2.5 sm:hidden"
            >
              Ver también las ofertas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
      </div>
    </section>
  );
}

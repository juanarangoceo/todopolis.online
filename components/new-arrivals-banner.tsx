import { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { bestColumns } from '@/lib/new-arrivals';
import { PRODUCT_CATEGORIES } from '@/lib/categories';

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
  const columns = bestColumns(shown.length);

  const formatCardPrice = (price: number) => '$ ' + price.toLocaleString('es-CO');
  // La categoría llega cruda del dataset (`electronica`); se muestra el
  // nombre con tilde, como en la cuadrícula.
  const categoryTitle = (value: string) =>
    PRODUCT_CATEGORIES.find((c) => c.value === value?.toLowerCase())?.title ?? value;

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

            {/* En móvil es un carrusel: 12 tarjetas en rejilla de 2 columnas
                son 6 filas que empujan la cuadrícula del catálogo fuera de la
                pantalla. Deslizando ocupan una sola fila.

                Desde `sm` vuelve a ser rejilla, y las columnas se calculan para
                que la última fila quede completa: con 6 novedades y 4 columnas
                salían 4 + 2 y dos huecos. `justify-center` es el plan B para
                cantidades sin divisor cómodo (7, 11…): la fila incompleta se
                centra y se lee como decisión, no como hueco. */}
            <div
              className="na-rail flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none na-grid sm:grid sm:grid-cols-3 md:gap-4 sm:justify-center"
              style={{ ['--na-cols' as string]: String(columns) }}
            >
              {shown.map((product) => {
                const slug = (product as { slug?: string }).slug || product.id;
                return (
                  <Link
                    key={product.id}
                    href={`/producto/${slug}`}
                    className="group w-[42vw] max-w-[190px] shrink-0 snap-start overflow-hidden rounded-3xl border border-nav-inactive-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-auto sm:max-w-none sm:shrink"
                  >
                    {/* 4:5, como las tarjetas del catálogo. */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden">
                      <Image
                        src={product.image || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 42vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    {/* Nombre y precio SIEMPRE visibles: en móvil no hay hover. */}
                    <div className="p-3 sm:p-4">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                        {categoryTitle(product.category)}
                      </p>
                      <p className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug text-ink-title">
                        {product.name}
                      </p>
                      <p className="mt-2 font-serif text-base font-extrabold tabular-nums text-ink-title sm:text-lg">
                        {formatCardPrice(product.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

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

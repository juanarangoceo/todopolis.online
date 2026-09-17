import { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { bestColumns } from '@/lib/new-arrivals';

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
  const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO');

  return (
    <section className="w-full pt-5 md:pt-8 pb-2" aria-labelledby="novedades-titulo">
      <div className="container mx-auto px-4">
        <div
          className="relative w-full rounded-3xl overflow-hidden shadow-sm border border-todopolis-lavender/25"
          style={{ background: 'linear-gradient(135deg, #F0F7FF 0%, #F5E9FF 55%, #EBF4FF 100%)' }}
        >
          <div aria-hidden className="absolute top-0 right-0 w-80 h-80 bg-todopolis-lavender/35 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 left-1/4 w-56 h-56 bg-todopolis-blue/25 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 px-5 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8">
            {/* El nombre de la marca en el titular: Todópolis es "todo" +
                polis, la ciudad de todo, y es lo único que ningún competidor
                puede copiar. El catálogo deja de ser una lista de inventario y
                pasa a ser un sitio con movimiento propio.

                No hay subtítulo a propósito. Los dos que hubo antes describían
                el bloque ("Llegaron 12 productos nuevos", "Doce novedades del
                catálogo") — contaban el estante en vez de decirle algo al
                cliente, y el titular ya dice qué es esto. Uno de ellos además
                repetía envío y medios de pago, que es exactamente lo que dicen
                los tres recuadros diez píxeles más abajo.

                Queda solo el sello de fecha, que es el único dato verificable
                y cambia solo. Va en su propia línea porque `whenLabel` devuelve
                "hoy", "ayer", "hace 3 días" o "el 12 de septiembre", y así
                encajan las cuatro sin reescribir la frase. */}
            <div className="mb-5 md:mb-6">
              <h2
                id="novedades-titulo"
                className="font-serif text-2xl md:text-4xl font-extrabold text-neutral-900 leading-tight text-balance"
              >
                Lo último que llegó a Todópolis
              </h2>
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
              className="na-rail flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none na-grid sm:grid sm:grid-cols-3 md:gap-4 sm:justify-center"
              style={{ ['--na-cols' as string]: String(columns) }}
            >
              {shown.map((product) => {
                const slug = (product as { slug?: string }).slug || product.id;
                return (
                  <Link
                    key={product.id}
                    href={`/producto/${slug}`}
                    className="group w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink rounded-2xl overflow-hidden bg-white/85 border border-white hover:border-todopolis-blue hover:shadow-md transition-all duration-200"
                  >
                    {/* 3/4 y no cuadrado: el recorte cuadrado decapitaba las
                        fotos de producto, que vienen verticales. */}
                    <div className="relative w-full aspect-[3/4]">
                      <Image
                        src={product.image || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 42vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    {/* Nombre y precio SIEMPRE visibles. Antes el precio salía
                        solo en hover, a 9px — invisible en móvil, donde no hay
                        hover. */}
                    <div className="px-3 py-2.5">
                      <p className="text-xs md:text-sm font-medium text-neutral-700 leading-snug line-clamp-2 min-h-[2.4em] group-hover:text-todopolis-blue-deep transition-colors">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm md:text-base font-black text-neutral-900">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Link
              href="/ofertas"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-todopolis-blue-deep hover:gap-2.5 transition-all"
            >
              Ver también las ofertas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

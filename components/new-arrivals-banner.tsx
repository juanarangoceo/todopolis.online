import { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { bestColumns } from '@/lib/new-arrivals';
import { advancePaymentEnabled } from '@/lib/payments/config';

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
  /** Fecha del producto más reciente del catálogo, en ISO. */
  newestAt?: string | null;
  /** Ventana en días que define "nuevo". Solo para el texto. */
  windowDays?: number;
}

/** "hoy", "ayer" o "el 12 de septiembre". Sin librerías. */
function whenLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);

  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return then.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

export function NewArrivalsBanner({ products = [], newestAt, windowDays = 7 }: NewArrivalsBannerProps) {
  // Sin novedades no hay sección. Inventar una sería el mismo error de antes.
  if (products.length === 0) return null;

  const shown = products.slice(0, 12);
  const columns = bestColumns(shown.length);
  const when = whenLabel(newestAt);
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
            {/* El titular ES el dato. Un número que cambia solo no se parece a
                una plantilla, que era justo el problema del copy anterior. */}
            <div className="mb-5 md:mb-6">
              <h2
                id="novedades-titulo"
                className="font-serif text-2xl md:text-4xl font-extrabold text-neutral-900 leading-tight text-balance"
              >
                {products.length === 1
                  ? 'Llegó 1 producto nuevo'
                  : `Llegaron ${products.length} productos nuevos`}
              </h2>
              <p className="mt-1.5 text-sm md:text-base text-neutral-600">
                {when ? `Los subimos ${when}.` : `Entraron esta semana.`}{' '}
                {advancePaymentEnabled()
                  ? 'Envío a todo el país, contraentrega o pago protegido.'
                  : 'Envío a todo el país y pago contraentrega.'}
              </p>
            </div>

            {/* Columnas calculadas para que la última fila quede completa: con
                6 novedades y 4 columnas salían 4 + 2 y dos huecos. `justify-center`
                es el plan B para cantidades sin divisor cómodo (7, 11…): la fila
                incompleta se centra y se lee como decisión, no como hueco. */}
            <div
              className="na-grid grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 justify-center"
              style={{ ['--na-cols' as string]: String(columns) }}
            >
              {shown.map((product) => {
                const slug = (product as { slug?: string }).slug || product.id;
                return (
                  <Link
                    key={product.id}
                    href={`/producto/${slug}`}
                    className="group rounded-2xl overflow-hidden bg-white/85 border border-white hover:border-todopolis-blue hover:shadow-md transition-all duration-200"
                  >
                    {/* 3/4 y no cuadrado: el recorte cuadrado decapitaba las
                        fotos de producto, que vienen verticales. */}
                    <div className="relative w-full aspect-[3/4]">
                      <Image
                        src={product.image || '/placeholder.jpg'}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
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

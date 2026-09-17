import { Product } from '@/lib/types';

interface ProductBenefitsProps {
  product: Product;
}

type Benefit = { _key?: string; icon?: string; title?: string; description?: string };

// Beneficios en desplegable.
//
// El schema ya guardaba `icon` (emoji), `title` (el resultado en 3-5 palabras)
// y `description` por cada beneficio, y el prompt de IA genera los tres
// (`lib/product-content-prompt.ts`), pero la landing pintaba SOLO la
// descripción: cuatro tarjetas de párrafo del mismo peso, sin jerarquía, que
// el comprador se salta enteras.
//
// Al plegarlas, el título de cada beneficio —que es la promesa— queda siempre
// a la vista y se puede recorrer de un vistazo; la descripción, que es el
// respaldo, se abre solo si el comprador quiere. Se gana la mitad del alto de
// la sección en la columna derecha de escritorio, que es donde más pesa.
//
// El PRIMERO va abierto a propósito: un acordeón enteramente cerrado no se lee
// como "hay más aquí dentro", se lee como una lista de encabezados muertos.
// Abrir uno enseña la mecánica sin que nadie tenga que descubrirla.
//
// Es `<details>` nativo, igual que `product-faq.tsx`: sin estado ni
// 'use client', funciona sin JavaScript y el buscador indexa el texto plegado.
export function ProductBenefits({ product }: ProductBenefitsProps) {
  const benefits = (product.benefits ?? []) as Benefit[];

  if (benefits.length === 0) return null;

  // Copy viejo: hay productos con beneficios que solo traen `description`
  // (generados antes de que el prompt pidiera título). Ahí la descripción hace
  // de encabezado y no hay nada que desplegar.
  const items = benefits.map((b) => {
    const raw = typeof b === 'string' ? { description: b } : b;
    const title = raw.title?.trim();
    const description = raw.description?.trim();
    return {
      key: raw._key,
      icon: raw.icon?.trim(),
      heading: title || description || '',
      body: title ? description : undefined,
    };
  }).filter((b) => b.heading);

  if (items.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-ink-title tracking-tight">
            Beneficios principales
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          {items.map((b, index) => {
            const Icon = (
              <span
                aria-hidden
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-todopolis-blue/15 to-todopolis-lavender/20 flex items-center justify-center text-lg leading-none"
              >
                {b.icon || '✦'}
              </span>
            );

            // Sin descripción no hay nada que plegar: se pinta como fila fija,
            // sin cursor de "clic" ni signo de más que no lleven a ningún sitio.
            if (!b.body) {
              return (
                <div
                  key={b.key ?? index}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-surface border border-nav-inactive-border shadow-sm"
                >
                  {Icon}
                  <p className="min-w-0 flex-1 font-semibold text-foreground text-sm md:text-base leading-snug">
                    {b.heading}
                  </p>
                </div>
              );
            }

            return (
              <details
                key={b.key ?? index}
                open={index === 0}
                className="group rounded-2xl bg-surface border border-nav-inactive-border shadow-sm open:shadow-md hover:border-todopolis-lavender/50 open:border-todopolis-lavender/50 transition-all duration-300"
              >
                <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none select-none rounded-2xl hover:bg-surface-soft transition-colors">
                  {Icon}
                  <span className="min-w-0 flex-1 font-semibold text-foreground text-sm md:text-base leading-snug">
                    {b.heading}
                  </span>
                  <span className="shrink-0 w-6 h-6 rounded-full bg-todopolis-lavender/30 flex items-center justify-center text-todopolis-lavender-deep font-bold text-sm transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                {/* El sangrado de la izquierda (56px) alinea el texto con el
                    título de arriba, saltándose el icono: sin él la
                    descripción arranca debajo del emoji y la columna se
                    quiebra al abrir. */}
                <div className="px-5 pb-5 pt-1 md:pl-[3.5rem]">
                  <p className="text-muted-foreground text-sm md:text-[0.9375rem] leading-relaxed">
                    {b.body}
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

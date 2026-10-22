import { ProductDisclosure } from './product-disclosure';
import { Product } from '@/lib/types';

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
// EL ENCABEZADO NO PUEDE ATRIBUIR ESTO A UN CLIENTE. «Experiencias de nuestros
// clientes», «Lo que opinan», «Testimonios» y cualquier variante afirman que
// alguien real lo dijo, y volverían a meter el problema entero por la puerta
// del título. El encabezado actual es igual de persuasivo por otra vía: habla
// en segunda persona y vende el beneficio al comprador («Así TE va a servir»)
// en vez de describir a terceros que no existen.
//
// La página de Términos (/terminos, sección «Contenido del sitio») declara por
// escrito que estos textos NO son testimonios de clientes reales. Si alguien
// cambia este encabezado, esa declaración pasa a contradecir a la ficha.
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

// Quieto (22-oct-2026): fue un carrusel que avanzaba solo cada 4,5 s, y la
// guía de marca prohíbe lo que se mueve solo. Ahora se ven todos a la vez, en
// rejilla, y cada uno conserva su número (al rotar, siempre decían 01 a 03).

function UseCaseCard({ text, index }: { text: string; index: number }) {
  return (
    <div className="relative flex flex-col border-t-2 border-nav-inactive-border pt-5 h-full">
      <span
        aria-hidden
        className="font-serif text-sm font-extrabold tabular-nums text-todopolis-lavender-deep mb-3"
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <p className="text-foreground leading-relaxed text-sm md:text-base flex-1">{text}</p>
    </div>
  );
}

export function ProductTestimonials({ product }: ProductTestimonialsProps) {
  const cases = (product.testimonials ?? [])
    // Los documentos antiguos tienen personas, ciudades y estrellas inventadas
    // por el generador anterior. No se muestran. Las generaciones nuevas solo
    // guardan `text` y funcionan como escenarios hipotéticos honestos.
    .filter((t) => !(t as { name?: string }).name?.trim())
    .map((t) => ((t as { text?: string; comment?: string }).text ?? (t as { comment?: string }).comment ?? '').trim())
    .filter(Boolean);

  // Sin contenido no se pinta la sección. Antes caía a tres testimonios de
  // respaldo escritos a mano —«Maria Garcia», «Carolina Martinez»— que salían
  // idénticos en cada producto sin copy.
  if (cases.length === 0) return null;

  return (
    <ProductDisclosure
      id="usos"
      title="Así te va a servir"
      description={`${cases.length} ${cases.length === 1 ? 'situación de uso' : 'situaciones de uso'} en tu día a día`}
    >
      {/* Tres columnas desde `lg` y no `md`: en tablet tres columnas dejan
          184 px de texto útil. */}
      <div className={`grid gap-5 sm:grid-cols-2 ${cases.length === 2 || cases.length === 4 ? '' : 'lg:grid-cols-3'}`}>
        {cases.map((text, i) => (
          <UseCaseCard key={i} text={text} index={i} />
        ))}
      </div>
    </ProductDisclosure>
  );
}

import { Product } from '@/lib/types'
import { CategorySpotlight } from '@/components/category-spotlight'

// «Eleva tu estilo»: la sección de moda y accesorios del home, y el H1 de la
// página (sep 2026). Todópolis se enfoca poco a poco en ese sector y el slogan
// va pegado a productos que lo cumplen, no encima de un catálogo que todavía
// es sobre todo hogar y belleza. La selección está en `lib/style-picks.ts`.
//
// Mismo lenguaje que Novedades: antetítulo gris con filete, titular, una fila
// deslizable con la misma `ProductCard`. Va sobre fondo blanco y Novedades
// sobre gris suave, así las dos franjas se separan sin cajas.

export function StyleSpotlight({ products }: { products: Product[] }) {
  // Con muy pocos productos, el slogan encima de dos tarjetas se lee a medio
  // hacer. Mejor no pintar la sección.
  if (products.length < 4) return null

  return (
    <CategorySpotlight
      products={products}
      id="estilo-titulo"
      eyebrow="Moda y accesorios"
      title="Eleva tu estilo"
      category="Ropa"
      linkLabel="Ver toda la ropa"
      primary
    />
  )
}

// Fuente ÚNICA de las categorías de producto.
//
// La consumen: el schema del Studio (sanity/schemaTypes/product.ts), el bloque
// de clasificación del prompt (lib/product-content-prompt.ts) y el script de
// limpieza scripts/fix-product-categories.ts.
//
// Antes la lista vivía dentro del schema y nada validaba lo que escribían el
// import de Mastershop ni los scripts sueltos. En el dataset quedaron
// 'electrónica' con tilde, 'Otros' en mayúscula y etiquetas crudas de
// Mastershop como 'Hogar, Muebles, Cocina'. Las dos primeras se salvan de
// casualidad por el fallback de `normalizeCategory` en components/product-browser.tsx;
// la tercera no cae en ninguna pestaña del home salvo "Todos".

export interface ProductCategory {
  /** Valor almacenado en Sanity. Siempre en minúscula, sin tildes, con guiones. */
  value: string
  /** Lo que ve el editor en el Studio y el comprador en el home. */
  title: string
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { value: 'electronica', title: 'Electrónica' },
  { value: 'hogar', title: 'Hogar' },
  { value: 'moda', title: 'Moda' },
  { value: 'deportes', title: 'Deportes' },
  { value: 'juguetes', title: 'Juguetes' },
  { value: 'belleza', title: 'Belleza' },
  { value: 'alimentos', title: 'Alimentos' },
  { value: 'accesorios', title: 'Accesorios' },
  { value: 'bienestar-intimo', title: 'Bienestar Íntimo' },
  { value: 'otros', title: 'Otros' },
]

export const PRODUCT_CATEGORY_VALUES: string[] = PRODUCT_CATEGORIES.map((c) => c.value)

export function isProductCategory(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_CATEGORY_VALUES.includes(value)
}

/**
 * Lleva un valor sucio al slug canónico cuando la diferencia es solo de forma
 * (tildes, mayúsculas, espacios). Devuelve null si el valor no corresponde a
 * ninguna categoría — ese caso necesita clasificarse, no normalizarse.
 */
export function normalizeProductCategory(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const folded = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  if (!folded) return null

  for (const category of PRODUCT_CATEGORIES) {
    const foldedValue = category.value.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const foldedTitle = category.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
    if (folded === foldedValue || folded === foldedTitle) return category.value
  }

  return null
}

// Cuánto carga la cuadrícula del catálogo y dónde van los carriles de
// inspiración. Lógica pura, con prueba, aparte del componente (`node --test`
// no importa JSX).
//
// Hasta sep 2026 el scroll era infinito de 24 en 24 sobre ~560 productos, y
// eso tenía dos costos concretos:
//   1. El PIE DE PÁGINA era inalcanzable en el home: para llegar había que
//      cargar el catálogo entero. Ahí están Privacidad y Términos, que Meta
//      exige encontrables, y la suscripción.
//   2. Volver de una ficha perdía el lugar: lo cargado no se guardaba, y quien
//      había bajado 150 productos volvía a los 24 primeros.
// Ahora carga solo hasta AUTO_LOAD_LIMIT y después pide un botón.

/** Productos por tanda. */
export const PAGE_SIZE = 24

/** Hasta aquí la cuadrícula carga sola al bajar; después, botón «Ver más». */
export const AUTO_LOAD_LIMIT = 48

/**
 * Tras qué producto va cada carril de inspiración (1-based: 16 = después del
 * 16.º). Eran ~23 carriles, uno cada 24 productos, con solo ~41 imágenes: el
 * mismo carril volvía cada cinco. Dos alcanzan para descubrir sin que el
 * catálogo se lea como relleno entre carriles.
 */
export const RAIL_AFTER = [16, 48] as const

/** ¿Carga la siguiente tanda sola al llegar al final de lo visible? */
export function shouldAutoLoad(visible: number, total: number): boolean {
  return visible < total && visible < AUTO_LOAD_LIMIT
}

/** Cuántos quedan por mostrar. */
export function remaining(visible: number, total: number): number {
  return Math.max(0, total - visible)
}

/**
 * El número de carril (0, 1…) que va después del producto en `index`
 * (0-based), o null. Solo si quedan productos visibles DESPUÉS: un carril
 * colgando al final de lo cargado se lee como el final del catálogo.
 */
export function railAfterIndex(index: number, visible: number): number | null {
  const at = RAIL_AFTER.indexOf((index + 1) as (typeof RAIL_AFTER)[number])
  if (at === -1) return null
  return visible > index + 1 ? at : null
}

/**
 * Firma de una lista de productos, para saber si lo guardado al salir hacia
 * una ficha corresponde a la misma lista al volver (mismo filtro, mismo orden).
 */
export function listSignature(ids: string[]): string {
  return `${ids.length}:${ids.slice(0, 3).join(',')}:${ids.at(-1) ?? ''}`
}

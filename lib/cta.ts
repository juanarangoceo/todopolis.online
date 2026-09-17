// Saneado del texto del botón de compra (`heroCta`, generado por IA y guardado
// por producto en Sanity).
//
// Vive en lib/ y no dentro del .tsx porque es justo el tipo de lógica que falla
// en silencio: un CTA malo no rompe nada, solo vende menos, y nadie lo nota
// revisando 576 fichas a mano. Misma razón que `lib/inspiration.ts`.
//
// Lo que hay hoy en el dataset (auditado el 17-sep-2026 sobre 558 productos con
// heroCta) y que este módulo corrige al renderizar:
//
//   · 191 CTAs pasivos — 151 de ellos "Ver mi pedido", que en una ficha de
//     producto suena a rastrear un pedido que todavía no existe. El prompt de
//     copy los prohíbe expresamente, pero se generaron con versiones viejas.
//   ·  13 nombran la contraentrega ("Comprar ahora contraentrega"). Desde que
//     hay pago protegido con Confío, el botón no puede casarse con UN medio de
//     pago: el comprador elige después, en el checkout.
//   ·  49 pasan de 22 caracteres y parten el botón en dos renglones, que en
//     móvil empuja el precio fuera de la pantalla.
//
// Sanear al renderizar y no en el dataset es deliberado: cubre también lo que
// genere la IA mañana, sin depender de que alguien vuelva a pasar un script.

/** Lo que se usa cuando el CTA del producto no sirve. */
export const DEFAULT_CTA = 'Comprar ahora'

/**
 * Máximo de caracteres que caben en una línea del botón en móvil (390 px de
 * ancho, con el icono y el padding del botón).
 */
export const MAX_CTA_LENGTH = 22

/** Verbos de exploración: invitan a mirar, no a comprar. */
const PASSIVE_START = /^(ver|explor|descub|conoc|saber|mira|m[áa]s\s+info)/i

/** Medios de pago mencionados dentro del botón. */
const PAYMENT_MENTION = /\s*\b(contra\s*-?\s*entrega|contraentrega|pago\s+contra\s*entrega)\b\s*/gi

export function sanitizeHeroCta(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_CTA

  // Quitar la mención al medio de pago suele dejar un CTA perfectamente bueno:
  // "Comprar ahora contraentrega" → "Comprar ahora". Se limpia antes de juzgar
  // el resto para no descartar por largo algo que sí sirve.
  let cta = raw.replace(PAYMENT_MENTION, ' ').replace(/\s+/g, ' ').trim()

  // Puntuación suelta que queda al arrancarle una palabra del final.
  cta = cta.replace(/[\s,;:·—-]+$/, '').trim()

  if (!cta) return DEFAULT_CTA
  if (PASSIVE_START.test(cta)) return DEFAULT_CTA
  if (cta.length > MAX_CTA_LENGTH) return DEFAULT_CTA

  return cta
}

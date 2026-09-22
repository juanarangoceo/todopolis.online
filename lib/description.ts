// La descripción corta que escribe la IA viene como viñetas con emoji al
// inicio («✅ … \n🔥 … \n⭐ …»). En el hero eso se pintaba como un solo párrafo
// con los emojis incrustados: se leía como un anuncio hecho con IA y, en
// Android sin la fuente de emoji, salían cuadritos vacíos.
//
// Aquí se parte en viñetas y se les quita el emoji. Se hace al RENDERIZAR y no
// en el dataset, igual que `sanitizeHeroCta`: cubre los 577 productos de hoy
// sin reescribirlos. El prompt ya pide viñetas sin emoji para lo nuevo.

const LEADING_SYMBOLS = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}️‍•\-–—*·•\s]+/u

/** Quita emojis y marcadores de viñeta del inicio de una línea. */
export function stripLeadingSymbols(line: string): string {
  return line.replace(LEADING_SYMBOLS, '').trim()
}

/**
 * Divide la descripción en viñetas limpias. Una descripción sin saltos de
 * línea devuelve un solo elemento: no se inventan viñetas partiendo frases.
 */
export function descriptionBullets(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map(stripLeadingSymbols)
    .filter((line) => line.length > 0)
}

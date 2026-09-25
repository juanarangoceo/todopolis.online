// Cómo se ofrecen las variantes en la ficha y en el checkout.
//
// Mastershop manda las variantes como combinaciones sueltas —«XS/NEGRO»,
// «2xl/Beige», «M/MORADO UVA»— desordenadas y con mayúsculas al azar. Pintadas
// tal cual eran hasta 50 botones por producto (72 productos con variantes al
// 25-sep-2026, casi todos fajas y ropa): la ficha se volvía una pared de
// píldoras antes del precio, y para encontrar «M negro» había que leerlas todas.
//
// Si TODAS las variantes tienen la forma «A/B» y uno de los dos lados es una
// talla, se parten en dos ejes —Talla y Color—, con las tallas en su orden
// (XS, S, M, L, XL, 2XL…) y los nombres limpios. 50 combinaciones pasan a ~7
// tallas y ~8 colores. Si no se puede partir con seguridad, se queda la lista
// única de siempre: mejor feo que equivocado.
//
// El pedido sigue viajando con la variante REAL (`idVariant` y su nombre
// original de Mastershop): esto solo cambia cómo se elige, no qué se pide.

export interface VariantLike {
  idVariant: number
  name: string
  stock?: number
}

export interface OptionValue {
  /** Clave de comparación (mayúsculas, sin espacios dobles). */
  key: string
  /** Texto para mostrar. */
  label: string
}

export interface VariantAxis {
  label: string
  values: OptionValue[]
}

export type VariantOptions<V extends VariantLike> =
  | { mode: 'single'; values: { variant: V; label: string }[] }
  | {
      mode: 'split'
      axes: [VariantAxis, VariantAxis]
      /** Combinación → variante. Clave `${a}|${b}`. */
      byPair: Map<string, V>
      /** Variante → sus dos claves. */
      pairOf: Map<number, [string, string]>
    }

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL']
const SIZE_ALIASES: Record<string, string> = { XXL: '2XL', XXXL: '3XL', XXXXL: '4XL' }
const ONE_SIZE = /^(U|UNICA|ÚNICA|TALLA UNICA|TALLA ÚNICA|ESTANDAR|ESTÁNDAR|STD)\b/
// Tamaños de cama y similares: no son talla, pero son el otro eje de un color.
const BED_SIZES = /^(SENCILLA|SENCILLO|SEMIDOBLE|SEMI DOBLE|DOBLE|QUEEN|KING|SUPER KING|CUNA|INFANTIL)$/

// Primera palabra de un color. Sirve para reconocer el eje «Color» cuando el
// otro lado no es talla («Queen/Azul»). Con NEGR0 (con cero) porque así viene
// de un proveedor.
const COLOR_WORDS = new Set([
  'NEGRO', 'NEGRA', 'NEGR0', 'BLANCO', 'BLANCA', 'BEIGE', 'COCOA', 'AZUL', 'ROJO', 'ROJA', 'ROSADO',
  'ROSADA', 'ROSA', 'VERDE', 'GRIS', 'CAFE', 'CAFÉ', 'CHOCOLATE', 'ARENA', 'NUDE', 'PIEL', 'TALCO',
  'MORADO', 'MORADA', 'FUCSIA', 'CELESTE', 'TURQUESA', 'AMARILLO', 'AMARILLA', 'NARANJA', 'VINO',
  'LILA', 'VIOLETA', 'DORADO', 'DORADA', 'PLATA', 'PLATEADO', 'ORO', 'MOCA', 'TERRACOTA', 'CREMA',
  'MARFIL', 'MIEL', 'CAREY', 'TRANSPARENTE', 'TRANSLUCIDO', 'MULTICOLOR', 'TRICOLOR', 'PALO',
  'CAMEL', 'MOSTAZA', 'CORAL', 'SALMON', 'SALMÓN', 'KAKI', 'CAQUI', 'MENTA', 'LAVANDA', 'BRONCE',
])

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')
const keyOf = (s: string) => clean(s).toUpperCase()

/** Talla normalizada («2xl» → «2XL», «XXL» → «2XL»), o null si no parece talla. */
export function normalizeSize(raw: string): string | null {
  const k = keyOf(raw).replace(/^TALLA\s+/, '')
  if (SIZE_ALIASES[k]) return SIZE_ALIASES[k]
  if (SIZE_ORDER.includes(k)) return k
  // «Unica (8/10/12/14)» también es talla única.
  if (ONE_SIZE.test(k)) return 'Única'
  // Tallas numéricas: ropa (6–16, 28–44) y calzado (21–46). Con más de dos
  // cifras ya es otra cosa (un modelo, una capacidad).
  if (/^\d{1,2}$/.test(k)) return k
  // Rangos: «S-M», «L-XL».
  const range = k.match(/^([A-Z0-9]+)\s*-\s*([A-Z0-9]+)$/)
  if (range) {
    const a = normalizeSize(range[1])
    const b = normalizeSize(range[2])
    if (a && b) return `${a}-${b}`
  }
  return null
}

function sizeRank(size: string): number {
  const first = size.split('-')[0]
  const i = SIZE_ORDER.indexOf(first)
  if (i >= 0) return i + (size.includes('-') ? 0.5 : 0)
  if (/^\d+$/.test(first)) return 100 + Number(first)
  return 1000
}

const BED_ORDER = ['CUNA', 'INFANTIL', 'SENCILLA', 'SENCILLO', 'SEMIDOBLE', 'SEMI DOBLE', 'DOBLE', 'QUEEN', 'KING', 'SUPER KING']
const bedRank = (size: string) => BED_ORDER.indexOf(keyOf(size))

const isColor = (raw: string) => COLOR_WORDS.has(keyOf(raw).split(/[\s-]/)[0])
const isBedSize = (raw: string) => BED_SIZES.test(keyOf(raw))

/** «MORADO UVA» → «Morado uva». Lo que no viene todo en mayúsculas se respeta. */
function pretty(raw: string): string {
  const s = clean(raw)
  // Siglas cortas («S/M», «LED») se dejan como vienen.
  if (s.split(/[^\p{L}]+/u).every((w) => w.length <= 3)) return s
  if (s !== s.toUpperCase()) return s.charAt(0).toUpperCase() + s.slice(1)
  const lower = s.toLocaleLowerCase('es-CO')
  return lower.charAt(0).toLocaleUpperCase('es-CO') + lower.slice(1)
}

export function isSoldOut(v: VariantLike): boolean {
  return typeof v.stock === 'number' && v.stock <= 0
}

/** Parte por la barra que NO está dentro de un paréntesis. */
function splitName(name: string): [string, string] | null {
  let depth = 0
  const cuts: number[] = []
  for (let i = 0; i < name.length; i++) {
    const c = name[i]
    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === '/' && depth === 0) cuts.push(i)
  }
  if (cuts.length !== 1) return null
  const a = clean(name.slice(0, cuts[0]))
  const b = clean(name.slice(cuts[0] + 1))
  return a && b ? [a, b] : null
}

/**
 * Lado de cada nombre que es «medida» (talla o tamaño) y lado que es color.
 * Se decide por variante, porque hay proveedores que los mezclan
 * («Negro/Unica» y «Unica/Terracota» en el mismo producto).
 */
function measureAndColor(parts: [string, string]): { measure: string; color: string; kind: 'talla' | 'tamaño' } | null {
  const [a, b] = parts
  const sa = normalizeSize(a)
  const sb = normalizeSize(b)
  if (sa && !sb) return { measure: sa, color: b, kind: 'talla' }
  if (sb && !sa) return { measure: sb, color: a, kind: 'talla' }
  if (sa || sb) return null // los dos parecen talla: «S/M»
  if (isBedSize(a) && isColor(b)) return { measure: pretty(a), color: b, kind: 'tamaño' }
  if (isBedSize(b) && isColor(a)) return { measure: pretty(b), color: a, kind: 'tamaño' }
  return null
}

export function variantOptions<V extends VariantLike>(variants: V[]): VariantOptions<V> {
  const parsed = variants.map((v) => {
    const parts = splitName(v.name)
    return parts ? measureAndColor(parts) : null
  })
  const allParsed = variants.length >= 2 && parsed.every((p) => p !== null)
  const kinds = new Set(parsed.map((p) => p?.kind))

  if (!allParsed || kinds.size !== 1) return { mode: 'single', values: sortSingle(variants) }
  const rows = parsed as NonNullable<(typeof parsed)[number]>[]

  const measures = new Map<string, OptionValue>()
  const colors = new Map<string, OptionValue>()
  rows.forEach((r) => {
    if (!measures.has(r.measure)) measures.set(r.measure, { key: r.measure, label: r.measure })
    const ck = keyOf(r.color)
    if (!colors.has(ck)) colors.set(ck, { key: ck, label: pretty(r.color) })
  })

  // Un lado fijo («Unica/Cafe», «35 / Negro»): no hay dos ejes, pero el nombre
  // se acorta al lado que cambia.
  if (measures.size < 2 || colors.size < 2) {
    const measureVaries = measures.size >= 2
    const values = variants.map((v, i) => ({
      variant: v,
      label: measureVaries ? rows[i].measure : pretty(rows[i].color),
    }))
    if (measureVaries && rows[0].kind === 'talla') values.sort((a, b) => sizeRank(a.label) - sizeRank(b.label))
    return { mode: 'single', values }
  }

  const byPair = new Map<string, V>()
  const pairOf = new Map<number, [string, string]>()
  variants.forEach((v, i) => {
    const pair: [string, string] = [rows[i].measure, keyOf(rows[i].color)]
    const k = pair.join('|')
    // Dos variantes que se leen igual («M/Negro» y «m/NEGRO»): gana la que
    // tiene stock; si no, la primera.
    const prev = byPair.get(k)
    if (!prev || (isSoldOut(prev) && !isSoldOut(v))) byPair.set(k, v)
    pairOf.set(v.idVariant, pair)
  })

  const kind = rows[0].kind
  const measureValues = [...measures.values()]
  if (kind === 'talla') measureValues.sort((a, b) => sizeRank(a.key) - sizeRank(b.key))
  else measureValues.sort((a, b) => bedRank(a.key) - bedRank(b.key))
  return {
    mode: 'split',
    axes: [
      { label: kind === 'talla' ? 'Talla' : 'Tamaño', values: measureValues },
      { label: 'Color', values: [...colors.values()] },
    ],
    byPair,
    pairOf,
  }
}

function sortSingle<V extends VariantLike>(variants: V[]) {
  const sizes = variants.map((v) => normalizeSize(v.name))
  const allSizes = sizes.every((s) => s !== null)
  const values = variants.map((v, i) => ({
    variant: v,
    label: allSizes ? (sizes[i] as string) : pretty(v.name),
  }))
  if (allSizes) values.sort((a, b) => sizeRank(a.label) - sizeRank(b.label))
  return values
}

/** Picks parciales de talla y color. */
export type Picks = [string | null, string | null]

/**
 * ¿Se puede elegir `value` en el eje `axis` con lo que ya está elegido en el
 * otro? Sin nada elegido en el otro eje, basta con que exista alguna
 * combinación con stock.
 */
export function isValueAvailable<V extends VariantLike>(
  opts: Extract<VariantOptions<V>, { mode: 'split' }>,
  axis: 0 | 1,
  value: string,
  picks: Picks,
): boolean {
  const other = picks[1 - axis]
  const candidates = other
    ? [opts.byPair.get(axis === 0 ? `${value}|${other}` : `${other}|${value}`)]
    : opts.axes[1 - axis].values.map((o) =>
        opts.byPair.get(axis === 0 ? `${value}|${o.key}` : `${o.key}|${value}`),
      )
  return candidates.some((v) => v !== undefined && !isSoldOut(v))
}

/**
 * Aplica un toque: fija `value` en `axis`. Si con eso el otro eje queda en una
 * combinación que no existe o está agotada, se suelta el otro eje en vez de
 * dejar al comprador con una elección imposible.
 */
export function pick<V extends VariantLike>(
  opts: Extract<VariantOptions<V>, { mode: 'split' }>,
  picks: Picks,
  axis: 0 | 1,
  value: string,
): { picks: Picks; variant: V | null } {
  const next: Picks = [...picks] as Picks
  next[axis] = value
  if (next[0] && next[1]) {
    const v = opts.byPair.get(`${next[0]}|${next[1]}`)
    if (v && !isSoldOut(v)) return { picks: next, variant: v }
    next[1 - axis] = null
  }
  return { picks: next, variant: null }
}

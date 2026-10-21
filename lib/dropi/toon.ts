// Decodificador de TOON (Token-Oriented Object Notation), el formato en que
// responden las herramientas del MCP de Dropi en vez de JSON. Ejemplo real:
//
//   items[1]:
//     - id: 2233738
//       name: COBIJA NAVIDEÑA PIEL DE CONEJO
//       categories[1]: Hogar
//       gallery[1]{urlS3}:
//         "https://d39ru7awumhhs2.cloudfront.net/…PNG"
//       variations[1]:
//         - id: 2366122
//           attributes[1]{name,value}:
//             DISEÑOS,SANTA AZUL
//   count: 1
//
// Cubre lo que define el formato: objetos por sangría, listas con «- »,
// arreglos en línea `k[N]: a,b`, tablas `k[N]{f1,f2}:` y delimitadores
// coma, tabulador o barra. Sin dependencias: el paquete oficial obligaría a
// reconstruir la imagen dev.

type Value = null | boolean | number | string | Value[] | { [k: string]: Value }

interface Line { indent: number; text: string }

const HEADER = /^\[#?(\d+)([\t|])?\](?:\{([^}]*)\})?:(.*)$/

export class ToonError extends Error {}

function splitDelimited(text: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      cur += c
      if (c === '\\') cur += text[++i] ?? ''
      else if (c === '"') quoted = false
    } else if (c === '"') { quoted = true; cur += c }
    else if (c === delim) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export function parsePrimitive(raw: string): Value {
  const s = raw.trim()
  if (s.startsWith('"')) return JSON.parse(s)
  if (s === 'null') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s)) return Number(s)
  return s
}

/** Índice del «:» que separa clave y valor, fuera de comillas. -1 si no hay. */
function keyEnd(text: string): number {
  if (text.startsWith('"')) {
    let i = 1
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1
    const rest = text.slice(i + 1)
    const m = rest.match(/^(\[[^\]]*\](?:\{[^}]*\})?)?:/)
    return m ? i + 1 + (m[1]?.length ?? 0) : -1
  }
  const m = text.match(/^[^:"[\s][^:"[]*(\[[^\]]*\](?:\{[^}]*\})?)?:/)
  return m ? m[0].length - 1 : -1
}

class Parser {
  private i = 0
  private readonly lines: Line[]
  constructor(lines: Line[]) { this.lines = lines }

  done() { return this.i >= this.lines.length }

  /** Campos de un objeto a esta sangría exacta. */
  object(indent: number, into: Record<string, Value> = {}): Record<string, Value> {
    while (!this.done() && this.lines[this.i].indent === indent && !this.lines[this.i].text.startsWith('- ')) {
      const { text } = this.lines[this.i++]
      this.field(text, indent, into)
    }
    return into
  }

  private field(text: string, indent: number, into: Record<string, Value>) {
    const end = keyEnd(text)
    if (end < 0) throw new ToonError(`Línea sin clave: ${text}`)
    const head = text.slice(0, end)
    const rest = text.slice(end + 1).trim()
    const bracket = head.startsWith('"') ? head.indexOf('[', head.lastIndexOf('"')) : head.indexOf('[')
    const key = String(parsePrimitive(bracket >= 0 ? head.slice(0, bracket) : head))
    if (bracket >= 0) {
      into[key] = this.array(head.slice(bracket) + ':' + rest, indent)
    } else if (rest) {
      into[key] = parsePrimitive(rest)
    } else {
      const next = this.lines[this.i]
      into[key] = next && next.indent > indent ? this.object(next.indent) : {}
    }
  }

  /** `[N]…:resto` ya separado de su clave. */
  array(header: string, indent: number): Value[] {
    const m = header.match(HEADER)
    if (!m) throw new ToonError(`Encabezado de arreglo inválido: ${header}`)
    const n = Number(m[1])
    const delim = m[2] ?? ','
    const fields = m[3] !== undefined ? splitDelimited(m[3], delim).map((f) => String(parsePrimitive(f))) : null
    const inline = m[4].trim()
    if (n === 0) return []
    if (inline) return splitDelimited(inline, delim).map(parsePrimitive)
    const out: Value[] = []
    while (out.length < n && !this.done() && this.lines[this.i].indent > indent) {
      const line = this.lines[this.i]
      if (fields) {
        this.i++
        const cells = splitDelimited(line.text, delim)
        out.push(Object.fromEntries(fields.map((f, k) => [f, parsePrimitive(cells[k] ?? 'null')])))
      } else {
        out.push(this.listItem(line))
      }
    }
    if (out.length !== n) throw new ToonError(`Se esperaban ${n} elementos y llegaron ${out.length}.`)
    return out
  }

  private listItem(line: Line): Value {
    if (!line.text.startsWith('- ') && line.text !== '-') throw new ToonError(`Elemento de lista inválido: ${line.text}`)
    this.i++
    const body = line.text.slice(2).trim()
    if (!body) return {}
    if (body.startsWith('[')) return this.array(body, line.indent)
    if (keyEnd(body) < 0) return parsePrimitive(body)
    // Objeto: el primer campo va en la línea del guion y el resto, dos
    // espacios más adentro.
    const obj: Record<string, Value> = {}
    this.field(body, line.indent + 2, obj)
    return this.object(line.indent + 2, obj)
  }
}

export function decodeToon(text: string): Value {
  const lines: Line[] = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => ({ indent: l.length - l.trimStart().length, text: l.trim() }))
  if (!lines.length) return {}
  const p = new Parser(lines)
  if (lines[0].indent === 0 && HEADER.test(lines[0].text)) {
    // Arreglo en la raíz: `[N]: …`
    const first = lines.shift()!
    return new Parser(lines).array(first.text, -1)
  }
  if (lines.length === 1 && keyEnd(lines[0].text) < 0) return parsePrimitive(lines[0].text)
  const out = p.object(lines[0].indent)
  if (!p.done()) throw new ToonError('Sobró contenido después del objeto raíz.')
  return out
}

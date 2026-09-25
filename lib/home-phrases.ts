// La frase con la que abre el home (25-sep-2026).
//
// El home empezaba directo con productos. Esto es un saludo según la hora y una
// frase corta, de ánimo más que de venta, que cambia en cada visita y se queda
// quieta mientras navegas (la guía prohíbe lo que se mueve solo).
//
// Reglas de las frases, que el test hace cumplir:
//   - Sin género: no sabemos quién entra. Nada de «lista», «bienvenido»…
//   - Sin emojis, sin inglés y sin promesas (nada que la SIC pueda pedir probar).
//   - Máximo MAX_PHRASE_LENGTH caracteres: tienen que caber en UNA línea a
//     390 px. Si una parte en dos, empuja las categorías cuando aparece.

export type DayPart = 'manana' | 'tarde' | 'noche'

export const MAX_PHRASE_LENGTH = 36

export const GREETINGS: Record<DayPart, string> = {
  manana: 'Buenos días',
  tarde: 'Buenas tardes',
  noche: 'Buenas noches',
}

/** Frases por momento del día; `siempre` se suma a cualquiera. */
export const PHRASES: Record<DayPart | 'siempre', string[]> = {
  manana: [
    'Buen día para empezar algo nuevo.',
    'Las mañanas en calma se construyen.',
    'Empieza el día con lo que te gusta.',
    'Un buen detalle cambia la jornada.',
  ],
  tarde: [
    'Lo pequeño también cambia el día.',
    'Tu estilo no se explica: se nota.',
    'Date el tiempo de elegir con calma.',
    'Lo bien hecho mejora la rutina.',
    'Regala algo que sí se vaya a usar.',
  ],
  noche: [
    'Consentirte no necesita una fecha.',
    'Mira con calma: aquí hay de todo.',
    'Lo que te hace bien merece un lugar.',
    'Hoy puede ser día de consentirse.',
  ],
  siempre: [
    'Tu casa, tu ritmo, tu estilo.',
    'Cuidarte también es un plan.',
    'El estilo está en lo que eliges.',
    'Pequeños cambios, días más bonitos.',
    'Que no falten las ganas de estrenar.',
    'Lo sencillo, bien elegido, brilla.',
    'Hoy es buen día para darte un gusto.',
  ],
}

/** Mañana de 5 a 11:59, tarde de 12 a 18:59, noche el resto. */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'manana'
  if (hour >= 12 && hour < 19) return 'tarde'
  return 'noche'
}

/**
 * Elige una frase para ese momento del día. `random` en [0, 1). `avoid` es la
 * última que vio esta persona: no se repite en la visita siguiente.
 */
export function pickPhrase(part: DayPart, random: number, avoid?: string | null): string {
  const pool = [...PHRASES[part], ...PHRASES.siempre]
  const candidates = pool.filter((p) => p !== avoid)
  const list = candidates.length > 0 ? candidates : pool
  const i = Math.min(list.length - 1, Math.max(0, Math.floor(random * list.length)))
  return list[i]
}

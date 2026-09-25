'use client'

import { useSyncExternalStore } from 'react'
import { GREETINGS, dayPart, pickPhrase, type DayPart } from '@/lib/home-phrases'

// Saludo según la hora + una frase (`lib/home-phrases.ts`), arriba del home.
//
// Se elige EN EL NAVEGADOR: el home está en caché y es el mismo HTML para
// todos, así que una frase elegida en el servidor sería la misma para todo el
// mundo hasta la siguiente revalidación, y la hora sería la del servidor
// (UTC), no la de quien entra.
//
// Para que la página no salte, el bloque tiene su altura desde el primer
// pintado y el texto aparece con un fundido corto. Las frases caben en una
// línea (lo exige el test).
//
// - Misma frase durante la sesión (`sessionStorage`): ir a una ficha y volver
//   no la cambia, que parecería que la página se reinició.
// - Otra en la visita siguiente, nunca la última vista (`localStorage`).
// Si el almacenamiento falla (modo privado), igual sale una frase.

const SESSION_KEY = 'tp_phrase_v1'
const LAST_KEY = 'tp_phrase_last_v1'

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value)
  } catch {
    // Sin almacenamiento: la frase vale solo para esta carga.
  }
}
type Choice = { part: DayPart; phrase: string }

function choose(): Choice {
  const part = dayPart(new Date().getHours())
  const saved = read(() => sessionStorage, SESSION_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Choice
      // Si cambió el momento del día (entró de tarde y volvió de noche), se
      // elige otra acorde.
      if (parsed.part === part && parsed.phrase) return parsed
    } catch {
      // Valor dañado: se elige una nueva.
    }
  }
  const phrase = pickPhrase(part, Math.random(), read(() => localStorage, LAST_KEY))
  const next = { part, phrase }
  write(() => sessionStorage, SESSION_KEY, JSON.stringify(next))
  write(() => localStorage, LAST_KEY, phrase)
  return next
}

// Se elige UNA vez por carga de página y se guarda aquí: `getSnapshot` tiene
// que devolver siempre el mismo objeto. En el servidor (y al hidratar) no hay
// frase; justo después React pinta la del navegador, sin desajuste.
let chosen: Choice | null = null
const subscribe = () => () => {}
const getSnapshot = () => (chosen ??= choose())
const getServerSnapshot = () => null

export function HomeGreeting() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)


  return (
    <div className="container mx-auto px-4 pt-4 md:pt-6">
      <div
        className={`min-h-[2.75rem] transition-opacity duration-300 motion-reduce:transition-none md:min-h-[3.5rem] ${
          state ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {state && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {GREETINGS[state.part]}
            </p>
            <p className="mt-0.5 font-serif text-base font-extrabold leading-snug tracking-[-0.01em] text-ink-title md:text-2xl">
              {state.phrase}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

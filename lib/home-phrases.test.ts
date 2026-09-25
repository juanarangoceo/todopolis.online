import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_PHRASE_LENGTH, PHRASES, dayPart, pickPhrase } from './home-phrases.ts'

const all = Object.values(PHRASES).flat()

test('las frases caben en una línea del celular', () => {
  for (const p of all) assert.ok(p.length <= MAX_PHRASE_LENGTH, `«${p}» tiene ${p.length} caracteres`)
})

test('sin emojis, sin repetidas y terminadas en punto', () => {
  assert.equal(new Set(all).size, all.length)
  for (const p of all) {
    assert.ok(!/\p{Extended_Pictographic}/u.test(p), `emoji en «${p}»`)
    assert.ok(p.endsWith('.'), `«${p}» sin punto final`)
  }
})

test('sin palabras con género: no sabemos quién entra', () => {
  const gendered = /\b(list[oa]s?|bienvenid[oa]s?|lind[oa]s?|hermos[oa]s?|guap[oa]s?|queridos?|queridas?|amig[oa]s?|seguros?|seguras?|cansad[oa]s?|consentid[oa]s?)\b/i
  for (const p of all) assert.ok(!gendered.test(p), `«${p}» tiene género`)
})

test('momentos del día', () => {
  assert.equal(dayPart(5), 'manana')
  assert.equal(dayPart(11), 'manana')
  assert.equal(dayPart(12), 'tarde')
  assert.equal(dayPart(18), 'tarde')
  assert.equal(dayPart(19), 'noche')
  assert.equal(dayPart(2), 'noche')
})

test('elige del momento o de «siempre», y no repite la última', () => {
  const pool = [...PHRASES.noche, ...PHRASES.siempre]
  for (let r = 0; r < 1; r += 0.05) {
    const p = pickPhrase('noche', r, PHRASES.noche[0])
    assert.ok(pool.includes(p))
    assert.notEqual(p, PHRASES.noche[0])
  }
  // random = 0.9999 no se sale de la lista.
  assert.ok(pool.includes(pickPhrase('noche', 0.9999)))
})

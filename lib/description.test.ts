import assert from 'node:assert/strict'
import test from 'node:test'
import { descriptionBullets, stripLeadingSymbols } from './description.ts'

test('parte en viñetas y quita el emoji inicial', () => {
  const text = '✅ Evita caídas con su dirección limitada a 135 grados.\n🔥 Desarrolla fuerza en sus piernas.\n⭐ Protege manos y deditos.'
  assert.deepEqual(descriptionBullets(text), [
    'Evita caídas con su dirección limitada a 135 grados.',
    'Desarrolla fuerza en sus piernas.',
    'Protege manos y deditos.',
  ])
})

test('emojis compuestos y marcadores de lista también salen', () => {
  assert.equal(stripLeadingSymbols('💪🏽 Más fuerza'), 'Más fuerza')
  assert.equal(stripLeadingSymbols('❤️ Con cariño'), 'Con cariño')
  assert.equal(stripLeadingSymbols('- Guion'), 'Guion')
  assert.equal(stripLeadingSymbols('• Punto'), 'Punto')
})

test('no toca emojis en medio de la frase ni números al inicio', () => {
  assert.equal(stripLeadingSymbols('Ideal para 🎮 gamers'), 'Ideal para 🎮 gamers')
  assert.equal(stripLeadingSymbols('2 barras incluidas'), '2 barras incluidas')
})

test('texto sin saltos es un solo elemento; vacío es lista vacía', () => {
  assert.deepEqual(descriptionBullets('Una sola frase.'), ['Una sola frase.'])
  assert.deepEqual(descriptionBullets(''), [])
  assert.deepEqual(descriptionBullets(null), [])
  assert.deepEqual(descriptionBullets('✅\n\n'), [])
})

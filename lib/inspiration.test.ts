// `railSlice` decide qué imágenes lleva cada carril. Si se equivoca, el fallo es
// silencioso y feo: el mismo carril repetido toda la home, o carriles vacíos a
// mitad del scroll infinito.

import assert from 'node:assert/strict'
import test from 'node:test'
import { inspirationImages, RAIL_SIZE, railSlice, type AiImage } from './inspiration.ts'

test('las fotos recién generadas en productos antiguos entran en el primer carril', () => {
  const products = Array.from({ length: 32 }, (_, i) => ({
    name: `Producto ${i}`, slug: `p${i}`, price: 100,
    aiLifestyleImage: `image${i}`, aiLifestyleImageCreatedAt: '2026-09-01T00:00:00Z',
  }))
  products[31].aiLifestyleImageCreatedAt = '2026-10-22T15:26:23Z'
  products[29].aiLifestyleImageCreatedAt = '2026-10-22T15:35:01Z'
  const originalOrder = products.map((p) => p.slug)
  assert.deepEqual(railSlice(inspirationImages(products), 0).slice(0, 2).map((p) => p.slug), ['p29', 'p31'])
  assert.deepEqual(products.map((p) => p.slug), originalOrder)
})

test('omite productos sin foto y conserva las fotos antiguas sin fecha', () => {
  assert.deepEqual(inspirationImages([
    { name: 'Sin foto', slug: 'sin-foto' },
    { name: 'Foto antigua', slug: 'antigua', aiLifestyleImage: 'old.jpg' },
    { name: 'Foto nueva', slug: 'nueva', aiLifestyleImage: 'new.jpg', aiLifestyleImageCreatedAt: '2026-10-22T15:35:01Z', price: 50 },
  ]), [
    { name: 'Foto nueva', slug: 'nueva', image: 'new.jpg', price: 50 },
    { name: 'Foto antigua', slug: 'antigua', image: 'old.jpg', price: 0 },
  ])
})

const make = (n: number): AiImage[] =>
  Array.from({ length: n }, (_, i) => ({ image: `img${i}`, name: `Producto ${i}`, slug: `p${i}` }))

test('cada carril trae RAIL_SIZE imágenes', () => {
  const imgs = make(39)
  for (const occ of [0, 1, 2, 3, 4]) {
    assert.equal(railSlice(imgs, occ).length, RAIL_SIZE, `carril ${occ}`)
  }
})

test('los primeros carriles no repiten mientras haya material', () => {
  const imgs = make(39)
  const seen = new Set<string>()
  // 39 imágenes / 8 = 4 carriles completos sin solaparse.
  for (const occ of [0, 1, 2, 3]) {
    for (const item of railSlice(imgs, occ)) {
      assert.ok(!seen.has(item.slug), `${item.slug} repetido en el carril ${occ}`)
      seen.add(item.slug)
    }
  }
  assert.equal(seen.size, 32)
})

test('da la vuelta cuando se agotan, en vez de quedarse vacío', () => {
  // Con 574 productos salen ~35 carriles y solo hay ~39 imágenes: repetir es
  // aceptable, dejar de mostrarlas a mitad del scroll no.
  const imgs = make(39)
  const late = railSlice(imgs, 30)
  assert.equal(late.length, RAIL_SIZE)
  assert.ok(late.every((i) => imgs.some((o) => o.slug === i.slug)))
})

test('aguanta menos imágenes que el tamaño del carril', () => {
  assert.equal(railSlice(make(3), 0).length, 3)
  assert.equal(railSlice(make(1), 5).length, 1)
  assert.deepEqual(railSlice([], 0), [])
})

test('sin imágenes no revienta ni inventa', () => {
  assert.deepEqual(railSlice([], 7), [])
})

// ── Posiciones de los carriles en la cuadrícula ──────────────────────────────
// Réplica de la condición de product-grid.tsx. Se prueba aparte porque el
// componente es .tsx y porque un fuera-de-uno aquí se traduce en carriles
// pegados, ausentes o colgando al final de lo cargado.

const REPEAT_FIRST_AFTER = 4
const REPEAT_EVERY = 12

function railPositions(visible: number): number[] {
  const out: number[] = []
  for (let index = 0; index < visible; index++) {
    const sinceFirst = index + 1 - REPEAT_FIRST_AFTER
    if (sinceFirst >= 0 && sinceFirst % REPEAT_EVERY === 0 && visible > index + 1) {
      out.push(index + 1)
    }
  }
  return out
}

test('el primer carril sale arriba y el resto va cada 12', () => {
  // Primera tanda del scroll infinito: 24 productos.
  assert.deepEqual(railPositions(24), [4, 16])
  // Segunda tanda: 48.
  assert.deepEqual(railPositions(48), [4, 16, 28, 40])
})

test('no se cuelga un carril al final de lo cargado', () => {
  // Con exactamente 4 productos NO hay carril: quedaría al final, sin nada
  // debajo, hasta que cargue la siguiente tanda.
  assert.deepEqual(railPositions(4), [])
  assert.deepEqual(railPositions(5), [4])
})

test('cada carril de la cuadrícula trae imágenes distintas', () => {
  const imgs = make(39)
  const first = railSlice(imgs, 0).map((i) => i.slug)
  const second = railSlice(imgs, 1).map((i) => i.slug)
  assert.notDeepEqual(first, second)
  assert.equal(new Set([...first, ...second]).size, RAIL_SIZE * 2)
})

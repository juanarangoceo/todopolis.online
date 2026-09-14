import assert from 'node:assert/strict'
import test from 'node:test'
import { projectSanityProduct } from './project-sanity-product'

test('proyecta precio, media y contenido comercial sin asumir autoridad de stock', () => {
  const projected = projectSanityProduct({
    _id: 'product-1',
    _updatedAt: '2026-09-14T12:00:00.000Z',
    name: 'Cafetera Nitro',
    slug: 'cafetera-nitro',
    price: 120000,
    originalPrice: 150000,
    mastershopImageUrl: 'https://cdn.example/main.jpg',
    images: ['https://cdn.example/gallery.jpg'],
    variants: [
      { idVariant: 10, name: 'Negra', sku: 'CAF-NEGRA', price: 115000, stock: 0, isEnable: true },
      { idVariant: 11, name: 'Roja', sku: 'CAF-ROJA', price: 125000, stock: 4, isEnable: true },
    ],
    tags: [{ name: 'Café', slug: 'cafe' }],
    specifications: [{ label: 'Voltaje', value: '110 V' }],
    benefits: [{ title: 'Rápida', description: 'Lista en minutos' }],
  })

  assert.ok(projected)
  assert.equal(projected.external_id, 'product-1')
  assert.equal(projected.price_min, 115000)
  assert.equal(projected.price_max, 125000)
  assert.equal(projected.track_stock, false)
  assert.equal(projected.stock_total, null)
  assert.deepEqual(projected.image_urls, [
    'https://cdn.example/gallery.jpg',
    'https://cdn.example/main.jpg',
  ])
  assert.match(projected.content_hash, /^[a-f0-9]{64}$/)
})

test('solo usa stock cuando Sanity lo declara autoritativo', () => {
  const projected = projectSanityProduct({
    _id: 'product-2',
    _updatedAt: '2026-09-14T12:00:00.000Z',
    name: 'Molino Nitro',
    slug: 'molino-nitro',
    price: 90000,
    trackStock: true,
    variants: [
      { idVariant: 20, name: 'Única', price: 90000, stock: 3, isEnable: true },
      { idVariant: 21, name: 'Retirada', price: 90000, stock: 99, isEnable: false },
    ],
  })
  assert.equal(projected?.stock_total, 3)
})

test('rechaza documentos que el bot no podría vender con seguridad', () => {
  assert.equal(projectSanityProduct({ _id: 'x', _updatedAt: '2026-09-14T12:00:00Z', name: 'Sin precio', slug: 'x' }), null)
})

test('un cambio solo de _updatedAt no genera una nueva versión de contenido', () => {
  const base = { _id: 'x', name: 'Producto', slug: 'producto', price: 10000 }
  const first = projectSanityProduct({ ...base, _updatedAt: '2026-09-14T12:00:00Z' })
  const second = projectSanityProduct({ ...base, _updatedAt: '2026-09-14T13:00:00Z' })
  assert.equal(first?.content_hash, second?.content_hash)
})

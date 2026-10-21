import test from 'node:test'
import assert from 'node:assert/strict'
import { DROPI_READ_TOOLS, dropiMarkedAdult, findDropiProduct, normalizeDropiProduct, sanityVariants } from './catalog.ts'

const variable = {
  id: 2233738, sku: null, name: 'COBIJA NAVIDEÑA PIEL DE CONEJO', sale_price: 26000, suggested_price: 28000, stock: 0, supplier_id: 393914,
  categories: ['Hogar'],
  gallery: [{ urlS3: 'https://d39ru7awumhhs2.cloudfront.net/colombia/products/2233738/a.PNG' }, { urlS3: 'https://evil.test/x.png' }],
  variations: [
    { id: 2366122, sku: 'null-5', stock: 987, sale_price: 26000, suggested_price: 28000, attributes: [{ name: 'DISEÑOS', value: 'SANTA AZUL' }] },
    { id: 2366123, sku: null, stock: 0, sale_price: 26000, suggested_price: 28000, attributes: [{ name: 'TALLA', value: 'M' }, { name: 'COLOR', value: 'ROJO' }] },
  ],
}

test('normaliza costo, stock por variación y solo fotos del CDN de Dropi', () => {
  const p = normalizeDropiProduct(variable)
  assert.equal(p.cost, 26000)
  assert.equal(p.stock, 987)
  assert.equal(p.sku, null)
  assert.deepEqual(p.images, ['https://d39ru7awumhhs2.cloudfront.net/colombia/products/2233738/a.PNG'])
  assert.equal(p.variations[1].name, 'M/ROJO')
})

test('las variantes guardan el costo y conservan la _key existente', () => {
  const v = sanityVariants(normalizeDropiProduct(variable), [{ idVariant: 2366123, _key: 'abc' }])
  assert.equal(v[0]._key, 'dropi-2366122')
  assert.equal(v[1]._key, 'abc')
  assert.equal(v[1].price, 26000)
})

test('marca de adultos del proveedor', () => {
  assert.equal(dropiMarkedAdult({ categories: ['Moda', 'Sex Shop'] }), true)
  assert.equal(dropiMarkedAdult({ categories: ['Hogar'] }), false)
})

test('nunca se puede llamar create_order', () => {
  assert.equal((DROPI_READ_TOOLS as readonly string[]).includes('create_order'), false)
})

test('encuentra por id entre los resultados de búsqueda por nombre', async () => {
  const calls: Record<string, unknown>[] = []
  const client = {
    async callTool(_name: string, args: Record<string, unknown> = {}) {
      calls.push(args)
      const items = args.supplier_id ? [] : [{ ...variable, id: 1 }, variable]
      return { content: [{ type: 'text', text: JSON.stringify({ items }) }] }
    },
  }
  const p = await findDropiProduct(client, { id: 2233738, name: 'COBIJA', supplierId: 393914 })
  assert.equal(p?.id, 2233738)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].supplier_id, 393914)
})

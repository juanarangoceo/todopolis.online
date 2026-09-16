// Todopolis y el bot de Nitro comparten la MISMA tienda de Confío, y Confío
// admite UNA sola URL de webhook por tienda. Eso significa que los eventos de
// los cobros de Todopolis llegan al endpoint de Nitro y viceversa.
//
// Lo único que impide que un sistema mueva un pedido del otro es el prefijo del
// correlationId. Esta prueba lo fija contra la implementación REAL de los dos
// lados: si alguien cambia un prefijo, esto se cae antes que la producción.
//
// Correr:  node --test --experimental-strip-types lib/payments/confio/isolation.test.ts

import assert from 'node:assert/strict'
import test from 'node:test'
import { correlationIdFor, orderIdFromCorrelation } from './protocol.ts'

const ORDER_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const SALE_ID = 'aa11bb22-cc33-4d44-8e55-ff6677889900'

/**
 * Copia literal de `saleIdFromCorrelation` de
 * nitro_bot/lib/payments/confio/protocol.ts. Se replica en vez de importarse
 * porque los dos repos son independientes y no comparten node_modules; si el
 * original cambia, esta copia deja de representarlo y hay que actualizarla.
 */
function nitroSaleIdFromCorrelation(correlationId: unknown): string | null {
  if (typeof correlationId !== 'string') return null
  const match = correlationId.match(
    /^nitro:[^:]+:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  )
  return match ? match[1].toLowerCase() : null
}

const nitroCorrelationId = (slug: string, saleId: string) => `nitro:${slug}:${saleId}`

test('Nitro descarta un cobro de Todopolis', () => {
  const ours = correlationIdFor(ORDER_ID)
  assert.equal(ours, `todopolis:${ORDER_ID}`)
  // Sin match, el webhook de Nitro lo registra `unmatched` y responde 200 sin
  // tocar una sola fila.
  assert.equal(nitroSaleIdFromCorrelation(ours), null)
})

test('Todopolis descarta un cobro de Nitro', () => {
  const theirs = nitroCorrelationId('coffee-maker-pro', SALE_ID)
  assert.equal(orderIdFromCorrelation(theirs), null)
})

test('cada sistema reconoce el suyo', () => {
  assert.equal(orderIdFromCorrelation(correlationIdFor(ORDER_ID)), ORDER_ID)
  assert.equal(
    nitroSaleIdFromCorrelation(nitroCorrelationId('coffee-maker-pro', SALE_ID)),
    SALE_ID,
  )
})

test('un tenant de Nitro llamado todopolis tampoco colisiona', () => {
  // `nitro:todopolis:<uuid>` es un id legítimo de Nitro. El formato de
  // Todopolis no lleva el prefijo `nitro:`, así que no se cruzan.
  const nitroWithOurSlug = nitroCorrelationId('todopolis', ORDER_ID)
  assert.equal(nitroSaleIdFromCorrelation(nitroWithOurSlug), ORDER_ID)
  assert.equal(orderIdFromCorrelation(nitroWithOurSlug), null)
})

test('formatos basura no pasan por ningún lado', () => {
  for (const bad of [ORDER_ID, 'todopolis:12345', 'todopolisx:' + ORDER_ID, '', null, 42]) {
    assert.equal(orderIdFromCorrelation(bad), null, `Todopolis aceptó ${String(bad)}`)
  }
})

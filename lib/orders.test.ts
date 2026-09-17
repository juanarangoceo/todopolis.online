import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ORDER_STATUSES,
  ALLOWED_TRANSITIONS,
  canTransition,
  isOrderStatus,
  STATUS_TIMESTAMP,
} from './orders.ts'

test('el camino normal de un pedido de contraentrega', () => {
  assert.equal(canTransition('pending', 'confirmed'), true)
  assert.equal(canTransition('confirmed', 'shipped'), true)
  assert.equal(canTransition('shipped', 'delivered'), true)
})

test('no se puede marcar entregado lo que nunca se despachó', () => {
  assert.equal(canTransition('pending', 'delivered'), false)
  assert.equal(canTransition('confirmed', 'delivered'), false)
})

test('un pedido cancelado o entregado ya no se mueve', () => {
  assert.deepEqual(ALLOWED_TRANSITIONS.delivered, [])
  assert.deepEqual(ALLOWED_TRANSITIONS.cancelled, [])
  assert.equal(canTransition('cancelled', 'delivered'), false)
  assert.equal(canTransition('delivered', 'shipped'), false)
})

test('no se retrocede: despachado no vuelve a sin confirmar', () => {
  assert.equal(canTransition('shipped', 'pending'), false)
  assert.equal(canTransition('confirmed', 'pending'), false)
})

test("'esperando pago' solo lo mueve Confío — a mano solo se cancela", () => {
  assert.deepEqual(ALLOWED_TRANSITIONS.pending_payment, ['cancelled'])
  assert.equal(canTransition('pending_payment', 'confirmed'), false)
  assert.equal(canTransition('pending_payment', 'delivered'), false)
})

test('cualquier estado vivo se puede cancelar', () => {
  for (const s of ['pending_payment', 'pending', 'confirmed', 'shipped'] as const) {
    assert.equal(canTransition(s, 'cancelled'), true, `${s} debería poder cancelarse`)
  }
})

test('un estado inventado no pasa — ni de origen ni de destino', () => {
  assert.equal(canTransition('Enviado', 'delivered'), false)
  assert.equal(canTransition('shipped', 'entregado'), false)
  assert.equal(isOrderStatus('Cancelado'), false)
  assert.equal(isOrderStatus('cancelled'), true)
})

test('todos los estados tienen transiciones definidas', () => {
  for (const s of ORDER_STATUSES) {
    assert.ok(Array.isArray(ALLOWED_TRANSITIONS[s]), `falta ${s}`)
  }
})

test('los destinos declarados son estados válidos', () => {
  for (const destinos of Object.values(ALLOWED_TRANSITIONS)) {
    for (const d of destinos) assert.equal(isOrderStatus(d), true)
  }
})

test('los estados que marcan un hito tienen su columna de fecha', () => {
  assert.equal(STATUS_TIMESTAMP.confirmed, 'confirmed_at')
  assert.equal(STATUS_TIMESTAMP.shipped, 'shipped_at')
  assert.equal(STATUS_TIMESTAMP.delivered, 'delivered_at')
  assert.equal(STATUS_TIMESTAMP.cancelled, 'cancelled_at')
})

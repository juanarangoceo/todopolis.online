import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hasTrackingConsent,
  shouldShowNotice,
  isConsentChoice,
  isConsentResolved,
  CONSENT_UNKNOWN,
} from './consent.ts'

test('sin decisión se mide y se muestra el aviso', () => {
  assert.equal(hasTrackingConsent(null), true)
  assert.equal(shouldShowNotice(null), true)
})

test('aceptar: se mide y el aviso desaparece', () => {
  assert.equal(hasTrackingConsent('granted'), true)
  assert.equal(shouldShowNotice('granted'), false)
})

test('RECHAZAR APAGA LA MEDICIÓN DE VERDAD — no es un botón decorativo', () => {
  assert.equal(hasTrackingConsent('denied'), false)
  assert.equal(shouldShowNotice('denied'), false)
})

test('un valor corrupto no cuenta como decisión, pero tampoco apaga nada', () => {
  assert.equal(isConsentChoice('quizás'), false)
  assert.equal(shouldShowNotice('quizás'), true)
  assert.equal(hasTrackingConsent('quizás'), true)
})

test('el centinela distingue "antes de hidratar" de "sin cookie"', () => {
  // Sin cookie SÍ se mide; antes de hidratar no se sabe todavía. Confundirlos
  // haría que el pixel se pintara al hidratar sobre un servidor que no pintó
  // nada — desajuste de hidratación.
  assert.equal(isConsentResolved(CONSENT_UNKNOWN), false)
  assert.equal(isConsentResolved(null), true)
  assert.equal(isConsentResolved('granted'), true)
  assert.equal(isConsentResolved('denied'), true)
})

// El fallo que esto impide es real y está documentado en nitro_bot: Confío
// estuvo encendido un día entero mientras el bot contestaba «solo manejamos
// contraentrega», porque el texto que describe el negocio lo negaba. El asesor
// obedece esa frase antes que a cualquier compuerta.
//
// Aquí se fijan las dos mitades de la regla:
//   - Sin proveedor, la narrativa NO puede ofrecer prepago (prometer lo que no
//     se puede cobrar deja al cliente esperando un link que nadie genera).
//   - Con proveedor, la narrativa NO puede negarlo.
//
// Correr:  node --test --experimental-strip-types lib/payments/narrative.test.ts

import assert from 'node:assert/strict'
import test from 'node:test'

async function policies(enabled: boolean) {
  if (enabled) {
    process.env.CONFIO_ACCESS_TOKEN = 'token-de-prueba'
    process.env.CONFIO_STORE_NAME = 'stores/PRUEBA'
  } else {
    delete process.env.CONFIO_ACCESS_TOKEN
    delete process.env.CONFIO_STORE_NAME
  }
  // Cache-busting: las funciones leen process.env en cada llamada, pero el
  // módulo se importa una vez por sufijo.
  const mod = await import(`./narrative.ts?enabled=${enabled}`)
  return {
    prompt: mod.paymentPolicyForPrompt() as string,
    voice: mod.paymentPolicyForVoice() as string,
  }
}

test('sin proveedor: no se ofrece prepago y se cierra la puerta', async () => {
  const { prompt, voice } = await policies(false)
  assert.match(prompt, /contraentrega/i)
  assert.match(prompt, /No manejamos transferencias/i)
  assert.doesNotMatch(prompt, /Confío/i, 'ofrece Confío sin tenerlo configurado')
  assert.doesNotMatch(prompt, /PSE|Nequi/i, 'ofrece medios de pago que no existen')
  assert.doesNotMatch(voice, /Confío|P S E|Nequi/i)
})

test('con proveedor: se ofrece, y NO se dice que solo hay contraentrega', async () => {
  const { prompt, voice } = await policies(true)
  assert.match(prompt, /PSE, Nequi o Bancolombia/)
  assert.match(prompt, /custodia/i, 'falta el ángulo de custodia, que es el que vende')
  assert.match(prompt, /nunca digas que solo hay contraentrega/i)
  // La frase que rompió Nitro no puede reaparecer.
  assert.doesNotMatch(prompt, /No manejamos transferencias/i)
  assert.doesNotMatch(prompt, /Pago 100% contraentrega/i)
  assert.match(voice, /dos formas de pagar/i)
  // La frase «solo manejamos contraentrega» puede aparecer, pero SOLO dentro de
  // la prohibición. Que aparezca como afirmación es justo el fallo de Nitro.
  assert.doesNotMatch(
    voice,
    /(?<!nunca digas que )solo manejamos contraentrega/i,
    'la voz afirma que solo hay contraentrega teniendo prepago encendido',
  )
})

test('nunca se ofrece tarjeta: esta tienda de Confío no la acepta', async () => {
  const { prompt } = await policies(true)
  assert.match(prompt, /No aceptamos tarjeta/i)
})

test('el mínimo que se anuncia es el real de la pasarela', async () => {
  const { prompt } = await policies(true)
  const { CONFIO_MIN_COP } = await import('./confio/protocol.ts')
  assert.match(prompt, new RegExp(`\\$${CONFIO_MIN_COP.toLocaleString('es-CO')}`))
})

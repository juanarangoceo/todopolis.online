import assert from 'node:assert/strict'
import test from 'node:test'
import { META_AD_RULES, SYSTEM_PROMPT as PRODUCT_PROMPT } from './product-content-prompt.ts'
import { SYSTEM_PROMPT as COLLECTION_PROMPT } from './collection-content-prompt.ts'
import { buildDestacadoPrompt } from './destacado-content.ts'

// Las landings reciben anuncios de Meta desde el 23-oct-2026. Cada prompt que
// las escribe lleva las mismas reglas: si uno se queda atrás, sus landings
// vuelven a prometer lo que la tienda no cumple.
const destacado = buildDestacadoPrompt({ name: 'Faja short' }, { headline: true, story: true, steps: true, box: true }, 0)

test('los tres prompts de landing llevan las reglas de Meta', () => {
  for (const [name, prompt] of [['producto', PRODUCT_PROMPT], ['colección', COLLECTION_PROMPT], ['destacado', destacado]]) {
    assert.ok(prompt.includes(META_AD_RULES), name)
  }
})

test('las reglas de Meta prohíben hablarle al cuerpo y prometer el uso para hoy', () => {
  assert.match(META_AD_RULES, /atributos personales/)
  assert.match(META_AD_RULES, /antes y después/)
  assert.match(META_AD_RULES, /3 a 7 días hábiles/)
})

test('el prompt de colecciones ya no autoriza inventar ni promete plazos falsos', () => {
  assert.doesNotMatch(COLLECTION_PROMPT, /INVENTA especificaciones|entrega rápida|despacho 24-48h|Usa un emoji/)
  assert.match(COLLECTION_PROMPT, /3 a 7 días HÁBILES/)
})

test('el cierre del producto ya no sugiere urgencia ni «esta noche» como ejemplo bueno', () => {
  assert.doesNotMatch(PRODUCT_PROMPT, /Ejemplos buenos: "Empieza esta noche/)
  assert.doesNotMatch(PRODUCT_PROMPT, /Crea urgencia REAL/)
})

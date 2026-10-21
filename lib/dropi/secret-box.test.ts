import test from 'node:test'
import assert from 'node:assert/strict'
import { open, seal } from './secret-box.ts'

test('cifra, descifra y no devuelve nada con otra clave', async () => {
  process.env.DROPI_TOKEN_KEY = 'clave-a'
  const sealed = await seal('token-secreto')
  assert.equal(sealed.includes('token-secreto'), false)
  assert.equal(await open(sealed), 'token-secreto')
  process.env.DROPI_TOKEN_KEY = 'clave-b'
  assert.equal(await open(sealed), null)
  assert.equal(await open('basura'), null)
})

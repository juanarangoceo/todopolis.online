// El fallo que esto impide: volver a aceptar una cookie que cualquiera puede
// escribir a mano.

import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminToken, verifyAdminToken } from './admin-session.ts'

process.env.ADMIN_DASHBOARD_PASSWORD = 'clave-de-prueba'
delete process.env.ADMIN_SESSION_SECRET

test('el token firmado vale', async () => {
  const t = await createAdminToken()
  assert.ok(t)
  assert.equal(await verifyAdminToken(t), true)
})

test('el valor viejo «authenticated» ya no entra', async () => {
  assert.equal(await verifyAdminToken('authenticated'), false)
})

test('una firma alterada o una expiración cambiada no entran', async () => {
  const t = (await createAdminToken())!
  const [v, exp, sig] = t.split('.')
  assert.equal(await verifyAdminToken(`${v}.${Number(exp) + 99999}.${sig}`), false)
  assert.equal(await verifyAdminToken(`${v}.${exp}.${sig.slice(0, -2)}xx`), false)
})

test('expira a las 8 horas', async () => {
  const t = await createAdminToken(Date.now() - 9 * 3600 * 1000)
  assert.equal(await verifyAdminToken(t), false)
})

test('cambiar la contraseña invalida las sesiones', async () => {
  const t = await createAdminToken()
  process.env.ADMIN_DASHBOARD_PASSWORD = 'otra'
  assert.equal(await verifyAdminToken(t), false)
  process.env.ADMIN_DASHBOARD_PASSWORD = 'clave-de-prueba'
})

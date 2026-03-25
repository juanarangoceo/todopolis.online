import crypto from 'crypto'

const WEBHOOK_SECRET = 'todopolis_webhook_2025'
const PRODUCTION_URL = 'https://todopolis.online/api/revalidate'

const payload = JSON.stringify({
  _type: 'product',
  _id: 'test-product-webhook-001',
  slug: { current: 'test-webhook-producto' },
  name: 'Producto de Prueba Webhook'
})

const timestamp = Math.floor(Date.now() / 1000).toString()
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${timestamp}.${payload}`)
  .digest('hex')

console.log('→ Sending test webhook to', PRODUCTION_URL)
console.log('→ Payload:', payload)
console.log('→ Signature:', `t=${timestamp},v1=${signature}`)

const res = await fetch(PRODUCTION_URL, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'sanity-webhook-signature': `t=${timestamp},v1=${signature}`,
  },
  body: payload,
})

const text = await res.text()
console.log('\n← Status:', res.status)
console.log('← Response:', text)

// Also test sync-product
const SYNC_URL = 'https://todopolis.online/api/sync-product'
const timestamp2 = Math.floor(Date.now() / 1000).toString()
const sig2 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp2}.${payload}`).digest('hex')

console.log('\n→ Sending test webhook to', SYNC_URL)
const res2 = await fetch(SYNC_URL, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'sanity-webhook-signature': `t=${timestamp2},v1=${sig2}`,
  },
  body: payload,
})
const text2 = await res2.text()
console.log('← Status:', res2.status)
console.log('← Response:', text2)

import { createHmac, timingSafeEqual } from 'node:crypto'

export const CATALOG_CONTROL_MAX_AGE_MS = 5 * 60 * 1000

export function signCatalogControlRequest(params: {
  secret: string
  timestamp: string
  method: string
  pathname: string
  body: string
}): string {
  const { secret, timestamp, method, pathname, body } = params
  return createHmac('sha256', secret)
    .update(`nitro-control.${timestamp}.${method.toUpperCase()}.${pathname}.${body}`)
    .digest('hex')
}

export function verifyCatalogControlRequest(params: {
  secret: string
  timestamp: string | null
  signature: string | null
  method: string
  pathname: string
  body: string
  now?: number
}): boolean {
  const { secret, timestamp, signature, method, pathname, body, now = Date.now() } = params
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const sentAt = Number(timestamp)
  if (!Number.isSafeInteger(sentAt) || Math.abs(now - sentAt) > CATALOG_CONTROL_MAX_AGE_MS) return false

  const expected = Buffer.from(signCatalogControlRequest({ secret, timestamp, method, pathname, body }), 'hex')
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

// Sesión del panel /admin: un token FIRMADO, no un valor fijo.
//
// Hasta sep 2026 la cookie `admin_session` valía literalmente `authenticated`,
// y el proxy solo comprobaba eso: cualquiera que escribiera esa cookie a mano
// entraba al panel de pedidos (nombres, celulares, direcciones) sin contraseña.
// Además la cookie vivía en `path=/admin`, así que las rutas de API del panel
// (`/api/mastershop/import`, `/api/mastershop/products`) no la recibían y
// quedaron abiertas: cualquiera podía importar productos o leer el catálogo del
// proveedor con sus costos.
//
// Ahora: `v1.<expira>.<firma>`, con HMAC-SHA256 sobre la expiración. La clave
// sale de ADMIN_SESSION_SECRET o, si no existe, de ADMIN_DASHBOARD_PASSWORD
// (cambiar la contraseña cierra todas las sesiones abiertas, que es lo
// esperable). Web Crypto para que funcione igual en el proxy y en Node.

export const ADMIN_COOKIE = 'admin_session'
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8 // 8 horas

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_DASHBOARD_PASSWORD?.trim()
  return s ? `todopolis-admin:${s}` : null
}

async function hmac(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data))
  return Buffer.from(sig).toString('base64url')
}

/** Compara sin filtrar por tiempo cuántos caracteres coincidieron. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createAdminToken(now = Date.now()): Promise<string | null> {
  const key = secret()
  if (!key) return null
  const exp = Math.floor(now / 1000) + ADMIN_SESSION_SECONDS
  return `v1.${exp}.${await hmac(key, `v1.${exp}`)}`
}

export async function verifyAdminToken(token: string | undefined | null, now = Date.now()): Promise<boolean> {
  const key = secret()
  if (!key || !token) return false
  const [v, expRaw, sig] = token.split('.')
  const exp = Number(expRaw)
  if (v !== 'v1' || !Number.isFinite(exp) || !sig) return false
  if (exp * 1000 < now) return false
  return safeEqual(sig, await hmac(key, `v1.${exp}`))
}

/** Para rutas de API y acciones de servidor: ¿la petición trae una sesión válida? */
export async function isAdminCookie(value: string | undefined | null): Promise<boolean> {
  return verifyAdminToken(value)
}

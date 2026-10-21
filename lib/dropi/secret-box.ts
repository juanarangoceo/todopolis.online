// Cifra los tokens de Dropi antes de guardarlos en Supabase (AES-256-GCM).
//
// Con el refresh token se entra a la cuenta de Dropi con todos sus permisos,
// incluido crear órdenes; no puede quedar legible en la base. La clave es
// DROPI_TOKEN_KEY y TIENE que ser la misma en local y en Vercel: la conexión
// se guarda en la base compartida y la usan los dos. Cambiarla obliga a
// reconectar (lo viejo deja de descifrarse y se trata como desconectado).

function keySource(): string | null {
  const s = process.env.DROPI_TOKEN_KEY?.trim()
  return s ? `todopolis-dropi:${s}` : null
}

export function secretBoxConfigured(): boolean {
  return keySource() !== null
}

async function key(): Promise<CryptoKey> {
  const source = keySource()
  if (!source) throw new Error('Falta DROPI_TOKEN_KEY.')
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function seal(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(plain))
  return `v1.${Buffer.from(iv).toString('base64url')}.${Buffer.from(ct).toString('base64url')}`
}

/** `null` si el texto no es nuestro o la clave cambió. Nunca lanza por datos malos. */
export async function open(sealed: string | null | undefined): Promise<string | null> {
  if (!sealed) return null
  const [v, iv, ct] = sealed.split('.')
  if (v !== 'v1' || !iv || !ct) return null
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') }, await key(), Buffer.from(ct, 'base64url'))
    return new TextDecoder().decode(plain)
  } catch { return null }
}

// Consentimiento de cookies de medición y publicidad.
//
// MODELO: AVISO CON RECHAZO EFECTIVO, no bloqueo previo.
//
// Colombia no exige el consentimiento previo estilo europeo para cookies: la
// Ley 1581 pide informar y permitir revocar. Así que el aviso informa, la
// medición funciona desde el primer momento, y quien rechaza deja de ser
// medido de verdad — no es un botón decorativo.
//
// Esto es una DECISIÓN DE JURISDICCIÓN, no una comodidad. Si algún día se
// pauta hacia la Unión Europea o el Reino Unido, hay que cambiar a opt-in
// (`hasTrackingConsent` devolvería false mientras no haya decisión) y ajustar
// el texto de /privacidad, que hoy describe este modelo.

export const CONSENT_COOKIE = 'tp_consent'
export const CONSENT_MAX_AGE_DAYS = 180

export type ConsentChoice = 'granted' | 'denied'

export function isConsentChoice(v: string | null | undefined): v is ConsentChoice {
  return v === 'granted' || v === 'denied'
}

/**
 * ¿Se puede medir?
 *
 * Sin decisión tomada, SÍ: es el modelo de aviso. Solo un 'denied' explícito lo
 * apaga. La única forma de que esto devuelva false es que la persona lo haya
 * pedido.
 */
export function hasTrackingConsent(stored: string | null | undefined): boolean {
  return stored !== 'denied'
}

/** ¿Hay que mostrar el aviso? Solo mientras no haya decisión. */
export function shouldShowNotice(stored: string | null | undefined): boolean {
  return !isConsentChoice(stored ?? null)
}

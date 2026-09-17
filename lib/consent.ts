// Consentimiento de cookies de medición y publicidad.
//
// MODELO: INFORMAR Y PERMITIR REVOCAR, sin bloqueo previo y sin aviso flotante.
//
// Colombia no exige el consentimiento previo estilo europeo: la Ley 1581 pide
// informar y permitir revocar. La información está en /privacidad y la
// revocación en el enlace del pie («Desactivar cookies de medición»).
//
// HUBO UN AVISO FLOTANTE Y SE QUITÓ (sep-2026): interrumpía a alguien que venía
// a comprar y costaba conversión sin comprar nada a cambio, porque aquí no es
// obligatorio. Lo que NO se quitó es el mecanismo: quien lo desactiva deja de
// ser medido de verdad, no es un botón decorativo. Si vuelve a hacer falta un
// aviso —por ejemplo al pautar hacia la UE o el Reino Unido—, hay que cambiar
// además `hasTrackingConsent` a opt-in y ajustar el texto de /privacidad.
//
// Esto es una DECISIÓN DE JURISDICCIÓN, no una comodidad. Si algún día se
// pauta hacia la Unión Europea o el Reino Unido, hay que cambiar a opt-in
// (`hasTrackingConsent` devolvería false mientras no haya decisión) y ajustar
// el texto de /privacidad, que hoy describe este modelo.

export const CONSENT_COOKIE = 'tp_consent'
export const CONSENT_MAX_AGE_DAYS = 180

export type ConsentChoice = 'granted' | 'denied'

/**
 * Valor que devuelve el snapshot de servidor de `useSyncExternalStore`.
 *
 * Hace falta un centinela y no `null` porque `null` ya significa algo: «no hay
 * cookie», que es un estado legítimo en el que SÍ se mide. Sin distinguirlos,
 * el render de hidratación decidiría «se mide» mientras el servidor no pintó
 * nada, y eso es un desajuste de hidratación.
 */
export const CONSENT_UNKNOWN = '__ssr__'

/** ¿Ya sabemos qué eligió esta persona, o seguimos antes de hidratar? */
export function isConsentResolved(stored: string | null): boolean {
  return stored !== CONSENT_UNKNOWN
}

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

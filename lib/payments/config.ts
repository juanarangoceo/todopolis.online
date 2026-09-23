// Si el pago anticipado está encendido y con qué credenciales. NADA MÁS.
//
// Vive aparte de `confio-orders.ts` por una razón de build, no de estética:
// los prompts que hablan de pagos (hoy `voice-session`; antes el chat web
// `lucy-chat`, que corría en **edge runtime**) necesitan saber si hay prepago
// para no negarlo. Si esa pregunta viviera junto al orquestador,
// el prompt arrastraría `node:crypto` y `@supabase/supabase-js` hasta el edge y
// el build falla con «Native module not found: node:crypto».
//
// Por eso este archivo solo lee variables de entorno: es seguro importarlo
// desde cualquier runtime. Si le añades una dependencia, comprueba que
// `pnpm build` siga pasando.

export type ConfioConfig = { token: string; storeName: string }

/**
 * Configuración o null. La AUSENCIA de configuración significa «Todopolis solo
 * cobra contraentrega», que es el comportamiento de siempre: el botón no se
 * muestra, la narrativa no lo ofrece y ninguna ruta de pago corre. Borrar
 * `CONFIO_ACCESS_TOKEN` es el freno de emergencia, sin desplegar.
 */
export function confioConfig(): ConfioConfig | null {
  const token = process.env.CONFIO_ACCESS_TOKEN
  const storeName = process.env.CONFIO_STORE_NAME
  if (!token || !storeName) return null
  return { token, storeName }
}

/** ¿Se puede cobrar por adelantado ahora mismo? */
export function advancePaymentEnabled(): boolean {
  return confioConfig() !== null
}

// El texto que describe CÓMO se paga, en un solo sitio y condicionado a que el
// pago anticipado esté realmente encendido.
//
// Esto existe por un fallo concreto y documentado en Nitro: tuvieron Confío
// activo un día entero mientras el bot seguía contestando «solo manejamos
// contraentrega», porque el texto que describe el negocio lo negaba. El asesor
// obedece esa frase antes que a cualquier compuerta.
//
// La regla que se deriva: la narrativa NUNCA se escribe a mano en un prompt. Se
// pide aquí, y aquí se decide según haya o no proveedor configurado. Prometer
// un prepago que no existe es tan caro como esconder uno que sí.

// Solo `./config` (lee env) y `./confio/protocol` (constantes puras): este
// módulo lo importa un prompt que corre en EDGE. Ver la cabecera de config.ts.
import { advancePaymentEnabled } from './config.ts'
import { CONFIO_MIN_COP } from './confio/protocol.ts'

// NARRATIVA DE CONFÍO (21-oct-2026, decisión de Juan): RAPIDEZ y MEDIOS DE
// PAGO, la misma de Nitro Complete. NO se dice que Confío guarda, retiene,
// custodia o protege el dinero, ni que lo devuelve si el pedido no llega, ni se
// le llama «pago protegido». Hasta esa fecha el ángulo era la custodia; se
// retiró de la tienda, de los prompts y del contenido ya generado.
//
// La rapidez es del PAGO, no del envío: pagar antes no hace que el pedido
// llegue antes (siguen siendo 3 a 7 días hábiles), y la confirmación tarda lo
// que tarda la reconciliación con Confío (cada 5 min,
// /api/cron/confio-reconcile): minutos, no «al instante».
const CONFIO_SPEED =
  'Pagar con Confío toma segundos desde el celular, y el pago se confirma solo en minutos: el cliente no manda capturas ni comprobantes. Eso es del pago; no digas que el pedido llega más rápido por pagar antes.'

const CONFIO_FORBIDDEN =
  'Nunca digas que Confío guarda, retiene, custodia o protege el dinero, ni que lo devuelve si el pedido no llega, ni lo llames "pago protegido": di "pagar con Confío".'

/**
 * Las políticas de pago para un prompt de venta: dos vías, y la de Confío se
 * presenta por su rapidez y por los medios que el cliente ya tiene en el celular.
 */
export function paymentPolicyForPrompt(): string {
  const cod =
    '- Pago contraentrega: paga en efectivo al recibir el producto en su casa. Es tu reversa de riesgo cada vez que el cliente dude.'

  if (!advancePaymentEnabled()) {
    // Sin proveedor, esta frase es la verdad y debe cerrar la puerta: si el
    // cliente pide transferencia, no hay manera de cobrarle.
    return `${cod}\n- No manejamos transferencias, links de pago ni tarjeta. Todo es contraentrega.`
  }

  return [
    'Hay DOS formas de pagar y el cliente elige. Ofrece siempre las dos; nunca digas que solo hay contraentrega.',
    cod,
    `- Pagar ya con Confío (desde $${CONFIO_MIN_COP.toLocaleString('es-CO')}): con PSE, Nequi o Bancolombia, lo que el cliente ya usa en el celular.`,
    `- ${CONFIO_SPEED}`,
    `- ${CONFIO_FORBIDDEN}`,
    '- No aceptamos tarjeta de crédito ni débito.',
    '- Para pagar ya, el cliente elige "Confío" en el checkout del producto y lo llevamos a Confío. Tú no generas links ni compartes URLs.',
    '- Si el cliente duda, cierra preguntando literalmente: "¿lo prefieres contraentrega o pagarlo ya con Confío?".',
  ].join('\n')
}

/** Igual, pero para voz: sin viñetas, sin símbolos, frases que se leen bien. */
export function paymentPolicyForVoice(): string {
  if (!advancePaymentEnabled()) {
    return 'Envío: doce mil pesos a todo Colombia, contraentrega (paga al recibir), 3 a 7 días hábiles. Usa la contraentrega como reversa de riesgo cada vez que el cliente dude.'
  }
  return [
    'Envío: doce mil pesos a todo Colombia, 3 a 7 días hábiles.',
    'Hay dos formas de pagar y el cliente elige: contraentrega, que paga al recibir, o pagar ya con Confío, por P S E, Nequi o Bancolombia.',
    'Pagar con Confío toma segundos desde el celular y se confirma solo en unos minutos, sin mandar comprobantes. No digas que el pedido llega más rápido por pagar antes.',
    'Nunca digas que Confío guarda, retiene o protege el dinero, ni lo llames pago protegido.',
    'Nunca digas que solo manejamos contraentrega. Si el cliente duda, pregunta: lo prefieres contraentrega o pagarlo ya con Confío.',
  ].join(' ')
}

/**
 * Los hechos de envío, pago y garantía para el COPY de una landing (prompt de
 * `lib/product-content-prompt.ts`). No es la narrativa de un asesor —no le dice
 * al modelo cómo cerrar una conversación—, sino qué puede afirmar por escrito
 * en preguntas frecuentes y en el cierre sin prometer algo falso.
 */
export function paymentFactsForCopy(): string {
  const shipping = [
    '- Envío a todo Colombia: llega en 3 a 7 días HÁBILES. Nunca escribas "envío rápido", "despacho rápido", "24-48h", "esta semana" ni "entrega inmediata".',
    '- Costo del envío: $12.000, gratis en los productos Destacados. Si no sabes si el producto es Destacado, no menciones el costo.',
    '- Garantía: 30 días si el producto llega con defecto de fábrica (se repone o se devuelve el dinero). NO es devolución libre por arrepentimiento ni "garantía de satisfacción".',
    '- Atención por WhatsApp antes y después de la compra.',
  ]
  const payment = advancePaymentEnabled()
    ? [
        '- Hay DOS formas de pagar y el cliente elige en el checkout: contraentrega (paga en efectivo al recibir) o pagar ya con Confío, por PSE, Nequi o Bancolombia.',
        '- Nunca digas que "solo" hay contraentrega, ni nombres un único medio de pago como si fuera el único.',
        `- ${CONFIO_SPEED}`,
        `- ${CONFIO_FORBIDDEN}`,
        '- No se acepta tarjeta de crédito ni débito.',
      ]
    : [
        '- Pago contraentrega: el cliente paga en efectivo al recibir. No hay tarjeta, transferencia ni link de pago.',
      ]
  return [...shipping, ...payment].join('\n')
}

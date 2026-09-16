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

/**
 * Las políticas de pago para un prompt de venta. El ángulo no es «paga por
 * adelantado» —que suena a riesgo y compite con la contraentrega— sino que el
 * dinero queda EN CUSTODIA: es una garantía más fuerte que la contraentrega, no
 * más débil.
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
    `- Pago protegido por adelantado (desde $${CONFIO_MIN_COP.toLocaleString('es-CO')}): paga con PSE, Nequi o Bancolombia a través de Confío. NO es pagar y confiar: Confío RETIENE el dinero en custodia y solo nos lo entrega cuando el cliente confirma que recibió el pedido. Si no llega, se lo devuelven. Preséntalo como una garantía MÁS fuerte que la contraentrega, no como un riesgo.`,
    '- No aceptamos tarjeta de crédito ni débito.',
    '- Para pagar por adelantado, el cliente elige "Pago protegido" en el checkout del producto y lo llevamos a Confío. Tú no generas links ni compartes URLs.',
    '- Si el cliente duda, cierra preguntando literalmente: "¿lo prefieres contraentrega o con pago protegido?".',
  ].join('\n')
}

/** Igual, pero para voz: sin viñetas, sin símbolos, frases que se leen bien. */
export function paymentPolicyForVoice(): string {
  if (!advancePaymentEnabled()) {
    return 'Envío: doce mil pesos a todo Colombia, contraentrega (paga al recibir), 3 a 7 días hábiles. Usa la contraentrega como reversa de riesgo cada vez que el cliente dude.'
  }
  return [
    'Envío: doce mil pesos a todo Colombia, 3 a 7 días hábiles.',
    'Hay dos formas de pagar y el cliente elige: contraentrega, que paga al recibir, o pago protegido por adelantado con P S E, Nequi o Bancolombia.',
    'El pago protegido no es pagar y confiar: el dinero queda retenido en custodia y solo nos lo entregan cuando el cliente confirma que recibió el pedido. Dilo así, porque es una garantía más fuerte que la contraentrega.',
    'Nunca digas que solo manejamos contraentrega. Si el cliente duda, pregunta: lo prefieres contraentrega o con pago protegido.',
  ].join(' ')
}

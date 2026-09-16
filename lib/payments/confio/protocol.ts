// Las tres reglas duras del protocolo de Confío, puras y probadas: el dinero,
// los estados y el nombre del recurso. Viven aparte del cliente HTTP para que
// se puedan verificar sin red — son justo las que, si están mal, cobran de
// menos o confirman un pedido que nadie pagó.
//
// PORTADO DE nitro_bot/lib/payments/confio/protocol.ts (verificado allí contra
// la API real el 2026-09-14). Un solo cambio, y es el que hace segura la
// convivencia: el correlationId lleva prefijo `todopolis:` en vez de `nitro:`.
// Todopolis y el bot de Nitro comparten la MISMA tienda de Confío, así que los
// eventos de un sistema llegan al otro. `saleIdFromCorrelation` de Nitro solo
// reconoce `nitro:{slug}:{uuid}`: con este prefijo, Nitro los descarta como
// «pago sin venta asociada» y responde 200 sin tocar una fila.
//
// Si cambias este prefijo, revisa nitro_bot/lib/payments/confio/protocol.ts
// antes: que los dos se ignoren mutuamente no es casualidad, es el diseño.

import type { AdvancePaymentOutcome } from '../types.ts'

// ---------------------------------------------------------------------------
// Dinero
// ---------------------------------------------------------------------------

/**
 * Confío cobra en CENTAVOS de peso. Todopolis guarda pesos enteros en `orders.price`, así que la
 * conversión es ×100 y en un solo sitio.
 *
 * Se rechaza el peso fraccionado en vez de redondearlo. En Colombia no existe
 * el centavo: un total con decimales significa que algo aguas arriba calculó
 * mal, y redondear lo escondería cobrándole al comprador un valor distinto al
 * que aceptó. El precio lo fija el servidor desde Sanity;
 * esta es la última puerta antes de que ese número salga hacia una pasarela.
 */
export function copToCents(totalCop: number): number {
  if (!Number.isFinite(totalCop) || !Number.isInteger(totalCop) || totalCop <= 0) {
    throw new RangeError(`Total inválido para cobrar: ${totalCop}`);
  }
  return totalCop * 100;
}

export function centsToCop(amountCents: number): number {
  return Math.round(amountCents / 100);
}

/**
 * Mínimo documentado por Confío: $10.000 COP. Un pago por debajo se rechaza con
 * 400, así que se comprueba ANTES de llamar y el asesor recibe una salida que
 * sabe explicar en vez de un error de pasarela.
 */
export const CONFIO_MIN_COP = 10_000;

/** `description` exige mínimo 24 caracteres o Confío devuelve 400. */
export const CONFIO_MIN_DESCRIPTION = 24;

/**
 * Rellena la descripción hasta el mínimo sin inventar información comercial. Lo
 * que se añade es la propuesta de valor del propio producto Confío, que es
 * cierta para cualquier cobro y no promete nada del pedido.
 */
export function padDescription(raw: string): string {
  const base = raw.replace(/\s+/g, " ").trim();
  if (base.length >= CONFIO_MIN_DESCRIPTION) return base.slice(0, 500);
  const suffix = " — Pago protegido: tu dinero queda en custodia hasta que recibas el pedido.";
  return `${base}${suffix}`.slice(0, 500);
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export const CONFIO_STATUSES = [
  "AWAITING_PAYMENT",
  "PAYMENT_IN_PROGRESS",
  "FUNDED",
  "DELIVERING",
  "UNDER_REVIEW",
  "APPROVED",
  "DISPUTED",
  "REFUNDED",
  "EXPIRED",
  "CANCELED",
  "FAILED",
] as const;

export type ConfioStatus = (typeof CONFIO_STATUSES)[number];

export function isConfioStatus(value: unknown): value is ConfioStatus {
  return typeof value === "string" && (CONFIO_STATUSES as readonly string[]).includes(value);
}

/**
 * Confío → Todopolis. La decisión que importa es que **FUNDED es la señal de
 * cobro**, no APPROVED: FUNDED significa que el comprador pagó y el dinero está
 * en custodia de Confío. APPROVED es la liberación de esos fondos al comercio,
 * que ocurre DESPUÉS de la entrega. Esperar a APPROVED para despachar sería un
 * bloqueo mutuo: Confío no libera hasta que se entregue y nosotros no
 * entregaríamos hasta que libere.
 *
 * Los estados posteriores al cobro devuelven `post_funding` en bloque: ninguno
 * mueve el pedido, y tratarlos por separado invitaría a que alguien automatizara
 * una disputa o un reembolso, que es precisamente lo que el brief prohíbe.
 *
 * Un estado DESCONOCIDO cae en `pending` a propósito: si Confío añade mañana un
 * estado nuevo, lo peor que puede pasar es que el cobro siga esperando y una
 * persona lo mire. La alternativa —tratarlo como terminal— cerraría pedidos
 * pagados.
 */
export function outcomeFor(status: string): AdvancePaymentOutcome {
  switch (status) {
    case "FUNDED":
      return "funded";
    case "EXPIRED":
      return "expired";
    case "CANCELED":
    case "FAILED":
      return "cancelled";
    case "DELIVERING":
    case "UNDER_REVIEW":
    case "APPROVED":
    case "DISPUTED":
    case "REFUNDED":
      return "post_funding";
    case "AWAITING_PAYMENT":
    case "PAYMENT_IN_PROGRESS":
    default:
      return "pending";
  }
}

/**
 * ¿Este estado prueba que el comprador YA pagó? `funded` y todo lo posterior lo
 * hacen: un pago que está en DELIVERING pasó por FUNDED necesariamente. Importa
 * porque la reconciliación puede encontrarse un pago que avanzó dos estados
 * entre dos pasadas del cron, y perder el FUNDED intermedio no puede costarle
 * el pedido al comprador.
 *
 * REFUNDED es la excepción dentro de `post_funding`: hubo pago, pero se
 * devolvió. Se excluye de aquí para que nunca dispare la creación de un pedido.
 */
export function provesPayment(status: string): boolean {
  return (
    status === "FUNDED" ||
    status === "DELIVERING" ||
    status === "UNDER_REVIEW" ||
    status === "APPROVED" ||
    status === "DISPUTED"
  );
}

/** Estados logísticos que Todopolis puede EMPUJAR hacia Confío. */
export type ConfioLogisticsStatus = "DELIVERING" | "UNDER_REVIEW";

// ---------------------------------------------------------------------------
// Nombres de recurso
// ---------------------------------------------------------------------------

/**
 * `stores/{store}/payments/{payment}` → sus dos piezas.
 *
 * Identifica el pago sin ambigüedad. Es estricto a propósito: un formato
 * inesperado devuelve null y la reconciliación no toca una sola fila.
 */
export function parsePaymentName(
  name: unknown
): { storeId: string; paymentId: string } | null {
  if (typeof name !== "string") return null;
  const match = name.match(/^(stores\/[A-Za-z0-9]+)\/payments\/([A-Za-z0-9]+)$/);
  if (!match) return null;
  return { storeId: match[1], paymentId: match[2] };
}

/**
 * El identificador de tienda que va en la URL de la API.
 *
 * La documentación dice «usa el valor de "name" (o su identificador) como
 * {store}», que admite las dos lecturas. Comprobado contra la API real el
 * 2026-09-14: con el nombre completo (`stores/01M28…`) devuelve **404**; solo
 * funciona el IID pelado. Todopolis guarda el nombre completo porque es lo que devuelve la API y lo
 * que identifica el pago sin ambigüedad, y esta función es la única que lo
 * convierte para la URL.
 */
export function storeApiId(storeName: string): string {
  return storeName.startsWith("stores/") ? storeName.slice("stores/".length) : storeName;
}

/**
 * El correlationId que Todopolis manda a Confío. Es su referencia de negocio,
 * NO su mecanismo de idempotencia (para eso está el header `Idempotency-Key`),
 * y por eso lleva el id del pedido y no un contador de intentos: el mismo cobro
 * reintentado tiene que seguir apuntando a la misma fila.
 *
 * El prefijo `todopolis:` es lo que separa estos cobros de los del bot de Nitro
 * en la tienda compartida. Ver la cabecera del archivo.
 */
export const CORRELATION_PREFIX = 'todopolis'

export function correlationIdFor(orderId: string): string {
  return `${CORRELATION_PREFIX}:${orderId}`
}

/** El id de pedido que hay dentro de un correlationId nuestro, si lo es. */
export function orderIdFromCorrelation(correlationId: unknown): string | null {
  if (typeof correlationId !== 'string') return null
  const match = correlationId.match(
    /^todopolis:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  )
  return match ? match[1].toLowerCase() : null
}

// Vocabulario del pago anticipado con Confío. Puro: sin red ni base de datos.
//
// Portado de nitro_bot/lib/payments/types.ts, recortado a lo que Todopolis
// necesita. Todopolis no tiene tenants ni transferencia manual: o el pedido es
// contraentrega (y no pasa por aquí) o es Confío.

/** Cómo se paga un pedido de Todopolis. */
export type PaymentMethod = 'cod' | 'confio'

/**
 * Estado del cobro tal como lo entiende Todopolis. Deliberadamente MÁS POBRE
 * que el de Confío: aquí solo caben las transiciones que mueven el pedido. Los
 * estados posteriores al cobro se conservan crudos en `provider_status`.
 */
export type AdvancePaymentOutcome =
  /** Cobro creado y todavía sin pagar. No toca el pedido. */
  | 'pending'
  /** Pagado y en custodia. ES la señal para confirmar el pedido. */
  | 'funded'
  /** Venció sin pagarse. Se puede generar uno nuevo. */
  | 'expired'
  /** Cancelado o fallido. Se puede generar uno nuevo. */
  | 'cancelled'
  /** Posterior al cobro (entrega, revisión, aprobación, disputa, reembolso). */
  | 'post_funding'

export type CreateAdvancePaymentInput = {
  /** Id del pedido en Supabase. Viaja como correlationId. */
  orderId: string
  /** Total en PESOS enteros, calculado en el servidor desde el catálogo. */
  totalCop: number
  /** Se guarda ANTES de llamar y se reutiliza en cada reintento. */
  idempotencyKey: string
  title: string
  description: string
  buyerFirstName: string
  /** E.164 con '+'. */
  buyerPhone: string
  /** Fotos del catálogo para la pantalla de pago. Confío las EXIGE. */
  mediaAssets?: string[]
}

export type CreatedAdvancePayment = {
  /** IID corto del pago (lo que va en la URL de la API). */
  paymentId: string
  /** Nombre completo del recurso: stores/{store}/payments/{payment}. */
  paymentName: string
  checkoutUrl: string
  amountCents: number
  providerStatus: string
  outcome: AdvancePaymentOutcome
}

export type AdvancePaymentSnapshot = {
  paymentId: string
  paymentName: string
  providerStatus: string
  amountCents: number | null
  checkoutUrl: string | null
  correlationId: string | null
  outcome: AdvancePaymentOutcome
}

export type AdvancePaymentErrorKind =
  | 'invalid_request'
  | 'unauthorized'
  | 'not_found'
  | 'rate_limited'
  | 'unavailable'

export class AdvancePaymentError extends Error {
  readonly kind: AdvancePaymentErrorKind
  readonly httpStatus?: number

  constructor(kind: AdvancePaymentErrorKind, message: string, httpStatus?: number) {
    super(message)
    this.name = 'AdvancePaymentError'
    this.kind = kind
    this.httpStatus = httpStatus
  }

  /**
   * ¿El resultado del POST quedó DESCONOCIDO? Solo entonces se conserva la
   * `Idempotency-Key`: reutilizarla es lo que impide un segundo cobro por el
   * mismo pedido. Ante 400/401/404 Confío NO creó nada, el reintento llevará un
   * cuerpo distinto, y reutilizar la clave respondería 409 dejando el cobro
   * atascado para siempre. (Esto rompió el primer cobro real en Nitro.)
   */
  get keepsIdempotencyKey(): boolean {
    return this.kind === 'unavailable' || this.kind === 'rate_limited'
  }
}

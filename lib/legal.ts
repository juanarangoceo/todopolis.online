// Identidad del negocio y datos legales, en UN solo sitio.
//
// El pie de página, la política de privacidad y los términos tienen que decir
// EXACTAMENTE lo mismo: si el nombre o la cédula no coinciden entre dos páginas,
// es justo el tipo de detalle que hace fallar una verificación de negocio.
//
// La Ley 1480 de 2011 (art. 50) obliga a que la tienda identifique al proveedor
// de forma clara y accesible. Todópolis es una MARCA, no una sociedad: el
// responsable es una persona natural.

export const BUSINESS = {
  /** Nombre comercial. Es lo que ve el cliente en todas partes. */
  brand: 'Todópolis',
  /**
   * Persona natural responsable.
   *
   * SE PUBLICA EL NOMBRE, NO EL DOCUMENTO. La ley pide que el consumidor pueda
   * saber a quién le está comprando y a quién reclamarle, y para eso basta el
   * nombre más un canal de contacto; el número de cédula no aporta nada a quien
   * compra y sí es un dato sensible en una página indexable.
   *
   * Si alguna plataforma o entidad pide el documento, se entrega por su canal
   * privado de verificación — nunca añadiéndolo aquí.
   */
  legalName: 'Juan David Arango Trejos',
  /** El mismo número de la tienda, que ya es público. */
  phone: '573146681896',
  phoneDisplay: '+57 314 668 1896',
  site: 'todopolis.online',
  country: 'Colombia',
} as const

/** Redes oficiales. Sin enlace muerto: si no hay cuenta, no va el icono. */
export const SOCIAL = {
  instagram: 'https://www.instagram.com/todopolis',
  facebook: 'https://www.facebook.com/todopolis',
} as const

/** Fecha de última revisión de los documentos legales. */
export const LEGAL_UPDATED_AT = '17 de septiembre de 2026'

/** Enlace de WhatsApp al responsable, con el mensaje ya escrito. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${BUSINESS.phone}?text=${encodeURIComponent(message)}`
}

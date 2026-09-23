import { defineType, defineField, defineArrayMember } from 'sanity'
import { GenerateContentButton } from '../components/GenerateContentButton'
import { GenerateAIImageButton } from '../components/GenerateAIImageButton'
import { GenerateArticleButton } from '../components/GenerateArticleButton'
import { CompleteDestacadoButton } from '../components/CompleteDestacadoButton'
import { MultiImageUploader } from '../components/MultiImageUploader'
import { PRODUCT_CATEGORIES } from '../../lib/categories'

export const productType = defineType({
  name: 'product',
  title: 'Producto',
  type: 'document',
  fields: [
    // ─── Datos básicos del producto ─────────────────────────────────────────
    // El orden importa: es la secuencia real de trabajo al crear un producto a
    // mano (nombre → fotos → texto → botones de IA → precio). Los botones van
    // justo debajo de sus insumos, no al final del formulario.
    defineField({
      name: 'name',
      title: 'Nombre del Producto',
      type: 'string',
      group: 'basics',
      description: 'Escribe uno provisional si quieres: la IA lo reemplaza por un nombre estratégico al generar la landing.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      group: 'basics',
      options: { source: 'name', maxLength: 96 },
      description: 'Si lo dejas vacío, la IA lo genera a partir del nombre final. En un producto ya publicado nunca se toca solo.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Galería de Imágenes',
      type: 'array',
      group: 'basics',
      description: 'La IA lee las 3 primeras para sacar material, color, piezas incluidas y medidas legibles. Entre mejores las fotos, mejor el copy.',
      of: [{ type: 'image', options: { hotspot: true } }],
      options: {
        layout: 'grid',
      },
      components: {
        input: MultiImageUploader,
      },
    }),
    defineField({
      name: 'shortDescription',
      title: 'Descripción Breve (input para la IA)',
      type: 'text',
      rows: 4,
      group: 'basics',
      description: 'Pega aquí la descripción del producto. La IA la usará junto con las fotos para generar el contenido de la landing page.',
    }),

    // ─── Botones de generación con IA ──────────────────────────────────────
    defineField({
      name: 'generateContent',
      title: '🤖 Generar Contenido con IA',
      type: 'string',
      group: 'basics',
      components: {
        input: GenerateContentButton,
      },
      description: 'Sube las fotos y llena la descripción arriba, luego haz clic en el botón para generar el contenido de la landing page.',
    }),
    defineField({
      name: 'generateArticle',
      title: '📝 Generar Artículo de Blog',
      type: 'string',
      group: 'basics',
      components: {
        input: GenerateArticleButton,
      },
      description: 'Crea el artículo del blog atado a este producto. Sin él, la ficha no muestra el enlace "Leer artículo →" que abre la ventana emergente.',
    }),
    defineField({
      name: 'generateAIImage',
      title: '🎨 Generar Imagen Lifestyle con IA',
      type: 'string',
      group: 'basics',
      components: {
        input: GenerateAIImageButton,
      },
      description: 'Genera fotos hiperrealistas del producto en uso. La primera queda como imagen principal; las siguientes se pueden añadir a la galería lifestyle (carrusel de la landing).',
    }),

    // ─── Precio y clasificación ─────────────────────────────────────────────
    defineField({
      name: 'price',
      title: 'Precio Venta',
      type: 'number',
      group: 'basics',
      description: 'Precio actual del producto. En productos manuales lo pones tú: no hay costo de proveedor del cual calcular el margen.',
    }),
    defineField({
      name: 'originalPrice',
      title: 'Precio Original (Tachado)',
      type: 'number',
      group: 'basics',
      description: 'Opcional. Si el producto está en oferta, escribe aquí el precio anterior.',
    }),
    // Combos por cantidad («Lleva 2 por $X»). El precio se resuelve con
    // `lib/quantity-offers.ts` tanto en la ficha como en el servidor de pagos:
    // el número que llega a Confío nunca sale del navegador.
    defineField({
      name: 'quantityOffers',
      title: '🎁 Combos por cantidad',
      type: 'array',
      group: 'basics',
      description: 'Opcional. Ej: "Lleva 2 por $229.000". Se muestran como opciones junto al precio y el checkout cobra el precio del combo. El precio del combo debe ser MENOR que el precio unitario × cantidad, o se ignora.',
      of: [
        defineArrayMember({
          name: 'quantityOffer',
          type: 'object',
          fields: [
            defineField({
              name: 'quantity',
              title: 'Cantidad',
              type: 'number',
              validation: (rule) => rule.required().integer().min(2).max(10),
            }),
            defineField({
              name: 'totalPrice',
              title: 'Precio total del combo',
              type: 'number',
              description: 'Lo que paga el cliente por TODAS las unidades juntas.',
              validation: (rule) => rule.required().positive(),
            }),
            defineField({
              name: 'label',
              title: 'Etiqueta (opcional)',
              type: 'string',
              description: 'Ej: "El más elegido", "Para regalar". Máximo 20 caracteres.',
              validation: (rule) => rule.max(20),
            }),
          ],
          preview: {
            select: { quantity: 'quantity', totalPrice: 'totalPrice', label: 'label' },
            prepare({ quantity, totalPrice, label }) {
              return {
                title: `Lleva ${quantity ?? '?'} por $${(totalPrice ?? 0).toLocaleString('es-CO')}`,
                subtitle: label,
              }
            },
          },
        }),
      ],
      validation: (rule) => rule.custom((offers, context) => {
        const price = context.document?.price as number | undefined
        if (!Array.isArray(offers) || !price) return true
        const bad = (offers as Array<{ quantity?: number; totalPrice?: number }>).find(
          (o) => o.quantity && o.totalPrice && o.totalPrice >= o.quantity * price,
        )
        return bad
          ? `El combo de ${bad.quantity} cuesta igual o más que ${bad.quantity} unidades sueltas: no se mostrará.`
          : true
      }).warning(),
    }),
    defineField({
      name: 'category',
      title: 'Categoría',
      type: 'string',
      group: 'basics',
      description: 'Si la dejas vacía, la IA la sugiere al generar la landing. Los valores salen de lib/categories.ts.',
      options: {
        list: PRODUCT_CATEGORIES.map((c) => ({ title: c.title, value: c.value })),
      },
    }),
    defineField({
      name: 'brand',
      title: 'Marca',
      type: 'string',
      group: 'basics',
      description: 'Marca comercial que el asesor puede usar al recomendar el producto.',
    }),
    defineField({
      name: 'isNew',
      title: '¿Producto Nuevo?',
      type: 'boolean',
      group: 'basics',
      initialValue: true,
    }),
    defineField({
      name: 'isBestSeller',
      title: '¿Más Vendido?',
      type: 'boolean',
      group: 'basics',
      initialValue: false,
    }),

    // ─── Vinculación con Mastershop ──────────────────────────────────────────
    // Van al final y se esconden en los productos creados a mano: dos campos
    // readOnly y vacíos como primera pantalla del formulario no le dicen nada
    // al editor, y eran lo primero que veía al crear un producto.
    defineField({
      name: 'mastershopId',
      title: 'ID en Mastershop',
      type: 'number',
      group: 'basics',
      description: 'ID numérico del producto en Mastershop (idProduct). Se asigna automáticamente al importar.',
      readOnly: true,
      hidden: ({ document }) => !document?.mastershopId,
    }),
    defineField({
      name: 'mastershopImageUrl',
      title: 'Imagen de Mastershop (URL externa)',
      type: 'url',
      group: 'basics',
      description: 'URL de la imagen original del proveedor en cdn.bemaster.com. Se usa como imagen principal si no hay imágenes subidas.',
      readOnly: true,
      hidden: ({ document }) => !document?.mastershopId,
    }),

    // ─── Variantes (sincronizadas desde Mastershop) ─────────────────────────
    defineField({
      name: 'variants',
      title: 'Variantes (talla, color, etc.)',
      type: 'array',
      group: 'variants',
      readOnly: true,
      description: 'Se sincronizan automáticamente desde Mastershop al importar el producto. Si está vacío, el producto no tiene variantes y no se muestra ningún selector en la landing page.',
      of: [
        defineArrayMember({
          name: 'variant',
          type: 'object',
          fields: [
            defineField({ name: 'idVariant', title: 'ID Variante (Mastershop)', type: 'number' }),
            defineField({ name: 'name', title: 'Nombre (ej: "39 / Beige")', type: 'string' }),
            defineField({ name: 'sku', title: 'SKU', type: 'string' }),
            defineField({ name: 'price', title: 'Precio Mastershop', type: 'number' }),
            defineField({ name: 'stock', title: 'Stock', type: 'number' }),
            defineField({ name: 'isEnable', title: 'Activa', type: 'boolean' }),
          ],
          preview: {
            select: { title: 'name', sku: 'sku', stock: 'stock' },
            prepare({ title, sku, stock }) {
              return {
                title: title || 'Variante',
                subtitle: [
                  sku && `SKU: ${sku}`,
                  typeof stock === 'number' && `Stock: ${stock}`,
                ]
                  .filter(Boolean)
                  .join(' · '),
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'trackStock',
      title: '¿El stock de variantes es autoritativo?',
      type: 'boolean',
      group: 'variants',
      initialValue: false,
      description: 'Actívalo solo si Mastershop mantiene el inventario al día. Apagado evita que un stock incompleto bloquee ventas en Nitro.',
    }),

    // ─── Etiquetas (multi-tag para filtros y campañas) ────────────────────────
    defineField({
      name: 'tags',
      title: '🏷️ Etiquetas',
      type: 'array',
      group: 'tags',
      description: 'Etiquetas que cruzan categorías (audiencia, ocasión, beneficio, nicho, promo). Las asigna la IA al generar la landing o al importar, y se pueden ajustar manualmente. Los filtros del home se construyen con esto.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'tag' }],
          options: {
            disableNew: false,
            filter: 'defined(slug.current)',
          },
        },
      ],
      options: {
        layout: 'tags',
      },
    }),

    // ─── Contenido Landing Page (generado por IA) ───────────────────────────
    defineField({
      name: 'aiLifestyleImage',
      title: '🖼️ Imagen Lifestyle IA (DALL-E 3)',
      type: 'image',
      group: 'landing',
      options: { hotspot: true },
      description: 'Imagen principal de la galería lifestyle. La genera el botón "Generar Imagen Lifestyle con IA" (Básicos) o la puedes subir tú.',
    }),
    // Galería lifestyle: acompaña a `aiLifestyleImage` (que sigue siendo la
    // primera y la que usan los carriles de inspiración del home). En la
    // landing se pintan juntas como carrusel. Se llena subiendo fotos aquí o
    // con el botón de IA, que ahora puede AÑADIR en vez de reemplazar.
    defineField({
      name: 'aiLifestyleGallery',
      title: '🖼️ Galería lifestyle (más fotos)',
      type: 'array',
      group: 'landing',
      description: 'Fotos adicionales del producto en uso. Arrastra varias a la vez o créalas con el botón de IA → "Añadir a la galería". Se muestran como carrusel después de la imagen principal.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
        }),
      ],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero: Título Principal',
      type: 'string',
      group: 'landing',
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero: Subtítulo',
      type: 'text',
      rows: 2,
      group: 'landing',
    }),
    defineField({
      name: 'heroCta',
      title: 'Hero: Texto del Botón CTA',
      type: 'string',
      group: 'landing',
    }),
    defineField({
      name: 'benefits',
      title: 'Sección de Beneficios',
      type: 'array',
      group: 'landing',
      of: [
        defineArrayMember({
          name: 'benefit',
          type: 'object',
          fields: [
            defineField({ name: 'icon', title: 'Emoji/Ícono', type: 'string' }),
            defineField({ name: 'title', title: 'Título', type: 'string' }),
            defineField({ name: 'description', title: 'Descripción', type: 'text', rows: 2 }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'specifications',
      title: 'Especificaciones del Producto',
      type: 'array',
      group: 'landing',
      of: [
        defineArrayMember({
          name: 'specification',
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Etiqueta', type: 'string' }),
            defineField({ name: 'value', title: 'Valor', type: 'string' }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'testimonials',
      title: 'Escenarios de uso (IA, no son reseñas)',
      type: 'array',
      group: 'landing',
      description: 'Situaciones hipotéticas de uso redactadas sin atribuirlas a personas reales. Los datos antiguos de nombre, ciudad y estrellas se conservan ocultos solo por compatibilidad.',
      of: [
        defineArrayMember({
          name: 'testimonial',
          type: 'object',
          fields: [
            defineField({ name: 'text', title: 'Situación de uso', type: 'text', rows: 3 }),
            defineField({ name: 'name', title: 'Nombre legado', type: 'string', hidden: true }),
            defineField({ name: 'role', title: 'Rol / Ciudad legado', type: 'string', hidden: true }),
            defineField({ name: 'rating', title: 'Calificación legada', type: 'number', hidden: true }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'reviewsCount',
      title: 'Cantidad Manual de Reseñas',
      type: 'number',
      description: 'Si se deja en blanco, se mostrará la cantidad de testimonios registrados abajo.',
      group: 'landing',
    }),
    // ─── Fotos reales de clientes ───────────────────────────────────────────
    // A diferencia de `testimonials`, que los escribe la IA con nombres
    // inventados, esto son fotos que MANDÓ un cliente de verdad al recibir el
    // producto. Es la única prueba social auténtica que hoy tiene la ficha, y
    // por eso se guarda aparte y no se genera nunca con IA.
    //
    // Si el array está vacío, la landing no pinta el recuadro: un bloque
    // "Así les llegó" sin fotos es peor que no tenerlo.
    defineField({
      name: 'customerPhotos',
      title: '📸 Fotos Reales de Clientes',
      type: 'array',
      group: 'landing',
      description:
        'Fotos que te mandan los clientes cuando reciben el producto. Súbelas solo si son reales y tienes permiso para publicarlas — son la prueba social de la ficha y el bloque no aparece si está vacío.',
      of: [
        defineArrayMember({
          name: 'customerPhoto',
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'customerName',
              title: 'Nombre del cliente (opcional)',
              type: 'string',
              description: 'Solo el nombre de pila. Se muestra bajo la foto.',
            }),
            defineField({
              name: 'city',
              title: 'Ciudad (opcional)',
              type: 'string',
            }),
            // Absorbe a los antiguos «Testimonios visuales» de Destacados: una
            // foto real con lo que dijo el cliente. Solo lo que el cliente
            // escribió de verdad, con su permiso.
            defineField({
              name: 'quote',
              title: 'Lo que dijo (opcional)',
              type: 'text',
              rows: 2,
              description: 'Copia textual de lo que escribió el cliente al mandar la foto. Nunca redactado por nosotros ni por la IA.',
            }),
            defineField({
              name: 'alt',
              title: 'Texto alternativo (accesibilidad)',
              type: 'string',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'ctaHeadline',
      title: 'CTA Final: Título',
      type: 'string',
      group: 'landing',
    }),
    defineField({
      name: 'ctaText',
      title: 'CTA Final: Texto',
      type: 'text',
      rows: 2,
      group: 'landing',
    }),
    // «¿Es para ti?». Lo llena la IA con el resto de la landing. Decir para
    // quién NO es da más confianza que otra lista de beneficios, y baja las
    // devoluciones de quien compró esperando otra cosa.
    defineField({
      name: 'audienceFit',
      title: '🎯 ¿Es para ti? (para quién sí / para quién no)',
      type: 'object',
      group: 'landing',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'forWho',
          title: 'Es para ti si…',
          type: 'array',
          of: [{ type: 'string' }],
          validation: (rule) => rule.max(4),
        }),
        defineField({
          name: 'notFor',
          title: 'No es para ti si…',
          type: 'array',
          of: [{ type: 'string' }],
          validation: (rule) => rule.max(3),
        }),
      ],
    }),
    defineField({
      name: 'faqs',
      title: 'Preguntas Frecuentes',
      type: 'array',
      group: 'landing',
      description: 'Se generan automáticamente al importar. Aparecen antes del CTA en la landing.',
      of: [
        defineArrayMember({
          name: 'faq',
          type: 'object',
          fields: [
            defineField({ name: 'question', title: 'Pregunta', type: 'string' }),
            defineField({ name: 'answer', title: 'Respuesta', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'question' } },
        }),
      ],
    }),

    // ─── Oferta / Countdown timer ────────────────────────────────────────────
    defineField({
      name: 'offerName',
      title: '🔥 Nombre de la Oferta',
      type: 'string',
      group: 'offer',
      description: 'Ej: "Flash Sale", "Oferta de Lanzamiento", "Black Friday". Si está vacío, no se muestra el countdown.',
    }),
    defineField({
      name: 'offerEndsAt',
      title: '⏱️ Oferta Termina El',
      type: 'datetime',
      group: 'offer',
      description: 'Fecha y hora exacta. El countdown desaparece automáticamente al llegar a cero.',
      // Una cuenta regresiva sin rebaja es urgencia fabricada: el comprador
      // corre a pagar un precio que es el de siempre. Con tráfico pagado eso
      // es publicidad engañosa para la SIC. Se avisa, no se bloquea.
      validation: (rule) =>
        rule
          .custom((value, context) => {
            if (!value) return true
            const doc = context.document as { price?: number; originalPrice?: number } | undefined
            const hasDiscount = !!doc?.originalPrice && !!doc?.price && doc.originalPrice > doc.price
            return hasDiscount
              ? true
              : 'La oferta no tiene rebaja: llena «Precio Original» (mayor que el precio) o quita la fecha. Una cuenta regresiva sin descuento es urgencia falsa.'
          })
          .warning(),
    }),

    // ─── Destacados — Contenido extendido de campaña ────────────────────────
    // OJO: los `name` de estos campos conservan el prefijo `vip*` a propósito.
    // Son los nombres ALMACENADOS en el dataset; renombrarlos exigiría migrar
    // los documentos existentes. Lo que ve el editor son los `title`, y el
    // código de la app los lee alias-eados como `destacado*` desde
    // lib/sanity/queries.ts. Ver CLAUDE.md.
    // `vipStory` llega prellenado por la IA y queda para revisión editorial.
    // Los módulos visuales restantes siguen siendo manuales porque dependen de
    // fotos, videos, comparaciones y testimonios aportados por la tienda.
    defineField({
      name: 'isVip',
      title: '⭐ ¿Producto Destacado?',
      type: 'boolean',
      group: 'destacados',
      initialValue: false,
      description: 'Activa la estrellita en la tarjeta del producto y lo incluye en /destacados. Si lo activas, los bloques de abajo se mostrarán en la landing (solo los que llenes). También activa envío gratis en el checkout.',
    }),
    // Nombres nuevos, sin prefijo `vip*`: los heredados solo conservan el suyo
    // porque ya están almacenados. Ver CLAUDE.md → Destacados.
    defineField({
      name: 'completeDestacado',
      title: '🤖 Completar Destacado con IA',
      type: 'string',
      group: 'destacados',
      components: { input: CompleteDestacadoButton },
      description: 'Llena lo que esté vacío: titular de campaña, historia, pasos de uso, qué viene en la caja y (opcional) 3 fotos para la galería. No toca lo que ya escribiste.',
    }),
    defineField({
      name: 'destacadoHeadline',
      title: '📣 Titular de campaña',
      type: 'string',
      group: 'destacados',
      description: 'La frase del anuncio, para que quien hace clic la reconozca. Sale bajo el nombre del producto en lugar del gancho de la IA. Máximo 60 caracteres. Ej: "Aprende a rodar sin caídas laterales".',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'destacadoBanner',
      title: '🪧 Banner bajo el hero',
      type: 'object',
      group: 'destacados',
      description: 'Imagen a todo el ancho de la pantalla, justo debajo de la primera sección (foto + precio). Ideal para la pieza de campaña del anuncio: la persona reconoce lo que vio en Meta.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'desktopImage',
          title: 'Imagen escritorio',
          type: 'image',
          options: { hotspot: true },
          description: 'Horizontal. Recomendado 2400 × 800 px (3:1) o 1920 × 720. Se muestra de borde a borde.',
        }),
        defineField({
          name: 'mobileImage',
          title: 'Imagen móvil (opcional)',
          type: 'image',
          options: { hotspot: true },
          description: 'Vertical o cuadrada, p. ej. 1080 × 1350. Si la dejas vacía, el móvil usa la de escritorio.',
        }),
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
          description: 'Qué muestra el banner, en una frase. Si el banner lleva texto dentro de la imagen, escríbelo aquí.',
        }),
      ],
    }),
    defineField({
      name: 'vipStory',
      title: '🧩 Historia de campaña — tres momentos',
      type: 'object',
      group: 'destacados',
      description: 'La IA la prepara al crear o regenerar el producto. Revísala antes de publicar: conecta el problema, el mecanismo real y el resultado; los módulos visuales de abajo sirven como evidencia.',
      options: { collapsible: true, collapsed: false },
      validation: (rule) => rule.custom((value, context) => {
        if (!context.document?.isVip) return true
        const story = value as Record<string, unknown> | undefined
        const required = [
          'problemTitle',
          'problemText',
          'turningPointTitle',
          'turningPointText',
          'outcomeTitle',
          'outcomeText',
        ]
        return story && required.every((field) => typeof story[field] === 'string' && story[field])
          ? true
          : 'Un producto Destacado necesita completar los tres momentos antes de publicarse como landing de campaña.'
      }).warning(),
      fields: [
        defineField({
          name: 'eyebrow',
          title: 'Antetítulo de la historia',
          type: 'string',
          description: 'Ej: "Si esto te pasa cada mañana". Una frase breve que haga sentir reconocido al visitante.',
        }),
        defineField({ name: 'problemTitle', title: '1. El momento — título', type: 'string' }),
        defineField({
          name: 'problemText',
          title: '1. El momento — escena concreta',
          type: 'text',
          rows: 3,
          description: 'Describe la situación cotidiana antes del producto, sin exagerar ni diagnosticar.',
        }),
        defineField({
          name: 'problemImage',
          title: '1. El momento — imagen (opcional)',
          type: 'image',
          options: { hotspot: true },
          description: 'Foto pequeña del problema. Se pinta arriba del texto, en formato 4:3. Si solo pones imagen en algunos momentos, los demás quedan solo con texto.',
          fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
        }),
        defineField({ name: 'turningPointTitle', title: '2. Lo que cambia — título', type: 'string' }),
        defineField({
          name: 'turningPointText',
          title: '2. Lo que cambia — mecanismo',
          type: 'text',
          rows: 3,
          description: 'Explica qué hace diferente al producto y por qué funciona, usando datos comprobables.',
        }),
        defineField({
          name: 'turningPointImage',
          title: '2. Lo que cambia — imagen (opcional)',
          type: 'image',
          options: { hotspot: true },
          description: 'Un detalle del producto: la pieza, el mecanismo o el material que explica el cambio.',
          fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
        }),
        defineField({ name: 'outcomeTitle', title: '3. El resultado — título', type: 'string' }),
        defineField({
          name: 'outcomeText',
          title: '3. El resultado — nueva escena',
          type: 'text',
          rows: 3,
          description: 'Pinta el después observable y realista. Nada de promesas absolutas.',
        }),
        defineField({
          name: 'outcomeImage',
          title: '3. El resultado — imagen (opcional)',
          type: 'image',
          options: { hotspot: true },
          description: 'El producto en uso, ya resolviendo el problema.',
          fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
        }),
      ],
    }),
    defineField({
      name: 'vipHeroVideo',
      title: '🎬 Video / GIF secundario',
      type: 'object',
      group: 'destacados',
      description: 'Video corto del producto en uso. Se renderiza bajo el hero, alto impacto.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'url',
          title: 'URL del video o GIF',
          type: 'url',
          description: 'Cloudinary (recomendado), YouTube, Vimeo o GIF directo.',
        }),
        defineField({
          name: 'posterImage',
          title: 'Imagen previa (poster)',
          type: 'image',
          options: { hotspot: true },
          description: 'Se muestra mientras carga el video.',
        }),
        defineField({
          name: 'caption',
          title: 'Caption corto (opcional)',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'vipBeforeAfter',
      title: '🔄 Antes / Después (puedes agregar varios)',
      type: 'array',
      group: 'destacados',
      description: 'Pares de imágenes para mostrar transformación. Ideal para belleza, fitness, limpieza, organización.',
      of: [
        defineArrayMember({
          name: 'beforeAfterPair',
          type: 'object',
          fields: [
            defineField({
              name: 'beforeImage',
              title: 'Imagen "Antes"',
              type: 'image',
              options: { hotspot: true },
              validation: (rule) => rule.required(),
              fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
            }),
            defineField({
              name: 'afterImage',
              title: 'Imagen "Después"',
              type: 'image',
              options: { hotspot: true },
              validation: (rule) => rule.required(),
              fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
            }),
            defineField({ name: 'caption', title: 'Caption (opcional)', type: 'string' }),
          ],
          preview: {
            select: { title: 'caption', media: 'afterImage' },
            prepare({ title, media }) {
              return { title: title || 'Antes / Después', media }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'vipSteps',
      title: '👣 Cómo se usa — pasos (puedes agregar varios)',
      type: 'array',
      group: 'destacados',
      description: 'Pasos ilustrados que enseñan a usar el producto. Sugerido: 3-4 pasos.',
      of: [
        defineArrayMember({
          name: 'step',
          type: 'object',
          fields: [
            defineField({
              name: 'image',
              title: 'Imagen del paso',
              type: 'image',
              options: { hotspot: true },
              fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
            }),
            defineField({
              name: 'title',
              title: 'Título del paso',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Descripción',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: { select: { title: 'title', media: 'image' } },
        }),
      ],
    }),
    defineField({
      name: 'vipBoxContents',
      title: '📦 Qué viene en la caja',
      type: 'object',
      group: 'destacados',
      description: 'Para reducir la duda de "¿qué exactamente recibo?". Foto del kit completo + lista de items, y si quieres una foto por pieza.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'title', title: 'Título de la sección', type: 'string', initialValue: 'Qué viene en la caja' }),
        defineField({
          name: 'image',
          title: 'Imagen del kit completo',
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
        }),
        defineField({ name: 'intro', title: 'Texto introductorio (opcional)', type: 'text', rows: 2 }),
        defineField({
          name: 'items',
          title: 'Items incluidos',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'Una línea por item.',
        }),
        defineField({
          name: 'pieces',
          title: 'Fotos por pieza (opcional)',
          type: 'array',
          description: 'Una foto de cada pieza del kit con su nombre. Se muestran en una fila debajo de la lista. Útil cuando el kit trae accesorios que no se distinguen en la foto general.',
          of: [
            defineArrayMember({
              name: 'boxPiece',
              type: 'object',
              fields: [
                defineField({
                  name: 'image',
                  title: 'Foto',
                  type: 'image',
                  options: { hotspot: true },
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: 'label',
                  title: 'Qué es',
                  type: 'string',
                  description: 'Ej: "2 bases circulares". Lo mismo que diría la lista.',
                  validation: (rule) => rule.required(),
                }),
              ],
              preview: { select: { title: 'label', media: 'image' } },
            }),
          ],
        }),
      ],
    }),
    // RETIRADO: se fusionó con «Fotos Reales de Clientes» (que ahora admite lo
    // que dijo el cliente). Los datos que ya existen se siguen mostrando —la
    // query los junta con customerPhotos— y el campo solo aparece en los
    // documentos que todavía tienen alguno, para poder moverlos a mano.
    defineField({
      name: 'vipTestimonials',
      title: '💬 Testimonios visuales (RETIRADO)',
      type: 'array',
      group: 'destacados',
      deprecated: { reason: 'Usa «Fotos Reales de Clientes» (pestaña Landing), que ahora admite lo que dijo el cliente.' },
      hidden: ({ value }) => !Array.isArray(value) || value.length === 0,
      description: 'Se sigue mostrando en la landing, junto a las fotos de clientes. Para cosas nuevas usa «Fotos Reales de Clientes».',
      of: [
        defineArrayMember({
          name: 'visualTestimonial',
          type: 'object',
          fields: [
            defineField({
              name: 'photo',
              title: 'Foto del cliente',
              type: 'image',
              options: { hotspot: true },
              validation: (rule) => rule.required(),
              fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
            }),
            defineField({
              name: 'quote',
              title: 'Frase / testimonio',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.required(),
            }),
            defineField({ name: 'name', title: 'Nombre', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'location', title: 'Ciudad / contexto (opcional)', type: 'string' }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'quote', media: 'photo' },
          },
        }),
      ],
    }),
    defineField({
      name: 'vipComparison',
      title: '⚖️ Comparativa con alternativas',
      type: 'object',
      group: 'destacados',
      description: 'Tabla simple: nuestra opción vs lo común. Reposiciona el precio y diferencia.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'title', title: 'Título', type: 'string', initialValue: 'Cómo nos comparamos' }),
        defineField({ name: 'ourLabel', title: 'Etiqueta nuestra columna', type: 'string', initialValue: 'Con Todopolis' }),
        defineField({ name: 'theirLabel', title: 'Etiqueta columna comparación', type: 'string', initialValue: 'Otros' }),
        defineField({
          name: 'rows',
          title: 'Filas de la comparación',
          type: 'array',
          of: [
            defineArrayMember({
              name: 'comparisonRow',
              type: 'object',
              fields: [
                defineField({ name: 'feature', title: 'Característica', type: 'string', validation: (rule) => rule.required() }),
                defineField({ name: 'ours', title: 'Nuestra opción', type: 'string' }),
                defineField({ name: 'theirs', title: 'Otros', type: 'string' }),
              ],
              preview: {
                select: { title: 'feature', ours: 'ours', theirs: 'theirs' },
                prepare({ title, ours, theirs }) {
                  return { title: title || 'Fila', subtitle: `${ours ?? '—'} vs ${theirs ?? '—'}` }
                },
              },
            }),
          ],
        }),
      ],
    }),
  ],

  groups: [
    // `default: true` hace que el Studio abra en esta pestaña. Sin ella, los
    // campos base caían en la pestaña "All fields" mezclados con los otros 40.
    { name: 'basics', title: '📝 Básicos', default: true },
    { name: 'landing', title: '🚀 Landing Page (Contenido IA)' },
    { name: 'offer', title: '⏱️ Oferta / Countdown' },
    { name: 'destacados', title: '⭐ Destacados — Contenido manual extendido' },
    { name: 'variants', title: '🎨 Variantes' },
    { name: 'tags', title: '🏷️ Etiquetas' },
  ],
})

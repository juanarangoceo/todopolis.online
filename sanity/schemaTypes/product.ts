import { defineType, defineField, defineArrayMember } from 'sanity'
import { GenerateContentButton } from '../components/GenerateContentButton'
import { GenerateAIImageButton } from '../components/GenerateAIImageButton'
import { GenerateArticleButton } from '../components/GenerateArticleButton'
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
      description: 'Genera una imagen hiperrealista de una persona usando el producto. Se mostrará antes de la sección de beneficios en la landing page.',
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
      description: 'Imagen generada con IA. Se muestra entre el hero y los beneficios en la landing page.',
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
        defineField({ name: 'turningPointTitle', title: '2. Lo que cambia — título', type: 'string' }),
        defineField({
          name: 'turningPointText',
          title: '2. Lo que cambia — mecanismo',
          type: 'text',
          rows: 3,
          description: 'Explica qué hace diferente al producto y por qué funciona, usando datos comprobables.',
        }),
        defineField({ name: 'outcomeTitle', title: '3. El resultado — título', type: 'string' }),
        defineField({
          name: 'outcomeText',
          title: '3. El resultado — nueva escena',
          type: 'text',
          rows: 3,
          description: 'Pinta el después observable y realista. Nada de promesas absolutas.',
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
      description: 'Para reducir la duda de "¿qué exactamente recibo?". Mostrar imagen del kit + lista de items.',
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
      ],
    }),
    defineField({
      name: 'vipTestimonials',
      title: '💬 Testimonios visuales (con foto)',
      type: 'array',
      group: 'destacados',
      description: 'Diferentes a los testimonios de texto generados por IA. Estos llevan foto real y convierten mucho mejor.',
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
    defineField({
      name: 'vipQuotes',
      title: '✨ Quotes destacadas (puedes agregar varios)',
      type: 'array',
      group: 'destacados',
      description: 'Frases sueltas grandes que dan respiro a la landing. Se intercalan entre secciones.',
      of: [
        defineArrayMember({
          name: 'vipQuote',
          type: 'object',
          fields: [
            defineField({ name: 'text', title: 'Texto del quote', type: 'text', rows: 3, validation: (rule) => rule.required() }),
            defineField({ name: 'author', title: 'Autor (opcional)', type: 'string' }),
          ],
          preview: { select: { title: 'text', subtitle: 'author' } },
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

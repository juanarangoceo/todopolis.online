import { defineType, defineField, defineArrayMember } from 'sanity'
import { GenerateContentButton } from '../components/GenerateContentButton'
import { GenerateAIImageButton } from '../components/GenerateAIImageButton'
import { MultiImageUploader } from '../components/MultiImageUploader'

export const productType = defineType({
  name: 'product',
  title: 'Producto',
  type: 'document',
  fields: [
    // ─── Vinculación con Mastershop ──────────────────────────────────────────
    defineField({
      name: 'mastershopId',
      title: 'ID en Mastershop',
      type: 'number',
      description: 'ID numérico del producto en Mastershop (idProduct). Se asigna automáticamente al importar.',
      readOnly: true,
    }),
    defineField({
      name: 'mastershopImageUrl',
      title: 'Imagen de Mastershop (URL externa)',
      type: 'url',
      description: 'URL de la imagen original del proveedor en cdn.bemaster.com. Se usa como imagen principal si no hay imágenes subidas.',
      readOnly: true,
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

    // ─── Datos básicos del producto ─────────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Nombre del Producto',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Galería de Imágenes',
      type: 'array',
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
      description: 'Pega aquí la descripción del producto. La IA la usará para generar el contenido de la landing page.',
    }),
    defineField({
      name: 'price',
      title: 'Precio Venta',
      type: 'number',
      description: 'Precio actual del producto.',
    }),
    defineField({
      name: 'originalPrice',
      title: 'Precio Original (Tachado)',
      type: 'number',
      description: 'Opcional. Si el producto está en oferta, escribe aquí el precio anterior.',
    }),
    defineField({
      name: 'category',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'Electrónica', value: 'electronica' },
          { title: 'Hogar', value: 'hogar' },
          { title: 'Moda', value: 'moda' },
          { title: 'Deportes', value: 'deportes' },
          { title: 'Juguetes', value: 'juguetes' },
          { title: 'Belleza', value: 'belleza' },
          { title: 'Alimentos', value: 'alimentos' },
          { title: 'Accesorios', value: 'accesorios' },
          { title: 'Bienestar Íntimo', value: 'bienestar-intimo' },
          { title: 'Otros', value: 'otros' },
        ],
      },
    }),
    defineField({
      name: 'isNew',
      title: '¿Producto Nuevo?',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'isBestSeller',
      title: '¿Más Vendido?',
      type: 'boolean',
      initialValue: false,
    }),

    // ─── Etiquetas (multi-tag para filtros y campañas) ────────────────────────
    defineField({
      name: 'tags',
      title: '🏷️ Etiquetas',
      type: 'array',
      group: 'tags',
      description: 'Etiquetas que cruzan categorías (audiencia, ocasión, beneficio, nicho, promo). Se asignan automáticamente al importar y se pueden ajustar manualmente. Filtros del home se construyen con esto.',
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

    // ─── Botones de generación con IA ──────────────────────────────────────
    defineField({
      name: 'generateContent',
      title: '🤖 Generar Contenido con IA',
      type: 'string',
      components: {
        input: GenerateContentButton,
      },
      description: 'Sube la imagen y llena la descripción arriba, luego haz clic en el botón para generar el contenido de la landing page.',
    }),
    defineField({
      name: 'generateAIImage',
      title: '🎨 Generar Imagen Lifestyle con IA',
      type: 'string',
      components: {
        input: GenerateAIImageButton,
      },
      description: 'Genera una imagen hiperrealista de una persona usando el producto con DALL-E 3. Se mostrará antes de la sección de beneficios en la landing page.',
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
      title: 'Testimonios',
      type: 'array',
      group: 'landing',
      of: [
        defineArrayMember({
          name: 'testimonial',
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Nombre', type: 'string' }),
            defineField({ name: 'role', title: 'Rol / Ciudad', type: 'string' }),
            defineField({ name: 'text', title: 'Testimonio', type: 'text', rows: 3 }),
            defineField({ name: 'rating', title: 'Calificación (1-5)', type: 'number', validation: (r) => r.min(1).max(5) }),
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

    // ─── VIP — Contenido manual extendido (100% editorial) ───────────────────
    // Estos campos NUNCA los toca la IA ni el sync de Mastershop. Decisión
    // editorial: el editor activa isVip y llena los bloques que quiera. Los
    // bloques vacíos no se renderizan.
    defineField({
      name: 'isVip',
      title: '👑 ¿Producto VIP?',
      type: 'boolean',
      group: 'vip',
      initialValue: false,
      description: 'Activa la coronita en la tarjeta del producto y la entrada VIP en el header. Si lo activas, los bloques VIP de abajo se mostrarán en la landing (solo los que llenes).',
    }),
    defineField({
      name: 'vipHeroVideo',
      title: '🎬 Video / GIF secundario',
      type: 'object',
      group: 'vip',
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
      group: 'vip',
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
      group: 'vip',
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
      group: 'vip',
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
      group: 'vip',
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
      group: 'vip',
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
      group: 'vip',
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
    { name: 'landing', title: '🚀 Landing Page (Contenido IA)' },
    { name: 'offer', title: '⏱️ Oferta / Countdown' },
    { name: 'vip', title: '👑 VIP — Contenido manual extendido' },
    { name: 'variants', title: '🎨 Variantes' },
    { name: 'tags', title: '🏷️ Etiquetas' },
  ],
})

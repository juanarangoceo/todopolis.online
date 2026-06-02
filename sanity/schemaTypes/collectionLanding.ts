import { defineType, defineField, defineArrayMember } from 'sanity'
import { GenerateCollectionButton } from '../components/GenerateCollectionButton'

// Colección de Marca: el editor elige 3-6 productos de un mismo segmento (ej:
// proyectores) y la IA genera una landing paraguas con narrativa de marca, guía
// de compra, tabla comparativa entre los productos y FAQ. Los productos mantienen
// su propia landing en /producto/[slug]; esta página los agrupa y los vende como
// segmento. Mismo patrón de generación IA que el documento `product`.
export const collectionLandingType = defineType({
  name: 'collectionLanding',
  title: '🛍️ Colección de Marca',
  type: 'document',
  description:
    'Elige 3-6 productos de un mismo segmento y genera con IA una landing de marca dedicada en /coleccion/[slug].',
  groups: [{ name: 'landing', title: '🚀 Contenido IA' }],
  fields: [
    // ─── Configuración ───────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Título interno (para identificarla)',
      type: 'string',
      description: 'Ej: "Proyectores portátiles", "Audífonos gamer". Solo para el Studio.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'segmentHint',
      title: 'Pista de segmento para la IA (opcional)',
      type: 'string',
      description:
        'Ej: "proyectores portátiles para casa", "audífonos inalámbricos deportivos". Ayuda a la IA a posicionar la colección. Si lo dejas vacío, la IA lo deduce de los productos.',
    }),
    defineField({
      name: 'products',
      title: 'Productos de la colección (3 a 6)',
      type: 'array',
      description: 'Elige entre 3 y 6 productos del mismo segmento. El orden se respeta en la tabla comparativa.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'product' }],
          options: { filter: 'defined(slug.current)' },
        },
      ],
      validation: (rule) =>
        rule.required().min(3).max(6).error('Elige entre 3 y 6 productos.'),
      options: { layout: 'tags' },
    }),

    // ─── Botón de generación con IA ──────────────────────────────────────────
    defineField({
      name: 'generateContent',
      title: '🤖 Generar Colección con IA',
      type: 'string',
      components: { input: GenerateCollectionButton },
      description:
        'Elige los productos arriba y haz clic para generar todo el contenido de marca de la landing.',
    }),

    // ─── Contenido generado por IA ───────────────────────────────────────────
    defineField({ name: 'heroEyebrow', title: 'Hero: Antetítulo (eyebrow)', type: 'string', group: 'landing' }),
    defineField({ name: 'heroTitle', title: 'Hero: Título Principal', type: 'string', group: 'landing' }),
    defineField({ name: 'heroSubtitle', title: 'Hero: Subtítulo', type: 'text', rows: 2, group: 'landing' }),
    defineField({ name: 'heroCta', title: 'Hero: Texto del Botón CTA', type: 'string', group: 'landing' }),
    defineField({
      name: 'brandIntro',
      title: 'Introducción de marca / segmento',
      type: 'text',
      rows: 4,
      group: 'landing',
      description: 'Párrafo que presenta el segmento y por qué Todopolis es la opción.',
    }),
    defineField({
      name: 'segmentBenefits',
      title: 'Beneficios del segmento',
      type: 'array',
      group: 'landing',
      of: [
        defineArrayMember({
          name: 'segmentBenefit',
          type: 'object',
          fields: [
            defineField({ name: 'icon', title: 'Emoji/Ícono', type: 'string' }),
            defineField({ name: 'title', title: 'Título', type: 'string' }),
            defineField({ name: 'description', title: 'Descripción', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        }),
      ],
    }),
    defineField({
      name: 'buyersGuide',
      title: 'Guía de compra ("Cómo elegir")',
      type: 'array',
      group: 'landing',
      of: [
        defineArrayMember({
          name: 'guideItem',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Título', type: 'string' }),
            defineField({ name: 'body', title: 'Texto', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'title', subtitle: 'body' } },
        }),
      ],
    }),
    defineField({
      name: 'comparisonRows',
      title: 'Tabla comparativa',
      type: 'array',
      group: 'landing',
      description:
        'Cada fila es una característica. Los valores están alineados al orden de los productos elegidos arriba.',
      of: [
        defineArrayMember({
          name: 'comparisonRow',
          type: 'object',
          fields: [
            defineField({ name: 'feature', title: 'Característica', type: 'string' }),
            defineField({
              name: 'values',
              title: 'Valores (en orden de los productos)',
              type: 'array',
              of: [{ type: 'string' }],
            }),
          ],
          preview: {
            select: { title: 'feature', values: 'values' },
            prepare({ title, values }) {
              return {
                title: title || 'Característica',
                subtitle: Array.isArray(values) ? values.join(' · ') : '',
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'faqs',
      title: 'Preguntas Frecuentes',
      type: 'array',
      group: 'landing',
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
    defineField({ name: 'ctaHeadline', title: 'CTA Final: Título', type: 'string', group: 'landing' }),
    defineField({ name: 'ctaText', title: 'CTA Final: Texto', type: 'text', rows: 2, group: 'landing' }),

    // ─── SEO ─────────────────────────────────────────────────────────────────
    defineField({ name: 'seoTitle', title: 'SEO: Título', type: 'string', group: 'landing' }),
    defineField({ name: 'seoDescription', title: 'SEO: Meta descripción', type: 'text', rows: 2, group: 'landing' }),
  ],
  preview: {
    select: { title: 'title', products: 'products' },
    prepare({ title, products }) {
      const count = Array.isArray(products) ? products.length : 0
      return {
        title: title || 'Colección sin nombre',
        subtitle: `${count} ${count === 1 ? 'producto' : 'productos'}`,
      }
    },
  },
})

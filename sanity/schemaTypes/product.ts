import { defineType, defineField, defineArrayMember } from 'sanity'
import { GenerateContentButton } from '../components/GenerateContentButton'

export const productType = defineType({
  name: 'product',
  title: 'Producto',
  type: 'document',
  fields: [
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
      validation: (rule) => rule.required().min(1),
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
          { title: 'Sexshop', value: 'sexshop' },
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

    // ─── Botón de generación con IA ─────────────────────────────────────────
    defineField({
      name: 'generateContent',
      title: '🤖 Generar Contenido con IA',
      type: 'string',
      components: {
        input: GenerateContentButton,
      },
      description: 'Sube la imagen y llena la descripción arriba, luego haz clic en el botón para generar el contenido de la landing page.',
    }),

    // ─── Contenido Landing Page (generado por IA) ───────────────────────────
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
  ],

  groups: [
    { name: 'landing', title: '🚀 Landing Page (Contenido IA)' },
  ],
})

import { defineType, defineField } from 'sanity'

export const heroBannerType = defineType({
  name: 'heroBanner',
  title: 'Banner Principal (IA)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Título Promocional',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtítulo',
      type: 'string',
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Color de Fondo',
      type: 'string',
      description: 'Clase de Tailwind o código HEX (ej. #FFD5E5)',
    }),
    defineField({
      name: 'products',
      title: 'Productos Destacados',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      validation: (rule) => rule.max(3),
    }),
  ],
})

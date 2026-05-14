import { defineType, defineField, defineArrayMember } from 'sanity'

export const articleType = defineType({
  name: 'article',
  title: 'Blog · Artículos',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Título del artículo', validation: Rule => Rule.required() }),
    defineField({
      name: 'slug', type: 'slug', title: 'Slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    }),
    defineField({ name: 'topic', type: 'string', title: 'Tema del artículo' }),
    defineField({ name: 'seoDescription', type: 'text', title: 'Descripción SEO / Extracto', rows: 3 }),
    defineField({ name: 'seoKeywords', type: 'array', title: 'Keywords SEO', of: [{ type: 'string' }] }),
    defineField({ name: 'readingTime', type: 'number', title: 'Tiempo de lectura (min)' }),
    defineField({ name: 'category', type: 'string', title: 'Categoría' }),
    defineField({ name: 'publishedAt', type: 'datetime', title: 'Fecha de publicación' }),
    defineField({ name: 'productSlug', type: 'string', title: 'Slug del producto (para enlace directo)' }),
    defineField({
      name: 'relatedProduct', type: 'reference', title: 'Producto relacionado',
      to: [{ type: 'product' }],
    }),
    defineField({
      name: 'sections', type: 'array', title: 'Secciones del artículo',
      of: [
        defineArrayMember({
          type: 'object', name: 'articleSection', title: 'Sección',
          fields: [
            defineField({
              name: 'type', type: 'string', title: 'Tipo',
              options: { list: [
                { title: 'Introducción', value: 'intro' },
                { title: 'Sección H2', value: 'h2' },
                { title: 'Lista', value: 'list' },
                { title: 'Preguntas frecuentes', value: 'faq' },
                { title: 'CTA / Llamada a la acción', value: 'cta' },
              ]},
            }),
            defineField({ name: 'heading', type: 'string', title: 'Título de la sección' }),
            defineField({ name: 'content', type: 'text', title: 'Contenido', rows: 5 }),
            defineField({ name: 'items', type: 'array', title: 'Items de lista', of: [{ type: 'string' }] }),
            defineField({ name: 'buttonText', type: 'string', title: 'Texto del botón (solo CTA)' }),
            defineField({
              name: 'faqs', type: 'array', title: 'Preguntas y respuestas',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({ name: 'question', type: 'string', title: 'Pregunta' }),
                    defineField({ name: 'answer', type: 'text', title: 'Respuesta', rows: 3 }),
                  ],
                  preview: { select: { title: 'question' } },
                }),
              ],
            }),
          ],
          preview: { select: { title: 'heading', subtitle: 'type' } },
        }),
      ],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'topic' } },
})

import { defineType, defineField } from 'sanity'

export const promoCampaignType = defineType({
  name: 'promoCampaign',
  title: '🏖️ Campaña / Banner Temporada',
  type: 'document',
  description:
    'Banner que aparece después de la 2ª fila de productos del home. Al hacer click lleva a /temporada, que muestra los productos con las etiquetas seleccionadas. Solo la campaña activa más reciente se publica.',
  fields: [
    defineField({
      name: 'title',
      title: 'Título interno (para identificarla)',
      type: 'string',
      description: 'Ej: "Navidad 2025", "Día de la Madre", "Black Friday".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: '✅ ¿Activa?',
      type: 'boolean',
      description:
        'Solo la campaña activa con fecha más reciente aparece en el home. Desactiva esta para volver al home sin banner.',
      initialValue: false,
    }),

    // ─── Imágenes del banner ───────────────────────────────────────────────
    defineField({
      name: 'desktopImage',
      title: '🖥️ Imagen desktop',
      type: 'image',
      description:
        'Imagen ancha para escritorio (recomendado ~1600×500 px). Visible desde tablet en adelante.',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mobileImage',
      title: '📱 Imagen mobile',
      type: 'image',
      description:
        'Imagen vertical para celular (recomendado ~800×800 px). Visible en pantallas menores a tablet.',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'imageAlt',
      title: 'Texto alternativo de la imagen',
      type: 'string',
      description: 'Para accesibilidad y SEO. Describe brevemente lo que se ve.',
      validation: (rule) => rule.required(),
    }),

    // ─── Selección de productos por tags ───────────────────────────────────
    defineField({
      name: 'tags',
      title: '🏷️ Etiquetas que definen la campaña',
      type: 'array',
      description:
        'Productos que tengan estas etiquetas aparecerán en /temporada. Elige las etiquetas más representativas del banner.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'tag' }],
          options: { filter: 'defined(slug.current)' },
        },
      ],
      validation: (rule) => rule.min(1).error('Elige al menos una etiqueta.'),
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'tagMatchMode',
      title: 'Modo de coincidencia',
      type: 'string',
      description:
        '"Cualquiera": producto entra si tiene al menos una etiqueta. "Todas": producto entra solo si tiene todas las etiquetas (más estricto).',
      options: {
        list: [
          { title: 'Cualquiera (más amplio)', value: 'any' },
          { title: 'Todas (más estricto)', value: 'all' },
        ],
        layout: 'radio',
      },
      initialValue: 'any',
    }),

    // ─── Contenido visible en /temporada ───────────────────────────────────
    defineField({
      name: 'pageHeading',
      title: 'Título grande de la página /temporada',
      type: 'string',
      description: 'Ej: "Regalos de Navidad", "Día de la Madre 2025". Lo que el usuario ve arriba en la página.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pageSubheading',
      title: 'Bajada / descripción',
      type: 'text',
      rows: 2,
      description: '1-2 oraciones que expliquen la colección.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Texto del botón sobre el banner',
      type: 'string',
      description: 'Opcional. Si está vacío no se muestra botón sobre la imagen.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      isActive: 'isActive',
      media: 'desktopImage',
    },
    prepare({ title, isActive, media }) {
      return {
        title: title || 'Campaña sin nombre',
        subtitle: isActive ? '✅ Activa' : 'Inactiva',
        media,
      }
    },
  },
})

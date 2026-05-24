import { defineType, defineField } from 'sanity'

export const tagType = defineType({
  name: 'tag',
  title: 'Etiqueta',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre',
      type: 'string',
      description: 'Cómo aparece en filtros y chips (ej: "Para mamás", "Regalo de Navidad").',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'ID interno para URLs y la IA (ej: "mamas", "regalo-navidad"). No usar espacios ni mayúsculas.',
      options: { source: 'name', maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'group',
      title: 'Grupo',
      type: 'string',
      description: 'Eje semántico al que pertenece. Define en qué sección del drawer/sheet aparece.',
      options: {
        list: [
          { title: '👥 Audiencia (para quién)', value: 'audiencia' },
          { title: '🎁 Ocasión / Campaña', value: 'ocasion' },
          { title: '🌟 Beneficio / Promesa', value: 'beneficio' },
          { title: '🛠️ Atributo / Material', value: 'atributo' },
          { title: '🏷️ Nicho / Sub-categoría', value: 'nicho' },
          { title: '🔥 Promo / Estado', value: 'promo' },
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'icon',
      title: 'Emoji / Ícono',
      type: 'string',
      description: 'Opcional. Un emoji que aparece junto al nombre en el chip.',
    }),
    defineField({
      name: 'color',
      title: 'Color (hex)',
      type: 'string',
      description: 'Opcional. Color de acento del chip (ej: "#FFB4AC"). Si está vacío usa el color del grupo.',
    }),
    defineField({
      name: 'description',
      title: 'Descripción (para la IA)',
      type: 'text',
      rows: 2,
      description: 'Cuándo aplicar esta etiqueta. La IA usa esto para decidir si un producto la lleva al importarse.',
    }),
    defineField({
      name: 'priority',
      title: 'Prioridad',
      type: 'number',
      description: 'Mayor prioridad → aparece antes en chips rápidos y filtros. Default 0.',
      initialValue: 0,
    }),
    defineField({
      name: 'isFeatured',
      title: '¿Chip rápido en home?',
      type: 'boolean',
      description: 'Si está activo, aparece como chip directo en la fila superior (no solo en el drawer).',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'name', group: 'group', icon: 'icon' },
    prepare({ title, group, icon }) {
      const groupLabels: Record<string, string> = {
        audiencia: '👥 Audiencia',
        ocasion: '🎁 Ocasión',
        beneficio: '🌟 Beneficio',
        atributo: '🛠️ Atributo',
        nicho: '🏷️ Nicho',
        promo: '🔥 Promo',
      }
      return {
        title: `${icon ? icon + ' ' : ''}${title}`,
        subtitle: groupLabels[group] ?? group,
      }
    },
  },
  orderings: [
    {
      title: 'Por grupo',
      name: 'byGroup',
      by: [
        { field: 'group', direction: 'asc' },
        { field: 'priority', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ],
    },
  ],
})

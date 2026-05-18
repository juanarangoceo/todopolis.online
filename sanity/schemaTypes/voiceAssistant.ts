import { defineType, defineField } from 'sanity'
import { GenerateVoicePromptButton } from '../components/GenerateVoicePromptButton'

export const voiceAssistantType = defineType({
  name: 'voiceAssistant',
  title: 'Asistente de Voz Lucy',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Nombre interno',
      type: 'string',
      description: 'Solo para identificarlo en la lista. Ej: "Lucy para Almohada Cervical".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'product',
      title: 'Producto anclado',
      type: 'reference',
      to: [{ type: 'product' }],
      description: 'La landing de este producto mostrará el botón de llamada con Lucy.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'enabled',
      title: '¿Activo?',
      type: 'boolean',
      description: 'Desactívalo para ocultar el botón de llamada sin borrar el documento.',
      initialValue: true,
    }),
    defineField({
      name: 'generatePrompt',
      title: '🤖 Generar Prompt con Gemini',
      type: 'string',
      description: 'Genera automáticamente un prompt experto a partir de los datos del producto anclado.',
      components: {
        input: GenerateVoicePromptButton,
      },
    }),
    defineField({
      name: 'prompt',
      title: 'Prompt de Lucy',
      type: 'text',
      rows: 16,
      description: 'Instrucciones que Lucy seguirá durante la llamada. Debe describir el producto a la perfección: beneficios, precio, dudas frecuentes, manejo de objeciones y cuándo cerrar la venta.',
      validation: (rule) => rule.required().min(200).warning('Un prompt muy corto puede hacer que Lucy improvise mal. Apunta a 800-1500 caracteres.'),
    }),
    defineField({
      name: 'greeting',
      title: 'Saludo inicial (opcional)',
      type: 'string',
      description: 'Primera frase que dirá Lucy al contestar. Si lo dejas vacío usará uno por defecto.',
    }),
    defineField({
      name: 'voice',
      title: 'Voz de Lucy',
      type: 'string',
      description: 'Tono de la voz de OpenAI Realtime.',
      initialValue: 'shimmer',
      options: {
        list: [
          { title: 'Shimmer (recomendada · cálida femenina)', value: 'shimmer' },
          { title: 'Marin (femenina jovial)', value: 'marin' },
          { title: 'Cedar (masculina cálida)', value: 'cedar' },
          { title: 'Alloy (neutra)', value: 'alloy' },
          { title: 'Verse (expresiva)', value: 'verse' },
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      productName: 'product.name',
      enabled: 'enabled',
    },
    prepare({ title, productName, enabled }) {
      return {
        title: title ?? 'Sin nombre',
        subtitle: `${enabled === false ? '⏸ Inactivo' : '🟢 Activo'} · ${productName ?? 'Sin producto'}`,
      }
    },
  },
})

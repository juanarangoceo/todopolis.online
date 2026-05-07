import { defineType, defineField, defineArrayMember } from 'sanity'

export const storeSettingsType = defineType({
  name: 'storeSettings',
  title: 'Ajustes de Tienda (Políticas)',
  type: 'document',
  fields: [
    defineField({
      name: 'policies',
      title: 'Políticas de la Tienda',
      type: 'array',
      description: 'Estas políticas se mostrarán al final de todas las páginas de los productos.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'iconName',
              title: 'Nombre del Icono',
              type: 'string',
              description: 'Nombre del icono en Lucide (ej: Truck, ShieldCheck, RefreshCw, Lock)',
            }),
            defineField({
              name: 'title',
              title: 'Título de la Política',
              type: 'string',
            }),
            defineField({
              name: 'description',
              title: 'Descripción',
              type: 'text',
              rows: 2,
            }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: 'object',
          iconName: 'Truck',
          title: 'Envío Rápido y Seguro',
          description: 'Despachamos tu pedido en menos de 24 horas. Entregas a toda Colombia con transportadoras aliadas.',
        },
        {
          _type: 'object',
          iconName: 'WalletCards',
          title: 'Pago Contra Entrega',
          description: 'Compra con total confianza. Paga en efectivo únicamente cuando recibas el producto en la puerta de tu casa.',
        },
        {
          _type: 'object',
          iconName: 'ShieldCheck',
          title: 'Garantía de Calidad',
          description: 'Todos nuestros productos pasan por un estricto control de calidad. Garantía por defectos de fábrica.',
        },
        {
          _type: 'object',
          iconName: 'Lock',
          title: 'Privacidad Protegida',
          description: 'Tus datos están 100% seguros con nosotros. No compartimos tu información con terceros.',
        },
      ],
    }),
  ],
})

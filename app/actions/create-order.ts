'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { sendCapiEvent } from '@/lib/meta-capi';
import { ATTRIBUTION_COOKIE, attributionToColumns, readStoredAttribution } from '@/lib/attribution';
import { deliveryToOrderColumns, validateDelivery, type DeliveryField } from '@/lib/checkout/delivery';
import { orderTotals, resolveOrderProduct } from '@/lib/checkout/order-pricing';

export type CreateOrderResult =
  | { success: true }
  | { success: false; error: string; fields?: Partial<Record<DeliveryField, string>> };

export async function createOrder(formData: FormData): Promise<CreateOrderResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase no está configurado');
    }

    // Initialize Supabase admin client to bypass RLS for inserting orders
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Variante elegida (idVariant de Mastershop). Null si el producto no tiene variantes.
    const variantIdRaw = formData.get('variantId') as string | null
    const variantId = variantIdRaw && !Number.isNaN(Number(variantIdRaw))
      ? Number(variantIdRaw)
      : null
    const variantName = (formData.get('variantName') as string) || null

    // Datos de entrega: mismas reglas que el formulario. El navegador ya avisó
    // campo por campo; esto es la red por si alguien se lo salta.
    const delivery = validateDelivery({
      nombre: formData.get('nombre'),
      telefono: formData.get('telefono'),
      departamentoCode: formData.get('departamentoCode'),
      ciudadCode: formData.get('ciudadCode'),
      direccion: formData.get('direccion'),
      barrio: formData.get('barrio'),
      indicaciones: formData.get('indicaciones'),
    });
    if (!delivery.ok) {
      return { success: false, error: 'Revisa los datos de entrega.', fields: delivery.errors };
    }

    // Precio desde Sanity, NUNCA del formulario (ver `lib/checkout/order-pricing`).
    const slug = String(formData.get('productId') ?? '').trim();
    const quantity = Math.max(1, Math.min(20, parseInt(formData.get('quantity') as string) || 1));
    const product = await resolveOrderProduct(slug, variantId);
    if (!product) {
      return { success: false, error: 'Este producto no está disponible en este momento.' };
    }
    if (product.hasVariants && !variantId) {
      return { success: false, error: 'Por favor selecciona una opción del producto.' };
    }
    const { total, pricePerUnit } = orderTotals(product, quantity);

    const orderData = {
      product_id: slug,
      product_name: product.name,
      price: pricePerUnit,
      quantity,
      ...deliveryToOrderColumns(delivery.data),
      variant_id: variantId,
      variant_name: variantName,
      status: 'pending',
    };

    // ── Atribución ───────────────────────────────────────────────────────────
    // De qué anuncio vino este pedido. Se copia AL CREARLO y no se calcula
    // después porque el Purchase de Meta se manda más tarde —cuando el pedido
    // se entrega— y para entonces ya no hay navegador del que leer `_fbp` ni
    // `_fbc`. Sin ellos, un evento enviado días después no se puede atribuir.
    const cookieStore = await cookies();
    const attribution = readStoredAttribution(
      cookieStore.get(ATTRIBUTION_COOKIE)?.value ?? null,
      Date.now()
    );

    const { error } = await supabase
      .from('orders')
      .insert([{
        ...orderData,
        ...attributionToColumns(attribution, {
          fbp: cookieStore.get('_fbp')?.value ?? null,
          fbc: cookieStore.get('_fbc')?.value ?? null,
        }),
      }]);

    if (error) {
      console.error('Error insertando orden:', error);
      return { success: false, error: 'Ocurrió un error al procesar tu pedido' };
    }

    // ── Meta Conversions API ─────────────────────────────────────────────────
    // ESTO ES UN `Lead`, NO UN `Purchase`.
    //
    // Aquí el comprador acaba de llenar un formulario: con contraentrega no ha
    // pagado nada todavía y el pedido nace 'pending'. Mandar `Purchase` en este
    // punto le decía a Meta que el 100% de los formularios eran ventas, así que
    // el algoritmo optimizaba hacia gente que llena formularios y luego no
    // recibe el paquete — que es exactamente el tráfico que no se quiere.
    //
    // El `Purchase` se manda cuando hay dinero de verdad:
    //   · Confío  → al pasar a `funded` (`lib/payments/confio-orders.ts`)
    //   · Contraentrega → al marcar el pedido 'delivered' en el panel
    // y en los dos casos con las cookies que se guardaron en esta fila.
    //
    // Best-effort: nunca debe romper la confirmación del pedido.
    try {
      const fbEventId = formData.get('fbEventId') as string | null;
      if (fbEventId) {
        const headerStore = await headers();
        const xff = headerStore.get('x-forwarded-for');
        await sendCapiEvent({
          eventName: 'Lead',
          eventId: fbEventId,
          eventSourceUrl: headerStore.get('referer') ?? undefined,
          customData: {
            content_ids: [orderData.product_id],
            content_type: 'product',
            num_items: orderData.quantity,
            value: total,
            currency: 'COP',
          },
          userData: {
            phone: orderData.customer_phone,
            name: orderData.customer_name,
            city: orderData.customer_city,
            state: delivery.data.departamento,
          },
          fbp: cookieStore.get('_fbp')?.value,
          fbc: cookieStore.get('_fbc')?.value,
          clientIp: xff ? xff.split(',')[0].trim() : headerStore.get('x-real-ip') ?? undefined,
          clientUserAgent: headerStore.get('user-agent') ?? undefined,
        });
      }
    } catch (capiErr) {
      console.error('[create-order] CAPI Lead falló (no crítico):', capiErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Server action error:', err);
    return { success: false, error: 'Ocurrió un error inesperado' };
  }
}

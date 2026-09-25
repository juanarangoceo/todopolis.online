-- La variante viaja a Nitro también por id (`variant_external_id`).
--
-- Solo viajaba `variant_name` («2xl/Cocoa»): sirve para leer, no para
-- despachar. En Mastershop la variante se identifica por su `idVariant`, que
-- aquí ya se guarda en `orders.variant_id`.
--
-- Nitro lo recibe desde su migración 20260925120000 (columna nueva en
-- `web_orders`); antes de eso lo ignoraba sin error, así que el orden de
-- despliegue da igual. Misma firma: el trigger `orders_enqueue_nitro` sigue
-- llamando a esta función sin cambios, y un pedido existente solo se reenvía
-- cuando algo suyo cambia.

create or replace function public.order_nitro_payload(o public.orders)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'external_id', o.id,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'product_external_id', o.product_id,
    'product_name', o.product_name,
    'variant_name', o.variant_name,
    -- idVariant de Mastershop: con él se despacha. Texto, como el
    -- `external_id` de las variantes en catalog.v1.
    'variant_external_id', o.variant_id::text,
    'quantity', coalesce(o.quantity, 1),
    -- `price` se guarda por unidad (ver lib/checkout/order-pricing.ts).
    'total', round(coalesce(o.price, 0) * coalesce(o.quantity, 1)),
    'delivery_data', jsonb_strip_nulls(jsonb_build_object(
      'nombre', o.customer_name,
      'telefono', o.customer_phone,
      'direccion', o.customer_address,
      'barrio', o.customer_neighborhood,
      'ciudad', o.customer_city,
      'ciudad_code', o.customer_city_code,
      'departamento', o.customer_department,
      'indicaciones', o.customer_address_details
    )),
    'attribution', jsonb_strip_nulls(jsonb_build_object(
      'utm_source', o.utm_source,
      'utm_medium', o.utm_medium,
      'utm_campaign', o.utm_campaign,
      'utm_content', o.utm_content,
      'landing_path', o.landing_path
    )),
    'placed_at', o.created_at
  )
$$;

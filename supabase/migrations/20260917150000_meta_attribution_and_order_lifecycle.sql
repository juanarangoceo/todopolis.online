-- Atribución de campañas y ciclo de vida del pedido.
--
-- Dos problemas que resuelve, y los dos nacen de lo mismo: hoy un pedido nace
-- 'pending' y NADA en el código lo vuelve a tocar.
--
-- 1. NO SE SABE DE DÓNDE VINO UNA VENTA. No se guardaba ni un UTM ni el
--    `fbclid`, así que la única atribución disponible era la que reporta Meta
--    — que es justo la que no puede saber cuáles de esos pedidos se
--    entregaron y cobraron. Con contraentrega esa diferencia es enorme.
--
-- 2. `Purchase` SE DISPARABA AL ENVIAR EL FORMULARIO. Un pedido que nunca se
--    entrega ya contaba como compra, así que Meta optimizaba hacia gente que
--    llena formularios y no paga. Para poder mandar el Purchase DESPUÉS, hay
--    que haber guardado `_fbp` y `_fbc` en el momento de crear el pedido: sin
--    ellos, un evento enviado días más tarde no se puede atribuir a un anuncio.
--
-- Todas las columnas son anulables y sin valor por defecto salvo donde se
-- indica: los 12 pedidos existentes no se tocan.

alter table public.orders
  -- ── Atribución de campaña ────────────────────────────────────────────────
  -- Columnas sueltas y no un jsonb: el panel agrupa y filtra por campaña, y eso
  -- en jsonb obliga a castear en cada consulta.
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,

  -- Cookies del Píxel. Se copian al pedido EN EL MOMENTO DE CREARLO porque el
  -- Purchase se manda después, cuando ya no hay navegador del que leerlas.
  add column if not exists fbp text,
  add column if not exists fbc text,

  -- Contexto de la primera visita, para distinguir tráfico pagado de orgánico
  -- cuando el anuncio no trae UTMs.
  add column if not exists landing_path text,
  add column if not exists referrer text,

  -- ── Ciclo de vida ────────────────────────────────────────────────────────
  add column if not exists confirmed_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,

  -- Exactamente-una-vez para el Purchase de Meta, con la misma idea que el CAS
  -- de Confío: no es una bandera booleana que alguien pueda poner dos veces,
  -- es una marca de tiempo que solo se escribe `where meta_purchase_sent_at is
  -- null`. Dos clics seguidos en "entregado" no pueden mandar dos compras.
  add column if not exists meta_purchase_sent_at timestamptz,
  add column if not exists meta_purchase_event_id text;

-- ── Vocabulario de `status` ──────────────────────────────────────────────────
-- Hasta ahora no había ninguno: el código escribe 'pending' y 'pending_payment',
-- y en la base hay 'Enviado' y 'Cancelado' escritos a mano desde el panel de
-- Supabase. Mezclar idiomas y mayúsculas hace que cualquier filtro se
-- equivoque en silencio. Se normaliza ANTES de poner la restricción.
update public.orders set status = 'shipped'   where status in ('Enviado', 'enviado', 'Enviado ');
update public.orders set status = 'cancelled' where status in ('Cancelado', 'cancelado');
update public.orders set status = 'pending'   where status is null or status = '';

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in (
    'pending_payment',  -- Confío: cobro creado, esperando que pague
    'pending',          -- creado, sin confirmar con el comprador
    'confirmed',        -- verificado por WhatsApp, listo para despachar
    'shipped',          -- despachado, en manos de la transportadora
    'delivered',        -- entregado y cobrado  → aquí se manda Purchase (COD)
    'cancelled'         -- cancelado
  ));

-- El panel lista por fecha y filtra por estado.
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
-- Para agrupar ventas por campaña sin recorrer la tabla entera.
create index if not exists orders_utm_campaign_idx on public.orders (utm_campaign)
  where utm_campaign is not null;

comment on column public.orders.meta_purchase_sent_at is
  'Marca de tiempo del envío del Purchase a Meta. Se escribe con CAS (where is null) para garantizar exactamente-una-vez.';
